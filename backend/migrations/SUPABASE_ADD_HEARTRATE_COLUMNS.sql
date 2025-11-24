-- Add heartrate columns to zwift_api_race_results
-- Run this in Supabase SQL Editor

ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS heartrate_avg INTEGER,
  ADD COLUMN IF NOT EXISTS heartrate_max INTEGER;

-- Verification
SELECT 
  'Heartrate columns added!' as status,
  COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'zwift_api_race_results'
  AND column_name IN ('heartrate_avg', 'heartrate_max');
