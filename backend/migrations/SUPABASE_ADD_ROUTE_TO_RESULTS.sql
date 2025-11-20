-- Migration: Add route columns to zwift_api_race_results
-- Voor Route Details in Results Dashboard
-- RUN IN SUPABASE SQL EDITOR

-- STAP 1: Drop FK constraint tijdelijk (als deze bestaat)
ALTER TABLE zwift_api_race_results 
  DROP CONSTRAINT IF EXISTS fk_rider;

-- STAP 2: Voeg route kolommen toe aan results tabel
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS sub_type TEXT,
  ADD COLUMN IF NOT EXISTS route_world TEXT,
  ADD COLUMN IF NOT EXISTS route_name TEXT,
  ADD COLUMN IF NOT EXISTS route_profile TEXT,
  ADD COLUMN IF NOT EXISTS distance_km TEXT,
  ADD COLUMN IF NOT EXISTS elevation_m INTEGER,
  ADD COLUMN IF NOT EXISTS laps INTEGER;

-- Update existing seed data met route details
UPDATE zwift_api_race_results SET
  event_type = 'RACE',
  sub_type = 'Scratch',
  route_world = 'Watopia',
  route_name = 'Avon Flyer',
  route_profile = 'Flat',
  distance_km = '5.1',
  elevation_m = 25,
  laps = 1
WHERE event_id = '5000001';

UPDATE zwift_api_race_results SET
  event_type = 'RACE',
  sub_type = 'Scratch',
  route_world = 'Watopia',
  route_name = 'Flat Route',
  route_profile = 'Flat',
  distance_km = '10.2',
  elevation_m = 15,
  laps = 2
WHERE event_id = '5000002';

UPDATE zwift_api_race_results SET
  event_type = 'RACE',
  sub_type = 'Scratch',
  route_world = 'Watopia',
  route_name = 'Volcano Circuit',
  route_profile = 'Hilly',
  distance_km = '8.5',
  elevation_m = 180,
  laps = 3
WHERE event_id = '5000003';

UPDATE zwift_api_race_results SET
  event_type = 'RACE',
  sub_type = 'Scratch',
  route_world = 'France',
  route_name = 'Alpe du Zwift',
  route_profile = 'Mountainous',
  distance_km = '12.2',
  elevation_m = 1036,
  laps = 1
WHERE event_id = '5000004';

UPDATE zwift_api_race_results SET
  event_type = 'RACE',
  sub_type = 'Scratch',
  route_world = 'Makuri Islands',
  route_name = 'Neokyo Sprint',
  route_profile = 'Flat',
  distance_km = '3.8',
  elevation_m = 5,
  laps = 4
WHERE event_id = '5000005';

-- Verificatie
SELECT 
  event_id,
  event_name,
  route_world,
  route_name,
  distance_km,
  elevation_m,
  route_profile,
  COUNT(*) as results_count
FROM zwift_api_race_results
GROUP BY event_id, event_name, route_world, route_name, distance_km, elevation_m, route_profile
ORDER BY event_id DESC;
