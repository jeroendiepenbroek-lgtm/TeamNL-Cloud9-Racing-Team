-- =============================================
-- MIGRATION 009: Category Fallback
-- =============================================
-- Fix: Use ZwiftRacing category as fallback when Zwift.com category is NULL
-- Issue: 4 riders (1076179, 3067920, 3137561, 4562003) have NULL Zwift.com category
-- Solution: COALESCE(zwift_official_category, zwiftracing_category)

BEGIN;

-- Drop existing view
DROP VIEW IF EXISTS v_rider_complete;

-- Recreate with category fallback
CREATE VIEW v_rider_complete AS
SELECT 
  -- Identity (prefer Zwift Official for official data)
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  
  -- Team Status
  tm.is_active AS is_team_member,
  tm.added_at AS team_member_since,
  tm.last_synced AS team_last_synced,
  
  -- Racing Metrics (combined sources with FALLBACK)
  zr.velo_live,
  zr.velo_30day,
  zr.velo_90day,
  zo.competition_racing_score AS zwift_official_racing_score,
  
  -- ✨ NEW: Category fallback - use ZwiftRacing if Zwift.com is NULL
  COALESCE(zo.competition_category, zr.category) AS zwift_official_category,
  
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  
  -- Race Results Statistics
  zr.race_wins,
  zr.race_podiums,
  zr.race_finishes,
  zr.race_dnfs,
  
  -- Win Rate & Success Metrics (calculated)
  CASE 
    WHEN zr.race_finishes > 0 
    THEN ROUND((zr.race_wins::NUMERIC / zr.race_finishes * 100), 1)
    ELSE 0 
  END AS win_rate_pct,
  CASE 
    WHEN zr.race_finishes > 0 
    THEN ROUND((zr.race_podiums::NUMERIC / zr.race_finishes * 100), 1)
    ELSE 0 
  END AS podium_rate_pct,
  CASE 
    WHEN zr.race_count > 0 
    THEN ROUND((zr.race_dnfs::NUMERIC / zr.race_count * 100), 1)
    ELSE 0 
  END AS dnf_rate_pct,
  
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
FULL OUTER JOIN api_zwiftracing_riders zr ON zo.rider_id = zr.rider_id
LEFT JOIN team_roster tm ON COALESCE(zo.rider_id, zr.rider_id) = tm.rider_id;

-- Update comment
COMMENT ON VIEW v_rider_complete IS 
  'Complete rider data with team membership status and category fallback.
   
   ✨ NEW in v009:
   - zwift_official_category now uses COALESCE(zo.competition_category, zr.category)
   - Fixes 4 riders (1076179, 3067920, 3137561, 4562003) who had NULL Zwift.com category
   
   Previous features:
   - is_team_member, team_member_since, team_last_synced
   - race_wins, race_podiums, race_finishes, race_dnfs
   - win_rate_pct, podium_rate_pct, dnf_rate_pct
   - admin_notes for team management
   
   Test queries:
   SELECT rider_id, full_name, zwift_official_category, zwiftracing_category 
   FROM v_rider_complete WHERE rider_id IN (1076179, 3067920, 3137561, 4562003);';

-- Grant permissions
GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;

-- Success logging
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 009: Category fallback applied';
  RAISE NOTICE '   - zwift_official_category now uses ZwiftRacing as fallback';
  RAISE NOTICE '   - Fixed 4 riders with NULL Zwift.com category';
END $$;

COMMIT;
