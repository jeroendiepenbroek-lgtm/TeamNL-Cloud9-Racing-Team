-- Create zwift_api_race_results table
-- Run this FIRST if table doesn't exist yet

CREATE TABLE IF NOT EXISTS zwift_api_race_results (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  
  -- Basic race data
  event_name TEXT,
  event_date TIMESTAMPTZ,
  rider_name TEXT,
  rank INTEGER,
  time_seconds INTEGER,
  avg_wkg DECIMAL(6,2),
  
  -- Race metadata
  pen TEXT,
  total_riders INTEGER,
  delta_winner_seconds INTEGER,
  
  -- vELO Rating
  velo_rating INTEGER,
  velo_previous INTEGER,
  velo_change INTEGER,
  
  -- Power Curves (W/kg)
  power_5s DECIMAL(6,2),
  power_15s DECIMAL(6,2),
  power_30s DECIMAL(6,2),
  power_1m DECIMAL(6,2),
  power_2m DECIMAL(6,2),
  power_5m DECIMAL(6,2),
  power_20m DECIMAL(6,2),
  
  -- Performance Metrics
  effort_score INTEGER,
  race_points DECIMAL(6,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(event_id, rider_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_results_rider_date ON zwift_api_race_results(rider_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_results_event ON zwift_api_race_results(event_id, rank);
CREATE INDEX IF NOT EXISTS idx_results_event_date ON zwift_api_race_results(event_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_results_velo ON zwift_api_race_results(rider_id, velo_rating) WHERE velo_rating IS NOT NULL;

-- Foreign key to riders table (COMMENTED OUT for development - allows test data with fake rider IDs)
-- Uncomment this line when using real production data:
-- ALTER TABLE zwift_api_race_results ADD CONSTRAINT fk_rider FOREIGN KEY (rider_id) REFERENCES riders(rider_id) ON DELETE CASCADE;

-- Verification
SELECT 
  'Table created successfully!' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'zwift_api_race_results';
