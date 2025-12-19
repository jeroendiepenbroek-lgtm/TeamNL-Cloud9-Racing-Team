-- ============================================================================
-- ADD: Power intervals to v_team_lineups_full for spider charts
-- ============================================================================
-- Adds power interval data (5s, 15s, 30s, 1m, 2m, 5m, 20m) to team lineups
-- for displaying spider charts in Team Lineup passport cards
-- ============================================================================

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
  zr.velo_30day,
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
  
  -- Racing metrics (Racing FTP, ZRS, Phenotype, Weight)
  zr.ftp AS racing_ftp,
  zo.competition_racing_score AS zwift_official_racing_score,
  zr.phenotype,
  COALESCE(zo.weight / 1000.0, zr.weight) AS weight_kg,
  CASE 
    WHEN zr.ftp IS NOT NULL AND COALESCE(zo.weight / 1000.0, zr.weight) > 0 
    THEN ROUND((zr.ftp::NUMERIC / COALESCE(zo.weight / 1000.0, zr.weight)), 2)
    ELSE NULL
  END AS ftp_wkg,
  
  -- Power intervals for spider charts (NEW - from ZwiftRacing)
  zr.power_5s,
  zr.power_15s,
  zr.power_30s,
  zr.power_60s,
  zr.power_120s,
  zr.power_300s,
  zr.power_1200s,
  zr.power_5s_wkg,
  zr.power_15s_wkg,
  zr.power_30s_wkg,
  zr.power_60s_wkg,
  zr.power_120s_wkg,
  zr.power_300s_wkg,
  zr.power_1200s_wkg
  
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
LEFT JOIN api_zwift_api_profiles zo ON tl.rider_id = zo.rider_id
LEFT JOIN api_zwiftracing_riders zr ON tl.rider_id = zr.rider_id
WHERE ct.is_active = true
ORDER BY ct.team_name, tl.lineup_position NULLS LAST;

COMMENT ON VIEW v_team_lineups_full IS 
  'Team lineups with full rider data including power intervals for spider charts.
   
   ✨ UPDATED: Added power interval data (5s, 15s, 30s, 1m, 2m, 5m, 20m)
   - Includes both absolute watts and W/kg for all intervals
   - Used for spider chart visualization in Team Lineup passport cards
   
   Sources: 
   - team_lineups (lineup assignments)
   - competition_teams (team config)
   - api_zwift_api_profiles (profile data: name, avatar, country, weight, ZRS)
   - api_zwiftracing_riders (racing data: vELO, FTP, power intervals, phenotype)';

GRANT SELECT ON v_team_lineups_full TO authenticated;
GRANT SELECT ON v_team_lineups_full TO anon;

-- Verificatie
DO $$ 
DECLARE
  v_lineups_count INTEGER;
  v_with_power INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_lineups_count FROM v_team_lineups_full;
  SELECT COUNT(*) INTO v_with_power FROM v_team_lineups_full WHERE power_5s IS NOT NULL;
  
  RAISE NOTICE '✅ v_team_lineups_full updated with power intervals';
  RAISE NOTICE '   Total lineups: %', v_lineups_count;
  RAISE NOTICE '   Riders with power data: %', v_with_power;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Ready for spider chart visualization in Team Lineup!';
END $$;
