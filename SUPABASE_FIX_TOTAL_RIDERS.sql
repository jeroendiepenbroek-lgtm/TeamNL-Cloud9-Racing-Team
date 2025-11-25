-- Fix: Update total_riders voor alle events
-- NOTA: Voor oude events (>30 dagen) heeft Zwift API geen data meer
-- We schatten total_riders = MAX(position) van onze team members
-- Dit is een MINIMUM schatting - het echte getal kan hoger zijn

-- Stap 1: Update total_riders gebaseerd op MAX(position) per event
-- position = overall position in event (niet gefilterd op team)
UPDATE zwift_api_race_results
SET total_riders = (
  SELECT MAX(COALESCE(position, rank))
  FROM zwift_api_race_results sub
  WHERE sub.event_id = zwift_api_race_results.event_id
)
WHERE total_riders IS NULL;

-- WAARSCHUWING: Dit is een SCHATTING!
-- Als onze slechtste team rider positie 139 heeft, 
-- dan waren er MINIMAAL 139 deelnemers (waarschijnlijk meer)

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
