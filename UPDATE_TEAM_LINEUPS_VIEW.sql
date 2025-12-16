-- ============================================================================
-- UPDATE TEAM LINEUPS VIEW - ADD EXTRA FIELDS FOR TEAM VIEWER
-- Run this in Supabase SQL Editor to update v_team_lineups_full view
-- ============================================================================

-- Update view: Team lineup with rider details (add phenotype, ZRS, FTP, weight)
CREATE OR REPLACE VIEW public.v_team_lineups_full AS
SELECT 
  tl.id AS lineup_id,
  tl.team_id,
  ct.team_name,
  ct.competition_type,
  ct.competition_name,
  ct.velo_min_rank,
  ct.velo_max_rank,
  ct.velo_max_spread,
  ct.allowed_categories,
  ct.allow_category_up,
  ct.min_riders,
  ct.max_riders,
  tl.rider_id,
  tl.lineup_position,
  rc.racing_name AS name,
  rc.full_name,
  COALESCE(rc.zwiftracing_category, rc.zwift_official_category) AS category,
  rc.velo_live AS current_velo_rank,
  rc.velo_30day,
  rc.country_alpha3,
  rc.avatar_url,
  rc.phenotype,
  rc.zwift_official_racing_score,
  rc.ftp_watts,
  rc.weight_kg,
  tl.rider_category AS category_at_add,
  tl.rider_velo_rank AS velo_rank_at_add,
  tl.is_valid,
  tl.validation_warning,
  tl.added_at,
  tl.updated_at,
  ct.created_at AS team_created_at
FROM public.team_lineups tl
JOIN public.competition_teams ct ON tl.team_id = ct.id
LEFT JOIN public.v_rider_complete rc ON tl.rider_id = rc.rider_id
WHERE ct.is_active = true
ORDER BY ct.team_name, tl.lineup_position NULLS LAST;

-- Verification
SELECT '✅ v_team_lineups_full updated!' AS status;
SELECT 'Added: velo_30day, phenotype, zwift_official_racing_score, ftp_watts, weight_kg' AS info;
