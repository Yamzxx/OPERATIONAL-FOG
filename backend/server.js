import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { migrate } from './db/migrate.js';
import { authenticateUser, requireRole } from './middleware/auth.js';
import { 
  validateStateTransition, 
  evaluateScenarioEvents, 
  filterParticipantMessages, 
  DELIVERY_STATUS,
  formatSecondsToMMSS
} from './services/simulationEngine.js';


const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 4000;

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

app.get(['/api/exercises', '/api/sessions'], async (req, res) => {
  try {
    const result = await queryDB('SELECT * FROM exercises ORDER BY created_at DESC');
    const list = result.rows.map(mapExerciseRow);
    res.json(list);
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

app.get(['/api/exercises/code/:code', '/api/sessions/code/:code', '/api/exercises/:id'], async (req, res) => {
  try {
    const codeOrId = (req.params.code || req.params.id || '').trim();
    const result = await queryDB(
      'SELECT * FROM exercises WHERE UPPER(session_code) = UPPER($1) OR id = $1',
      [codeOrId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Session with join code or ID "${codeOrId}" not found.` });
    }
    res.json(mapExerciseRow(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup exercise session', details: err.message });
  }
});

app.post(['/api/exercises', '/api/sessions'], async (req, res) => {
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

    const creatorId = s.creator || req.user?.serviceId || 'OPS-8842-IND';
    const initialParticipants = s.participants || [
      { id: `p-${Date.now()}`, serviceId: creatorId, displayName: `${creatorId} (Host)`, role: req.user?.role || 'instructor', status: 'Online', joinedAt: new Date().toISOString() }
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
app.patch('/api/exercises/:id/elapsed', async (req, res) => {
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
app.post('/api/exercises/:id/events/seed', async (req, res) => {
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
    // Accept role from header (auth middleware) or query param (cross-origin participant)
    const roleFromQuery = req.query.role;

    const exRes = await queryDB(
      'SELECT * FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [id]
    );
    if (exRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }
    const ex = exRes.rows[0];

    const snapshot = typeof ex.scenario_snapshot_json === 'string'
      ? JSON.parse(ex.scenario_snapshot_json)
      : ex.scenario_snapshot_json;

    // --- AUTHORITATIVE CLOCK: use the DB's elapsed_seconds, not a browser value ---
    const elapsed = ex.elapsed_seconds || 0;
    const userRole = roleFromQuery || req.user?.role || 'commander';

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

    // Server-side role filter — dropped messages are NEVER included for participants.
    const authorizedMessages = filterParticipantMessages(evaluatedEvents, userRole);

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
      const elapsed = ex.elapsed_seconds || 0;
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

    res.json({
      exerciseId: ex.id,
      elapsedSeconds: ex.elapsed_seconds || 0,
      status: ex.status,
      totalEvents: events.length,
      deliveredCount: events.filter(e => e.status === DELIVERY_STATUS.DELIVERED).length,
      delayedCount: events.filter(e => e.status === DELIVERY_STATUS.DELAYED).length,
      droppedCount: events.filter(e => e.status === DELIVERY_STATUS.DROPPED).length,
      pendingCount: events.filter(e => e.status === DELIVERY_STATUS.PENDING).length,
      events
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
// Optional ?submittedBy= filter lets a participant retrieve only their own decisions.
// Instructors omit the filter to see all participant decisions.
app.get(['/api/exercises/:id/decisions', '/api/decisions'], async (req, res) => {
  try {
    let exerciseId = req.params.id || req.query.sessionId;
    const filterBy = req.query.submittedBy || null; // optional per-participant filter

    // Resolve session_code to an actual exercise ID if needed
    if (exerciseId) {
      const idRes = await queryDB(
        'SELECT id FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
        [exerciseId]
      );
      if (idRes.rows.length > 0) {
        exerciseId = idRes.rows[0].id;
      }
    }

    let query = 'SELECT * FROM participant_decisions';
    const params = [];
    const conditions = [];

    if (exerciseId) {
      conditions.push(`exercise_id = $${params.length + 1}`);
      params.push(exerciseId);
    }
    if (filterBy) {
      conditions.push(`submitted_by = $${params.length + 1}`);
      params.push(filterBy);
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

    // Resolve session_code to actual exercise ID
    const exCheck = await queryDB(
      'SELECT id, status FROM exercises WHERE id = $1 OR UPPER(session_code) = UPPER($1)',
      [exerciseId]
    );
    if (exCheck.rows.length === 0) {
      return res.status(404).json({ error: `Exercise "${exerciseId}" not found.` });
    }
    const exStatus = exCheck.rows[0].status;
    exerciseId = exCheck.rows[0].id; // use canonical DB id

    // Guard: reject submissions for completed/reviewed exercises
    if (exStatus === 'Completed' || exStatus === 'Reviewed') {
      return res.status(400).json({ error: 'Cannot submit decisions for a completed exercise session.' });
    }

    // Stable decision ID — supplied by the client so idempotency works across retries
    const id = d.id || `dec-${Date.now()}`;
    const timestamp = d.timestamp || new Date().toISOString();
    const submittedBy = d.submittedBy || req.user?.serviceId || 'OPERATOR';
    const submittedRole = d.submittedRole || req.user?.role || 'commander';

    // Store both elapsed_minutes (legacy display) and elapsed_seconds (precise timing)
    const rawElapsedSeconds = d.elapsedSeconds !== undefined ? parseInt(d.elapsedSeconds, 10) : 0;
    const elapsedMinutes = d.elapsedMinutes !== undefined ? parseInt(d.elapsedMinutes, 10) : Math.floor(rawElapsedSeconds / 60);
    const elapsedFormatted = d.elapsedTimeFormatted || `${String(Math.floor(rawElapsedSeconds / 60)).padStart(2,'0')}:${String(rawElapsedSeconds % 60).padStart(2,'0')}`;

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
