-- =============================================
-- FIX: Add 'name' column to v_rider_complete
-- Also fixes display issues in frontend
-- =============================================

DROP VIEW IF EXISTS v_rider_complete CASCADE;

CREATE VIEW v_rider_complete AS
SELECT 
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  
  -- ✨ NEW: Add 'name' as primary display name (matches frontend interface)
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name, 'Rider ' || COALESCE(zo.rider_id, zr.rider_id)) AS name,
  
  -- Keep existing name fields for compatibility
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  
  tm.is_active AS is_team_member,
  tm.added_at AS team_member_since,
  tm.last_synced AS team_last_synced,
  zr.velo_live,
  zr.velo_30day,
  zr.velo_90day,
  zo.competition_racing_score AS zwift_official_racing_score,
  
  -- ✨ US5: Use ZwiftRacing category as fallback, AND upgrade A to A+ when appropriate
  CASE 
    WHEN zo.competition_category = 'A' AND zr.category = 'A+' THEN 'A+'
    WHEN zr.category = 'A+' THEN 'A+'
    ELSE COALESCE(zo.competition_category, zr.category)
  END AS zwift_official_category,
  
  zr.phenotype,
  zr.category AS zwiftracing_category,
  zr.race_count,
  zr.race_wins,
  zr.race_podiums,
  zr.race_finishes,
  zr.race_dnfs,
  CASE WHEN zr.race_finishes > 0 THEN ROUND((zr.race_wins::NUMERIC / zr.race_finishes * 100), 1) ELSE 0 END AS win_rate_pct,
  CASE WHEN zr.race_finishes > 0 THEN ROUND((zr.race_podiums::NUMERIC / zr.race_finishes * 100), 1) ELSE 0 END AS podium_rate_pct,
  CASE WHEN zr.race_count > 0 THEN ROUND((zr.race_dnfs::NUMERIC / zr.race_count * 100), 1) ELSE 0 END AS dnf_rate_pct,
  zr.ftp AS racing_ftp,
  zr.power_5s, zr.power_15s, zr.power_30s, zr.power_60s,
  zr.power_120s, zr.power_300s, zr.power_1200s,
  zr.power_5s_wkg, zr.power_15s_wkg, zr.power_30s_wkg,
  zr.power_60s_wkg, zr.power_120s_wkg, zr.power_300s_wkg,
  zr.power_1200s_wkg,
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  COALESCE(zo.height, zr.height) AS height_cm,
  COALESCE(zo.ftp, zr.ftp) AS ftp_watts,
  zo.image_src AS avatar_url,
  zo.image_src_large AS avatar_url_large,
  zo.followers_count,
  zo.followees_count,
  zo.rideons_given,
  zo.age,
  zo.male AS is_male,
  zo.country_code,
  zo.country_alpha3,
  zo.achievement_level,
  zo.total_distance / 1000.0 AS total_distance_km,
  zo.total_distance_climbed AS total_elevation_m,
  zo.privacy_profile,
  zo.privacy_activities,
  zo.riding AS currently_riding,
  zo.world_id AS current_world,
  zr.fetched_at AS racing_data_updated,
  zo.fetched_at AS profile_data_updated,
  CASE 
    WHEN zr.rider_id IS NOT NULL AND zo.rider_id IS NOT NULL THEN 'complete'
    WHEN zr.rider_id IS NOT NULL THEN 'racing_only'
    WHEN zo.rider_id IS NOT NULL THEN 'profile_only'
  END AS data_completeness
FROM api_zwift_api_profiles zo
FULL OUTER JOIN api_zwiftracing_riders zr ON zo.rider_id = zr.rider_id
LEFT JOIN team_roster tm ON COALESCE(zo.rider_id, zr.rider_id) = tm.rider_id;

GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;

-- Test: Check name fields
SELECT 
  rider_id,
  name,
  full_name,
  racing_name,
  CASE 
    WHEN name = full_name THEN '✓ name = full_name'
    WHEN name = racing_name THEN '⚠ name = racing_name only'
    ELSE '❌ name mismatch'
  END AS name_status
FROM v_rider_complete
WHERE is_team_member = true
LIMIT 10;
