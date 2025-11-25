-- Fix: Update total_riders voor oude events
-- 
-- DEFINITIE:
-- - total_riders = penTotal (aantal deelnemers in de PEN/category, bijv. cat B)
-- - position_in_category = rank binnen die pen
--
-- Voor NIEUWE events wordt penTotal correct opgeslagen via rider.history sync
-- Voor OUDE events (>30 dagen) schatten we: MAX(position_in_category) per event+pen

-- Stap 1: Reset alle total_riders naar NULL (huidige waarden zijn incorrect)
UPDATE zwift_api_race_results
SET total_riders = NULL
WHERE total_riders IS NOT NULL;

-- Stap 2: Update total_riders = MAX(position_in_category) per event
-- Dit is een SCHATTING voor oude data (nieuwe data krijgt accurate penTotal)
UPDATE zwift_api_race_results
SET total_riders = (
  SELECT MAX(COALESCE(position_in_category, position, rank))
  FROM zwift_api_race_results sub
  WHERE sub.event_id = zwift_api_race_results.event_id
    AND sub.pen = zwift_api_race_results.pen
)
WHERE total_riders IS NULL;

-- NOTA: Voor oude events is dit een minimum schatting
-- Nieuwe syncs slaan penTotal correct op uit rider.history[].penTotal

-- Verificatie
SELECT 
  'total_riders updated!' as status,
  COUNT(*) FILTER (WHERE total_riders IS NOT NULL) as events_with_total,
  COUNT(*) FILTER (WHERE total_riders IS NULL) as events_without_total,
  COUNT(*) as total_results
FROM zwift_api_race_results;

-- Voorbeeld check: Toon eerste 5 events met hun total_riders
SELECT DISTINCT
  event_id,
  event_name,
  event_date,
  total_riders,
  (SELECT COUNT(*) FROM zwift_api_race_results r WHERE r.event_id = zwift_api_race_results.event_id) as team_results
FROM zwift_api_race_results
ORDER BY event_date DESC
LIMIT 5;
