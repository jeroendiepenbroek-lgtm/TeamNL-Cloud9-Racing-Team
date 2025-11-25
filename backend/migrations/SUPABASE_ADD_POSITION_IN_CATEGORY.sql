-- Migration: Add position_in_category column to zwift_api_race_results
-- US: PositionInCategory en Positie goed doorvoeren bij resultaten

-- Add position_in_category column
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS position_in_category INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN zwift_api_race_results.position_in_category IS 'Position within category/pen (used as primary display)';

-- Create index for position_in_category queries
CREATE INDEX IF NOT EXISTS idx_results_position_in_category 
  ON zwift_api_race_results(event_id, position_in_category) 
  WHERE position_in_category IS NOT NULL;

-- Verification query
SELECT 
  'Position_in_category column added successfully!' as status,
  COUNT(*) FILTER (WHERE position_in_category IS NOT NULL) as results_with_position_in_category,
  COUNT(*) FILTER (WHERE position IS NOT NULL) as results_with_position,
  COUNT(*) as total_results
FROM zwift_api_race_results;
