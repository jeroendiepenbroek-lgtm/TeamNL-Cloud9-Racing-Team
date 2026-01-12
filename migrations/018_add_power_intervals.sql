-- Migration: 018_add_power_intervals
-- Add power interval columns to race_results table
-- These intervals match ZwiftRacing.app format

ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS power_5s INTEGER,
  ADD COLUMN IF NOT EXISTS power_15s INTEGER,
  ADD COLUMN IF NOT EXISTS power_30s INTEGER,
  ADD COLUMN IF NOT EXISTS power_1m INTEGER,
  ADD COLUMN IF NOT EXISTS power_2m INTEGER,
  ADD COLUMN IF NOT EXISTS power_5m INTEGER,
  ADD COLUMN IF NOT EXISTS power_20m INTEGER,
  ADD COLUMN IF NOT EXISTS effort_score INTEGER,
  ADD COLUMN IF NOT EXISTS racing_score INTEGER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_race_results_effort ON race_results(effort_score DESC) WHERE effort_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_race_results_racing_score ON race_results(racing_score DESC) WHERE racing_score IS NOT NULL;

-- Comment
COMMENT ON COLUMN race_results.power_5s IS 'Best 5-second average power in watts';
COMMENT ON COLUMN race_results.power_15s IS 'Best 15-second average power in watts';
COMMENT ON COLUMN race_results.power_30s IS 'Best 30-second average power in watts';
COMMENT ON COLUMN race_results.power_1m IS 'Best 1-minute average power in watts';
COMMENT ON COLUMN race_results.power_2m IS 'Best 2-minute average power in watts';
COMMENT ON COLUMN race_results.power_5m IS 'Best 5-minute average power in watts';
COMMENT ON COLUMN race_results.power_20m IS 'Best 20-minute average power in watts';
COMMENT ON COLUMN race_results.effort_score IS 'Effort score from ZwiftRacing.app (0-100)';
COMMENT ON COLUMN race_results.racing_score IS 'Racing Points (RP) from ZwiftRacing.app';
