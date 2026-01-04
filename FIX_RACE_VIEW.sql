-- ============================================================================
-- KRITIEKE FIX: v_race_results_recent view verwijdert category kolom
-- ============================================================================
-- VOER DIT UIT IN SUPABASE SQL EDITOR
-- Datum: 4 januari 2026
-- ============================================================================

-- Drop de oude view eerst (force recreate)
DROP VIEW IF EXISTS v_race_results_recent CASCADE;

-- Maak nieuwe view zonder category kolom
CREATE VIEW v_race_results_recent AS
SELECT 
  rr.*,
  rc.racing_name,
  rc.full_name,
  rc.avatar_url,
  rc.country_alpha3,
  RANK() OVER (PARTITION BY rr.rider_id ORDER BY rr.event_date DESC) AS race_rank
FROM race_results rr
LEFT JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
WHERE rr.event_date >= NOW() - INTERVAL '90 days'
ORDER BY rr.event_date DESC;

-- Verify
SELECT 'View created successfully' AS status;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'v_race_results_recent' 
ORDER BY ordinal_position;
