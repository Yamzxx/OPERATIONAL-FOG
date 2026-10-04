import fs from 'fs';
import path from 'path';
import fileDir from 'url';
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

// Default Seed Data
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
    status: 'Ready (SIH Demo)',
    events: [
      { id: 'sih-ev-1', time: '00:00', title: 'Initial Tactical Dispatch', type: 'info', deliveryBehavior: 'normal', delaySeconds: 0, intendedRecipient: 'all', content: 'Joint Command orders forward unit alignment along Sector Bravo. Telemetry channels operational.' },
      { id: 'sih-ev-2', time: '05:00', title: 'Signal Attenuation Warning', type: 'warning', deliveryBehavior: 'delayed', delaySeconds: 300, intendedRecipient: 'all', content: 'RF jamming detected. Secondary satellite link experiencing 300-second latency.' },
      { id: 'sih-ev-3', time: '12:00', title: 'RF Blackout (Dropped Dispatch)', type: 'alert', deliveryBehavior: 'dropped', delaySeconds: 0, intendedRecipient: 'all', content: 'Patrol Bravo emergency beacon update. Link dropped due to terrain masking.' },
      { id: 'sih-ev-4', time: '18:00', title: 'Forward Recon Update A', type: 'info', deliveryBehavior: 'normal', delaySeconds: 0, intendedRecipient: 'commander', content: 'Reconnaissance Patrol Alpha reports Sector Bravo route clear of obstructions.' },
      { id: 'sih-ev-5', time: '25:00', title: 'Satellite Imagery Feed B (Conflicting)', type: 'warning', deliveryBehavior: 'conflicting', delaySeconds: 0, intendedRecipient: 'all', content: 'Thermal imagery feed Bravo indicates heavy route obstruction at Sector Bravo grid 44-B.' },
      { id: 'sih-ev-6', time: '30:00', title: 'Intercepted Signals Intel C (Conflicting Report 2)', type: 'warning', deliveryBehavior: 'conflicting', delaySeconds: 0, intendedRecipient: 'all', content: 'Electronic warfare intercept indicates enemy decoy emitter active at Sector Bravo grid 44-B.' },
      { id: 'sih-ev-7', time: '35:00', title: 'Truncated Supply Order D (Incomplete Report)', type: 'warning', deliveryBehavior: 'incomplete', delaySeconds: 0, intendedRecipient: 'all', content: 'Resupply dispatch received: "Hold position at grid [DATA CORRUPTED] until secondary convoy arrives at..."' }
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
    events: [
      { id: 'ev-1', time: '00:00', title: 'Initial Dispatch Received', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Base command orders unit realignment along Sector Bravo. Telemetry link operational.' },
      { id: 'ev-2', time: '05:00', title: 'Signal Attenuation Warning', type: 'warning', deliveryBehavior: 'delayed', delaySeconds: 300, intendedRecipient: 'all', content: 'RF interference detected. Telemetry packet delay increased by 300 seconds.' },
      { id: 'ev-3', time: '12:00', title: 'Delayed Field Update', type: 'delay', deliveryBehavior: 'delayed', delaySeconds: 600, intendedRecipient: 'all', content: 'Reconnaissance dispatch received with 10-minute timestamp lag. Position unconfirmed.' },
      { id: 'ev-4', time: '25:00', title: 'Secondary Link Restoration', type: 'info', deliveryBehavior: 'normal', intendedRecipient: 'all', content: 'Satellite relay restored. Verify pending orders before execution.' }
    ]
  }
];

const DEFAULT_SESSIONS = [
  {
    id: 'sess-sih-101',
    sessionCode: 'FOG-SIH1',
    name: 'SIH Joint Tactical Node Exercise',
    scenarioId: 'scen-sih-2026',
    scenarioTitle: 'SIH Demo Scenario — Joint Tactical Node Resilience',
    status: 'Completed',
    participantCount: 2,
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
      {
        id: 'dec-sih-1',
        title: 'Verify Signal Attenuation & Request Secondary VHF Link',
        rationale: 'Telemetry experienced 300-second latency. Verified timestamp with Signals officer before changing unit formation.',
        timestamp: '2026-10-03T18:12:00Z',
        elapsedMinutes: 12,
        elapsedTimeFormatted: '12:00',
        confidence: 'High',
        submittedBy: 'Commander Alpha',
        submittedRole: 'commander'
      },
      {
        id: 'dec-sih-2',
        title: 'Hold Position at Sector Bravo Grid 44-B',
        rationale: 'Received conflicting Thermal Imagery Feed Bravo indicating route obstruction. Ordered hold until ground recon cross-verifies.',
        timestamp: '2026-10-03T18:28:00Z',
        elapsedMinutes: 28,
        elapsedTimeFormatted: '28:00',
        confidence: 'Medium',
        submittedBy: 'Commander Alpha',
        submittedRole: 'commander'
      }
    ],
    events: DEFAULT_SCENARIOS[0].events,
    participants: [
      { displayName: 'Commander Alpha', role: 'commander', status: 'Online' },
      { displayName: 'Forward Observer Bravo', role: 'field_unit', status: 'Online' }
    ],
    isSample: true
  }
];

export async function migrate() {
  console.log('Connecting to PostgreSQL database for migration...');
  const client = await pool.connect();
  try {
    const sqlPath = path.join(process.cwd(), 'db', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing database schema creation...');
    await client.query(sql);
    console.log('Schema tables created/verified.');

    // Seed Scenarios if empty
    const scenRes = await client.query('SELECT COUNT(*) FROM scenarios');
    if (parseInt(scenRes.rows[0].count, 10) === 0) {
      console.log('Seeding initial default scenarios...');
      for (const s of DEFAULT_SCENARIOS) {
        await client.query(
          `INSERT INTO scenarios (id, code, title, category, short_desc, objective, duration, difficulty, status, events_json)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.code, s.title, s.category, s.shortDesc, s.objective, s.duration, s.difficulty, s.status, JSON.stringify(s.events)]
        );
      }
    }

    // Seed Sessions if empty
    const sessRes = await client.query('SELECT COUNT(*) FROM sessions');
    if (parseInt(sessRes.rows[0].count, 10) === 0) {
      console.log('Seeding initial sample exercise session...');
      for (const s of DEFAULT_SESSIONS) {
        await client.query(
          `INSERT INTO sessions (id, session_code, name, scenario_id, scenario_title, status, participant_count, creator, participants_json, is_sample, created_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.sessionCode, s.name, s.scenarioId, s.scenarioTitle, s.status, s.participantCount, s.creator, JSON.stringify(s.participants), s.isSample, s.createdAt, s.completedAt]
        );
      }
    }

    // Seed AARs if empty
    const aarRes = await client.query('SELECT COUNT(*) FROM aars');
    if (parseInt(aarRes.rows[0].count, 10) === 0) {
      console.log('Seeding initial sample AAR records...');
      for (const a of DEFAULT_AARS) {
        await client.query(
          `INSERT INTO aars (id, session_id, session_code, session_name, scenario_title, creator, start_time, end_time, duration_minutes, decisions_count, instructor_notes, decisions_json, events_json, participants_json, is_sample)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (id) DO NOTHING`,
          [a.id, a.sessionId, a.sessionCode, a.sessionName, a.scenarioTitle, a.creator, a.startTime, a.endTime, a.durationMinutes, a.decisionsCount, a.instructorNotes, JSON.stringify(a.decisions), JSON.stringify(a.events), JSON.stringify(a.participants), a.isSample]
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

// Run directly if called as a script
if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
