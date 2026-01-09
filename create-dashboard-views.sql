-- ============================================================================
-- DASHBOARD VIEWS VOOR RACE RESULTS
-- Maak views aan voor rider results dashboard
-- ============================================================================

-- Dashboard 1: Rider Results (90 dagen)
CREATE OR REPLACE VIEW v_dashboard_rider_results AS
SELECT 
  re.event_id,
  re.event_name,
  re.event_date,
  re.world,
  re.route,
  re.distance_km,
  rr.rider_id,
  rr.position,
  rr.category,
  rr.category_position,
  rr.avg_power,
  rr.avg_wkg,
  rr.time_seconds,
  rr.velo_before,
  rr.velo_after,
  rr.velo_change,
  rr.team_name,
  rr.source,
  -- Bereken tijd in min:sec format
  CONCAT(
    FLOOR(rr.time_seconds / 60)::TEXT, 
    ':', 
    LPAD((rr.time_seconds % 60)::TEXT, 2, '0')
  ) AS time_formatted,
  -- Count total participants
  (SELECT COUNT(*) FROM race_results WHERE event_id = rr.event_id) AS total_participants
FROM race_results rr
INNER JOIN race_events re ON rr.event_id = re.event_id
WHERE re.event_date >= NOW() - INTERVAL '90 days'
ORDER BY re.event_date DESC, rr.position ASC;

COMMENT ON VIEW v_dashboard_rider_results IS 'Dashboard 1: Rider race results laatste 90 dagen';

-- Grant permissions
GRANT SELECT ON v_dashboard_rider_results TO authenticated;
GRANT SELECT ON v_dashboard_rider_results TO anon;

-- Test query
SELECT COUNT(*) as total_rows FROM v_dashboard_rider_results;
SELECT COUNT(*) as rider_150437_rows FROM v_dashboard_rider_results WHERE rider_id = 150437;
