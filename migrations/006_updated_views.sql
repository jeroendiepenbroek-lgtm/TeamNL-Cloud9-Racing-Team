-- ============================================================================
-- MIGRATION 006: Updated Views for New ZwiftRacing Riders Table
-- ============================================================================
-- Purpose: Update all views to use api_zwiftracing_riders instead of clubs
-- Date: 10 december 2025
-- ============================================================================

-- Drop all existing views
DROP VIEW IF EXISTS v_rider_complete CASCADE;
DROP VIEW IF EXISTS v_team_rankings CASCADE;
DROP VIEW IF EXISTS v_power_rankings CASCADE;
DROP VIEW IF EXISTS v_event_results CASCADE;
DROP VIEW IF EXISTS v_activities_feed CASCADE;
DROP VIEW IF EXISTS v_race_calendar CASCADE;
DROP VIEW IF EXISTS v_event_signup_preview CASCADE;
DROP VIEW IF EXISTS v_social_network CASCADE;
DROP VIEW IF EXISTS v_dashboard_summary CASCADE;

-- ============================================================================
-- VIEW 1: Complete Rider Profile (Racing Matrix / Team Dashboard)
-- ============================================================================

CREATE OR REPLACE VIEW v_rider_complete AS
SELECT 
  -- Identity (prefer Zwift Official for official data)
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  
  -- Racing Metrics (combined sources)
  zr.velo_live,
  zr.velo_30day,
  zr.velo_90day,
  zo.competition_racing_score AS zwift_official_racing_score,
  zo.competition_category AS zwift_official_category,
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  
  -- Power Curve (only from ZwiftRacing)
  zr.ftp AS racing_ftp,
  zr.power_5s, zr.power_15s, zr.power_30s, zr.power_60s,
  zr.power_120s, zr.power_300s, zr.power_1200s,
  zr.power_5s_wkg, zr.power_15s_wkg, zr.power_30s_wkg,
  zr.power_60s_wkg, zr.power_120s_wkg, zr.power_300s_wkg,
  zr.power_1200s_wkg,
  
  -- Physical (prefer Official for accuracy, convert from grams to kg)
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  COALESCE(zo.height, zr.height) AS height_cm,
  COALESCE(zo.ftp, zr.ftp) AS ftp_watts,
  
  -- Avatar & Visual (only from Official)
  zo.image_src AS avatar_url,
  zo.image_src_large AS avatar_url_large,
  
  -- Social Stats (only from Official)
  zo.followers_count,
  zo.followees_count,
  zo.rideons_given,
  
  -- Demographics (only from Official)
  zo.age,
  zo.male AS is_male,
  zo.country_code,
  zo.country_alpha3,
  
  -- Achievements (only from Official)
  zo.achievement_level,
  zo.total_distance / 1000.0 AS total_distance_km,
  zo.total_distance_climbed AS total_elevation_m,
  
  -- Privacy (only from Official)
  zo.privacy_profile,
  zo.privacy_activities,
  
  -- Status
  zo.riding AS currently_riding,
  zo.world_id AS current_world,
  
  -- Sync tracking
  zr.fetched_at AS racing_data_updated,
  zo.fetched_at AS profile_data_updated,
  
  -- Source indicators
  CASE 
    WHEN zr.rider_id IS NOT NULL AND zo.rider_id IS NOT NULL THEN 'complete'
    WHEN zr.rider_id IS NOT NULL THEN 'racing_only'
    WHEN zo.rider_id IS NOT NULL THEN 'profile_only'
  END AS data_completeness

FROM api_zwift_api_profiles zo
FULL OUTER JOIN api_zwiftracing_riders zr ON zo.rider_id = zr.rider_id;

COMMENT ON VIEW v_rider_complete IS 
  'Complete rider data combining Zwift Official + ZwiftRacing.app.
   NO club dependency - direct rider lookup.
   Used by: Racing Matrix, Team Dashboard.
   Test: SELECT * FROM v_rider_complete WHERE rider_id = 150437;';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Created v_rider_complete view';
  RAISE NOTICE '📊 Uses: api_zwift_api_profiles + api_zwiftracing_riders';
  RAISE NOTICE '🎯 NO club dependency';
END $$;
