-- Operational Fog - PostgreSQL Relational Database DDL Schema

-- 1. Users & Auth Identities Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  service_id VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'commander', -- instructor | commander | field_unit | logistics | signals | evaluator
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Scenario Templates Table
CREATE TABLE IF NOT EXISTS scenarios (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  short_desc TEXT NOT NULL,
  objective TEXT NOT NULL,
  duration VARCHAR(32) NOT NULL,
  difficulty VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Ready', -- Draft | Ready | Archived
  version INTEGER DEFAULT 1,
  creator VARCHAR(64) NOT NULL,
  events_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_custom BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Exercise Sessions Table (with Immutable Scenario Snapshot)
CREATE TABLE IF NOT EXISTS exercises (
  id VARCHAR(64) PRIMARY KEY,
  session_code VARCHAR(16) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  scenario_id VARCHAR(64) REFERENCES scenarios(id) ON DELETE SET NULL,
  scenario_title TEXT NOT NULL,
  scenario_snapshot_json JSONB NOT NULL, -- Immutable snapshot of scenario configuration at launch
  status VARCHAR(32) NOT NULL DEFAULT 'In Progress', -- Draft | Ready | Active / In Progress | Paused | Completed | Reviewed
  participant_count INTEGER DEFAULT 1,
  max_participants INTEGER DEFAULT 6,
  instructor_id VARCHAR(64) NOT NULL,
  creator VARCHAR(64) NOT NULL,
  participants_json JSONB DEFAULT '[]'::jsonb,
  team_messages_json JSONB DEFAULT '[]'::jsonb,
  is_sample BOOLEAN DEFAULT FALSE,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0, -- Authoritative simulation clock value persisted on pause/end
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Backward compatibility view mapping 'sessions' to 'exercises'
CREATE OR REPLACE VIEW sessions AS SELECT * FROM exercises;

-- 4. Exercise Participants Table
CREATE TABLE IF NOT EXISTS exercise_participants (
  id VARCHAR(64) PRIMARY KEY,
  exercise_id VARCHAR(64) NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'commander',
  status VARCHAR(32) NOT NULL DEFAULT 'Online', -- Online | Disconnected
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMPTZ
);

-- 5. Communication Events Table
CREATE TABLE IF NOT EXISTS communication_events (
  id VARCHAR(64) PRIMARY KEY,
  exercise_id VARCHAR(64) NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  event_type VARCHAR(32) NOT NULL DEFAULT 'info', -- info | warning | alert | delay
  domain VARCHAR(32) NOT NULL DEFAULT 'JOINT', -- LAND | AIR | CYBER | EW | JOINT
  delivery_behavior VARCHAR(32) NOT NULL DEFAULT 'normal', -- normal | delayed | dropped | conflicting | incomplete
  recipient_role VARCHAR(32) NOT NULL DEFAULT 'all', -- all | team_leader | land_member | air_member | cyber_ew_member | instructor
  scheduled_time_sec INTEGER NOT NULL DEFAULT 0,
  delay_seconds INTEGER NOT NULL DEFAULT 0,
  actual_delivery_time_sec INTEGER NOT NULL DEFAULT 0,
  confidence VARCHAR(32) DEFAULT '80%',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING | DELIVERED | DELAYED | DROPPED
  role_variations_json JSONB DEFAULT '{}'::jsonb,
  instructor_notes TEXT DEFAULT '',
  conflicts_with_id VARCHAR(64),
  incomplete_fields VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Participant Command Decisions Table
CREATE TABLE IF NOT EXISTS participant_decisions (
  id VARCHAR(64) PRIMARY KEY,
  exercise_id VARCHAR(64) NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  confidence VARCHAR(32) DEFAULT 'Medium', -- High | Medium | Low
  elapsed_minutes INTEGER DEFAULT 0,
  elapsed_seconds INTEGER DEFAULT 0,        -- raw elapsed seconds at time of submission
  elapsed_time_formatted VARCHAR(16) DEFAULT '00:00',
  submitted_by VARCHAR(64) NOT NULL,
  submitted_role VARCHAR(64) NOT NULL DEFAULT 'commander',
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Backward compatibility table alias for decisions
CREATE TABLE IF NOT EXISTS decisions (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) REFERENCES exercises(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  confidence VARCHAR(32) DEFAULT 'Medium',
  elapsed_minutes INTEGER DEFAULT 0,
  elapsed_time_formatted VARCHAR(16) DEFAULT '00:00',
  submitted_by VARCHAR(64) NOT NULL,
  submitted_role VARCHAR(64) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. After-Action Reviews (AARs) Table
CREATE TABLE IF NOT EXISTS aars (
  id VARCHAR(64) PRIMARY KEY,
  exercise_id VARCHAR(64) REFERENCES exercises(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  session_code VARCHAR(16),
  session_name TEXT NOT NULL,
  scenario_title TEXT NOT NULL,
  creator VARCHAR(64) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  decisions_count INTEGER DEFAULT 0,
  instructor_notes TEXT DEFAULT '',
  decisions_json JSONB DEFAULT '[]'::jsonb,
  events_json JSONB DEFAULT '[]'::jsonb,
  participants_json JSONB DEFAULT '[]'::jsonb,
  scenario_snapshot_json JSONB DEFAULT '{}'::jsonb,
  is_sample BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);
CREATE INDEX IF NOT EXISTS idx_exercises_code ON exercises(session_code);
CREATE INDEX IF NOT EXISTS idx_exercises_status ON exercises(status);
CREATE INDEX IF NOT EXISTS idx_comms_exercise ON communication_events(exercise_id);
CREATE INDEX IF NOT EXISTS idx_comms_status ON communication_events(status);
CREATE INDEX IF NOT EXISTS idx_decisions_exercise ON participant_decisions(exercise_id);
CREATE INDEX IF NOT EXISTS idx_aars_exercise ON aars(exercise_id);
