-- ============================================================================
-- MIGRATION 012: Event Results Cache
-- ============================================================================
-- Purpose: Cache event results from ZwiftRacing API for faster loading
-- Date: January 2, 2026
-- API: GET https://api.zwiftracing.app/api/public/results/{eventId}
-- ============================================================================

-- Event Results Cache Table
CREATE TABLE IF NOT EXISTS event_results (
  event_id TEXT PRIMARY KEY,
  event_name TEXT,
  event_date TIMESTAMPTZ,
  route_name TEXT,
  distance_km NUMERIC(6,2),
  elevation_m INTEGER,
  world_name TEXT,
  
  -- Complete API response
  results JSONB NOT NULL,
  
  -- Cache metadata
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Performance tracking
  total_riders INTEGER,
  cloud9_riders INTEGER
);

CREATE INDEX idx_event_results_date ON event_results(event_date DESC);
CREATE INDEX idx_event_results_fetched ON event_results(fetched_at DESC);
CREATE INDEX idx_event_results_name ON event_results(event_name);

COMMENT ON TABLE event_results IS 'Cache for ZwiftRacing event results. Reduces API calls and improves page load speed.';

-- Rider Race History Table (denormalized for fast queries)
CREATE TABLE IF NOT EXISTS rider_race_history (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,
  event_id TEXT,
  
  -- Race Info
  event_name TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  route_name TEXT,
  distance_km NUMERIC(6,2),
  
  -- Result
  position INTEGER,
  category TEXT,
  pen TEXT,  -- Category pen (A, B, C, D, E)
  race_time_seconds INTEGER,
  delta_winner_seconds INTEGER,
  
  -- Performance
  avg_wkg NUMERIC(4,2),
  avg_power_watts INTEGER,
  heartrate_avg INTEGER,
  heartrate_max INTEGER,
  
  -- Power intervals
  power_5s NUMERIC(5,1),
  power_15s NUMERIC(5,1),
  power_30s NUMERIC(5,1),
  power_1m NUMERIC(5,1),
  power_2m NUMERIC(5,1),
  power_5m NUMERIC(5,1),
  power_20m NUMERIC(5,1),
  
  -- vELO tracking
  velo_before INTEGER,
  velo_after INTEGER,
  velo_change INTEGER,
  
  -- Flags
  dnf BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_race_history_rider ON rider_race_history(rider_id);
CREATE INDEX idx_race_history_date ON rider_race_history(event_date DESC);
CREATE INDEX idx_race_history_event ON rider_race_history(event_id);
CREATE INDEX idx_race_history_rider_date ON rider_race_history(rider_id, event_date DESC);

COMMENT ON TABLE rider_race_history IS 'Denormalized race history per rider for fast queries. Built from event_results data.';

-- Function to extract Cloud9 riders from event results
CREATE OR REPLACE FUNCTION extract_cloud9_results_from_event(event_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  event_record RECORD;
  result JSONB;
  inserted_count INTEGER := 0;
BEGIN
  -- Get event data
  SELECT * INTO event_record FROM event_results WHERE event_id = event_id_param;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Event % not found', event_id_param;
    RETURN 0;
  END IF;
  
  -- Loop through results array
  FOR result IN SELECT * FROM jsonb_array_elements(event_record.results->'results')
  LOOP
    -- Check if rider is from Cloud9 (you can filter on team name or rider list)
    -- For now, insert all results
    INSERT INTO rider_race_history (
      rider_id, event_id, event_name, event_date,
      position, category, pen,
      race_time_seconds, avg_wkg, velo_after
    ) VALUES (
      (result->>'riderId')::INTEGER,
      event_id_param,
      event_record.event_name,
      event_record.event_date,
      (result->>'position')::INTEGER,
      result->>'category',
      result->>'pen',
      (result->>'timeSeconds')::INTEGER,
      (result->>'avgWkg')::NUMERIC,
      (result->>'veloRating')::INTEGER
    )
    ON CONFLICT DO NOTHING;
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION extract_cloud9_results_from_event IS 'Extract rider results from cached event and insert into rider_race_history';

-- View for recent team results
CREATE OR REPLACE VIEW v_recent_team_results AS
SELECT 
  rh.rider_id,
  r.racing_name,
  r.full_name,
  r.avatar_url,
  rh.event_name,
  rh.event_date,
  rh.position,
  rh.category,
  rh.race_time_seconds,
  rh.avg_wkg,
  rh.velo_after,
  rh.velo_change,
  rh.dnf,
  CASE 
    WHEN rh.position = 1 THEN '🥇'
    WHEN rh.position = 2 THEN '🥈'
    WHEN rh.position = 3 THEN '🥉'
    ELSE NULL
  END as medal
FROM rider_race_history rh
LEFT JOIN v_rider_complete r ON rh.rider_id = r.rider_id
WHERE rh.event_date >= NOW() - INTERVAL '90 days'
ORDER BY rh.event_date DESC, rh.position ASC
LIMIT 100;

COMMENT ON VIEW v_recent_team_results IS 'Last 100 race results for Cloud9 riders in past 90 days';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'event_results table created' as status;
SELECT 'rider_race_history table created' as status;
SELECT 'v_recent_team_results view created' as status;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example: Cache an event
-- INSERT INTO event_results (event_id, event_name, event_date, results)
-- VALUES ('4879983', 'Snowman TTT', '2025-12-29', '{"results": [...]}');

-- Example: Extract Cloud9 results from event
-- SELECT extract_cloud9_results_from_event('4879983');

-- Example: Get rider race history
-- SELECT * FROM rider_race_history WHERE rider_id = 150437 ORDER BY event_date DESC;

-- Example: Get recent team results
-- SELECT * FROM v_recent_team_results LIMIT 20;
