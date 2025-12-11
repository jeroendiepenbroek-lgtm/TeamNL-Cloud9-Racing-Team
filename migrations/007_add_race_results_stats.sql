-- ============================================================================
-- MIGRATION 007: Add Race Results Statistics (Wins, Podiums, DNFs)
-- ============================================================================
-- Purpose: Add wins, podiums, finishes, and DNFs to zwiftracing_riders table
-- Source: ZwiftRacing.app API - velo object
-- Date: 11 december 2025
-- ============================================================================

-- Add race statistics columns to api_zwiftracing_riders
ALTER TABLE api_zwiftracing_riders
  ADD COLUMN IF NOT EXISTS race_wins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS race_podiums INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS race_finishes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS race_dnfs INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN api_zwiftracing_riders.race_wins IS 
  'Total race wins (1st place) - from ZwiftRacing velo.wins';
COMMENT ON COLUMN api_zwiftracing_riders.race_podiums IS 
  'Total podium finishes (1st-3rd place) - from ZwiftRacing velo.podiums';
COMMENT ON COLUMN api_zwiftracing_riders.race_finishes IS 
  'Total completed races - from ZwiftRacing velo.finishes';
COMMENT ON COLUMN api_zwiftracing_riders.race_dnfs IS 
  'Did Not Finish count - from ZwiftRacing velo.dnfs';

-- Create index for sorting by wins/podiums
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_riders_wins 
  ON api_zwiftracing_riders(race_wins DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_api_zwiftracing_riders_podiums 
  ON api_zwiftracing_riders(race_podiums DESC NULLS LAST);

-- ============================================================================
-- UPDATE VIEW: v_rider_complete
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
  
  -- Race Results Statistics (NEW!)
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
FULL OUTER JOIN api_zwiftracing_riders zr ON zo.rider_id = zr.rider_id;

COMMENT ON VIEW v_rider_complete IS 
  'Complete rider data with race results (wins, podiums, DNFs).
   Sources: Zwift Official + ZwiftRacing.app
   New fields: race_wins, race_podiums, race_finishes, race_dnfs, win_rate_pct, podium_rate_pct, dnf_rate_pct
   Test: SELECT rider_id, full_name, race_wins, race_podiums, race_dnfs FROM v_rider_complete WHERE rider_id = 150437;';

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
  RAISE NOTICE '✅ Added race_wins, race_podiums, race_finishes, race_dnfs columns';
  RAISE NOTICE '✅ Updated v_rider_complete view with race statistics';
  RAISE NOTICE '📊 New calculated fields: win_rate_pct, podium_rate_pct, dnf_rate_pct';
  RAISE NOTICE '🎯 Ready for dashboard integration';
END $$;
