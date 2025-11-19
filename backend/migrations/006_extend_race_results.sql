-- Migration 006: Extend event_results table for Results Dashboard
-- Feature: Results page met power metrics en vELO tracking
-- Date: 2025-11-18
-- Source: /public/zp/<eventId>/results API endpoint

-- 1. Extend event_results table (sourcing table voor ZwiftPower results)
-- 
-- EXISTING COLUMNS (from step2-deploy-only.sql):
--   event_id BIGINT              -> already exists (join key)
--   position INTEGER             -> gebruik als 'rank' in queries
--   finish_time_seconds INTEGER  -> gebruik als 'time_seconds' in queries  
--   watts_per_kg DECIMAL(5,2)    -> gebruik als 'avg_wkg' in queries
--   avg_power_watts INTEGER      -> already exists
--   category TEXT                -> gebruik als 'pen' in queries
--
-- NEW COLUMNS voor Results Dashboard:
ALTER TABLE event_results
  -- Race context (denormalized for fast queries)
  ADD COLUMN IF NOT EXISTS pen TEXT,                      -- A/B/C/D/E pen (additional to category)
  ADD COLUMN IF NOT EXISTS total_riders INTEGER,          -- Total participants in race
  ADD COLUMN IF NOT EXISTS delta_winner_seconds INTEGER,  -- Time gap to winner
  
  -- vELO tracking
  ADD COLUMN IF NOT EXISTS velo_rating INTEGER,           -- Club Ladder vELO (1-7)
  ADD COLUMN IF NOT EXISTS velo_previous INTEGER,         -- Previous vELO for trend
  ADD COLUMN IF NOT EXISTS velo_change INTEGER,           -- +/- change (calculated)
  
  -- Power curve data (peak watts/kg per duration)
  ADD COLUMN IF NOT EXISTS power_5s DECIMAL(6,2),         -- 5 second peak
  ADD COLUMN IF NOT EXISTS power_15s DECIMAL(6,2),        -- 15 second peak
  ADD COLUMN IF NOT EXISTS power_30s DECIMAL(6,2),        -- 30 second peak
  ADD COLUMN IF NOT EXISTS power_1m DECIMAL(6,2),         -- 1 minute peak
  ADD COLUMN IF NOT EXISTS power_2m DECIMAL(6,2),         -- 2 minute peak
  ADD COLUMN IF NOT EXISTS power_5m DECIMAL(6,2),         -- 5 minute peak
  ADD COLUMN IF NOT EXISTS power_20m DECIMAL(6,2),        -- 20 minute peak (FTP proxy)
  
  -- Derived metrics
  ADD COLUMN IF NOT EXISTS effort_score INTEGER,          -- 0-100 (% of PR)
  ADD COLUMN IF NOT EXISTS race_points DECIMAL(6,2);      -- RP scoring

-- 2. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_results_event 
  ON event_results(event_id, position);  -- Use position (existing column) not rank

CREATE INDEX IF NOT EXISTS idx_results_rider 
  ON event_results(rider_id);

-- 3. Personal Records tracking table
CREATE TABLE IF NOT EXISTS rider_personal_records (
  id SERIAL PRIMARY KEY,
  rider_id BIGINT NOT NULL,                               -- Match riders.zwift_id type
  duration TEXT NOT NULL,                                 -- "5s", "15s", "30s", "1m", "2m", "5m", "20m"
  best_wkg DECIMAL(6,2) NOT NULL,
  best_watts INTEGER,                                     -- Absolute watts
  event_id BIGINT,                                        -- Match events.event_id type
  event_date TIMESTAMPTZ,
  previous_best DECIMAL(6,2),                             -- For progression tracking
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, duration)
);

CREATE INDEX IF NOT EXISTS idx_pr_rider ON rider_personal_records(rider_id);

-- 4. Function to calculate vELO change
CREATE OR REPLACE FUNCTION calculate_velo_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.velo_rating IS NOT NULL AND NEW.velo_previous IS NOT NULL THEN
    NEW.velo_change := NEW.velo_rating - NEW.velo_previous;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to auto-calculate vELO change
DROP TRIGGER IF EXISTS trigger_velo_change ON event_results;
CREATE TRIGGER trigger_velo_change
  BEFORE INSERT OR UPDATE ON event_results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_velo_change();

-- 6. Function to update personal records
CREATE OR REPLACE FUNCTION update_personal_records()
RETURNS TRIGGER AS $$
DECLARE
  power_durations TEXT[] := ARRAY['5s', '15s', '30s', '1m', '2m', '5m', '20m'];
  power_values DECIMAL[] := ARRAY[NEW.power_5s, NEW.power_15s, NEW.power_30s, 
                                   NEW.power_1m, NEW.power_2m, NEW.power_5m, NEW.power_20m];
  i INTEGER;
  v_event_date TIMESTAMPTZ;
BEGIN
  -- Get event_date from events table (not stored in event_results)
  SELECT event_date INTO v_event_date 
  FROM events 
  WHERE event_id = NEW.event_id;
  
  -- Loop through each duration and check for PR
  FOR i IN 1..array_length(power_durations, 1) LOOP
    IF power_values[i] IS NOT NULL AND power_values[i] > 0 THEN
      INSERT INTO rider_personal_records (rider_id, duration, best_wkg, event_id, event_date)
      VALUES (NEW.rider_id, power_durations[i], power_values[i], NEW.event_id, v_event_date)
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

-- 7. Trigger to auto-update PRs after result insert
DROP TRIGGER IF EXISTS trigger_update_prs ON event_results;
CREATE TRIGGER trigger_update_prs
  AFTER INSERT OR UPDATE ON event_results
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_records();

-- 8. Materialized view for team recent results (fast queries)
DROP MATERIALIZED VIEW IF EXISTS view_team_recent_results CASCADE;
CREATE MATERIALIZED VIEW view_team_recent_results AS
SELECT 
  r.id,
  r.event_id,
  r.event_id AS event_name,        -- Use event_id as placeholder for event name
  CURRENT_TIMESTAMP AS event_date, -- Placeholder - will join with zwift_api_events later
  'Race' AS event_type,             -- Default type
  r.category AS sub_type,           -- Use category as sub_type
  NULL::TEXT AS route_name,         -- Placeholder
  r.rider_id,
  r.rider_name,
  COALESCE(r.pen, r.category) AS pen,  -- Use new pen column or fallback to category
  COALESCE(r.position, 0) AS rank,     -- Map position to rank
  r.total_riders,
  r.velo_rating,
  r.velo_previous,
  r.velo_change,
  r.finish_time_seconds AS time_seconds,        -- Map existing column to expected name
  r.delta_winner_seconds,
  r.watts_per_kg AS avg_wkg,                    -- Map existing column to expected name
  r.power_5s, r.power_15s, r.power_30s,
  r.power_1m, r.power_2m, r.power_5m, r.power_20m,
  r.effort_score,
  r.race_points,
  r.did_finish AS is_disqualified,              -- Map existing column (invert logic in app)
  r.synced_at AS created_at
FROM event_results r
WHERE r.rider_id IN (SELECT rider_id FROM view_my_team)
ORDER BY r.synced_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_view_team_recent_id ON view_team_recent_results(id);
CREATE INDEX IF NOT EXISTS idx_view_team_recent_date ON view_team_recent_results(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_view_team_recent_rider ON view_team_recent_results(rider_id);

-- 9. Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_team_results_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY view_team_recent_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN event_results.pen IS 'Race pen/category (A/B/C/D/E)';
COMMENT ON COLUMN event_results.velo_rating IS 'Club Ladder vELO rating (1-7, lower is better)';
COMMENT ON COLUMN event_results.velo_change IS 'vELO change from previous race (+/-)';
COMMENT ON COLUMN event_results.effort_score IS 'Effort as % of personal record (0-100)';
COMMENT ON COLUMN event_results.delta_winner_seconds IS 'Time gap to race winner in seconds';

COMMENT ON TABLE rider_personal_records IS 'Personal Records per rider per power duration';
COMMENT ON MATERIALIZED VIEW view_team_recent_results IS 'Fast query view for team results dashboard (refresh hourly)';
