-- Migration: Extend zwift_api_race_results for Results Dashboard
-- Voegt power curves, vELO tracking, en performance metrics toe
-- RUN IN SUPABASE SQL EDITOR

-- ============================================
-- PART 1: Extend zwift_api_race_results tabel
-- ============================================

ALTER TABLE zwift_api_race_results
  -- Race metadata (cached voor snellere queries)
  ADD COLUMN IF NOT EXISTS pen TEXT,                           -- A/B/C/D/E race category
  ADD COLUMN IF NOT EXISTS total_riders INTEGER,               -- Aantal deelnemers
  ADD COLUMN IF NOT EXISTS event_name TEXT,                    -- Cached event naam
  ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ,             -- Cached event datum
  ADD COLUMN IF NOT EXISTS delta_winner_seconds INTEGER,       -- Delta naar winnaar (+/- sec)
  
  -- vELO Rating (Club Ladder 1-7)
  ADD COLUMN IF NOT EXISTS velo_rating INTEGER,                -- Huidige vELO (1-7)
  ADD COLUMN IF NOT EXISTS velo_previous INTEGER,              -- Vorige vELO
  ADD COLUMN IF NOT EXISTS velo_change INTEGER,                -- Auto-calculated: rating - previous
  
  -- Power Curves (alle in W/kg, 2 decimalen)
  ADD COLUMN IF NOT EXISTS power_5s DECIMAL(6,2),              -- 5 second peak
  ADD COLUMN IF NOT EXISTS power_15s DECIMAL(6,2),             -- 15 second peak
  ADD COLUMN IF NOT EXISTS power_30s DECIMAL(6,2),             -- 30 second peak
  ADD COLUMN IF NOT EXISTS power_1m DECIMAL(6,2),              -- 1 minute peak
  ADD COLUMN IF NOT EXISTS power_2m DECIMAL(6,2),              -- 2 minute peak
  ADD COLUMN IF NOT EXISTS power_5m DECIMAL(6,2),              -- 5 minute peak
  ADD COLUMN IF NOT EXISTS power_20m DECIMAL(6,2),             -- 20 minute peak (FTP proxy)
  
  -- Performance Metrics
  ADD COLUMN IF NOT EXISTS effort_score INTEGER,               -- 0-100 (% van PR)
  ADD COLUMN IF NOT EXISTS race_points DECIMAL(6,2);           -- RP scoring

-- Indexes voor snelle queries
CREATE INDEX IF NOT EXISTS idx_results_rider_date 
  ON zwift_api_race_results(rider_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_results_event 
  ON zwift_api_race_results(event_id, rank);

CREATE INDEX IF NOT EXISTS idx_results_event_date 
  ON zwift_api_race_results(event_date DESC NULLS LAST);

-- Index voor vELO trends
CREATE INDEX IF NOT EXISTS idx_results_velo 
  ON zwift_api_race_results(rider_id, velo_rating) 
  WHERE velo_rating IS NOT NULL;

-- ============================================
-- PART 2: Personal Records Tracking Tabel
-- ============================================

CREATE TABLE IF NOT EXISTS rider_personal_records (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL REFERENCES riders(rider_id) ON DELETE CASCADE,
  duration TEXT NOT NULL,                              -- '5s', '15s', '30s', '1m', '2m', '5m', '20m'
  best_wkg DECIMAL(6,2) NOT NULL,                     -- Best W/kg voor deze duration
  event_id TEXT,                                       -- Event waar PR behaald
  event_date TIMESTAMPTZ,                              -- Datum van PR
  previous_best DECIMAL(6,2),                          -- Vorige PR (voor progression)
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rider_id, duration)
);

CREATE INDEX IF NOT EXISTS idx_pr_rider ON rider_personal_records(rider_id);
CREATE INDEX IF NOT EXISTS idx_pr_duration ON rider_personal_records(duration);
CREATE INDEX IF NOT EXISTS idx_pr_date ON rider_personal_records(event_date DESC NULLS LAST);

-- ============================================
-- PART 3: Triggers voor automatische updates
-- ============================================

-- Trigger 1: Auto-calculate vELO change
CREATE OR REPLACE FUNCTION calculate_velo_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.velo_rating IS NOT NULL AND NEW.velo_previous IS NOT NULL THEN
    NEW.velo_change := NEW.velo_rating - NEW.velo_previous;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_velo_change ON zwift_api_race_results;
CREATE TRIGGER trigger_velo_change
  BEFORE INSERT OR UPDATE ON zwift_api_race_results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_velo_change();

-- Trigger 2: Auto-update Personal Records
CREATE OR REPLACE FUNCTION update_personal_records()
RETURNS TRIGGER AS $$
DECLARE
  durations TEXT[] := ARRAY['5s', '15s', '30s', '1m', '2m', '5m', '20m'];
  duration_col TEXT;
  power_value DECIMAL(6,2);
  current_pr DECIMAL(6,2);
BEGIN
  -- Loop door alle power durations
  FOREACH duration_col IN ARRAY durations
  LOOP
    -- Haal power waarde op uit NEW record
    EXECUTE format('SELECT ($1).power_%s', duration_col) INTO power_value USING NEW;
    
    -- Skip als power waarde NULL of 0
    IF power_value IS NULL OR power_value <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Haal huidige PR op (indien bestaat)
    SELECT best_wkg INTO current_pr
    FROM rider_personal_records
    WHERE rider_id = NEW.rider_id AND duration = duration_col;
    
    -- Update of insert PR
    IF current_pr IS NULL OR power_value > current_pr THEN
      INSERT INTO rider_personal_records (
        rider_id, 
        duration, 
        best_wkg, 
        event_id, 
        event_date, 
        previous_best,
        achieved_at,
        updated_at
      )
      VALUES (
        NEW.rider_id,
        duration_col,
        power_value,
        NEW.event_id,
        NEW.event_date,
        current_pr,
        NOW(),
        NOW()
      )
      ON CONFLICT (rider_id, duration) DO UPDATE SET
        previous_best = rider_personal_records.best_wkg,
        best_wkg = power_value,
        event_id = NEW.event_id,
        event_date = NEW.event_date,
        updated_at = NOW();
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_prs ON zwift_api_race_results;
CREATE TRIGGER trigger_update_prs
  AFTER INSERT OR UPDATE ON zwift_api_race_results
  FOR EACH ROW
  WHEN (NEW.power_5s IS NOT NULL OR NEW.power_15s IS NOT NULL OR 
        NEW.power_30s IS NOT NULL OR NEW.power_1m IS NOT NULL OR 
        NEW.power_2m IS NOT NULL OR NEW.power_5m IS NOT NULL OR 
        NEW.power_20m IS NOT NULL)
  EXECUTE FUNCTION update_personal_records();

-- ============================================
-- PART 4: Views voor Results Dashboard
-- ============================================

-- View: Team Recent Results
CREATE OR REPLACE VIEW view_team_recent_results AS
SELECT 
  r.event_id,
  r.event_name,
  r.event_date,
  r.rider_id,
  rd.name as rider_name,
  r.rank,
  r.pen,
  r.total_riders,
  r.time_seconds,
  r.avg_wkg,
  r.velo_rating,
  r.velo_change,
  r.power_5s,
  r.power_15s,
  r.power_30s,
  r.power_1m,
  r.power_2m,
  r.power_5m,
  r.power_20m,
  r.effort_score,
  r.race_points,
  r.delta_winner_seconds
FROM zwift_api_race_results r
INNER JOIN riders rd ON r.rider_id = rd.rider_id
WHERE r.event_date IS NOT NULL
ORDER BY r.event_date DESC, r.event_id, r.rank;

-- View: Rider Stats Summary
CREATE OR REPLACE VIEW view_rider_stats AS
SELECT 
  r.rider_id,
  rd.name as rider_name,
  COUNT(*) as total_races,
  COUNT(*) FILTER (WHERE r.rank <= 3) as podiums,
  COUNT(*) FILTER (WHERE r.rank = 1) as wins,
  AVG(r.rank) as avg_rank,
  AVG(r.avg_wkg) as avg_power,
  MAX(r.avg_wkg) as max_power,
  AVG(r.effort_score) as avg_effort,
  SUM(r.race_points) as total_race_points,
  MAX(r.event_date) as last_race_date,
  -- Personal Records
  MAX(r.power_5s) as pr_5s,
  MAX(r.power_15s) as pr_15s,
  MAX(r.power_30s) as pr_30s,
  MAX(r.power_1m) as pr_1m,
  MAX(r.power_2m) as pr_2m,
  MAX(r.power_5m) as pr_5m,
  MAX(r.power_20m) as pr_20m
FROM zwift_api_race_results r
INNER JOIN riders rd ON r.rider_id = rd.rider_id
GROUP BY r.rider_id, rd.name;

-- ============================================
-- PART 5: Verificatie
-- ============================================

SELECT 
  'Migration successful - Results Dashboard tables ready' as status,
  (SELECT COUNT(*) FROM zwift_api_race_results) as total_results,
  (SELECT COUNT(*) FROM zwift_api_race_results WHERE power_5s IS NOT NULL) as results_with_power,
  (SELECT COUNT(*) FROM zwift_api_race_results WHERE velo_rating IS NOT NULL) as results_with_velo,
  (SELECT COUNT(*) FROM rider_personal_records) as total_personal_records,
  (SELECT COUNT(DISTINCT rider_id) FROM rider_personal_records) as riders_with_prs;

-- Verificatie query: Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND event_object_table = 'zwift_api_race_results'
ORDER BY trigger_name;
