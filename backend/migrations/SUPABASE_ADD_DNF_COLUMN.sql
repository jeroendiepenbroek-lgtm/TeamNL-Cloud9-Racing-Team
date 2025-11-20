-- Add DNF (Did Not Finish) column to race results
-- Run dit in Supabase SQL Editor

-- Step 1: Add DNF column
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS dnf BOOLEAN DEFAULT FALSE;

-- Step 2: Create index for DNF queries
CREATE INDEX IF NOT EXISTS idx_zwift_api_race_results_dnf 
  ON zwift_api_race_results(dnf) 
  WHERE dnf = TRUE;

-- Step 3: Update seed data - mark one rider as DNF for testing
-- Event 3 - Emma Davis DNF (rank blijft behouden voor history, maar DNF flag is true)
UPDATE zwift_api_race_results 
SET dnf = TRUE 
WHERE event_id = '5000003' AND rider_id = 123459;

-- Step 4: Verify DNF data
SELECT 
  event_id,
  event_name,
  rider_name,
  rank,
  dnf,
  time_seconds
FROM zwift_api_race_results
WHERE dnf = TRUE
ORDER BY event_date DESC;

-- Expected: 1 row (Emma Davis in Event 5000003)
