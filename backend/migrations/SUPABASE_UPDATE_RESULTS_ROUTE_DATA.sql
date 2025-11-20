-- UPDATE: Voeg route details toe aan bestaande seed data
-- Run dit in Supabase SQL Editor

-- Event 1: WTRL TTT - Stage 1 (A pen)
UPDATE zwift_api_race_results SET
  route_world = 'Watopia',
  route_name = 'Tempus Fugit',
  route_profile = 'Flat',
  distance_km = '42.2',
  elevation_m = 125,
  laps = 1,
  event_type = 'Race',
  sub_type = 'TTT'
WHERE event_id = '5000001';

-- Event 2: ZRL Premier - Watopia Flat (B pen)
UPDATE zwift_api_race_results SET
  route_world = 'Watopia',
  route_name = 'Flat Route',
  route_profile = 'Flat',
  distance_km = '31.5',
  elevation_m = 45,
  laps = 2,
  event_type = 'Race',
  sub_type = 'Scratch'
WHERE event_id = '5000002';

-- Event 3: Club Race - Volcano Circuit (C pen)
UPDATE zwift_api_race_results SET
  route_world = 'Watopia',
  route_name = 'Volcano Circuit',
  route_profile = 'Rolling',
  distance_km = '28.3',
  elevation_m = 320,
  laps = 3,
  event_type = 'Race',
  sub_type = 'Circuit'
WHERE event_id = '5000003';

-- Event 4: KISS Race - Alpe du Zwift (A pen)
UPDATE zwift_api_race_results SET
  route_world = 'France',
  route_name = 'Alpe du Zwift',
  route_profile = 'Mountainous',
  distance_km = '12.2',
  elevation_m = 1015,
  laps = 1,
  event_type = 'Race',
  sub_type = 'Climb'
WHERE event_id = '5000004';

-- Event 5: SZR Sprint Series (B pen)
UPDATE zwift_api_race_results SET
  route_world = 'London',
  route_name = 'Surrey Hills',
  route_profile = 'Hilly',
  distance_km = '24.7',
  elevation_m = 450,
  laps = 2,
  event_type = 'Race',
  sub_type = 'Sprint'
WHERE event_id = '5000005';

-- Verificatie
SELECT 
  event_name, 
  route_world, 
  route_name, 
  distance_km, 
  elevation_m, 
  route_profile,
  event_type,
  sub_type,
  COUNT(*) as riders
FROM zwift_api_race_results
GROUP BY event_id, event_name, route_world, route_name, distance_km, elevation_m, route_profile, event_type, sub_type
ORDER BY event_date DESC;
