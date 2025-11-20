-- COMPLETE RESULTS DASHBOARD SETUP
-- Run dit VOLLEDIG script in Supabase SQL Editor voor een werkende Results Dashboard
-- Dit script doet alles: table creation, route columns, seed data

-- ============================================
-- STAP 1: Drop FK constraint (als deze bestaat)
-- ============================================
ALTER TABLE zwift_api_race_results 
  DROP CONSTRAINT IF EXISTS fk_rider;

-- ============================================
-- STAP 2: Voeg route kolommen toe (als ze nog niet bestaan)
-- ============================================
ALTER TABLE zwift_api_race_results 
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS sub_type TEXT,
  ADD COLUMN IF NOT EXISTS route_world TEXT,
  ADD COLUMN IF NOT EXISTS route_name TEXT,
  ADD COLUMN IF NOT EXISTS route_profile TEXT,
  ADD COLUMN IF NOT EXISTS distance_km TEXT,
  ADD COLUMN IF NOT EXISTS elevation_m INTEGER,
  ADD COLUMN IF NOT EXISTS laps INTEGER;

-- ============================================
-- STAP 3: Update bestaande seed data met route details
-- ============================================

-- Event 1: WTRL TTT - Stage 1 (PEN A) - Watopia Avon Flyer
UPDATE zwift_api_race_results SET
  event_type = 'Race',
  sub_type = 'Scratch',
  route_world = 'Watopia',
  route_name = 'Avon Flyer',
  route_profile = 'Flat',
  distance_km = '5.1',
  elevation_m = 25,
  laps = 1
WHERE event_id = '5000001';

-- Event 2: ZRL Premier - Watopia Flat (PEN B)
UPDATE zwift_api_race_results SET
  event_type = 'Race',
  sub_type = 'Scratch',
  route_world = 'Watopia',
  route_name = 'Flat Route',
  route_profile = 'Flat',
  distance_km = '10.2',
  elevation_m = 15,
  laps = 2
WHERE event_id = '5000002';

-- Event 3: Club Race - Volcano Circuit (PEN C)
UPDATE zwift_api_race_results SET
  event_type = 'Race',
  sub_type = 'Scratch',
  route_world = 'Watopia',
  route_name = 'Volcano Circuit',
  route_profile = 'Hilly',
  distance_km = '8.5',
  elevation_m = 180,
  laps = 3
WHERE event_id = '5000003';

-- Event 4: KISS Race - Alpe du Zwift (PEN A)
UPDATE zwift_api_race_results SET
  event_type = 'Race',
  sub_type = 'Scratch',
  route_world = 'France',
  route_name = 'Alpe du Zwift',
  route_profile = 'Mountainous',
  distance_km = '12.2',
  elevation_m = 1036,
  laps = 1
WHERE event_id = '5000004';

-- Event 5: SZR Sprint Series (PEN B)
UPDATE zwift_api_race_results SET
  event_type = 'Race',
  sub_type = 'Scratch',
  route_world = 'Makuri Islands',
  route_name = 'Neokyo Sprint',
  route_profile = 'Flat',
  distance_km = '3.8',
  elevation_m = 5,
  laps = 4
WHERE event_id = '5000005';

-- ============================================
-- STAP 4: Verificatie - Toon alle events met route details
-- ============================================
SELECT 
  event_id,
  event_name,
  route_world,
  route_name,
  distance_km || ' km' as distance,
  elevation_m || 'm ↑' as elevation,
  route_profile,
  event_type,
  sub_type,
  laps || ' lap(s)' as laps,
  COUNT(*) as team_riders
FROM zwift_api_race_results
GROUP BY event_id, event_name, route_world, route_name, distance_km, elevation_m, route_profile, event_type, sub_type, laps
ORDER BY event_id;

-- Success message
SELECT 
  '✅ Results Dashboard Setup Complete!' as status,
  'Refresh /results page to see route details' as next_step;
