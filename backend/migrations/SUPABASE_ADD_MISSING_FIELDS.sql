-- Migration: Add all missing fields to zwift_api_race_results
-- Comprehensive update voor alle User Stories
-- RUN IN SUPABASE SQL EDITOR

-- US1: Separate position fields for accuracy
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS position INTEGER,
  ADD COLUMN IF NOT EXISTS position_in_category INTEGER;

-- Heartrate fields (US: Hartslag metrics)
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS heartrate_avg INTEGER,
  ADD COLUMN IF NOT EXISTS heartrate_max INTEGER;

-- Route details (US4: Complete route info)
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS route_world TEXT,
  ADD COLUMN IF NOT EXISTS route_name TEXT,
  ADD COLUMN IF NOT EXISTS route_profile TEXT,
  ADD COLUMN IF NOT EXISTS distance_km TEXT,
  ADD COLUMN IF NOT EXISTS elevation_m INTEGER,
  ADD COLUMN IF NOT EXISTS laps INTEGER,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS sub_type TEXT;

-- Comment: rank blijft behouden als "best position" (position || positionInCategory fallback)

-- Verification query
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'zwift_api_race_results' 
  AND column_name IN (
    'position', 
    'position_in_category', 
    'heartrate_avg', 
    'heartrate_max',
    'route_world',
    'route_name',
    'route_profile',
    'distance_km',
    'elevation_m',
    'laps',
    'event_type',
    'sub_type'
  )
ORDER BY column_name;
