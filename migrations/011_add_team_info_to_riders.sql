-- ============================================================================
-- Migration 011: Add team_id and team_name to v_rider_complete
-- ============================================================================
-- Purpose: Enable team filtering in Rider Passport Gallery
-- Adds: team_id, team_name fields from team_lineups and competition_teams
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔄 Starting Migration 011: Add team info to v_rider_complete...';
END $$;

-- Drop and recreate v_rider_complete with team information
DROP VIEW IF EXISTS v_rider_complete CASCADE;

CREATE VIEW v_rider_complete AS
SELECT 
  -- Identity (prefer Zwift Official for official data)
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  
  -- Team Status (NEW: added team_id and team_name)
  tm.is_active AS is_team_member,
  tm.added_at AS team_member_since,
  tm.last_synced AS team_last_synced,
  tl.team_id,
  ct.team_name,
  
  -- Racing Metrics (combined sources with FALLBACK)
  zr.velo_live,
  zr.velo_30day,
  zr.velo_90day,
  zo.competition_racing_score AS zwift_official_racing_score,
  
  -- Category fallback - use ZwiftRacing if Zwift.com is NULL
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
LEFT JOIN team_roster tm ON COALESCE(zo.rider_id, zr.rider_id) = tm.rider_id
LEFT JOIN team_lineups tl ON COALESCE(zo.rider_id, zr.rider_id) = tl.rider_id AND tl.is_valid = true
LEFT JOIN competition_teams ct ON tl.team_id = ct.id;

COMMENT ON VIEW v_rider_complete IS 
  'Complete rider data with team info, category fallback and race statistics.
   
   ✨ NEW in v011:
   - team_id: ID of the competition team (from team_lineups)
   - team_name: Name of the competition team (from competition_teams)
   - Enables team filtering in Rider Passport Gallery
   
   Previous features (v009):
   - zwift_official_category uses COALESCE(zo.competition_category, zr.category)
   - is_team_member, team_member_since, team_last_synced
   - race_wins, race_podiums, race_finishes, race_dnfs
   
   Sources: 
   - api_zwift_api_profiles (profile data)
   - api_zwiftracing_riders (racing data)
   - team_roster (membership status)
   - team_lineups (team assignments)
   - competition_teams (team names)
   
   Test: 
   SELECT rider_id, full_name, team_id, team_name, zwift_official_category 
   FROM v_rider_complete 
   WHERE team_id IS NOT NULL 
   LIMIT 5;';

-- Grant permissions
GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;

-- Verification
DO $$ 
DECLARE
  v_riders_with_teams INTEGER;
  v_total_riders INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_riders FROM v_rider_complete WHERE is_team_member = true;
  SELECT COUNT(*) INTO v_riders_with_teams FROM v_rider_complete WHERE team_id IS NOT NULL;
  
  RAISE NOTICE '✅ Migration 011 complete';
  RAISE NOTICE '   Total team members: %', v_total_riders;
  RAISE NOTICE '   Riders with team_id: %', v_riders_with_teams;
  RAISE NOTICE '   New fields: team_id, team_name';
  
  IF v_riders_with_teams = 0 THEN
    RAISE WARNING '⚠️  No riders have team_id assigned. Check team_lineups table.';
  END IF;
END $$;
