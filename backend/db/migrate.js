import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'op_fog_db',
  user: process.env.DB_USER || 'op_fog_user',
  password: process.env.DB_PASSWORD || 'op_fog_password',
  connectionTimeoutMillis: 5000
});

// Default Seed Users
const DEFAULT_USERS = [
  { id: 'user-inst-1', serviceId: 'OPS-8842-IND', displayName: 'Instructor Control Director', role: 'instructor' },
  { id: 'user-cmd-1', serviceId: 'OPS-CMD-101', displayName: 'Commander Alpha', role: 'commander' },
  { id: 'user-obs-1', serviceId: 'OPS-OBS-202', displayName: 'Forward Observer Bravo', role: 'field_unit' }
];

// Default Scenarios including SIH Demonstration Scenario
const DEFAULT_SCENARIOS = [
  {
    id: 'scen-sih-2026',
    code: 'SCEN-SIH-2026',
    title: 'SIH Demo Scenario — Joint Tactical Node Resilience',
    category: 'Joint Operations',
    shortDesc: 'Official Smart India Hackathon demonstration scenario featuring normal dispatches, 300s signal latency, dropped dispatches, and conflicting intel feeds.',
    objective: 'Evaluate tactical decision discipline when primary telemetry links experience RF attenuation and contradictory reconnaissance dispatches.',
    duration: '45 mins (SIH Demo Template)',
    difficulty: 'High Friction',
    status: 'Ready',
    version: 1,
    creator: 'OPS-8842-IND',
    events: [
      { id: 'sih-ev-1', time: '00:00', title: 'Initial Tactical Dispatch', type: 'info', deliveryBehavior: 'normal', delaySeconds: 0, intendedRecipient: 'all', content: 'Joint Command orders forward unit alignment along Sector Bravo. Telemetry channels operational.', instructorNotes: 'Baseline event delivered at exercise start.' },
      { id: 'sih-ev-2', time: '05:00', title: 'Signal Attenuation Warning', type: 'warning', deliveryBehavior: 'delayed', delaySeconds: 300, intendedRecipient: 'all', content: 'RF jamming detected. Secondary satellite link experiencing 300-second latency.', instructorNotes: 'Tests participant caution when dealing with delayed dispatches.' },
      { id: 'sih-ev-3', time: '12:00', title: 'RF Blackout (Dropped Dispatch)', type: 'alert', deliveryBehavior: 'dropped', delaySeconds: 0, intendedRecipient: 'all', content: 'Patrol Bravo emergency beacon update. Link dropped due to terrain masking.', instructorNotes: 'Message is dropped from participant view but recorded in instructor audit log.' },
      { id: 'sih-ev-4', time: '18:00', title: 'Forward Recon Update A', type: 'info', deliveryBehavior: 'normal', delaySeconds: 0, intendedRecipient: 'commander', content: 'Reconnaissance Patrol Alpha reports Sector Bravo route clear of obstructions.', instructorNotes: 'First intel report (delivered to Commander).' },
      { id: 'sih-ev-5', time: '25:00', title: 'Satellite Imagery Feed B (Conflicting)', type: 'warning', deliveryBehavior: 'conflicting', delaySeconds: 0, intendedRecipient: 'all', content: 'Thermal imagery feed Bravo indicates heavy route obstruction at Sector Bravo grid 44-B.', instructorNotes: 'Contradicts Patrol Alpha report. Forces participant to record verification rationale.' },
      { id: 'sih-ev-6', time: '30:00', title: 'Intercepted Signals Intel C (Conflicting Report 2)', type: 'warning', deliveryBehavior: 'conflicting', delaySeconds: 0, intendedRecipient: 'all', content: 'Electronic warfare intercept indicates enemy decoy emitter active at Sector Bravo grid 44-B.', instructorNotes: 'Second conflicting report providing alternate explanation for thermal imagery.' },
      { id: 'sih-ev-7', time: '35:00', title: 'Truncated Supply Order D (Incomplete Report)', type: 'warning', deliveryBehavior: 'incomplete', delaySeconds: 0, intendedRecipient: 'all', content: 'Resupply dispatch received: "Hold position at grid [DATA CORRUPTED] until secondary convoy arrives at..."', instructorNotes: 'Incomplete information dispatch requiring contingent decision rationale.' }
    ]
  },
  {
    id: 'scen-01',
    code: 'SCEN-101',
    title: 'Scenario A — Communication Delay',
    category: 'Latency & Signal',
    shortDesc: 'Messages arrive later than expected, requiring participants to manage out-of-order dispatches and incomplete information.',
    objective: 'Practice command discipline, prioritize essential dispatches, and maintain situational awareness during 5 to 15-minute signal blackouts.',
    duration: '45 mins',
    difficulty: 'Intermediate',
    status: 'Ready',
    version: 1,
    creator: 'OPS-8842-IND',
    events: [
      { id: 'ev-1', time: '00:00', title: 'Initial Dispatch Received', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Base command orders unit realignment along Sector Bravo. Telemetry link operational.' },
      { id: 'ev-2', time: '05:00', title: 'Signal Attenuation Warning', type: 'warning', deliveryBehavior: 'delayed', delaySeconds: 300, intendedRecipient: 'all', content: 'RF interference detected. Telemetry packet delay increased by 300 seconds.' },
      { id: 'ev-3', time: '12:00', title: 'Delayed Field Update', type: 'delay', deliveryBehavior: 'delayed', delaySeconds: 600, intendedRecipient: 'all', content: 'Reconnaissance dispatch received with 10-minute timestamp lag. Position unconfirmed.' },
      { id: 'ev-4', time: '25:00', title: 'Secondary Link Restoration', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Satellite relay restored. Verify pending orders before execution.' }
    ]
  }
];

const DEFAULT_EXERCISES = [
  {
    id: 'sess-sih-101',
    sessionCode: 'FOG-SIH1',
    name: 'SIH Joint Tactical Node Exercise',
    scenarioId: 'scen-sih-2026',
    scenarioTitle: 'SIH Demo Scenario — Joint Tactical Node Resilience',
    scenarioSnapshot: DEFAULT_SCENARIOS[0],
    status: 'Completed',
    participantCount: 2,
    maxParticipants: 6,
    instructorId: 'user-inst-1',
    creator: 'OPS-8842-IND',
    createdAt: '2026-10-03T18:00:00Z',
    completedAt: '2026-10-03T18:45:00Z',
    isSample: true,
    participants: [
      { displayName: 'Commander Alpha', role: 'commander', status: 'Online' },
      { displayName: 'Forward Observer Bravo', role: 'field_unit', status: 'Online' }
    ]
  }
];

const DEFAULT_AARS = [
  {
    id: 'aar-sih-101',
    exerciseId: 'sess-sih-101',
    sessionId: 'sess-sih-101',
    sessionCode: 'FOG-SIH1',
    sessionName: 'SIH Joint Tactical Node Exercise',
    scenarioTitle: 'SIH Demo Scenario — Joint Tactical Node Resilience',
    creator: 'OPS-8842-IND',
    startTime: '2026-10-03T18:00:00Z',
    endTime: '2026-10-03T18:45:00Z',
    durationMinutes: 45,
    decisionsCount: 2,
    instructorNotes: 'Participants handled the 300s delayed warning with proper caution. Successfully identified contradiction between Recon Patrol Alpha and Thermal Imagery Feed Bravo.',
    decisions: [
      { id: 'dec-sih-1', title: 'Verify Signal Attenuation & Request Secondary VHF Link', rationale: 'Telemetry experienced 300-second latency. Verified timestamp with Signals officer before changing unit formation.', timestamp: '2026-10-03T18:12:00Z', elapsedMinutes: 12, elapsedTimeFormatted: '12:00', confidence: 'High', submittedBy: 'Commander Alpha', submittedRole: 'commander' },
      { id: 'dec-sih-2', title: 'Hold Position at Sector Bravo Grid 44-B', rationale: 'Received conflicting Thermal Imagery Feed Bravo indicating route obstruction. Ordered hold until ground recon cross-verifies.', timestamp: '2026-10-03T18:28:00Z', elapsedMinutes: 28, elapsedTimeFormatted: '28:00', confidence: 'Medium', submittedBy: 'Commander Alpha', submittedRole: 'commander' }
    ],
    events: DEFAULT_SCENARIOS[0].events,
    participants: DEFAULT_EXERCISES[0].participants,
    scenarioSnapshot: DEFAULT_SCENARIOS[0],
    isSample: true
  }
];

export async function migrate() {
  console.log('Connecting to PostgreSQL database for migration...');
  const client = await pool.connect();
  try {
    const sqlPath = path.join(process.cwd(), 'db', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing DDL schema creation & index updates...');
    await client.query(sql);
    console.log('Schema tables & views verified.');

    // Idempotent column migrations for databases created before schema update
    await client.query(`
      ALTER TABLE exercises ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER NOT NULL DEFAULT 0;
    `).catch(err => console.log('Note: elapsed_seconds column already present or migration not needed:', err.message));

    console.log('Column migrations applied.');

    // Seed Users
    for (const u of DEFAULT_USERS) {
      await client.query(
        `INSERT INTO users (id, service_id, display_name, role, status)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.serviceId, u.displayName, u.role, 'active']
      );
    }

    // Seed Scenarios if empty
    const scenRes = await client.query('SELECT COUNT(*) FROM scenarios');
    if (parseInt(scenRes.rows[0].count, 10) === 0) {
      console.log('Seeding initial default scenarios...');
      for (const s of DEFAULT_SCENARIOS) {
        await client.query(
          `INSERT INTO scenarios (id, code, title, category, short_desc, objective, duration, difficulty, status, version, creator, events_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.code, s.title, s.category, s.shortDesc, s.objective, s.duration, s.difficulty, s.status, s.version, s.creator, JSON.stringify(s.events)]
        );
      }
    }

    // Seed Exercises if empty
    const exRes = await client.query('SELECT COUNT(*) FROM exercises');
    if (parseInt(exRes.rows[0].count, 10) === 0) {
      console.log('Seeding initial exercise session...');
      for (const e of DEFAULT_EXERCISES) {
        await client.query(
          `INSERT INTO exercises (id, session_code, name, scenario_id, scenario_title, scenario_snapshot_json, status, participant_count, max_participants, instructor_id, creator, participants_json, is_sample, created_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (id) DO NOTHING`,
          [e.id, e.sessionCode, e.name, e.scenarioId, e.scenarioTitle, JSON.stringify(e.scenarioSnapshot), e.status, e.participantCount, e.maxParticipants, e.instructorId, e.creator, JSON.stringify(e.participants), e.isSample, e.createdAt, e.completedAt]
        );
      }
    }

    // Seed AARs if empty
    const aarRes = await client.query('SELECT COUNT(*) FROM aars');
    if (parseInt(aarRes.rows[0].count, 10) === 0) {
      console.log('Seeding initial sample AAR records...');
      for (const a of DEFAULT_AARS) {
        await client.query(
          `INSERT INTO aars (id, exercise_id, session_id, session_code, session_name, scenario_title, creator, start_time, end_time, duration_minutes, decisions_count, instructor_notes, decisions_json, events_json, participants_json, scenario_snapshot_json, is_sample)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO NOTHING`,
          [a.id, a.exerciseId, a.sessionId, a.sessionCode, a.sessionName, a.scenarioTitle, a.creator, a.startTime, a.endTime, a.durationMinutes, a.decisionsCount, a.instructorNotes, JSON.stringify(a.decisions), JSON.stringify(a.events), JSON.stringify(a.participants), JSON.stringify(a.scenarioSnapshot), a.isSample]
        );
      }
    }

    console.log('Database migration & seeding completed successfully.');
  } catch (err) {
    console.error('Database migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
