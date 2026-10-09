import http from 'http';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { migrate } from './db/migrate.js';
import { authenticateUser, makeResolveUser, requireRole } from './middleware/auth.js';
import { 
  validateStateTransition, 
  evaluateScenarioEvents, 
  evaluateParticipantDeliveredEvents,
  generateAsymmetryMatrix,
  filterParticipantMessages, 
  DELIVERY_STATUS,
<<<<<<< Updated upstream
  formatSecondsToMMSS
=======
  formatSecondsToMMSS,
  isDecisionEvent,
  calculateInformationAvailability,
  calculateSharedAwareness,
  createEvidenceSnapshot,
  getDecisionTargetRoles,
  isRoleAllowedForDecision,
  normalizeRole
>>>>>>> Stashed changes
} from './services/simulationEngine.js';
import { initWebSocketServer, wsManager } from './services/websocketServer.js';


const { Pool } = pg;

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

// Initialize WebSocket room manager
initWebSocketServer(server);

// Allow all origins in development. In production, restrict to the actual frontend domain.
app.use(cors({
  origin: true,
  credentials: true
}));
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

// DB-based identity resolution — enriches req.user with dbRole and verified flag.
// Runs after authenticateUser so every route sees an authoritative role.
app.use(makeResolveUser(pool));

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
function mapExerciseRow(r) {
  const snapshot = typeof r.scenario_snapshot_json === 'string' ? JSON.parse(r.scenario_snapshot_json) : r.scenario_snapshot_json;
  const participants = typeof r.participants_json === 'string' ? JSON.parse(r.participants_json) : (r.participants_json || []);
  const teamMessages = typeof r.team_messages_json === 'string' ? JSON.parse(r.team_messages_json) : (r.team_messages_json || []);
  return {
    id: r.id,
    sessionCode: r.session_code,
    name: r.name,
    scenarioId: r.scenario_id,
    scenarioTitle: r.scenario_title,
    scenarioSnapshot: snapshot,
    scenario: snapshot,
    status: r.status,
    elapsedSeconds: r.elapsed_seconds || 0,
    participantCount: r.participant_count || participants.length,
    maxParticipants: r.max_participants || 6,
    instructorId: r.instructor_id,
    creator: r.creator,
    participants: participants,
    teamMessages: teamMessages,
    isSample: r.is_sample,
    createdAt: r.created_at,
    completedAt: r.completed_at
  };
}

// GET exercises — instructors see all; participants see only exercises they are a member of.
app.get(['/api/exercises', '/api/sessions'], async (req, res) => {
  try {
    const effectiveRole = req.user?.dbRole || req.user?.role || 'participant';
    let result;
    if (effectiveRole === 'instructor') {
      result = await queryDB('SELECT * FROM exercises ORDER BY created_at DESC');
    } else {
      // Scope to exercises where the participant's serviceId appears in participants_json
      // or they are the creator. Uses a JSONB containment/text search as a practical
      // approach for the prototype's JSONB participant list.
      const sid = req.user?.serviceId;
      if (!sid) {
        return res.status(401).json({ error: 'Unauthorized: Service identity required to list exercises.' });
      }
      result = await queryDB(
        `SELECT * FROM exercises
         WHERE creator = $1
            OR participants_json::text ILIKE $2
         ORDER BY created_at DESC`,
        [sid, `%${sid}%`]
      );
    }
    res.json(result.rows.map(mapExerciseRow));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercise sessions', details: err.message });
  }
});

// GET: Look up a session by join code without mutating anything.
// This MUST be registered BEFORE the /api/exercises/:id catch-all route.
// Used by participants to restore their session context after a page refresh.
app.get(['/api/exercises/join/:code', '/api/sessions/join/:code', '/api/exercises/lookup/:code', '/api/sessions/lookup/:code'], async (req, res) => {
  try {
    const code = (req.params.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Please provide a Join Code.' });
    }
    const result = await queryDB(
      'SELECT * FROM exercises WHERE UPPER(session_code) = UPPER($1)',
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Join code "${code}" not found.` });
    }
    res.json(mapExerciseRow(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to look up session', details: err.message });
  }
});

app.get(['/api/exercises/code/:code', '/api/sessions/code/:code'], async (req, res) => {
  try {
    const code = (req.params.code || '').trim();
    const result = await queryDB(
      'SELECT * FROM exercises WHERE UPPER(session_code) = UPPER($1)',
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Session with join code "${code}" not found.` });
    }
    res.json(mapExerciseRow(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup exercise session', details: err.message });
  }
});

app.get(['/api/exercises/:id', '/api/sessions/:id'], async (req, res) => {
  try {
    const codeOrId = (req.params.id || '').trim();
    const result = await queryDB(
      'SELECT * FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [codeOrId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Session with join code or ID "${codeOrId}" not found.` });
    }
    const ex = result.rows[0];

    // Authoritative exercise membership check for participants
    const effectiveRole = req.user?.dbRole || req.user?.role || 'participant';
    if (effectiveRole !== 'instructor') {
      const sid = req.user?.serviceId;
      if (!sid) {
        return res.status(401).json({ error: 'Unauthorized: Service identity required.' });
      }
      const participants = typeof ex.participants_json === 'string'
        ? JSON.parse(ex.participants_json)
        : (ex.participants_json || []);
      const isMember = participants.some(p => p.serviceId === sid) || ex.creator === sid;
      if (!isMember) {
        return res.status(403).json({ error: 'Forbidden: You are not a member of this exercise session.' });
      }
    }

    res.json(mapExerciseRow(ex));
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup exercise session', details: err.message });
  }
});

// POST /api/exercises — instructor only; participants cannot create exercises.
app.post(['/api/exercises', '/api/sessions'], requireRole(['instructor']), async (req, res) => {
  try {
    const s = req.body;
    const id = s.id || `sess-${Date.now()}`;
    const code = (s.sessionCode || `FOG-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase().trim();

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

    // Always use the verified server-side identity as creator — never trust client-supplied creator field.
    const creatorId = req.user?.serviceId || s.creator;
    if (!creatorId) {
      return res.status(401).json({ error: 'Unauthorized: Cannot identify exercise creator.' });
    }
    const effectiveRole = req.user?.dbRole || req.user?.role || 'instructor';
    const initialParticipants = s.participants || [
      { id: `p-${Date.now()}`, serviceId: creatorId, displayName: `${creatorId} (Host)`, role: effectiveRole, status: 'Online', joinedAt: new Date().toISOString() }
    ];

    const result = await queryDB(
      `INSERT INTO exercises (id, session_code, name, scenario_id, scenario_title, scenario_snapshot_json, status, participant_count, max_participants, instructor_id, creator, participants_json, is_sample)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         participants_json = EXCLUDED.participants_json,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        id,
        code,
        s.name || `${snapshot.title} Exercise`,
        s.scenarioId || snapshot.id || null,
        snapshot.title,
        JSON.stringify(snapshot),
        s.status || 'In Progress',
        initialParticipants.length,
        s.maxParticipants || 6,
        creatorId,
        creatorId,
        JSON.stringify(initialParticipants),
        s.isSample || false
      ]
    );

    res.status(201).json(mapExerciseRow(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create exercise session', details: err.message });
  }
});

// Centrally Validated State Transitions (Draft -> Ready -> Active -> Paused -> Completed -> Reviewed)
app.post('/api/exercises/:id/transition', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { targetStatus, elapsedSeconds } = req.body;

    const current = await queryDB('SELECT * FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: `Exercise session "${id}" not found.` });
    }

    const currentStatus = current.rows[0].status;
    validateStateTransition(currentStatus, targetStatus);

    const completedAt = targetStatus === 'Completed' ? new Date().toISOString() : current.rows[0].completed_at;
    const pausedAt = targetStatus === 'Paused' ? new Date().toISOString() : null;
    // Persist elapsed seconds when pausing or completing so refresh restores the correct clock
    const persistedElapsed = (elapsedSeconds !== undefined && elapsedSeconds !== null)
      ? parseInt(elapsedSeconds, 10)
      : (current.rows[0].elapsed_seconds || 0);

    const result = await queryDB(
      `UPDATE exercises
       SET status = $1, paused_at = $2, completed_at = $3, elapsed_seconds = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [targetStatus, pausedAt, completedAt, persistedElapsed, current.rows[0].id]
    );

    res.json(mapExerciseRow(result.rows[0]));
  } catch (err) {
    res.status(400).json({ error: 'State transition rejected', details: err.message });
  }
});

// PATCH: Persist simulation clock (elapsed_seconds) without changing status.
// Called periodically while the exercise is running so refresh can restore the clock.
// Only the instructor (clock owner) may update elapsed_seconds — prevents participants from spoofing the clock.
app.patch('/api/exercises/:id/elapsed', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { elapsedSeconds } = req.body;
    if (elapsedSeconds === undefined || elapsedSeconds === null) {
      return res.status(400).json({ error: 'elapsedSeconds is required.' });
    }
    const result = await queryDB(
      `UPDATE exercises SET elapsed_seconds = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, elapsed_seconds, status`,
      [parseInt(elapsedSeconds, 10), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }
    res.json({ id: result.rows[0].id, elapsedSeconds: result.rows[0].elapsed_seconds, status: result.rows[0].status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to persist elapsed time', details: err.message });
  }
});

app.post(['/api/exercises/join', '/api/exercises/:id/join', '/api/sessions/join', '/api/sessions/:id/join'], async (req, res) => {
  try {
    const targetCodeOrId = (req.params.id || req.body.sessionCode || req.body.id || '').trim();
    const { displayName, role, serviceId } = req.body;

    if (!targetCodeOrId) {
      return res.status(400).json({ error: 'Please enter a valid Join Code.' });
    }

    const result = await queryDB(
      'SELECT * FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [targetCodeOrId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Invalid Join Code "${targetCodeOrId}". Session not found in database.` });
    }

    const ex = result.rows[0];

    // Only allow joining sessions that are in a joinable state.
    const joinableStatuses = ['Waiting', 'Ready', 'In Progress', 'Active'];
    if (!joinableStatuses.includes(ex.status)) {
      const reason = ex.status === 'Completed' || ex.status === 'Reviewed'
        ? 'This exercise session has already completed and is no longer accepting participants.'
        : `This exercise session (status: ${ex.status}) is not currently accepting participants.`;
      return res.status(400).json({ error: reason });
    }

    let participants = typeof ex.participants_json === 'string' ? JSON.parse(ex.participants_json) : (ex.participants_json || []);
    const userServiceId = serviceId || req.user?.serviceId || `USER-${Math.floor(1000 + Math.random() * 9000)}`;

    const existingIndex = participants.findIndex(p => p.serviceId === userServiceId);

    if (existingIndex >= 0) {
      // Participant is rejoining — update their status to Online
      participants[existingIndex].status = 'Online';
      participants[existingIndex].displayName = displayName || participants[existingIndex].displayName || userServiceId;
      participants[existingIndex].role = role || participants[existingIndex].role;
    } else {
      if (participants.length >= ex.max_participants) {
        return res.status(400).json({ error: `Exercise participant capacity limit of ${ex.max_participants} reached.` });
      }
      participants.push({
        id: `p-${Date.now()}`,
        serviceId: userServiceId,
        displayName: displayName || userServiceId,
        role: role || 'commander',
        status: 'Online',
        joinedAt: new Date().toISOString()
      });
    }

    // Auto-advance status: Waiting -> Ready when a second participant joins
    let newStatus = ex.status;
    if (participants.length >= 2 && ex.status === 'Waiting') {
      newStatus = 'Ready';
    }

    const updated = await queryDB(
      `UPDATE exercises SET participants_json = $1, participant_count = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [JSON.stringify(participants), participants.length, newStatus, ex.id]
    );

    // Upsert into exercise_participants for relational membership tracking
    await queryDB(
      `INSERT INTO exercise_participants (id, exercise_id, user_id, display_name, role, status)
       VALUES ($1, $2, $3, $4, $5, 'Online')
       ON CONFLICT (id) DO UPDATE SET status = 'Online', display_name = EXCLUDED.display_name`,
      [`ep-${ex.id}-${userServiceId}`, ex.id, userServiceId, displayName || userServiceId, role || 'commander']
    ).catch(() => {});

    res.json(mapExerciseRow(updated.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to join exercise session', details: err.message });
  }
});

// ------------------------------------------------------------------
// Helper: derive a stable VARCHAR(64) event ID from exercise + scenario event
// ------------------------------------------------------------------
function stableEventId(exerciseId, ev, index) {
  const evId = ev.id || `ev-${index + 1}`;
  return `evt-${exerciseId}-${evId}`.substring(0, 64);
}

// ------------------------------------------------------------------
// Helper: map a communication_events DB row to the shape expected by the frontend
// ------------------------------------------------------------------
function mapEventRow(r) {
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    title: r.title,
    content: r.content,
    type: r.event_type,
    deliveryBehavior: r.delivery_behavior,
    recipientRole: r.recipient_role,
    scheduledTimeSec: r.scheduled_time_sec,
    delaySeconds: r.delay_seconds,
    actualDeliveryTimeSec: r.actual_delivery_time_sec,
    scheduledTimeFormatted: formatSecondsToMMSS(r.scheduled_time_sec),
    actualDeliveryTimeFormatted: formatSecondsToMMSS(r.actual_delivery_time_sec),
    status: r.status,
    deliveredToParticipant: r.status === 'DELIVERED',
    instructorNotes: r.instructor_notes || '',
    conflictsWithId: r.conflicts_with_id || null,
    incompleteFields: r.incomplete_fields || null,
    createdAt: r.created_at
  };
}

// ------------------------------------------------------------------
// Helper: persist a single evaluated event into communication_events.
// Idempotent — ON CONFLICT only upgrades status (PENDING → DELAYED → DELIVERED/DROPPED).
// ------------------------------------------------------------------
async function persistEventState(exerciseId, ev, index) {
  const evId = stableEventId(exerciseId, ev, index);
  await queryDB(
    `INSERT INTO communication_events
       (id, exercise_id, title, content, event_type, delivery_behavior, recipient_role,
        scheduled_time_sec, delay_seconds, actual_delivery_time_sec, status, instructor_notes,
        conflicts_with_id, incomplete_fields)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       actual_delivery_time_sec = EXCLUDED.actual_delivery_time_sec`,
    [
      evId,
      exerciseId,
      (ev.title || '').substring(0, 500),
      (ev.content || ev.messageContent || '').substring(0, 5000),
      (ev.type || 'info').substring(0, 32),
      (ev.deliveryBehavior || 'normal').substring(0, 32),
      (ev.recipientRole || ev.intendedRecipient || 'all').substring(0, 32),
      ev.scheduledTimeSec || 0,
      ev.delaySeconds || 0,
      ev.actualDeliveryTimeSec || 0,
      ev.status || 'PENDING',
      (ev.instructorNotes || '').substring(0, 2000),
      ev.conflictsWithId ? String(ev.conflictsWithId).substring(0, 64) : null,
      ev.incompleteFields ? String(ev.incompleteFields).substring(0, 128) : null
    ]
  );
}

// -------------------------------------------------------------
// 4. AUTHORITATIVE SIMULATION & PARTICIPANT MESSAGE DISPATCHES
// -------------------------------------------------------------

// POST: Idempotently seed all scenario events into communication_events as PENDING.
// Called once when a participant/instructor first enters the Training Room.
// Safe to call multiple times — ON CONFLICT (id) DO NOTHING prevents duplicates.
// Seeding events is an instructor/system operation — participants must not seed their own events.
app.post('/api/exercises/:id/events/seed', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const exRes = await queryDB(
      'SELECT * FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [id]
    );
    if (exRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }
    const snapshot = typeof ex.scenario_snapshot_json === 'string'
      ? JSON.parse(ex.scenario_snapshot_json)
      : ex.scenario_snapshot_json;

    const scenarioEvents = snapshot?.events || [];

    // Evaluate at elapsed=0 to get the base structure (scheduledTimeSec etc.)
    // then insert as PENDING — status will be updated on subsequent message polls.
    const baseEvents = evaluateScenarioEvents(scenarioEvents, 0);
    let seeded = 0;
    for (let i = 0; i < baseEvents.length; i++) {
      const ev = { ...baseEvents[i], status: 'PENDING' };
      const evId = stableEventId(ex.id, ev, i);
      const result = await queryDB(
        `INSERT INTO communication_events
           (id, exercise_id, title, content, event_type, delivery_behavior, recipient_role,
            scheduled_time_sec, delay_seconds, actual_delivery_time_sec, status,
            instructor_notes, conflicts_with_id, incomplete_fields)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          evId,
          ex.id,
          (ev.title || '').substring(0, 500),
          (ev.content || ev.messageContent || '').substring(0, 5000),
          (ev.type || 'info').substring(0, 32),
          (ev.deliveryBehavior || 'normal').substring(0, 32),
          (ev.recipientRole || ev.intendedRecipient || 'all').substring(0, 32),
          ev.scheduledTimeSec || 0,
          ev.delaySeconds || 0,
          ev.actualDeliveryTimeSec || 0,
          'PENDING',
          (ev.instructorNotes || '').substring(0, 2000),
          ev.conflictsWithId ? String(ev.conflictsWithId).substring(0, 64) : null,
          ev.incompleteFields ? String(ev.incompleteFields).substring(0, 128) : null
        ]
      );
      if (result.rowCount > 0) seeded++;
    }

    res.json({
      exerciseId: ex.id,
      totalScenarioEvents: scenarioEvents.length,
      seeded,
      alreadyPresent: scenarioEvents.length - seeded
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed scenario events', details: err.message });
  }
});

// GET: Authoritative participant message dispatch.
// Uses DB elapsed_seconds as the clock — not the browser-supplied value.
// Lazily persists every evaluated DELIVERED/DROPPED event into communication_events.
// Participant visibility is enforced server-side: dropped events are NEVER returned.
app.get('/api/exercises/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the requester has a service identity before returning any data
    if (!req.user?.serviceId) {
      return res.status(401).json({ error: 'Unauthorized: Service identity required.' });
    }

    const exRes = await queryDB(
      'SELECT * FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [id]
    );
    if (exRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }
    const ex = exRes.rows[0];

    // Exercise membership check for participants — instructors see all exercises
    const effectiveRole = req.user?.dbRole || req.user?.role || 'participant';
    if (effectiveRole !== 'instructor') {
      const participants = typeof ex.participants_json === 'string'
        ? JSON.parse(ex.participants_json)
        : (ex.participants_json || []);
      const isMember = participants.some(p => p.serviceId === req.user.serviceId)
        || ex.creator === req.user.serviceId;
      if (!isMember) {
        return res.status(403).json({ error: 'Forbidden: You are not a member of this exercise.' });
      }
    }

    const snapshot = typeof ex.scenario_snapshot_json === 'string'
      ? JSON.parse(ex.scenario_snapshot_json)
      : ex.scenario_snapshot_json;

    // --- AUTHORITATIVE CLOCK: use query param if provided, otherwise DB elapsed_seconds ---
    const elapsed = req.query.elapsedSeconds ? parseInt(req.query.elapsedSeconds, 10) : (ex.elapsed_seconds || 0);
    // Role from query param or auth identity
    const userRole = req.query.role || effectiveRole;
    const sessionSeed = ex.session_code || ex.id || 'OP_FOG_DEFAULT';
    const activeDisruptions = wsManager ? wsManager.getActiveDisruptions(ex.session_code || ex.id) : [];

    // Evaluate all scenario events deterministically at the authoritative elapsed time
    const scenarioEvents = snapshot?.events || [];
    const evaluatedEvents = evaluateScenarioEvents(scenarioEvents, elapsed);

    // Lazily persist events that have reached a terminal state.
    // ON CONFLICT DO UPDATE ensures the status column is always current;
    // it never inserts a duplicate row.
    const persistPromises = evaluatedEvents.map((ev, i) => {
      if (ev.status === DELIVERY_STATUS.DELIVERED || ev.status === DELIVERY_STATUS.DROPPED || ev.status === DELIVERY_STATUS.DELAYED) {
        return persistEventState(ex.id, ev, i).catch(() => {}); // fire-and-forget; do not fail the response
      }
      return Promise.resolve();
    });
    await Promise.all(persistPromises);

    // Multi-domain information asymmetry delivered events:
    const authorizedMessages = evaluateParticipantDeliveredEvents(scenarioEvents, userRole, elapsed, sessionSeed, activeDisruptions);

    res.json({
      exerciseId: ex.id,
      elapsedSeconds: elapsed,
      isPaused: ex.status === 'Paused',
      isCompleted: ex.status === 'Completed' || ex.status === 'Reviewed',
      userRole,
      messages: authorizedMessages
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to evaluate simulation dispatches', details: err.message });
  }
});

// GET: Instructor audit log — full event schedule including PENDING, DELAYED, DROPPED.
// Uses DB elapsed_seconds as the authoritative clock.
// For active exercises: evaluates from scenario snapshot.
// For completed exercises: reads persisted communication_events rows.
app.get('/api/exercises/:id/instructor-log', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;

    const exRes = await queryDB(
      'SELECT * FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [id]
    );
    if (exRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }
    const ex = exRes.rows[0];

    const elapsed = req.query.elapsedSeconds ? parseInt(req.query.elapsedSeconds, 10) : (ex.elapsed_seconds || 0);
    const sessionSeed = ex.session_code || ex.id || 'OP_FOG_DEFAULT';
    const activeDisruptions = wsManager ? wsManager.getActiveDisruptions(ex.session_code || ex.id) : [];

    const isFinished = ex.status === 'Completed' || ex.status === 'Reviewed';

    let events;

    if (isFinished) {
      // For completed exercises, read the persisted communication_events table.
      // This is the permanent authoritative record for the AAR.
      const evRes = await queryDB(
        'SELECT * FROM communication_events WHERE exercise_id = $1 ORDER BY scheduled_time_sec ASC',
        [ex.id]
      );
      events = evRes.rows.map(r => ({
        ...mapEventRow(r),
        scheduledTimeFormatted: formatSecondsToMMSS(r.scheduled_time_sec),
        actualDeliveryTimeFormatted: formatSecondsToMMSS(r.actual_delivery_time_sec)
      }));
    } else {
      // For active/paused exercises: evaluate from snapshot at current DB elapsed time.
      const snapshot = typeof ex.scenario_snapshot_json === 'string'
        ? JSON.parse(ex.scenario_snapshot_json)
        : ex.scenario_snapshot_json;
      const scenarioEvents = snapshot?.events || [];
      const raw = evaluateScenarioEvents(scenarioEvents, elapsed);
      events = raw.map(ev => ({
        ...ev,
        scheduledTimeFormatted: formatSecondsToMMSS(ev.scheduledTimeSec || 0),
        actualDeliveryTimeFormatted: formatSecondsToMMSS(ev.actualDeliveryTimeSec || 0)
      }));
    }

    const snapshot = typeof ex.scenario_snapshot_json === 'string'
      ? JSON.parse(ex.scenario_snapshot_json)
      : ex.scenario_snapshot_json;
    const asymmetryMatrix = generateAsymmetryMatrix(snapshot?.events || [], elapsed, sessionSeed, activeDisruptions);

    res.json({
      exerciseId: ex.id,
      elapsedSeconds: elapsed,
      status: ex.status,
      totalEvents: events.length,
      deliveredCount: events.filter(e => e.status === DELIVERY_STATUS.DELIVERED).length,
      delayedCount: events.filter(e => e.status === DELIVERY_STATUS.DELAYED).length,
      droppedCount: events.filter(e => e.status === DELIVERY_STATUS.DROPPED).length,
      pendingCount: events.filter(e => e.status === DELIVERY_STATUS.PENDING).length,
      events,
      asymmetryMatrix
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch instructor audit log', details: err.message });
  }
});



// -------------------------------------------------------------
// 5. COMMAND DECISIONS LOGGING
// -------------------------------------------------------------

// Helper: map a participant_decisions DB row to the camelCase shape used by the frontend
function mapDecisionRow(r) {
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    sessionId: r.exercise_id,
    title: r.title,
    rationale: r.rationale,
    confidence: r.confidence,
    elapsedMinutes: r.elapsed_minutes,
    elapsedSeconds: r.elapsed_seconds || 0,
    elapsedTimeFormatted: r.elapsed_time_formatted,
    submittedBy: r.submitted_by,
    submittedRole: r.submitted_role,
    timestamp: r.timestamp
  };
}

// GET decisions — returns decisions for an exercise.
// Instructors see all participant decisions.
// Participants see only their own decisions (submitted_by = their serviceId) — backend enforced.
app.get(['/api/exercises/:id/decisions', '/api/decisions'], async (req, res) => {
  try {
    const callerRole = req.user?.dbRole || req.user?.role || 'participant';
    const callerServiceId = req.user?.serviceId;

    if (!callerServiceId) {
      return res.status(401).json({ error: 'Unauthorized: Service identity required.' });
    }

    let exerciseId = req.params.id || req.query.sessionId;

    // Resolve session_code to an actual exercise ID if needed
    if (exerciseId) {
      const idRes = await queryDB(
        'SELECT id, creator, participants_json FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
        [exerciseId]
      );
      if (idRes.rows.length > 0) {
        const exRow = idRes.rows[0];
        exerciseId = exRow.id;

        // Exercise membership check for non-instructors
        if (callerRole !== 'instructor') {
          const participants = typeof exRow.participants_json === 'string'
            ? JSON.parse(exRow.participants_json)
            : (exRow.participants_json || []);
          const isMember = participants.some(p => p.serviceId === callerServiceId) || exRow.creator === callerServiceId;
          if (!isMember) {
            return res.status(403).json({ error: 'Forbidden: You are not a member of this exercise session.' });
          }
        }
      }
    }

    let query = 'SELECT * FROM participant_decisions';
    const params = [];
    const conditions = [];

    if (exerciseId) {
      conditions.push(`exercise_id = $${params.length + 1}`);
      params.push(exerciseId);
    }

    if (callerRole === 'instructor') {
      // Instructors may optionally filter by ?submittedBy= to view a specific participant's decisions
      const filterBy = req.query.submittedBy || null;
      if (filterBy) {
        conditions.push(`submitted_by = $${params.length + 1}`);
        params.push(filterBy);
      }
    } else {
      // Participants always see only their own decisions — query param override is ignored
      conditions.push(`submitted_by = $${params.length + 1}`);
      params.push(callerServiceId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY timestamp ASC';

    const result = await queryDB(query, params);
    res.json(result.rows.map(mapDecisionRow));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch decision logs', details: err.message });
  }
});


app.post(['/api/exercises/:id/decisions', '/api/decisions'], async (req, res) => {
  try {
    const d = req.body;
    let exerciseId = req.params.id || d.sessionId || d.exerciseId;
    if (!exerciseId || !d.title || !d.rationale) {
      return res.status(400).json({ error: 'Exercise ID, decision title, and rationale are required.' });
    }

    const callerServiceId = req.user?.serviceId;
    if (!callerServiceId) {
      return res.status(401).json({ error: 'Unauthorized: Service identity required.' });
    }

    // Resolve session_code to actual exercise ID
    const exCheck = await queryDB(
      'SELECT id, status, creator, participants_json FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [exerciseId]
    );
    if (exCheck.rows.length === 0) {
      return res.status(404).json({ error: `Exercise "${exerciseId}" not found.` });
    }
    const exRow = exCheck.rows[0];
    const exStatus = exRow.status;
    exerciseId = exRow.id; // use canonical DB id

    // Authoritative Exercise membership check for non-instructors
    const effectiveRole = req.user?.dbRole || req.user?.role || 'participant';
    if (effectiveRole !== 'instructor') {
      const participants = typeof exRow.participants_json === 'string'
        ? JSON.parse(exRow.participants_json)
        : (exRow.participants_json || []);
      const isMember = participants.some(p => p.serviceId === callerServiceId) || exRow.creator === callerServiceId;
      if (!isMember) {
        return res.status(403).json({ error: 'Forbidden: You are not a member of this exercise session.' });
      }
    }

    // Guard: reject submissions for completed/reviewed exercises
    if (exStatus === 'Completed' || exStatus === 'Reviewed') {
      return res.status(400).json({ error: 'Cannot submit decisions for a completed exercise session.' });
    }

    // Stable decision ID — supplied by the client for idempotency across retries.
    const id = d.id || `dec-${Date.now()}`;
    const timestamp = d.timestamp || new Date().toISOString();

    // submittedBy is always derived from the server-verified identity — never trusted from client body.
    // This prevents a participant from impersonating another by setting d.submittedBy.
    const submittedBy = callerServiceId;
    const submittedRole = req.user?.dbRole || req.user?.role || d.submittedRole || 'commander';

    // Store both elapsed_minutes (legacy display) and elapsed_seconds (precise timing)
    const rawElapsedSeconds = d.elapsedSeconds !== undefined ? parseInt(d.elapsedSeconds, 10) : 0;
    const elapsedMinutes = d.elapsedMinutes !== undefined ? parseInt(d.elapsedMinutes, 10) : Math.floor(rawElapsedSeconds / 60);
    const elapsedFormatted = d.elapsedTimeFormatted || `${String(Math.floor(rawElapsedSeconds / 60)).padStart(2,'0')}:${String(rawElapsedSeconds % 60).padStart(2,'0')}`;

<<<<<<< Updated upstream
=======
    // Build or accept Evidence Snapshot
    const snapshot = typeof exRow.scenario_snapshot_json === 'string'
      ? JSON.parse(exRow.scenario_snapshot_json)
      : (exRow.scenario_snapshot_json || {});
    const scenarioEvents = snapshot.events || [];

    // Verify role authorization against active decision point targetRoles
    let decisionPoint = null;
    if (d.decisionPointId) {
      decisionPoint = scenarioEvents.find(e => e.id === d.decisionPointId);
    }
    if (!decisionPoint && d.title) {
      decisionPoint = scenarioEvents.find(e => isDecisionEvent(e) && e.title === d.title);
    }
    if (!decisionPoint) {
      decisionPoint = scenarioEvents.find(e => isDecisionEvent(e));
    }

    const targetRoles = decisionPoint 
      ? getDecisionTargetRoles(decisionPoint)
      : (Array.isArray(d.targetRoles) ? d.targetRoles.map(normalizeRole) : (d.targetRole ? [normalizeRole(d.targetRole)] : []));

    if (targetRoles.length > 0 && !targetRoles.includes('all')) {
      const normSubmittedRole = normalizeRole(submittedRole);
      const isAllowed = normSubmittedRole === 'instructor' || targetRoles.includes(normSubmittedRole);
      if (!isAllowed) {
        return res.status(403).json({
          error: `Forbidden: Role "${normSubmittedRole}" is not authorized to submit this decision. Permitted role(s): ${targetRoles.join(', ')}.`,
          decisionPointId: decisionPoint?.id || d.decisionPointId || null,
          targetRoles,
          submittedRole: normSubmittedRole
        });
      }
    }

    const sessionSeed = exRow.session_code || exRow.id || 'OP_FOG_DEFAULT';
    const activeDisruptions = wsManager ? wsManager.getActiveDisruptions(exRow.session_code || exRow.id) : [];
    const teamMessages = typeof exRow.team_messages_json === 'string'
      ? JSON.parse(exRow.team_messages_json)
      : (exRow.team_messages_json || []);

    const sourcesUsed = Array.isArray(d.sourcesUsed) ? d.sourcesUsed : [];
    const evidenceSnapshot = (d.evidenceSnapshot && Object.keys(d.evidenceSnapshot).length > 0)
      ? d.evidenceSnapshot
      : createEvidenceSnapshot({
          scenarioEvents,
          decidingRole: submittedRole,
          decidingParticipantId: submittedBy,
          decisionText: d.title.trim(),
          confidence: d.confidence || 'Medium',
          rationale: d.rationale.trim(),
          sourcesUsed,
          elapsedSeconds: rawElapsedSeconds,
          sessionSeed,
          activeDisruptions,
          teamMessages,
          decisionTriggerTimeSec: d.decisionTriggerTimeSec || rawElapsedSeconds
        });

>>>>>>> Stashed changes
    // ON CONFLICT (id) DO NOTHING: duplicate submission (double-click, retry) is silently accepted
    const result = await queryDB(
      `INSERT INTO participant_decisions
         (id, exercise_id, title, rationale, confidence, elapsed_minutes, elapsed_seconds, elapsed_time_formatted, submitted_by, submitted_role, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        id,
        exerciseId,
        d.title.trim(),
        d.rationale.trim(),
        d.confidence || 'Medium',
        elapsedMinutes,
        rawElapsedSeconds,
        elapsedFormatted,
        submittedBy,
        submittedRole,
        timestamp
      ]
    );

    if (result.rows.length === 0) {
      // DO NOTHING fired — fetch and return the existing record (idempotent response)
      const existing = await queryDB('SELECT * FROM participant_decisions WHERE id = $1', [id]);
      const row = existing.rows[0];
      if (row) return res.status(200).json(mapDecisionRow(row));
      return res.status(200).json({ id, exerciseId, duplicate: true });
    }

    res.status(201).json(mapDecisionRow(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to log decision', details: err.message });
  }
});

// Team Coordination Chat Messages
app.get(['/api/exercises/:id/team-messages', '/api/exercises/code/:id/team-messages'], async (req, res) => {
  try {
    const codeOrId = (req.params.id || '').trim();
    const result = await queryDB('SELECT team_messages_json FROM exercises WHERE UPPER(session_code) = UPPER($1) OR id = $1', [codeOrId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise session not found' });
    }
    const msgs = typeof result.rows[0].team_messages_json === 'string' 
      ? JSON.parse(result.rows[0].team_messages_json) 
      : (result.rows[0].team_messages_json || []);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team messages', details: err.message });
  }
});

app.post(['/api/exercises/:id/team-messages', '/api/exercises/code/:id/team-messages'], async (req, res) => {
  try {
    const codeOrId = (req.params.id || '').trim();
    const { text, senderId, senderName, senderRole } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const exResult = await queryDB('SELECT id, team_messages_json FROM exercises WHERE UPPER(session_code) = UPPER($1) OR id = $1', [codeOrId]);
    if (exResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise session not found' });
    }

    const currentMsgs = typeof exResult.rows[0].team_messages_json === 'string'
      ? JSON.parse(exResult.rows[0].team_messages_json)
      : (exResult.rows[0].team_messages_json || []);

    const newMsg = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderId: senderId || req.user?.serviceId || 'User',
      senderName: senderName || req.user?.serviceId || 'User',
      senderRole: senderRole || req.user?.role || 'team_leader',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMsgs = [...currentMsgs, newMsg];
    await queryDB('UPDATE exercises SET team_messages_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(updatedMsgs), exResult.rows[0].id]);

    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send team message', details: err.message });
  }
});

// -------------------------------------------------------------
// LIVE INSTRUCTOR DISRUPTION INJECTION & CONTROL
// -------------------------------------------------------------
app.get(['/api/exercises/:id/disruptions', '/api/exercises/code/:id/disruptions'], async (req, res) => {
  try {
    const codeOrId = (req.params.id || '').trim();
    const active = wsManager.getActiveDisruptions(codeOrId);
    const log = wsManager.getDisruptionsLog(codeOrId);
    res.json({ activeDisruptions: active, disruptionsLog: log });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch disruptions', details: err.message });
  }
});

app.post(['/api/exercises/:id/disruptions', '/api/exercises/code/:id/disruptions'], async (req, res) => {
  try {
    const codeOrId = (req.params.id || '').trim();
    const { target, disruptionType, severity, duration } = req.body;
    const result = wsManager.injectDisruption(codeOrId, {
      target,
      disruptionType,
      severity,
      duration,
      injectedBy: req.user?.serviceId || 'instructor'
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to inject disruption', details: err.message });
  }
});

app.post(['/api/exercises/:id/disruptions/clear', '/api/exercises/code/:id/disruptions/clear'], async (req, res) => {
  try {
    const codeOrId = (req.params.id || '').trim();
    const { target } = req.body;
    const result = wsManager.clearDisruption(codeOrId, target || 'all');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear disruption', details: err.message });
  }
});


// -------------------------------------------------------------
// 6. AFTER-ACTION REVIEW (AAR) AUDIT REPORTS
// -------------------------------------------------------------

// Helper: map an aars DB row → frontend camelCase shape
function mapAARRow(r) {
  return {
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
    instructorNotes: r.instructor_notes || '',
    decisions: typeof r.decisions_json === 'string' ? JSON.parse(r.decisions_json) : (r.decisions_json || []),
    events: typeof r.events_json === 'string' ? JSON.parse(r.events_json) : (r.events_json || []),
    participants: typeof r.participants_json === 'string' ? JSON.parse(r.participants_json) : (r.participants_json || []),
    scenarioSnapshot: typeof r.scenario_snapshot_json === 'string' ? JSON.parse(r.scenario_snapshot_json) : (r.scenario_snapshot_json || {}),
    isSample: r.is_sample,
    createdAt: r.created_at
  };
}

// GET /api/aars — index of AAR records (scoped by membership for participants)
app.get('/api/aars', async (req, res) => {
  try {
    const effectiveRole = req.user?.dbRole || req.user?.role || 'participant';
    const sid = req.user?.serviceId;

    if (!sid) {
      return res.status(401).json({ error: 'Unauthorized: Service identity required.' });
    }

    let result;
    if (effectiveRole === 'instructor') {
      result = await queryDB('SELECT * FROM aars ORDER BY created_at DESC');
    } else {
      result = await queryDB(
        `SELECT * FROM aars
         WHERE creator = $1
            OR participants_json::text ILIKE $2
         ORDER BY created_at DESC`,
        [sid, `%${sid}%`]
      );
    }
    res.json(result.rows.map(mapAARRow));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AAR records', details: err.message });
  }
});

// GET /api/aars/exercise/:exerciseId — generate a live, authoritative AAR from PostgreSQL.
// Fetches data from: exercises, participant_decisions, communication_events.
// Upserts the result into the aars table (one AAR per exercise — idempotent).
app.get('/api/aars/exercise/:exerciseId', async (req, res) => {
  try {
    const { exerciseId } = req.params;

    // Resolve by ID or session_code
    const exRes = await queryDB(
      'SELECT * FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [exerciseId]
    );
    if (exRes.rows.length === 0) {
      return res.status(404).json({ error: `Exercise "${exerciseId}" not found.` });
    }
    const ex = exRes.rows[0];

    // Exercise membership authorization check for participants
    const effectiveRole = req.user?.dbRole || req.user?.role || 'participant';
    if (effectiveRole !== 'instructor') {
      const sid = req.user?.serviceId;
      if (!sid) {
        return res.status(401).json({ error: 'Unauthorized: Service identity required.' });
      }
      const participants = typeof ex.participants_json === 'string'
        ? JSON.parse(ex.participants_json)
        : (ex.participants_json || []);
      const isMember = participants.some(p => p.serviceId === sid) || ex.creator === sid;
      if (!isMember) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view the AAR for this exercise.' });
      }
    }

    // 1. Live decisions from participant_decisions table
    const decRes = await queryDB(
      'SELECT * FROM participant_decisions WHERE exercise_id = $1 ORDER BY timestamp ASC',
      [ex.id]
    );
    const decisions = decRes.rows.map(mapDecisionRow);

    // 2. Live communication events from communication_events table
    const evRes = await queryDB(
      'SELECT * FROM communication_events WHERE exercise_id = $1 ORDER BY scheduled_time_sec ASC',
      [ex.id]
    );
    const events = evRes.rows.map(r => ({
      ...mapEventRow(r),
      scheduledTimeFormatted: formatSecondsToMMSS(r.scheduled_time_sec),
      actualDeliveryTimeFormatted: formatSecondsToMMSS(r.actual_delivery_time_sec)
    }));

    // 3. Scenario snapshot, participants from exercise record
    const snapshot = typeof ex.scenario_snapshot_json === 'string'
      ? JSON.parse(ex.scenario_snapshot_json)
      : (ex.scenario_snapshot_json || {});
    const participants = typeof ex.participants_json === 'string'
      ? JSON.parse(ex.participants_json)
      : (ex.participants_json || []);

    // 4. Authoritative timing — use persisted exercise timestamps + elapsed_seconds
    const startTime = ex.created_at;
    const endTime = ex.completed_at || new Date().toISOString();
    const elapsedSec = ex.elapsed_seconds || 0;
    const durationMinutes = Math.max(1, Math.round(elapsedSec / 60));

    // 5. Degradation analysis derived from persisted records — no hardcoding
    const commStats = {
      total: events.length,
      delivered: events.filter(e => e.status === 'DELIVERED').length,
      delayed: events.filter(e => e.deliveryBehavior === 'delayed').length,
      dropped: events.filter(e => e.status === 'DROPPED').length,
      incomplete: events.filter(e => e.deliveryBehavior === 'incomplete').length,
      conflicting: events.filter(e => e.deliveryBehavior === 'conflicting').length,
      pending: events.filter(e => e.status === 'PENDING').length
    };

    // Upsert into aars table — one AAR per exercise, idempotent
    const existingAAR = await queryDB(
      'SELECT id, instructor_notes FROM aars WHERE exercise_id = $1 OR id = $2',
      [ex.id, `aar-${ex.id}`]
    );

    let aarId;
    let preservedNotes = '';

    if (existingAAR.rows.length > 0) {
      aarId = existingAAR.rows[0].id;
      preservedNotes = existingAAR.rows[0].instructor_notes || '';
      // Update — preserve instructor notes, refresh everything else from live records
      await queryDB(
        `UPDATE aars SET
           session_code = $1, session_name = $2, scenario_title = $3,
           end_time = $4, duration_minutes = $5, decisions_count = $6,
           decisions_json = $7, events_json = $8, participants_json = $9,
           scenario_snapshot_json = $10
         WHERE id = $11`,
        [
          ex.session_code, ex.name, ex.scenario_title,
          endTime, durationMinutes, decisions.length,
          JSON.stringify(decisions), JSON.stringify(events),
          JSON.stringify(participants), JSON.stringify(snapshot),
          aarId
        ]
      );
    } else {
      aarId = `aar-${ex.id}`;
      await queryDB(
        `INSERT INTO aars
           (id, exercise_id, session_id, session_code, session_name, scenario_title, creator,
            start_time, end_time, duration_minutes, decisions_count, instructor_notes,
            decisions_json, events_json, participants_json, scenario_snapshot_json, is_sample)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [
          aarId, ex.id, ex.id, ex.session_code, ex.name, ex.scenario_title, ex.creator,
          startTime, endTime, durationMinutes, decisions.length, '',
          JSON.stringify(decisions), JSON.stringify(events),
          JSON.stringify(participants), JSON.stringify(snapshot),
          ex.is_sample || false
        ]
      );
    }

    res.json({
      id: aarId,
      exerciseId: ex.id,
      sessionId: ex.id,
      sessionCode: ex.session_code,
      sessionName: ex.name,
      scenarioTitle: ex.scenario_title,
      creator: ex.creator,
      startTime,
      endTime,
      durationMinutes,
      decisionsCount: decisions.length,
      instructorNotes: preservedNotes,
      decisions,
      events,
      participants,
      scenarioSnapshot: snapshot,
      commStats,
      isSample: ex.is_sample || false
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate AAR', details: err.message });
  }
});

// GET /api/aars/:id — single AAR with live-enriched decisions and events
app.get('/api/aars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const aarRes = await queryDB('SELECT * FROM aars WHERE id = $1', [id]);
    if (aarRes.rows.length === 0) {
      return res.status(404).json({ error: 'AAR not found.' });
    }
    const base = mapAARRow(aarRes.rows[0]);

    // Exercise membership authorization check for non-instructors
    const effectiveRole = req.user?.dbRole || req.user?.role || 'participant';
    if (effectiveRole !== 'instructor') {
      const sid = req.user?.serviceId;
      if (!sid) {
        return res.status(401).json({ error: 'Unauthorized: Service identity required.' });
      }
      const participants = typeof base.participants === 'string'
        ? JSON.parse(base.participants)
        : (base.participants || []);
      const isMember = participants.some(p => p.serviceId === sid) || base.creator === sid;
      if (!isMember) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to view this AAR.' });
      }
    }

    // Enrich with live records if an exercise_id is linked
    if (base.exerciseId) {
      const [decRes, evRes] = await Promise.all([
        queryDB('SELECT * FROM participant_decisions WHERE exercise_id = $1 ORDER BY timestamp ASC', [base.exerciseId]),
        queryDB('SELECT * FROM communication_events WHERE exercise_id = $1 ORDER BY scheduled_time_sec ASC', [base.exerciseId])
      ]);
      if (decRes.rows.length > 0) base.decisions = decRes.rows.map(mapDecisionRow);
      if (evRes.rows.length > 0) base.events = evRes.rows.map(r => ({
        ...mapEventRow(r),
        scheduledTimeFormatted: formatSecondsToMMSS(r.scheduled_time_sec),
        actualDeliveryTimeFormatted: formatSecondsToMMSS(r.actual_delivery_time_sec)
      }));
    }

    res.json(base);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch AAR', details: err.message });
  }
});

// POST /api/aars — create/update AAR from payload (used by storageService.saveAAR).
// ON CONFLICT (id) DO UPDATE prevents duplicate AARs on double-click or reconnect.
app.post('/api/aars', async (req, res) => {
  try {
    const a = req.body;
    const exerciseId = a.exerciseId || a.sessionId || null;
    const id = a.id || (exerciseId ? `aar-${exerciseId}` : `aar-${Date.now()}`);

    const result = await queryDB(
      `INSERT INTO aars
         (id, exercise_id, session_id, session_code, session_name, scenario_title, creator,
          start_time, end_time, duration_minutes, decisions_count, instructor_notes,
          decisions_json, events_json, participants_json, scenario_snapshot_json, is_sample)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (id) DO UPDATE SET
         end_time = EXCLUDED.end_time,
         duration_minutes = EXCLUDED.duration_minutes,
         decisions_count = EXCLUDED.decisions_count,
         decisions_json = EXCLUDED.decisions_json,
         events_json = EXCLUDED.events_json,
         participants_json = EXCLUDED.participants_json
       RETURNING *`,
      [
        id,
        exerciseId,
        a.sessionId || exerciseId,
        a.sessionCode || null,
        a.sessionName || 'Unnamed Exercise',
        a.scenarioTitle || 'Unknown Scenario',
        a.creator || req.user?.serviceId || 'SYSTEM',
        a.startTime || new Date().toISOString(),
        a.endTime || new Date().toISOString(),
        a.durationMinutes || 0,
        a.decisionsCount || (a.decisions || []).length,
        a.instructorNotes || '',
        JSON.stringify(a.decisions || []),
        JSON.stringify(a.events || []),
        JSON.stringify(a.participants || []),
        JSON.stringify(a.scenarioSnapshot || {}),
        a.isSample || false
      ]
    );

    res.status(201).json(mapAARRow(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create AAR audit record', details: err.message });
  }
});

// PATCH /api/aars/:id/note — instructor saves debrief notes
app.patch('/api/aars/:id/note', requireRole(['instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { noteText } = req.body;
    const result = await queryDB(
      'UPDATE aars SET instructor_notes = $1 WHERE id = $2 RETURNING *',
      [noteText || '', id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'AAR record not found.' });
    }
    res.json(mapAARRow(result.rows[0]));
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

  server.listen(PORT, () => {
    console.log(`Operational Fog Backend API running on port ${PORT}`);
    console.log(`Health Check Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`WebSocket Endpoint: ws://localhost:${PORT}/ws`);
  });
}

startServer();
