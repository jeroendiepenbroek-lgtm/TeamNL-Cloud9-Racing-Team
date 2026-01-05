-- ============================================================================
-- FIX: Race Results - Change power fields from INTEGER to NUMERIC
-- ============================================================================
-- Probleem: Power waarden zoals "20.911700000000003" kunnen niet als INTEGER
-- Oplossing: Verander power kolommen naar NUMERIC(6,2)
-- De wkg_* kolommen zijn al NUMERIC
-- ============================================================================

-- Voer dit uit in Supabase SQL Editor

-- Step 1: Drop view die afhankelijk is van power kolommen
DROP VIEW IF EXISTS v_race_results_recent CASCADE;

-- Step 2: Alter kolommen naar NUMERIC
ALTER TABLE race_results 
  ALTER COLUMN power_avg TYPE NUMERIC(6,2),
  ALTER COLUMN power_np TYPE NUMERIC(6,2),
  ALTER COLUMN power_ftp TYPE NUMERIC(6,2);

-- Step 3: Recreate view
CREATE OR REPLACE VIEW v_race_results_recent AS
SELECT 
  rr.*,
  rc.racing_name,
  rc.full_name,
  rc.avatar_url,
  rc.country_alpha3,
  rc.zwift_official_category,
  rc.zwiftracing_category,
  RANK() OVER (PARTITION BY rr.rider_id ORDER BY rr.event_date DESC) AS race_rank
FROM race_results rr
LEFT JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
WHERE rr.event_date >= NOW() - INTERVAL '90 days'
ORDER BY rr.event_date DESC;

COMMENT ON VIEW v_race_results_recent IS 'Race results (90 days) with rider details';

-- Verify
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns 
WHERE table_name = 'race_results' 
  AND (column_name LIKE 'power%' OR column_name LIKE 'wkg%')
ORDER BY column_name;

-- Test insert
SELECT 'Schema updated successfully - power columns now accept decimal values' AS status;
