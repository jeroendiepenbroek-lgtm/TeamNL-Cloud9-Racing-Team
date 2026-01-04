-- ============================================================================
-- DEFINITIEVE FIX: Race Results View - Correcte kolom namen
-- ============================================================================
-- Voer dit uit in Supabase SQL Editor
-- Datum: 4 januari 2026
-- ============================================================================

-- Probleem: v_race_results_recent probeert 'category' te gebruiken
-- maar v_rider_complete heeft 'zwift_official_category' en 'zwiftracing_category'

-- Drop oude view
DROP VIEW IF EXISTS v_race_results_recent CASCADE;

-- Maak nieuwe view met correcte kolom namen
CREATE OR REPLACE VIEW v_race_results_recent AS
SELECT 
  rr.*,
  rc.racing_name,
  rc.full_name,
  rc.avatar_url,
  rc.country_alpha3,
  rc.zwift_official_category,  -- Correcte kolom naam!
  rc.zwiftracing_category,
  RANK() OVER (PARTITION BY rr.rider_id ORDER BY rr.event_date DESC) AS race_rank
FROM race_results rr
LEFT JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
WHERE rr.event_date >= NOW() - INTERVAL '90 days'
ORDER BY rr.event_date DESC;

COMMENT ON VIEW v_race_results_recent IS 'Race results (90 days) with rider details - gebruikt correcte kolom namen uit v_rider_complete';

-- Verify
SELECT 'View successfully created' AS status;

-- Test query
SELECT 
  rider_id, 
  racing_name, 
  zwift_official_category,
  zwiftracing_category,
  COUNT(*) as race_count
FROM v_race_results_recent
GROUP BY rider_id, racing_name, zwift_official_category, zwiftracing_category
LIMIT 5;
