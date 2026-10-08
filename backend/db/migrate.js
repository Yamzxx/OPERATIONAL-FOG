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
    title: 'Operation Border Shield — Ambush or False Alarm?',
    category: 'Joint Tactical Operation',
    shortDesc: 'Your squad must escort a medical convoy through mountain Sector Alpha. Enemy jammers are active, causing radio delays, scrambled radar, and lost messages.',
    objective: 'Make sound decisions despite communication friction: cross-check facts with your team in chat before ordering troops to move forward.',
    duration: '5 Mins (Fast-Forward Available)',
    difficulty: 'Multi-Domain Friction',
    status: 'Ready',
    version: 1,
    creator: 'OPS-8842-IND',
    events: [
      {
        id: 'sih-ev-1',
        time: '00:05',
        title: 'Forward Scout: Route Alpha Check',
        domain: 'LAND',
        type: 'info',
        confidence: '80%',
        content: 'Forward scout confirms Route Alpha is clear of enemy roadblocks. 80% confidence.',
        instructorNotes: 'Ground Truth: Route is clear. Land gets it immediately; Leader delayed 20s; Air gets blind spot warning; Cyber/EW dropped.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Forward scout reports Route Alpha is clear. Confidence 60% (Arrived with 20s delay).', confidence: '60%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Forward scout confirms Route Alpha is clear of enemy roadblocks. 80% confidence.', confidence: '80%' },
          air_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Forward scout reports Route Alpha clear [AIR RADAR BLIND SPOT - ROAD CROSSING UNVERIFIED]...', confidence: 'Partial' },
          cyber_ew_member: { deliveryBehavior: 'dropped', reason: 'Blocked by directional enemy radio jammer' }
        }
      },
      {
        id: 'sih-ev-2',
        time: '00:25',
        title: 'Drone Alert: Approaching Aircraft',
        domain: 'AIR',
        type: 'warning',
        confidence: '90%',
        content: 'Air radar detects 2 low-flying surveillance drones heading toward your squad at 140 knots.',
        instructorNotes: 'Ground Truth: Real physical drones. Air gets normal alert; Cyber/EW intercepts deceptive radio decoy; Land static.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 30, content: 'Air alert received with 30s lag: 2 unidentified aircraft heading toward team position.', confidence: '75%' },
          land_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Air alert: low-flying objects [RADIO STATIC - FREQUENCY CUT OFF]...', confidence: 'Partial' },
          air_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Air radar detects 2 low-flying surveillance drones heading toward your squad at 140 knots. 90% confidence.', confidence: '90%' },
          cyber_ew_member: { deliveryBehavior: 'conflicting', delaySeconds: 0, content: 'Signals intercept: Enemy using electronic decoys! These may be fake radar blips, not real drones. 60% confidence.', confidence: '60%' }
        }
      },
      {
        id: 'sih-ev-3',
        time: '00:50',
        title: 'Enemy Jammer Hits Main Radio',
        domain: 'CYBER',
        type: 'alert',
        confidence: '95%',
        content: 'Enemy radio jammer active! Main satellite radio link is knocked out. Squad must use backup Team Chat.',
        instructorNotes: 'Ground Truth: Radio jammed. Cyber/EW knows immediately; Land & Air dropped; Leader delayed 25s.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 25, content: 'Satellite radio link degraded. High communication lag expected across team channels.', confidence: '70%' },
          land_member: { deliveryBehavior: 'dropped', reason: 'Satellite uplink dropped before message delivery' },
          air_member: { deliveryBehavior: 'dropped', reason: 'Satellite uplink dropped before message delivery' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'CRITICAL ALERT: Enemy jammer has knocked out main satellite radio! Use Team Chat to coordinate.', confidence: '95%' }
        }
      },
      {
        id: 'sih-ev-4',
        time: '01:15',
        title: 'Supply Convoy Bravo Status',
        domain: 'EW',
        type: 'warning',
        confidence: '85%',
        content: 'Medical Convoy Bravo has temporarily stopped at Mile 44 due to a fallen tree blocking the road.',
        instructorNotes: 'Ground Truth: Convoy stopped by fallen tree. Land normal; Air camera sees conflicting movement; Leader missing location.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Convoy Bravo [LOCATION CUT OFF] requesting escort assistance...', confidence: 'Partial' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Convoy Bravo halted at Mile 44 due to a fallen tree. Clearing road now. 85% confidence.', confidence: '85%' },
          air_member: { deliveryBehavior: 'conflicting', delaySeconds: 0, content: 'Drone camera scan shows Convoy Bravo moving forward normally without stopping. 70% confidence.', confidence: '70%' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Emergency transponder beacon confirmed at Mile 44. Beacon validated.', confidence: '90%' }
        }
      },
      {
        id: 'sih-ev-5',
        time: '01:45',
        title: 'Command Directive: Move to Extraction',
        domain: 'JOINT',
        type: 'info',
        confidence: '100%',
        content: 'Headquarters orders the entire team to advance to Extraction Point at 02:00. Verify all unit positions.',
        instructorNotes: 'Ground Truth: Advance order. Leader & Air on time; Land & Cyber/EW delayed by 30s.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Headquarters orders advance to Extraction Point at 02:00. Verify all unit positions. 100% confidence.', confidence: '100%' },
          land_member: { deliveryBehavior: 'delayed', delaySeconds: 30, content: 'Advance order received with delay: timed for 02:00. Verify positions.', confidence: '80%' },
          air_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Headquarters orders advance to Extraction Point at 02:00. Air support aligned.', confidence: '90%' },
          cyber_ew_member: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Advance order received with delay. Electronic clearance requested.', confidence: '85%' }
        }
      },
      {
        id: 'sih-ev-6',
        time: '02:15',
        title: 'Hostile Jammer Location Triangulated',
        domain: 'EW',
        type: 'warning',
        confidence: '85%',
        content: 'Signals Intelligence triangulates enemy radio jammer active on Hill 52.',
        instructorNotes: 'Ground Truth: Active jammer on Hill 52. Cyber/EW normal; Leader delayed; Land incomplete; Air dropped.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'delayed', delaySeconds: 20, content: 'Enemy jammer localized on Hill 52. Caution advised along northern ridge.', confidence: '85%' },
          land_member: { deliveryBehavior: 'incomplete', delaySeconds: 0, content: 'Jammer active on [LOCATION CUT OFF] - maintain radio silence...', confidence: 'Partial' },
          air_member: { deliveryBehavior: 'dropped', reason: 'High-altitude signal blocked by jamming' },
          cyber_ew_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Signals Intelligence triangulates enemy radio jammer active on Hill 52. 95% confidence.', confidence: '95%' }
        }
      },
      {
        id: 'sih-ev-7',
        title: 'Extraction Zone Perimeter Check',
        time: '02:45',
        domain: 'LAND',
        type: 'info',
        confidence: '90%',
        content: 'Forward patrol confirms Extraction Zone perimeter is secure.',
        instructorNotes: 'Ground Truth: Extraction perimeter secure. Air reports conflicting movement.',
        roleVariations: {
          team_leader: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Forward patrol confirms Extraction Zone perimeter is secure. 90% confidence.', confidence: '90%' },
          land_member: { deliveryBehavior: 'normal', delaySeconds: 0, content: 'Forward patrol confirms Extraction Zone perimeter is secure. 90% confidence.', confidence: '90%' },
          air_member: { deliveryBehavior: 'conflicting', delaySeconds: 0, content: 'Aerial camera detects suspicious movement near northern edge of Extraction Zone. 65% confidence.', confidence: '65%' },
          cyber_ew_member: { deliveryBehavior: 'delayed', delaySeconds: 25, content: 'Perimeter check acknowledgement received with delay.', confidence: '80%' }
        }
      }
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

    // Idempotent column migrations for databases created before schema updates
    await client.query(`
      ALTER TABLE exercises ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER NOT NULL DEFAULT 0;
    `).catch(err => console.log('Note: exercises.elapsed_seconds already present:', err.message));

    await client.query(`
      ALTER TABLE participant_decisions ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER DEFAULT 0;
    `).catch(err => console.log('Note: participant_decisions.elapsed_seconds already present:', err.message));

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
