-- ============================================================================
-- MIGRATION 014: Fix Race Results Views - Filter by Team Riders
-- ============================================================================
-- Description: Fix views to only show races where our team riders participated
-- Author: GitHub Copilot
-- Date: 2026-01-05
-- ============================================================================

-- Drop existing views
DROP VIEW IF EXISTS v_race_results_recent CASCADE;
DROP VIEW IF EXISTS v_rider_race_stats CASCADE;

-- ============================================================================
-- VIEW: Team Race Results (90 days)
-- ============================================================================
-- Only races where at least one of our team riders participated
CREATE OR REPLACE VIEW v_team_race_results AS
SELECT 
  rr.*,
  rc.racing_name,
  rc.full_name,
  rc.avatar_url,
  rc.country_alpha3,
  rc.zwift_official_category,
  rc.zwiftracing_category
FROM race_results rr
INNER JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
WHERE rr.event_date >= NOW() - INTERVAL '90 days'
ORDER BY rr.event_date DESC, rr.position ASC;

COMMENT ON VIEW v_team_race_results IS 
'Race results from last 90 days for team riders only';

-- ============================================================================
-- VIEW: Rider Results Summary (per rider, 90 days)
-- ============================================================================
CREATE OR REPLACE VIEW v_rider_results_summary AS
SELECT 
  rc.rider_id,
  rc.racing_name,
  rc.full_name,
  rc.avatar_url,
  rc.country_alpha3,
  rc.zwift_official_category,
  rc.zwiftracing_category,
  COUNT(*) AS total_races,
  COUNT(*) FILTER (WHERE rr.position = 1) AS total_wins,
  COUNT(*) FILTER (WHERE rr.position <= 3) AS total_podiums,
  COUNT(*) FILTER (WHERE rr.position <= 5) AS total_top5,
  COUNT(*) FILTER (WHERE rr.position <= 10) AS total_top10,
  ROUND(AVG(rr.position), 1) AS avg_position,
  ROUND(AVG(rr.wkg_avg), 2) AS avg_wkg,
  MAX(rr.velo_rating) AS max_velo,
  MIN(rr.position) AS best_position,
  MAX(rr.event_date) AS last_race_date,
  MIN(rr.event_date) AS first_race_date,
  -- Latest race info
  (
    SELECT jsonb_build_object(
      'event_id', event_id,
      'event_name', event_name,
      'event_date', event_date,
      'position', position,
      'velo_rating', velo_rating
    )
    FROM race_results
    WHERE rider_id = rc.rider_id
    ORDER BY event_date DESC
    LIMIT 1
  ) AS latest_race
FROM v_rider_complete rc
LEFT JOIN race_results rr ON rc.rider_id = rr.rider_id 
  AND rr.event_date >= NOW() - INTERVAL '90 days'
GROUP BY 
  rc.rider_id,
  rc.racing_name,
  rc.full_name,
  rc.avatar_url,
  rc.country_alpha3,
  rc.zwift_official_category,
  rc.zwiftracing_category
ORDER BY total_races DESC, last_race_date DESC;

COMMENT ON VIEW v_rider_results_summary IS 
'Summary stats per rider for last 90 days';

-- ============================================================================
-- VIEW: Event Results (all riders in events where team participated)
-- ============================================================================
CREATE OR REPLACE VIEW v_event_results_detail AS
WITH team_events AS (
  -- Get all events where at least one team rider participated
  SELECT DISTINCT event_id
  FROM race_results rr
  INNER JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
  WHERE rr.event_date >= NOW() - INTERVAL '90 days'
)
SELECT 
  rr.*,
  -- Mark if this is a team rider
  CASE 
    WHEN rc.rider_id IS NOT NULL THEN true 
    ELSE false 
  END AS is_team_rider,
  -- Team rider details (null for non-team riders)
  rc.racing_name AS team_racing_name,
  rc.full_name AS team_full_name,
  rc.avatar_url AS team_avatar_url,
  rc.country_alpha3 AS team_country_alpha3
FROM race_results rr
INNER JOIN team_events te ON rr.event_id = te.event_id
LEFT JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
ORDER BY rr.event_date DESC, rr.position ASC;

COMMENT ON VIEW v_event_results_detail IS 
'All riders in events where team participated (team riders flagged)';

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_race_results_rider_date 
  ON race_results(rider_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_race_results_event_position 
  ON race_results(event_id, position ASC);
