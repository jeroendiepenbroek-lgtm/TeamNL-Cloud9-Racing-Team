-- Migration: Add heartrate columns to zwift_api_race_results
-- US1: AVG en MAX HRM (Heartrate) toevoegen aan Results Dashboard

-- Add heartrate columns
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS heartrate_avg INTEGER,
  ADD COLUMN IF NOT EXISTS heartrate_max INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN zwift_api_race_results.heartrate_avg IS 'Average heart rate (BPM) during race';
COMMENT ON COLUMN zwift_api_race_results.heartrate_max IS 'Maximum heart rate (BPM) during race';

-- Create index for heartrate queries (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_results_heartrate 
  ON zwift_api_race_results(heartrate_avg, heartrate_max) 
  WHERE heartrate_avg IS NOT NULL;

-- Verification query
SELECT 
  'Heartrate columns added successfully!' as status,
  COUNT(*) FILTER (WHERE heartrate_avg IS NOT NULL) as results_with_hr_avg,
  COUNT(*) FILTER (WHERE heartrate_max IS NOT NULL) as results_with_hr_max,
  COUNT(*) as total_results
FROM zwift_api_race_results;
