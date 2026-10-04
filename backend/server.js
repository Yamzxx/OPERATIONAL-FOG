import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { migrate } from './db/migrate.js';

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'op_fog_db',
  user: process.env.DB_USER || 'op_fog_user',
  password: process.env.DB_PASSWORD || 'op_fog_password',
  connectionTimeoutMillis: 5000
});

// Helper for database queries
async function queryDB(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

// 1. Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await queryDB('SELECT NOW() as db_time');
    res.json({
      status: 'UP',
      service: 'Operational Fog Backend API',
      database: 'CONNECTED (PostgreSQL)',
      dbTime: dbRes.rows[0].db_time,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      service: 'Operational Fog Backend API',
      database: 'DISCONNECTED',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 2. Scenarios Endpoints
app.get('/api/scenarios', async (req, res) => {
  try {
    const result = await queryDB('SELECT * FROM scenarios ORDER BY created_at DESC');
    const scenarios = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      title: row.title,
      category: row.category,
      shortDesc: row.short_desc,
      objective: row.objective,
      duration: row.duration,
      difficulty: row.difficulty,
      status: row.status,
      events: typeof row.events_json === 'string' ? JSON.parse(row.events_json) : row.events_json,
      isCustom: row.is_custom
    }));
    res.json(scenarios);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scenarios', details: err.message });
  }
});

app.post('/api/scenarios', async (req, res) => {
  try {
    const s = req.body;
    const result = await queryDB(
      `INSERT INTO scenarios (id, code, title, category, short_desc, objective, duration, difficulty, status, events_json, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        s.id || `scen-custom-${Date.now()}`,
        s.code || `SCEN-CFG-${Math.floor(100 + Math.random() * 900)}`,
        s.title,
        s.category || 'Joint Operations',
        s.shortDesc,
        s.objective || 'Fictional exercise objective',
        s.duration || '45 mins',
        s.difficulty || 'Intermediate',
        s.status || 'Ready',
        JSON.stringify(s.events || []),
        s.isCustom || true
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save scenario', details: err.message });
  }
});

// 3. Sessions Endpoints
app.get('/api/sessions', async (req, res) => {
  try {
    const result = await queryDB('SELECT * FROM sessions ORDER BY created_at DESC');
    const sessions = result.rows.map(r => ({
      id: r.id,
      sessionCode: r.session_code,
      name: r.name,
      scenarioId: r.scenario_id,
      scenarioTitle: r.scenario_title,
      status: r.status,
      participantCount: r.participant_count,
      maxParticipants: r.max_participants,
      creator: r.creator,
      participants: typeof r.participants_json === 'string' ? JSON.parse(r.participants_json) : r.participants_json,
      teamMessages: typeof r.team_messages_json === 'string' ? JSON.parse(r.team_messages_json) : r.team_messages_json,
      isSample: r.is_sample,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }));
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions', details: err.message });
  }
});

app.post('/api/sessions', async (req, res) => {
  try {
    const s = req.body;
    const id = s.id || `sess-${Date.now()}`;
    const createdAt = s.createdAt || new Date().toISOString();
    const result = await queryDB(
      `INSERT INTO sessions (id, session_code, name, scenario_id, scenario_title, status, participant_count, max_participants, creator, participants_json, team_messages_json, is_sample, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        s.sessionCode || null,
        s.name,
        s.scenarioId || null,
        s.scenarioTitle,
        s.status || 'In Progress',
        s.participantCount || 1,
        s.maxParticipants || 6,
        s.creator || 'Operator',
        JSON.stringify(s.participants || []),
        JSON.stringify(s.teamMessages || []),
        s.isSample || false,
        createdAt
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session', details: err.message });
  }
});

app.patch('/api/sessions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const completedAt = status === 'Completed' ? new Date().toISOString() : null;
    const result = await queryDB(
      `UPDATE sessions SET status = $1, completed_at = $2 WHERE id = $3 RETURNING *`,
      [status, completedAt, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update session status', details: err.message });
  }
});

// 4. Decisions Endpoints
app.get('/api/decisions', async (req, res) => {
  try {
    const { sessionId } = req.query;
    let query = 'SELECT * FROM decisions';
    let params = [];
    if (sessionId) {
      query += ' WHERE session_id = $1';
      params.push(sessionId);
    }
    query += ' ORDER BY timestamp ASC';
    const result = await queryDB(query, params);
    const decisions = result.rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      title: r.title,
      rationale: r.rationale,
      confidence: r.confidence,
      elapsedMinutes: r.elapsed_minutes,
      elapsedTimeFormatted: r.elapsed_time_formatted,
      submittedBy: r.submitted_by,
      submittedRole: r.submitted_role,
      timestamp: r.timestamp
    }));
    res.json(decisions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch decisions', details: err.message });
  }
});

app.post('/api/decisions', async (req, res) => {
  try {
    const d = req.body;
    const id = d.id || `dec-${Date.now()}`;
    const timestamp = d.timestamp || new Date().toISOString();
    const result = await queryDB(
      `INSERT INTO decisions (id, session_id, title, rationale, confidence, elapsed_minutes, elapsed_time_formatted, submitted_by, submitted_role, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        d.sessionId,
        d.title,
        d.rationale,
        d.confidence || 'Medium',
        d.elapsedMinutes || 0,
        d.elapsedTimeFormatted || '00:00',
        d.submittedBy || 'Operator',
        d.submittedRole || 'commander',
        timestamp
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log decision', details: err.message });
  }
});

// 5. AARs Endpoints
app.get('/api/aars', async (req, res) => {
  try {
    const result = await queryDB('SELECT * FROM aars ORDER BY created_at DESC');
    const aars = result.rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      sessionCode: r.session_code,
      sessionName: r.session_name,
      scenarioTitle: r.scenario_title,
      creator: r.creator,
      startTime: r.start_time,
      endTime: r.end_time,
      durationMinutes: r.duration_minutes,
      decisionsCount: r.decisions_count,
      instructorNotes: r.instructor_notes,
      decisions: typeof r.decisions_json === 'string' ? JSON.parse(r.decisions_json) : r.decisions_json,
      events: typeof r.events_json === 'string' ? JSON.parse(r.events_json) : r.events_json,
      participants: typeof r.participants_json === 'string' ? JSON.parse(r.participants_json) : r.participants_json,
      isSample: r.is_sample,
      createdAt: r.created_at
    }));
    res.json(aars);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AARs', details: err.message });
  }
});

app.post('/api/aars', async (req, res) => {
  try {
    const a = req.body;
    const id = a.id || `aar-${Date.now()}`;
    const result = await queryDB(
      `INSERT INTO aars (id, session_id, session_code, session_name, scenario_title, creator, start_time, end_time, duration_minutes, decisions_count, instructor_notes, decisions_json, events_json, participants_json, is_sample)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        id,
        a.sessionId || null,
        a.sessionCode || null,
        a.sessionName,
        a.scenarioTitle,
        a.creator || 'Operator',
        a.startTime || new Date().toISOString(),
        a.endTime || new Date().toISOString(),
        a.durationMinutes || 45,
        a.decisionsCount || 0,
        a.instructorNotes || '',
        JSON.stringify(a.decisions || []),
        JSON.stringify(a.events || []),
        JSON.stringify(a.participants || []),
        a.isSample || false
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save AAR', details: err.message });
  }
});

app.patch('/api/aars/:id/note', async (req, res) => {
  try {
    const { id } = req.params;
    const { noteText } = req.body;
    const result = await queryDB(
      `UPDATE aars SET instructor_notes = $1 WHERE id = $2 RETURNING *`,
      [noteText, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update AAR instructor note', details: err.message });
  }
});

// Automatic startup database migration & retry loop
async function startServer() {
  let retries = 10;
  while (retries > 0) {
    try {
      console.log('Running database migration on startup...');
      await migrate();
      break;
    } catch (err) {
      console.log(`Database connection failed (${err.message}). Retrying in 3 seconds... (${retries} attempts left)`);
      retries -= 1;
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  app.listen(PORT, () => {
    console.log(`Operational Fog Backend Server running on port ${PORT}`);
    console.log(`API Health Endpoint: http://localhost:${PORT}/api/health`);
  });
}

startServer();
