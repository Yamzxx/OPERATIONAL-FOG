import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { migrate } from './db/migrate.js';
import { authenticateUser, requireRole } from './middleware/auth.js';
import { 
  validateStateTransition, 
  evaluateScenarioEvents, 
  filterParticipantMessages, 
  DELIVERY_STATUS 
} from './services/simulationEngine.js';

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(authenticateUser);

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'op_fog_db',
  user: process.env.DB_USER || 'op_fog_user',
  password: process.env.DB_PASSWORD || 'op_fog_password',
  connectionTimeoutMillis: 5000
});

async function queryDB(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  return res;
}

// -------------------------------------------------------------
// 1. HEALTH & SYSTEM CHECK
// -------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await queryDB('SELECT NOW() as db_time');
    res.json({
      status: 'UP',
      service: 'Operational Fog Authoritative Backend API',
      database: 'CONNECTED (PostgreSQL)',
      dbTime: dbRes.rows[0].db_time,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      service: 'Operational Fog Authoritative Backend API',
      database: 'DISCONNECTED',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// -------------------------------------------------------------
// 2. SCENARIO MANAGEMENT ENDPOINTS
// -------------------------------------------------------------
app.get('/api/scenarios', async (req, res) => {
  try {
    const { category, search, includeArchived } = req.query;
    let query = 'SELECT * FROM scenarios WHERE 1=1';
    let params = [];

    if (!includeArchived) {
      query += ' AND is_archived = false';
    }

    if (category && category !== 'ALL') {
      params.push(`%${category}%`);
      query += ` AND UPPER(category) LIKE UPPER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (UPPER(title) LIKE UPPER($${params.length}) OR UPPER(short_desc) LIKE UPPER($${params.length}))`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await queryDB(query, params);
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
      version: row.version || 1,
      creator: row.creator,
      events: typeof row.events_json === 'string' ? JSON.parse(row.events_json) : row.events_json,
      isCustom: row.is_custom,
      isArchived: row.is_archived
    }));

    res.json(scenarios);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scenarios', details: err.message });
  }
});

app.get('/api/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await queryDB('SELECT * FROM scenarios WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Scenario with ID "${id}" not found.` });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      code: row.code,
      title: row.title,
      category: row.category,
      shortDesc: row.short_desc,
      objective: row.objective,
      duration: row.duration,
      difficulty: row.difficulty,
      status: row.status,
      version: row.version || 1,
      creator: row.creator,
      events: typeof row.events_json === 'string' ? JSON.parse(row.events_json) : row.events_json,
      isCustom: row.is_custom,
      isArchived: row.is_archived
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scenario details', details: err.message });
  }
});

app.post('/api/scenarios', requireRole(['instructor']), async (req, res) => {
  try {
    const s = req.body;
    if (!s.title || !s.shortDesc) {
      return res.status(400).json({ error: 'Scenario title and short description are required.' });
    }

    const id = s.id || `scen-custom-${Date.now()}`;
    const code = s.code || `SCEN-CFG-${Math.floor(100 + Math.random() * 900)}`;

    const result = await queryDB(
      `INSERT INTO scenarios (id, code, title, category, short_desc, objective, duration, difficulty, status, version, creator, events_json, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        code,
        s.title.trim(),
        s.category || 'Joint Operations',
        s.shortDesc.trim(),
        s.objective ? s.objective.trim() : 'Fictional training objective',
        s.duration || '45 mins',
        s.difficulty || 'Intermediate',
        s.status || 'Ready',
        s.version || 1,
        req.user.serviceId,
        JSON.stringify(s.events || []),
        s.isCustom !== undefined ? s.isCustom : true
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save scenario draft', details: err.message });
  }
});

app.patch('/api/scenarios/:id/archive', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await queryDB(
      `UPDATE scenarios SET is_archived = true, status = 'Archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scenario not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive scenario', details: err.message });
  }
});

app.post('/api/scenarios/:id/duplicate', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const src = await queryDB('SELECT * FROM scenarios WHERE id = $1', [id]);
    if (src.rows.length === 0) {
      return res.status(404).json({ error: 'Source scenario not found.' });
    }
    const row = src.rows[0];
    const newId = `scen-copy-${Date.now()}`;
    const newCode = `${row.code}-COPY`;
    const newTitle = `${row.title} (Copy)`;

    const result = await queryDB(
      `INSERT INTO scenarios (id, code, title, category, short_desc, objective, duration, difficulty, status, version, creator, events_json, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
       RETURNING *`,
      [newId, newCode, newTitle, row.category, row.short_desc, row.objective, row.duration, row.difficulty, 'Ready', 1, req.user.serviceId, row.events_json]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate scenario', details: err.message });
  }
});

// -------------------------------------------------------------
// 3. EXERCISE SESSION LIFECYCLE ENDPOINTS
// -------------------------------------------------------------
app.get(['/api/exercises', '/api/sessions'], async (req, res) => {
  try {
    const result = await queryDB('SELECT * FROM exercises ORDER BY created_at DESC');
    const list = result.rows.map(r => ({
      id: r.id,
      sessionCode: r.session_code,
      name: r.name,
      scenarioId: r.scenario_id,
      scenarioTitle: r.scenario_title,
      scenarioSnapshot: typeof r.scenario_snapshot_json === 'string' ? JSON.parse(r.scenario_snapshot_json) : r.scenario_snapshot_json,
      status: r.status,
      participantCount: r.participant_count,
      maxParticipants: r.max_participants,
      instructorId: r.instructor_id,
      creator: r.creator,
      participants: typeof r.participants_json === 'string' ? JSON.parse(r.participants_json) : r.participants_json,
      teamMessages: typeof r.team_messages_json === 'string' ? JSON.parse(r.team_messages_json) : r.team_messages_json,
      isSample: r.is_sample,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercise sessions', details: err.message });
  }
});

app.post(['/api/exercises', '/api/sessions'], requireRole(['instructor', 'commander']), async (req, res) => {
  try {
    const s = req.body;
    const id = s.id || `sess-${Date.now()}`;
    const code = s.sessionCode || `FOG-${Math.floor(1000 + Math.random() * 9000)}`;

    // Fetch scenario to freeze immutable scenario snapshot at launch time
    let snapshot = s.scenarioSnapshot || s.scenario;
    if (!snapshot && s.scenarioId) {
      const scenRes = await queryDB('SELECT * FROM scenarios WHERE id = $1', [s.scenarioId]);
      if (scenRes.rows.length > 0) {
        const row = scenRes.rows[0];
        snapshot = {
          id: row.id,
          code: row.code,
          title: row.title,
          category: row.category,
          shortDesc: row.short_desc,
          objective: row.objective,
          events: typeof row.events_json === 'string' ? JSON.parse(row.events_json) : row.events_json
        };
      }
    }

    if (!snapshot) {
      return res.status(400).json({ error: 'Valid scenario reference or snapshot required to launch exercise.' });
    }

    const initialParticipants = s.participants || [
      { id: `p-${Date.now()}`, serviceId: req.user.serviceId, displayName: `${req.user.serviceId} (Host)`, role: req.user.role || 'instructor', status: 'Online', joinedAt: new Date().toISOString() }
    ];

    const result = await queryDB(
      `INSERT INTO exercises (id, session_code, name, scenario_id, scenario_title, scenario_snapshot_json, status, participant_count, max_participants, instructor_id, creator, participants_json, is_sample)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        code,
        s.name || `${snapshot.title} Exercise`,
        s.scenarioId || snapshot.id || null,
        snapshot.title,
        JSON.stringify(snapshot),
        'In Progress',
        initialParticipants.length,
        s.maxParticipants || 6,
        req.user.serviceId,
        req.user.serviceId,
        JSON.stringify(initialParticipants),
        s.isSample || false
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create exercise session', details: err.message });
  }
});

// Centrally Validated State Transitions (Draft -> Ready -> Active -> Paused -> Completed -> Reviewed)
app.post('/api/exercises/:id/transition', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { targetStatus } = req.body;

    const current = await queryDB('SELECT * FROM exercises WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: `Exercise session "${id}" not found.` });
    }

    const currentStatus = current.rows[0].status;
    validateStateTransition(currentStatus, targetStatus);

    const completedAt = targetStatus === 'Completed' ? new Date().toISOString() : current.rows[0].completed_at;
    const pausedAt = targetStatus === 'Paused' ? new Date().toISOString() : null;

    const result = await queryDB(
      `UPDATE exercises SET status = $1, paused_at = $2, completed_at = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [targetStatus, pausedAt, completedAt, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: 'State transition rejected', details: err.message });
  }
});

app.post('/api/exercises/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, role } = req.body;

    const result = await queryDB('SELECT * FROM exercises WHERE id = $1 OR session_code = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise session not found.' });
    }

    const ex = result.rows[0];
    if (ex.status === 'Completed') {
      return res.status(400).json({ error: 'Exercise session has already completed.' });
    }

    let participants = typeof ex.participants_json === 'string' ? JSON.parse(ex.participants_json) : ex.participants_json;
    const existingIndex = participants.findIndex(p => p.serviceId === req.user.serviceId);

    if (existingIndex >= 0) {
      participants[existingIndex].status = 'Online';
      participants[existingIndex].role = role || participants[existingIndex].role;
    } else {
      if (participants.length >= ex.max_participants) {
        return res.status(400).json({ error: 'Exercise participant capacity reached.' });
      }
      participants.push({
        id: `p-${Date.now()}`,
        serviceId: req.user.serviceId,
        displayName: displayName || req.user.serviceId,
        role: role || 'commander',
        status: 'Online',
        joinedAt: new Date().toISOString()
      });
    }

    const updated = await queryDB(
      `UPDATE exercises SET participants_json = $1, participant_count = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [JSON.stringify(participants), participants.length, ex.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to join exercise', details: err.message });
  }
});

// -------------------------------------------------------------
// 4. AUTHORITATIVE SIMULATION & PARTICIPANT MESSAGE DISPATCHES
// -------------------------------------------------------------
app.get('/api/exercises/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { elapsedSeconds, role } = req.query;

    const exRes = await queryDB('SELECT * FROM exercises WHERE id = $1 OR session_code = $1', [id]);
    if (exRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }

    const ex = exRes.rows[0];
    const snapshot = typeof ex.scenario_snapshot_json === 'string' ? JSON.parse(ex.scenario_snapshot_json) : ex.scenario_snapshot_json;
    const elapsed = parseInt(elapsedSeconds || '0', 10);

    const evaluatedEvents = evaluateScenarioEvents(snapshot.events || [], elapsed);
    const userRole = role || req.user.role || 'commander';
    const authorizedMessages = filterParticipantMessages(evaluatedEvents, userRole);

    res.json({
      exerciseId: ex.id,
      elapsedSeconds: elapsed,
      userRole,
      messages: authorizedMessages
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to evaluate simulation dispatches', details: err.message });
  }
});

app.get('/api/exercises/:id/instructor-log', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { elapsedSeconds } = req.query;

    const exRes = await queryDB('SELECT * FROM exercises WHERE id = $1 OR session_code = $1', [id]);
    if (exRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }

    const ex = exRes.rows[0];
    const snapshot = typeof ex.scenario_snapshot_json === 'string' ? JSON.parse(ex.scenario_snapshot_json) : ex.scenario_snapshot_json;
    const elapsed = parseInt(elapsedSeconds || '0', 10);

    const evaluatedEvents = evaluateScenarioEvents(snapshot.events || [], elapsed);

    res.json({
      exerciseId: ex.id,
      elapsedSeconds: elapsed,
      totalEvents: evaluatedEvents.length,
      deliveredCount: evaluatedEvents.filter(e => e.status === DELIVERY_STATUS.DELIVERED).length,
      delayedCount: evaluatedEvents.filter(e => e.status === DELIVERY_STATUS.DELAYED).length,
      droppedCount: evaluatedEvents.filter(e => e.status === DELIVERY_STATUS.DROPPED).length,
      events: evaluatedEvents
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch instructor audit log', details: err.message });
  }
});

// -------------------------------------------------------------
// 5. COMMAND DECISIONS LOGGING
// -------------------------------------------------------------
app.get(['/api/exercises/:id/decisions', '/api/decisions'], async (req, res) => {
  try {
    const exerciseId = req.params.id || req.query.sessionId;
    let query = 'SELECT * FROM participant_decisions';
    let params = [];
    if (exerciseId) {
      query += ' WHERE exercise_id = $1';
      params.push(exerciseId);
    }
    query += ' ORDER BY timestamp ASC';

    const result = await queryDB(query, params);
    const decisions = result.rows.map(r => ({
      id: r.id,
      exerciseId: r.exercise_id,
      sessionId: r.exercise_id,
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
    res.status(500).json({ error: 'Failed to fetch decision logs', details: err.message });
  }
});

app.post(['/api/exercises/:id/decisions', '/api/decisions'], async (req, res) => {
  try {
    const d = req.body;
    const exerciseId = req.params.id || d.sessionId || d.exerciseId;
    if (!exerciseId || !d.title || !d.rationale) {
      return res.status(400).json({ error: 'Exercise ID, decision title, and rationale are required.' });
    }

    const id = d.id || `dec-${Date.now()}`;
    const timestamp = d.timestamp || new Date().toISOString();

    const result = await queryDB(
      `INSERT INTO participant_decisions (id, exercise_id, title, rationale, confidence, elapsed_minutes, elapsed_time_formatted, submitted_by, submitted_role, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        exerciseId,
        d.title.trim(),
        d.rationale.trim(),
        d.confidence || 'Medium',
        d.elapsedMinutes || 0,
        d.elapsedTimeFormatted || '00:00',
        d.submittedBy || req.user.serviceId,
        d.submittedRole || req.user.role || 'commander',
        timestamp
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to log decision', details: err.message });
  }
});

// -------------------------------------------------------------
// 6. AFTER-ACTION REVIEW (AAR) AUDIT REPORTS
// -------------------------------------------------------------
app.get('/api/aars', async (req, res) => {
  try {
    const result = await queryDB('SELECT * FROM aars ORDER BY created_at DESC');
    const aars = result.rows.map(r => ({
      id: r.id,
      exerciseId: r.exercise_id,
      sessionId: r.session_id || r.exercise_id,
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
      scenarioSnapshot: typeof r.scenario_snapshot_json === 'string' ? JSON.parse(r.scenario_snapshot_json) : r.scenario_snapshot_json,
      isSample: r.is_sample,
      createdAt: r.created_at
    }));
    res.json(aars);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AAR records', details: err.message });
  }
});

app.post('/api/aars', async (req, res) => {
  try {
    const a = req.body;
    const id = a.id || `aar-${Date.now()}`;
    const result = await queryDB(
      `INSERT INTO aars (id, exercise_id, session_id, session_code, session_name, scenario_title, creator, start_time, end_time, duration_minutes, decisions_count, instructor_notes, decisions_json, events_json, participants_json, scenario_snapshot_json, is_sample)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id,
        a.exerciseId || a.sessionId || null,
        a.sessionId || a.exerciseId || null,
        a.sessionCode || null,
        a.sessionName,
        a.scenarioTitle,
        a.creator || req.user.serviceId,
        a.startTime || new Date().toISOString(),
        a.endTime || new Date().toISOString(),
        a.durationMinutes || 45,
        a.decisionsCount || (a.decisions || []).length,
        a.instructorNotes || '',
        JSON.stringify(a.decisions || []),
        JSON.stringify(a.events || []),
        JSON.stringify(a.participants || []),
        JSON.stringify(a.scenarioSnapshot || {}),
        a.isSample || false
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create AAR audit record', details: err.message });
  }
});

app.patch('/api/aars/:id/note', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { noteText } = req.body;
    const result = await queryDB(
      `UPDATE aars SET instructor_notes = $1 WHERE id = $2 RETURNING *`,
      [noteText, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AAR record not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update AAR note', details: err.message });
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
    console.log(`Operational Fog Backend API running on port ${PORT}`);
    console.log(`Health Check Endpoint: http://localhost:${PORT}/api/health`);
  });
}

startServer();
