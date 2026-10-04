-- Operational Fog - PostgreSQL Relational Database Schema

-- Scenarios Table
CREATE TABLE IF NOT EXISTS scenarios (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  title TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  short_desc TEXT NOT NULL,
  objective TEXT NOT NULL,
  duration VARCHAR(32) NOT NULL,
  difficulty VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  events_json JSONB NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Exercise Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  session_code VARCHAR(16) UNIQUE,
  name TEXT NOT NULL,
  scenario_id VARCHAR(64) REFERENCES scenarios(id) ON DELETE SET NULL,
  scenario_title TEXT NOT NULL,
  status VARCHAR(32) DEFAULT 'In Progress',
  participant_count INTEGER DEFAULT 1,
  max_participants INTEGER DEFAULT 6,
  creator VARCHAR(64) NOT NULL,
  participants_json JSONB DEFAULT '[]'::jsonb,
  team_messages_json JSONB DEFAULT '[]'::jsonb,
  is_sample BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

-- Command Decisions Log Table
CREATE TABLE IF NOT EXISTS decisions (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  confidence VARCHAR(32) DEFAULT 'Medium',
  elapsed_minutes INTEGER DEFAULT 0,
  elapsed_time_formatted VARCHAR(16) DEFAULT '00:00',
  submitted_by VARCHAR(64) NOT NULL,
  submitted_role VARCHAR(64) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- After-Action Reviews Table
CREATE TABLE IF NOT EXISTS aars (
  id VARCHAR(64) PRIMARY KEY,
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
  is_sample BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
