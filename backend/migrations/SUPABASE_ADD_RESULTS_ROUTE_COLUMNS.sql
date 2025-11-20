-- Migration: Add route columns to zwift_api_race_results
-- Voor Results Dashboard met complete route details
-- RUN IN SUPABASE SQL EDITOR FIRST

-- Voeg route kolommen toe
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS route_world TEXT,
  ADD COLUMN IF NOT EXISTS route_name TEXT,
  ADD COLUMN IF NOT EXISTS route_profile TEXT,
  ADD COLUMN IF NOT EXISTS distance_km TEXT,
  ADD COLUMN IF NOT EXISTS elevation_m INTEGER,
  ADD COLUMN IF NOT EXISTS laps INTEGER,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS sub_type TEXT;

-- Verificatie
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'zwift_api_race_results' 
  AND column_name IN ('route_world', 'route_name', 'route_profile', 'distance_km', 'elevation_m', 'laps', 'event_type', 'sub_type')
ORDER BY column_name;
