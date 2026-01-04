-- ============================================================================
-- MIGRATION 013: Race Results System
-- ============================================================================
-- Purpose: Store race results for my riders with automated periodic scanning
-- Date: 3 januari 2026
-- ============================================================================

-- ============================================================================
-- RACE RESULTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS race_results (
  id SERIAL PRIMARY KEY,
  
  -- Event identification
  event_id VARCHAR(20) NOT NULL,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(50),
  event_subtype VARCHAR(50),
  
  -- Route info
  distance_meters INTEGER,
  elevation_meters INTEGER,
  route_id VARCHAR(50),
  
  -- Rider info
  rider_id INTEGER NOT NULL,
  rider_name TEXT,
  
  -- Position & results
  position INTEGER NOT NULL,
  total_riders INTEGER NOT NULL,
  category VARCHAR(10),
  time_seconds INTEGER,
  gap_seconds NUMERIC,
  dnf BOOLEAN DEFAULT false,
  
  -- vELO tracking
  velo_rating INTEGER,
  velo_before INTEGER,
  velo_change INTEGER,
  velo_max_30day INTEGER,
  velo_max_90day INTEGER,
  
  -- Power metrics
  wkg_avg NUMERIC(5,2),
  wkg_5s NUMERIC(5,2),
  wkg_15s NUMERIC(5,2),
  wkg_30s NUMERIC(5,2),
  wkg_60s NUMERIC(5,2),
  wkg_120s NUMERIC(5,2),
  wkg_300s NUMERIC(5,2),
  wkg_1200s NUMERIC(5,2),
  
  -- Additional metrics
  power_avg INTEGER,
  power_np INTEGER,
  power_ftp INTEGER,
  heart_rate_avg INTEGER,
  effort_score INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: één rider per event
  CONSTRAINT race_results_unique UNIQUE(event_id, rider_id)
);

-- Indexes voor snelle queries
CREATE INDEX IF NOT EXISTS idx_race_results_rider ON race_results(rider_id);
CREATE INDEX IF NOT EXISTS idx_race_results_event ON race_results(event_id);
CREATE INDEX IF NOT EXISTS idx_race_results_date ON race_results(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_race_results_rider_date ON race_results(rider_id, event_date DESC);

COMMENT ON TABLE race_results IS 
'Automated race results for my riders. Periodically scanned from ZwiftRacing API.';

-- ============================================================================
-- RACE SCAN CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS race_scan_config (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  
  -- Scan settings
  scan_interval_minutes INTEGER DEFAULT 60, -- Hoe vaak scannen
  lookback_hours INTEGER DEFAULT 24, -- Hoeveel uur terug kijken
  max_events_per_scan INTEGER DEFAULT 100, -- Max events per scan
  
  -- Last run info
  last_scan_at TIMESTAMPTZ,
  last_scan_events_checked INTEGER,
  last_scan_events_saved INTEGER,
  last_scan_duration_seconds INTEGER,
  
  -- Next run
  next_scan_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO race_scan_config (enabled, scan_interval_minutes, lookback_hours)
VALUES (true, 60, 24)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE race_scan_config IS 
'Configuration for automated race results scanning';

-- ============================================================================
-- RACE SCAN LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS race_scan_log (
  id SERIAL PRIMARY KEY,
  
  -- Scan info
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL, -- 'running', 'success', 'failed'
  
  -- Results
  events_checked INTEGER DEFAULT 0,
  events_with_my_riders INTEGER DEFAULT 0,
  results_saved INTEGER DEFAULT 0,
  results_updated INTEGER DEFAULT 0,
  
  -- Performance
  duration_seconds INTEGER,
  
  -- Error info
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_race_scan_log_date ON race_scan_log(started_at DESC);

COMMENT ON TABLE race_scan_log IS 
'Audit log for race results scanning operations';

-- ============================================================================
-- VIEW: Recent Race Results
-- ============================================================================
CREATE OR REPLACE VIEW v_race_results_recent AS
SELECT 
  rr.*,
  rc.racing_name,
  rc.full_name,
  rc.avatar_url,
  rc.country_alpha3,
  RANK() OVER (PARTITION BY rr.rider_id ORDER BY rr.event_date DESC) AS race_rank
FROM race_results rr
LEFT JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
WHERE rr.event_date >= NOW() - INTERVAL '90 days'
ORDER BY rr.event_date DESC;

COMMENT ON VIEW v_race_results_recent IS 
'Race results from last 90 days with rider details';

-- ============================================================================
-- VIEW: Rider Statistics
-- ============================================================================
CREATE OR REPLACE VIEW v_rider_race_stats AS
SELECT 
  rider_id,
  COUNT(*) AS total_races,
  COUNT(*) FILTER (WHERE position = 1) AS total_wins,
  COUNT(*) FILTER (WHERE position <= 3) AS total_podiums,
  COUNT(*) FILTER (WHERE position <= 5) AS total_top5,
  COUNT(*) FILTER (WHERE position <= 10) AS total_top10,
  ROUND(AVG(position), 1) AS avg_position,
  ROUND(AVG(wkg_avg), 2) AS avg_wkg,
  MAX(velo_rating) AS max_velo,
  MIN(position) AS best_position,
  MAX(event_date) AS last_race_date,
  COUNT(*) FILTER (WHERE event_date >= NOW() - INTERVAL '7 days') AS races_last_7d,
  COUNT(*) FILTER (WHERE event_date >= NOW() - INTERVAL '30 days') AS races_last_30d
FROM race_results
GROUP BY rider_id;

COMMENT ON VIEW v_rider_race_stats IS 
'Aggregated statistics per rider from race_results';

-- ============================================================================
-- FUNCTION: Cleanup old results
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_race_results()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete results older than 1 year
  DELETE FROM race_results
  WHERE event_date < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_race_results IS 
'Delete race results older than 1 year. Returns number of deleted rows.';
