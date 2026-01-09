-- ============================================================================
-- RACE RESULTS SYSTEM - Clean Implementation with zpdatafetch
-- ============================================================================
-- Migration: 015_race_results_zpdatafetch
-- Created: January 7, 2026
-- Purpose: Race results tracking using ZwiftPower & Zwiftracing APIs
-- Data Source: zpdatafetch Python library
-- ============================================================================

-- Drop old race results tables if they exist
DROP TABLE IF EXISTS race_results CASCADE;
DROP TABLE IF EXISTS race_events CASCADE;
DROP TABLE IF EXISTS race_results_sync_log CASCADE;
DROP VIEW IF EXISTS v_recent_race_results CASCADE;

-- ============================================================================
-- RACE EVENTS TABLE
-- Stores metadata about races
-- ============================================================================

CREATE TABLE race_events (
  event_id BIGINT PRIMARY KEY,
  event_name TEXT,
  event_date TIMESTAMPTZ,
  event_type TEXT,  -- 'race', 'workout', 'group_ride'
  world TEXT,       -- Zwift world name
  route TEXT,       -- Route name
  distance_km DECIMAL(6,2),
  elevation_m INTEGER,
  
  -- Category info
  categories TEXT[],  -- ['A', 'B', 'C', 'D'] or specific categories
  
  -- Metadata
  source TEXT CHECK (source IN ('zwiftpower', 'zwiftracing', 'zwift_official')),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_race_events_date ON race_events(event_date DESC);
CREATE INDEX idx_race_events_fetched ON race_events(fetched_at DESC);
CREATE INDEX idx_race_events_source ON race_events(source);

COMMENT ON TABLE race_events IS 'Race event metadata from ZwiftPower/Zwiftracing';

-- ============================================================================
-- RACE RESULTS TABLE
-- Stores individual rider results per race
-- ============================================================================

CREATE TABLE race_results (
  -- Composite primary key: unique per rider per event
  event_id BIGINT NOT NULL,
  rider_id INTEGER NOT NULL,
  
  -- Race Performance
  position INTEGER,
  time_seconds INTEGER,
  distance_meters INTEGER,
  
  -- Power Data
  avg_power INTEGER,
  max_power INTEGER,
  avg_wkg DECIMAL(5,2),
  max_wkg DECIMAL(5,2),
  normalized_power INTEGER,
  
  -- Heart Rate
  avg_hr INTEGER,
  max_hr INTEGER,
  
  -- vELO / Rating Changes (from Zwiftracing)
  velo_before DECIMAL(10,2),
  velo_after DECIMAL(10,2),
  velo_change DECIMAL(10,2),
  
  -- Category & Classification
  category TEXT,  -- A, B, C, D, E
  category_position INTEGER,  -- Position within category
  
  -- Points & Scoring (from ZwiftPower)
  points DECIMAL(8,2),
  points_type TEXT,  -- 'individual', 'team', 'league'
  
  -- Status
  dnf BOOLEAN DEFAULT FALSE,
  dq BOOLEAN DEFAULT FALSE,
  dnf_reason TEXT,
  
  -- Team Info
  team_name TEXT,
  team_id INTEGER,
  
  -- Metadata
  source TEXT CHECK (source IN ('zwiftpower', 'zwiftracing', 'zwift_official')) DEFAULT 'zwiftracing',
  raw_data JSONB,  -- Full API response for debugging
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  PRIMARY KEY (event_id, rider_id),
  FOREIGN KEY (event_id) REFERENCES race_events(event_id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX idx_race_results_rider ON race_results(rider_id);
CREATE INDEX idx_race_results_event ON race_results(event_id);
CREATE INDEX idx_race_results_position ON race_results(position) WHERE position IS NOT NULL;
CREATE INDEX idx_race_results_category ON race_results(category);
CREATE INDEX idx_race_results_velo ON race_results(velo_after DESC) WHERE velo_after IS NOT NULL;
CREATE INDEX idx_race_results_fetched ON race_results(fetched_at DESC);
CREATE INDEX idx_race_results_source ON race_results(source);
CREATE INDEX idx_race_results_team ON race_results(team_id) WHERE team_id IS NOT NULL;

-- Partial index for podium finishes
CREATE INDEX idx_race_results_podium 
  ON race_results(rider_id, position, event_id) 
  WHERE position <= 3 AND dnf = FALSE;

-- Partial index for DNFs
CREATE INDEX idx_race_results_dnf 
  ON race_results(rider_id, event_id) 
  WHERE dnf = TRUE;

COMMENT ON TABLE race_results IS 'Individual race results from ZwiftPower/Zwiftracing APIs via zpdatafetch';
COMMENT ON COLUMN race_results.velo_before IS 'vELO rating before race (from Zwiftracing)';
COMMENT ON COLUMN race_results.velo_after IS 'vELO rating after race (from Zwiftracing)';
COMMENT ON COLUMN race_results.velo_change IS 'vELO rating change (+/-) from this race';
COMMENT ON COLUMN race_results.raw_data IS 'Full JSON response from API for debugging';

-- ============================================================================
-- VIEW: Recent Race Results (Last 30 Days)
-- ============================================================================

CREATE OR REPLACE VIEW v_recent_race_results AS
SELECT 
  rr.event_id,
  re.event_name,
  re.event_date,
  rr.rider_id,
  rr.position,
  rr.category_position,
  rr.time_seconds,
  rr.avg_power,
  rr.avg_wkg,
  rr.velo_before,
  rr.velo_after,
  rr.velo_change,
  rr.category,
  rr.points,
  rr.dnf,
  rr.dq,
  rr.team_name,
  rr.source,
  rr.fetched_at
FROM race_results rr
LEFT JOIN race_events re ON rr.event_id = re.event_id
WHERE re.event_date >= NOW() - INTERVAL '30 days'
  OR (re.event_date IS NULL AND rr.fetched_at >= NOW() - INTERVAL '30 days')
ORDER BY 
  COALESCE(re.event_date, rr.fetched_at) DESC,
  rr.position ASC NULLS LAST;

COMMENT ON VIEW v_recent_race_results IS 'Race results from last 30 days with event info';

-- ============================================================================
-- VIEW: TeamNL Race Results (Club Members Only)
-- ============================================================================

CREATE OR REPLACE VIEW v_teamnl_race_results AS
SELECT 
  rr.event_id,
  re.event_name,
  re.event_date,
  rr.rider_id,
  ar.name AS rider_name,
  rr.position,
  rr.category_position,
  rr.time_seconds,
  rr.avg_power,
  rr.avg_wkg,
  rr.velo_before,
  rr.velo_after,
  rr.velo_change,
  rr.category,
  rr.points,
  rr.dnf,
  rr.dq,
  rr.source,
  rr.fetched_at
FROM race_results rr
LEFT JOIN race_events re ON rr.event_id = re.event_id
INNER JOIN api_zwiftracing_riders ar ON rr.rider_id = ar.rider_id
ORDER BY 
  COALESCE(re.event_date, rr.fetched_at) DESC,
  rr.position ASC NULLS LAST;

COMMENT ON VIEW v_teamnl_race_results IS 'Race results for TeamNL riders from api_zwiftracing_riders';

-- ============================================================================
-- VIEW: Rider Race Statistics
-- ============================================================================

CREATE OR REPLACE VIEW v_rider_race_stats AS
SELECT 
  rr.rider_id,
  COUNT(*) AS total_races,
  COUNT(*) FILTER (WHERE rr.dnf = FALSE AND rr.dq = FALSE) AS completed_races,
  COUNT(*) FILTER (WHERE rr.position = 1 AND rr.dnf = FALSE) AS wins,
  COUNT(*) FILTER (WHERE rr.position <= 3 AND rr.dnf = FALSE) AS podiums,
  COUNT(*) FILTER (WHERE rr.position <= 10 AND rr.dnf = FALSE) AS top_10,
  COUNT(*) FILTER (WHERE rr.dnf = TRUE) AS dnfs,
  ROUND(AVG(rr.position) FILTER (WHERE rr.dnf = FALSE), 1) AS avg_position,
  ROUND(AVG(rr.avg_wkg) FILTER (WHERE rr.dnf = FALSE), 2) AS avg_wkg,
  ROUND(AVG(rr.velo_change) FILTER (WHERE rr.velo_change IS NOT NULL), 1) AS avg_velo_change,
  MAX(rr.avg_power) AS max_avg_power,
  MAX(rr.avg_wkg) AS max_avg_wkg,
  MIN(rr.fetched_at) AS first_race_date,
  MAX(rr.fetched_at) AS last_race_date
FROM race_results rr
GROUP BY rr.rider_id;

COMMENT ON VIEW v_rider_race_stats IS 'Aggregate race statistics per rider';

-- ============================================================================
-- SYNC LOG TABLE (Track API fetches)
-- ============================================================================

CREATE TABLE IF NOT EXISTS race_results_sync_log (
  id SERIAL PRIMARY KEY,
  sync_type TEXT CHECK (sync_type IN ('full', 'incremental', 'single_event', 'single_rider')),
  source TEXT CHECK (source IN ('zwiftpower', 'zwiftracing')),
  events_fetched INTEGER DEFAULT 0,
  results_fetched INTEGER DEFAULT 0,
  results_saved INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_messages TEXT[],
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
  ) STORED,
  success BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sync_log_started ON race_results_sync_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_source ON race_results_sync_log(source);
CREATE INDEX IF NOT EXISTS idx_sync_log_success ON race_results_sync_log(success);

COMMENT ON TABLE race_results_sync_log IS 'Track race results API sync operations';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON race_events TO authenticated;
GRANT SELECT ON race_results TO authenticated;
GRANT SELECT ON v_recent_race_results TO authenticated;
GRANT SELECT ON v_teamnl_race_results TO authenticated;
GRANT SELECT ON v_rider_race_stats TO authenticated;
GRANT SELECT ON race_results_sync_log TO authenticated;

GRANT SELECT ON race_events TO anon;
GRANT SELECT ON race_results TO anon;
GRANT SELECT ON v_recent_race_results TO anon;
GRANT SELECT ON v_teamnl_race_results TO anon;
GRANT SELECT ON v_rider_race_stats TO anon;

GRANT ALL ON race_events TO service_role;
GRANT ALL ON race_results TO service_role;
GRANT ALL ON race_results_sync_log TO service_role;
GRANT ALL ON race_results_sync_log_id_seq TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table creation
SELECT 'race_events' as table_name, COUNT(*) as row_count FROM race_events
UNION ALL
SELECT 'race_results', COUNT(*) FROM race_results
UNION ALL
SELECT 'race_results_sync_log', COUNT(*) FROM race_results_sync_log;
