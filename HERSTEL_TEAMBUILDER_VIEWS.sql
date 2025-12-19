-- ============================================================================
-- HERSTEL: v_team_lineups_full en v_team_summary
-- ============================================================================
-- Probleem: Migration 011 deed DROP CASCADE op v_rider_complete
--          Dit verwijderde ook v_team_lineups_full en v_team_summary
-- Oplossing: Herstel deze views zonder data te verliezen
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '🔧 Herstellen Teambuilder views...';
END $$;

-- ============================================================================
-- View 1: Team lineup with rider details
-- ============================================================================

CREATE OR REPLACE VIEW v_team_lineups_full AS
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
  
  -- Rider info
  tl.rider_id,
  tl.lineup_position,
  rc.full_name AS name,
  rc.full_name,
  rc.zwift_official_category AS category,
  rc.velo_live AS current_velo_rank,
  rc.country_alpha3,
  rc.avatar_url,
  
  -- Validation snapshot
  tl.rider_category AS category_at_add,
  tl.rider_velo_rank AS velo_rank_at_add,
  tl.is_valid,
  tl.validation_warning,
  
  -- Timestamps
  tl.added_at,
  tl.updated_at,
  ct.created_at AS team_created_at
  
FROM team_lineups tl
JOIN competition_teams ct ON tl.team_id = ct.id
LEFT JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
ORDER BY ct.team_name, tl.lineup_position NULLS LAST;

COMMENT ON VIEW v_team_lineups_full IS 
'Complete team lineups with rider details and validation status';

GRANT SELECT ON v_team_lineups_full TO authenticated;
GRANT SELECT ON v_team_lineups_full TO anon;

-- ============================================================================
-- View 2: Team summary with rider counts
-- ============================================================================

CREATE OR REPLACE VIEW v_team_summary AS
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
  
  -- vELO spread validation (for vELO teams)
  CASE 
    WHEN ct.competition_type = 'velo' THEN
      MAX(rc.velo_live) - MIN(rc.velo_live)
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
LEFT JOIN v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
GROUP BY ct.id, ct.team_name, ct.competition_type, ct.competition_name, 
         ct.is_active, ct.velo_min_rank, ct.velo_max_rank, ct.velo_max_spread,
         ct.allowed_categories, ct.min_riders, ct.max_riders, ct.created_at, ct.updated_at
ORDER BY ct.team_name;

COMMENT ON VIEW v_team_summary IS 
'Team overview with rider counts, validation status, and vELO spread';

GRANT SELECT ON v_team_summary TO authenticated;
GRANT SELECT ON v_team_summary TO anon;

-- ============================================================================
-- VERIFICATIE
-- ============================================================================

DO $$ 
DECLARE
  v_teams_count INTEGER;
  v_lineups_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_teams_count FROM v_team_summary;
  SELECT COUNT(*) INTO v_lineups_count FROM v_team_lineups_full;
  
  RAISE NOTICE '✅ Teambuilder views hersteld';
  RAISE NOTICE '   v_team_summary: % teams', v_teams_count;
  RAISE NOTICE '   v_team_lineups_full: % riders', v_lineups_count;
  
  IF v_teams_count = 0 THEN
    RAISE WARNING '⚠️  Geen teams gevonden. Check competition_teams tabel.';
  END IF;
END $$;
