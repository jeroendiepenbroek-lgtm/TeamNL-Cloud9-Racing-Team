-- ============================================================================
-- SUPABASE MIGRATION 013: Race Results Scanner
-- ============================================================================
-- Kopieer dit HELE bestand naar Supabase SQL Editor en run
-- Datum: 3 januari 2026
-- ============================================================================

-- Table 1: race_results (opslag)
CREATE TABLE IF NOT EXISTS race_results (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(20) NOT NULL,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(50),
  event_subtype VARCHAR(50),
  distance_meters INTEGER,
  elevation_meters INTEGER,
  route_id VARCHAR(50),
  rider_id INTEGER NOT NULL,
  rider_name TEXT,
  position INTEGER NOT NULL,
  total_riders INTEGER NOT NULL,
  category VARCHAR(10),
  time_seconds INTEGER,
  gap_seconds NUMERIC,
  dnf BOOLEAN DEFAULT false,
  velo_rating INTEGER,
  velo_before INTEGER,
  velo_change INTEGER,
  velo_max_30day INTEGER,
  velo_max_90day INTEGER,
  wkg_avg NUMERIC(5,2),
  wkg_5s NUMERIC(5,2),
  wkg_15s NUMERIC(5,2),
  wkg_30s NUMERIC(5,2),
  wkg_60s NUMERIC(5,2),
  wkg_120s NUMERIC(5,2),
  wkg_300s NUMERIC(5,2),
  wkg_1200s NUMERIC(5,2),
  power_avg INTEGER,
  power_np INTEGER,
  power_ftp INTEGER,
  heart_rate_avg INTEGER,
  effort_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT race_results_unique UNIQUE(event_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_race_results_rider ON race_results(rider_id);
CREATE INDEX IF NOT EXISTS idx_race_results_event ON race_results(event_id);
CREATE INDEX IF NOT EXISTS idx_race_results_date ON race_results(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_race_results_rider_date ON race_results(rider_id, event_date DESC);

COMMENT ON TABLE race_results IS 'Automated race results for my riders';

-- Table 2: race_scan_config (settings)
CREATE TABLE IF NOT EXISTS race_scan_config (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  scan_interval_minutes INTEGER DEFAULT 60,
  lookback_hours INTEGER DEFAULT 24,
  max_events_per_scan INTEGER DEFAULT 100,
  last_scan_at TIMESTAMPTZ,
  last_scan_events_checked INTEGER,
  last_scan_events_saved INTEGER,
  last_scan_duration_seconds INTEGER,
  next_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO race_scan_config (enabled, scan_interval_minutes, lookback_hours)
VALUES (true, 60, 24)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE race_scan_config IS 'Scanner configuration';

-- Table 3: race_scan_log (audit)
CREATE TABLE IF NOT EXISTS race_scan_log (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL,
  events_checked INTEGER DEFAULT 0,
  events_with_my_riders INTEGER DEFAULT 0,
  results_saved INTEGER DEFAULT 0,
  results_updated INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_race_scan_log_date ON race_scan_log(started_at DESC);

COMMENT ON TABLE race_scan_log IS 'Audit log for scans';

-- View 1: Recent results (90 days)
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

COMMENT ON VIEW v_race_results_recent IS 'Last 90 days with rider details';

-- View 2: Rider statistics
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

COMMENT ON VIEW v_rider_race_stats IS 'Aggregated stats per rider';

-- Function: Cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_race_results()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM race_results WHERE event_date < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_race_results IS 'Delete results >1 year old';

-- ============================================================================
-- VERIFICATION QUERIES (run deze na migration)
-- ============================================================================

-- Check tabellen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'race_%';

-- Check views
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' AND table_name LIKE 'v_race_%';

-- Check config
SELECT * FROM race_scan_config;

-- ============================================================================
-- SUCCESS! 🎉
-- Nu server herstarten en testen met: ./test-race-scanner.sh
-- ============================================================================
