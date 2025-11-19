-- Fix: distance_meters conversie bug
-- 
-- Probleem: sync-v2.service.ts deed * 1000 op distance terwijl API al meters geeft
-- Resultaat: distance_meters bevat 25000000 ipv 25000 (25000 km ipv 25 km)
--
-- Deze fix: Deel door 1000 voor alle events met distance_meters > 1000000
-- (> 1000 km is onrealistisch voor Zwift race)

UPDATE zwift_api_events 
SET distance_meters = distance_meters / 1000 
WHERE distance_meters > 1000000;

-- Verifieer resultaat:
-- SELECT event_id, title, distance_meters, distance_meters / 1000 as distance_km 
-- FROM zwift_api_events 
-- WHERE distance_meters IS NOT NULL 
-- ORDER BY time_unix DESC 
-- LIMIT 10;
