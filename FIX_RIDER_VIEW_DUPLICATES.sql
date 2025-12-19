-- ============================================================================
-- FIX: v_rider_complete - verwijder duplicaten met DISTINCT ON
-- ============================================================================
-- Probleem: LEFT JOIN team_lineups creëert meerdere rows als rider in meerdere teams zit
-- Oplossing: Gebruik DISTINCT ON (rider_id) om 1 row per rider te garanderen
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Fixing v_rider_complete view - removing duplicates...';
END $$;

-- Drop en recreate met DISTINCT ON
DROP VIEW IF EXISTS v_rider_complete CASCADE;

CREATE VIEW v_rider_complete AS
SELECT DISTINCT ON (COALESCE(zo.rider_id, zr.rider_id))
  -- Identity (prefer Zwift Official for official data)
  COALESCE(zo.rider_id, zr.rider_id) AS rider_id,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  zr.name AS racing_name,
  zo.first_name,
  zo.last_name,
  
  -- Team Status (alleen eerste team als rider in meerdere teams zit)
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
  zo.ftp AS ftp_watts,  -- ZFTP = Zwift Official FTP only
  
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
LEFT JOIN competition_teams ct ON tl.team_id = ct.id
ORDER BY COALESCE(zo.rider_id, zr.rider_id), (tl.team_id IS NULL), tl.added_at DESC NULLS LAST;

COMMENT ON VIEW v_rider_complete IS 
  'Complete rider data with team info - DISTINCT ON rider_id to prevent duplicates.
   
   ✨ FIXED: DISTINCT ON prevents multiple rows when rider is in multiple teams
   - Shows only first/primary team per rider (most recent added_at)
   
   Features:
   - team_id, team_name: Competition team (first if multiple)
   - zwift_official_category: COALESCE(zo.competition_category, zr.category)
   - is_team_member, team_member_since, team_last_synced
   - race_wins, race_podiums, race_finishes, race_dnfs
   
   Sources: 
   - api_zwift_api_profiles (profile data)
   - api_zwiftracing_riders (racing data)
   - team_roster (membership status)
   - team_lineups (team assignments - first team only)
   - competition_teams (team names)
   
   Test: 
   SELECT rider_id, full_name, team_id, team_name 
   FROM v_rider_complete 
   WHERE team_id IS NOT NULL 
   LIMIT 5;';

-- Grant permissions
GRANT SELECT ON v_rider_complete TO authenticated;
GRANT SELECT ON v_rider_complete TO anon;

-- Nu moeten we v_team_lineups_full en v_team_summary opnieuw maken
-- (ze werden gedropped door CASCADE)
-- Belangrijk: Deze views moeten NIET afhankelijk zijn van v_rider_complete's team_id
-- omdat dat duplicaten voorkomt. We joinen direct met de brontabellen.

DROP VIEW IF EXISTS v_team_lineups_full;

CREATE VIEW v_team_lineups_full AS
SELECT 
  tl.id AS lineup_id,
  tl.team_id,
  ct.team_name,
  ct.competition_type,
  ct.competition_name,
  
  -- Team constraints
  ct.velo_min_rank,
  ct.velo_max_rank,
  ct.velo_max_spread,
  ct.allowed_categories,
  ct.allow_category_up,
  ct.min_riders,
  ct.max_riders,
  
  -- Rider info (direct from source tables, NOT from v_rider_complete)
  tl.rider_id,
  tl.lineup_position,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS name,
  COALESCE(zo.first_name || ' ' || zo.last_name, zr.name) AS full_name,
  COALESCE(zo.competition_category, zr.category) AS category,
  zr.velo_live AS current_velo_rank,
  zo.country_alpha3,
  zo.image_src AS avatar_url,
  
  -- Validation snapshot
  tl.rider_category AS category_at_add,
  tl.rider_velo_rank AS velo_rank_at_add,
  tl.is_valid,
  tl.validation_warning,
  
  -- Timestamps
  tl.added_at,
  tl.updated_at,
  ct.created_at AS team_created_at,
  
  -- Racing metrics (Racing FTP, ZRS, Phenotype, Weight) - NEW at end to avoid column position conflicts
  zr.ftp AS racing_ftp,  -- ZwiftRacing FTP (zoals in Performance Matrix)
  zo.competition_racing_score AS zwift_official_racing_score,  -- ZRS = Zwift Racing Score
  zr.phenotype,
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,  -- Voor W/kg berekening
  -- W/kg calculated
  CASE 
    WHEN zr.ftp IS NOT NULL AND COALESCE(zo.weight / 1000.0, zr.weight) > 0 
    THEN ROUND((zr.ftp::NUMERIC / COALESCE(zo.weight / 1000.0, zr.weight)), 2)
    ELSE NULL
  END AS ftp_wkg
  
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
LEFT JOIN api_zwift_api_profiles zo ON tl.rider_id = zo.rider_id
LEFT JOIN api_zwiftracing_riders zr ON tl.rider_id = zr.rider_id
WHERE ct.is_active = true
ORDER BY ct.team_name, tl.lineup_position NULLS LAST;

GRANT SELECT ON v_team_lineups_full TO authenticated;
GRANT SELECT ON v_team_lineups_full TO anon;

DROP VIEW IF EXISTS v_team_summary;

CREATE VIEW v_team_summary AS
SELECT 
  ct.id AS team_id,
  ct.team_name,
  ct.competition_type,
  ct.competition_name,
  ct.is_active,
  
  -- Team config
  ct.velo_min_rank,
  ct.velo_max_rank,
  ct.velo_max_spread,
  ct.allowed_categories,
  ct.min_riders,
  ct.max_riders,
  
  -- Rider counts
  COUNT(tl.rider_id) AS current_riders,
  COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = true) AS valid_riders,
  COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = false) AS invalid_riders,
  
  -- vELO spread validation (for vELO teams) - direct from source table
  CASE 
    WHEN ct.competition_type = 'velo' THEN
      MAX(zr.velo_live) - MIN(zr.velo_live)
    ELSE NULL
  END AS current_velo_spread,
  
  -- Team status
  CASE 
    WHEN COUNT(tl.rider_id) < ct.min_riders THEN 'incomplete'
    WHEN COUNT(tl.rider_id) > ct.max_riders THEN 'overfilled'
    WHEN COUNT(tl.rider_id) FILTER (WHERE tl.is_valid = false) > 0 THEN 'warning'
    ELSE 'ready'
  END AS team_status,
  
  ct.created_at,
  ct.updated_at
  
FROM competition_teams ct
LEFT JOIN team_lineups tl ON ct.id = tl.team_id
LEFT JOIN api_zwiftracing_riders zr ON tl.rider_id = zr.rider_id
WHERE ct.is_active = true
GROUP BY ct.id, ct.team_name, ct.competition_type, ct.competition_name, 
         ct.is_active, ct.velo_min_rank, ct.velo_max_rank, ct.velo_max_spread,
         ct.allowed_categories, ct.min_riders, ct.max_riders, ct.created_at, ct.updated_at
ORDER BY ct.team_name;

GRANT SELECT ON v_team_summary TO authenticated;
GRANT SELECT ON v_team_summary TO anon;

-- Verificatie
DO $$ 
DECLARE
  v_total_riders INTEGER;
  v_unique_riders INTEGER;
  v_teams_count INTEGER;
  v_lineups_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_riders FROM v_rider_complete;
  SELECT COUNT(DISTINCT rider_id) INTO v_unique_riders FROM v_rider_complete;
  SELECT COUNT(*) INTO v_teams_count FROM v_team_summary;
  SELECT COUNT(*) INTO v_lineups_count FROM v_team_lineups_full;
  
  RAISE NOTICE '✅ v_rider_complete gefixed met DISTINCT ON';
  RAISE NOTICE '   Total rows: %', v_total_riders;
  RAISE NOTICE '   Unique rider_ids: %', v_unique_riders;
  RAISE NOTICE '   Duplicaten: %', v_total_riders - v_unique_riders;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Teambuilder views hersteld';
  RAISE NOTICE '   v_team_summary: % teams', v_teams_count;
  RAISE NOTICE '   v_team_lineups_full: % riders', v_lineups_count;
  
  IF v_total_riders > v_unique_riders THEN
    RAISE WARNING '⚠️  v_rider_complete heeft nog % duplicaten!', v_total_riders - v_unique_riders;
  ELSE
    RAISE NOTICE '✅ Geen duplicaten in v_rider_complete!';
  END IF;
END $$;
