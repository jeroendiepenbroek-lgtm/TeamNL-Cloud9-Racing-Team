-- ============================================================================
-- MIGRATION 017: Create Race Results Sourcing Tables
-- ============================================================================
-- Purpose: 1:1 mapping van result endpoints naar sourcing tables
-- Date: 2025-11-18
-- Feature: Results Dashboard (Feature 2)
-- 
-- API Endpoints:
--   1. /public/results/<eventId>     → zwift_api_race_results
--   2. /public/zp/<eventId>/results  → zwift_api_zp_results (ZwiftPower)
-- ============================================================================

-- ============================================================================
-- TABLE 1: zwift_api_race_results
-- Source: /public/results/<eventId>
-- Rate: 1 call per minute
-- ============================================================================

CREATE TABLE IF NOT EXISTS zwift_api_race_results (
  id BIGSERIAL PRIMARY KEY,
  
  -- Event & Rider identification
  event_id TEXT NOT NULL REFERENCES zwift_api_events(event_id) ON DELETE CASCADE,
  rider_id INTEGER NOT NULL,
  rider_name TEXT NOT NULL,
  
  -- Race placement
  rank INTEGER,                        -- finish position (1st, 2nd, etc)
  total_riders INTEGER,                -- total participants
  pen TEXT,                            -- A/B/C/D/E category
  
  -- Time & Performance
  time_seconds INTEGER,                -- finish time in seconds
  delta_winner_seconds INTEGER,       -- gap to winner (+/- seconds)
  avg_wkg DECIMAL(6,2),               -- average watts/kg
  avg_watts INTEGER,                  -- average power
  
  -- Additional metrics (if available)
  avg_heart_rate INTEGER,
  avg_cadence INTEGER,
  
  -- Status
  is_disqualified BOOLEAN DEFAULT false,
  did_finish BOOLEAN DEFAULT true,
  dnf_reason TEXT,
  
  -- Raw API response
  raw_response JSONB,
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(event_id, rider_id)
);

-- Indexes
CREATE INDEX idx_race_results_event_id ON zwift_api_race_results(event_id);
CREATE INDEX idx_race_results_rider_id ON zwift_api_race_results(rider_id);
CREATE INDEX idx_race_results_rank ON zwift_api_race_results(rank);
CREATE INDEX idx_race_results_pen ON zwift_api_race_results(pen);

-- RLS Policies
ALTER TABLE zwift_api_race_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON zwift_api_race_results
  FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON zwift_api_race_results
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE 2: zwift_api_zp_results
-- Source: /public/zp/<eventId>/results (ZwiftPower detailed results)
-- Rate: 1 call per minute
-- Contains: Power curves, FTP, detailed telemetry
-- ============================================================================

CREATE TABLE IF NOT EXISTS zwift_api_zp_results (
  id BIGSERIAL PRIMARY KEY,
  
  -- Event & Rider identification
  event_id TEXT NOT NULL REFERENCES zwift_api_events(event_id) ON DELETE CASCADE,
  rider_id INTEGER NOT NULL,
  rider_name TEXT NOT NULL,
  
  -- Race placement
  rank INTEGER,
  total_riders INTEGER,
  pen TEXT,                            -- A/B/C/D/E category
  
  -- Time & Performance
  time_seconds INTEGER,
  delta_winner_seconds INTEGER,
  
  -- Power Metrics (the important ones for Results Dashboard!)
  avg_watts INTEGER,
  avg_wkg DECIMAL(6,2),
  normalized_power INTEGER,           -- NP
  ftp INTEGER,                         -- Functional Threshold Power
  
  -- Power Curve (peak watts/kg per duration)
  power_5s DECIMAL(6,2),              -- 5 second peak
  power_15s DECIMAL(6,2),             -- 15 second peak
  power_30s DECIMAL(6,2),             -- 30 second peak
  power_1m DECIMAL(6,2),              -- 1 minute peak
  power_2m DECIMAL(6,2),              -- 2 minute peak
  power_5m DECIMAL(6,2),              -- 5 minute peak
  power_20m DECIMAL(6,2),             -- 20 minute peak (FTP proxy)
  
  -- Physiological
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  avg_cadence INTEGER,
  
  -- Rider physical
  weight_kg DECIMAL(5,2),
  height_cm INTEGER,
  
  -- vELO / Rating (if available)
  velo_rating INTEGER,                -- Club Ladder vELO (1-7)
  race_points DECIMAL(6,2),           -- RP scoring
  
  -- Status
  is_disqualified BOOLEAN DEFAULT false,
  did_finish BOOLEAN DEFAULT true,
  dnf_reason TEXT,
  
  -- Raw API response
  raw_response JSONB,
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(event_id, rider_id)
);

-- Indexes
CREATE INDEX idx_zp_results_event_id ON zwift_api_zp_results(event_id);
CREATE INDEX idx_zp_results_rider_id ON zwift_api_zp_results(rider_id);
CREATE INDEX idx_zp_results_rank ON zwift_api_zp_results(rank);
CREATE INDEX idx_zp_results_pen ON zwift_api_zp_results(pen);
CREATE INDEX idx_zp_results_power ON zwift_api_zp_results(power_20m DESC NULLS LAST);

-- RLS Policies
ALTER TABLE zwift_api_zp_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON zwift_api_zp_results
  FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON zwift_api_zp_results
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE 3: rider_personal_records
-- Derived from zwift_api_zp_results power curve data
-- ============================================================================

CREATE TABLE IF NOT EXISTS rider_personal_records (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,
  duration TEXT NOT NULL,              -- "5s", "15s", "30s", "1m", "2m", "5m", "20m"
  best_wkg DECIMAL(6,2) NOT NULL,     -- Best watts/kg
  best_watts INTEGER,                  -- Absolute watts (for reference)
  event_id TEXT,                       -- Event where PR achieved
  event_date TIMESTAMPTZ,              -- When PR was achieved
  previous_best DECIMAL(6,2),          -- Previous PR (for progression)
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rider_id, duration)
);

CREATE INDEX idx_pr_rider ON rider_personal_records(rider_id);
CREATE INDEX idx_pr_duration ON rider_personal_records(duration);

-- RLS Policies
ALTER TABLE rider_personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON rider_personal_records
  FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON rider_personal_records
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Auto-update PRs when new ZP results are inserted
CREATE OR REPLACE FUNCTION update_personal_records_from_zp()
RETURNS TRIGGER AS $$
DECLARE
  power_durations TEXT[] := ARRAY['5s', '15s', '30s', '1m', '2m', '5m', '20m'];
  power_values DECIMAL[] := ARRAY[NEW.power_5s, NEW.power_15s, NEW.power_30s, 
                                   NEW.power_1m, NEW.power_2m, NEW.power_5m, NEW.power_20m];
  i INTEGER;
BEGIN
  -- Loop through each duration and check for PR
  FOR i IN 1..array_length(power_durations, 1) LOOP
    IF power_values[i] IS NOT NULL AND power_values[i] > 0 THEN
      INSERT INTO rider_personal_records (
        rider_id, 
        duration, 
        best_wkg, 
        event_id, 
        event_date
      )
      VALUES (
        NEW.rider_id, 
        power_durations[i], 
        power_values[i], 
        NEW.event_id,
        (SELECT time_unix FROM zwift_api_events WHERE event_id = NEW.event_id LIMIT 1)
      )
      ON CONFLICT (rider_id, duration) DO UPDATE
        SET previous_best = rider_personal_records.best_wkg,
            best_wkg = GREATEST(rider_personal_records.best_wkg, EXCLUDED.best_wkg),
            event_id = CASE 
              WHEN EXCLUDED.best_wkg > rider_personal_records.best_wkg THEN EXCLUDED.event_id
              ELSE rider_personal_records.event_id
            END,
            event_date = CASE
              WHEN EXCLUDED.best_wkg > rider_personal_records.best_wkg THEN EXCLUDED.event_date
              ELSE rider_personal_records.event_date
            END,
            updated_at = NOW()
        WHERE EXCLUDED.best_wkg > rider_personal_records.best_wkg;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update PRs after ZP result insert
DROP TRIGGER IF EXISTS trigger_update_prs_from_zp ON zwift_api_zp_results;
CREATE TRIGGER trigger_update_prs_from_zp
  AFTER INSERT OR UPDATE ON zwift_api_zp_results
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_records_from_zp();

-- ============================================================================
-- MATERIALIZED VIEW: view_team_recent_results
-- Fast queries for Results Dashboard
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS view_team_recent_results CASCADE;
CREATE MATERIALIZED VIEW view_team_recent_results AS
SELECT 
  -- From race results (basic data)
  rr.id,
  rr.event_id,
  rr.rider_id,
  rr.rider_name,
  rr.rank,
  rr.total_riders,
  rr.pen,
  rr.time_seconds,
  rr.delta_winner_seconds,
  rr.avg_wkg,
  rr.avg_watts,
  rr.is_disqualified,
  
  -- From ZP results (power curves if available)
  zp.power_5s,
  zp.power_15s,
  zp.power_30s,
  zp.power_1m,
  zp.power_2m,
  zp.power_5m,
  zp.power_20m,
  zp.velo_rating,
  zp.race_points,
  zp.ftp,
  
  -- From events (context)
  e.title AS event_name,
  e.time_unix AS event_date,
  e.event_type,
  e.sub_type,
  e.route_name,
  
  -- Metadata
  rr.created_at
FROM zwift_api_race_results rr
  LEFT JOIN zwift_api_zp_results zp 
    ON rr.event_id = zp.event_id AND rr.rider_id = zp.rider_id
  LEFT JOIN zwift_api_events e 
    ON rr.event_id = e.event_id
WHERE rr.rider_id IN (
  SELECT rider_id FROM view_my_team
)
ORDER BY e.time_unix DESC NULLS LAST;

-- Indexes on materialized view
CREATE UNIQUE INDEX idx_view_team_recent_id ON view_team_recent_results(id);
CREATE INDEX idx_view_team_recent_date ON view_team_recent_results(event_date DESC NULLS LAST);
CREATE INDEX idx_view_team_recent_rider ON view_team_recent_results(rider_id);
CREATE INDEX idx_view_team_recent_event ON view_team_recent_results(event_id);

-- Function to refresh view
CREATE OR REPLACE FUNCTION refresh_team_results_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_team_recent_results;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE zwift_api_race_results IS 
  '1:1 sourcing table for /public/results/<eventId> endpoint';

COMMENT ON TABLE zwift_api_zp_results IS 
  '1:1 sourcing table for /public/zp/<eventId>/results endpoint - contains power curves';

COMMENT ON TABLE rider_personal_records IS 
  'Personal Records per rider per power duration - auto-updated from ZP results';

COMMENT ON MATERIALIZED VIEW view_team_recent_results IS 
  'Fast query view for Results Dashboard - refresh hourly';

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE zwift_api_race_results;
ALTER PUBLICATION supabase_realtime ADD TABLE zwift_api_zp_results;
ALTER PUBLICATION supabase_realtime ADD TABLE rider_personal_records;
