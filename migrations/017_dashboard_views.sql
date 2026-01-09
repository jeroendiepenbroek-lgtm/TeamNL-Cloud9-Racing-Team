-- ============================================================================
-- DASHBOARD VIEWS VOOR RACE RESULTS
-- ============================================================================
-- Voor: Rider Results, Race Details, Team Results dashboards
-- Data: ZwiftPower + ZwiftRacing.app gecombineerd
-- ============================================================================

-- ============================================================================
-- DASHBOARD 1: RIDER RESULTS (90 dagen)
-- Vergelijkbaar met: https://www.zwiftracing.app/riders/150437
-- ============================================================================

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

COMMENT ON VIEW v_dashboard_rider_results IS 'Dashboard 1: Rider race results laatste 90 dagen (alle data blijft in database)';

-- ============================================================================
-- DASHBOARD 2: RACE DETAILS PER EVENT
-- Vergelijkbaar met: https://www.zwiftracing.app/events/5331604
-- ============================================================================

CREATE OR REPLACE VIEW v_dashboard_race_details AS
SELECT 
  re.event_id,
  re.event_name,
  re.event_date,
  re.world,
  re.route,
  re.distance_km,
  re.elevation_m,
  re.categories,
  -- Results per rider
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
  rr.dnf,
  rr.dq,
  -- Enrichment met rider info
  ar.name AS rider_name,
  ar.country,
  ar.velo_live AS rider_velo_current,
  -- Time formatted
  CONCAT(
    FLOOR(rr.time_seconds / 60)::TEXT, 
    ':', 
    LPAD((rr.time_seconds % 60)::TEXT, 2, '0')
  ) AS time_formatted,
  -- Gap to winner
  rr.time_seconds - (
    SELECT MIN(time_seconds) 
    FROM race_results 
    WHERE event_id = rr.event_id AND category = rr.category
  ) AS gap_seconds
FROM race_results rr
INNER JOIN race_events re ON rr.event_id = re.event_id
LEFT JOIN api_zwiftracing_riders ar ON rr.rider_id = ar.rider_id
ORDER BY re.event_date DESC, rr.category, rr.position ASC;

COMMENT ON VIEW v_dashboard_race_details IS 'Dashboard 2: Complete race results per event met alle deelnemers';

-- ============================================================================
-- DASHBOARD 3: TEAM RESULTS OVERVIEW (7 dagen)
-- Vergelijkbaar met: https://www.zwiftracing.app/clubs/2281
-- ============================================================================

CREATE OR REPLACE VIEW v_dashboard_team_results AS
SELECT 
  re.event_id,
  re.event_name,
  re.event_date,
  re.world,
  re.route,
  -- Team rider results
  rr.rider_id,
  ar.name AS rider_name,
  rr.position,
  rr.category,
  rr.avg_power,
  rr.avg_wkg,
  rr.velo_before,
  rr.velo_after,
  rr.velo_change,
  -- Aggregates
  (SELECT COUNT(*) FROM race_results WHERE event_id = rr.event_id) AS total_riders,
  (SELECT COUNT(*) FROM race_results r2 
   INNER JOIN api_zwiftracing_riders ar2 ON r2.rider_id = ar2.rider_id 
   WHERE r2.event_id = rr.event_id) AS team_riders_in_race,
  -- Performance indicators
  CASE 
    WHEN rr.position <= 3 THEN 'podium'
    WHEN rr.position <= 10 THEN 'top10'
    ELSE 'other'
  END AS performance_tier,
  -- Time formatted
  CONCAT(
    FLOOR(rr.time_seconds / 60)::TEXT, 
    ':', 
    LPAD((rr.time_seconds % 60)::TEXT, 2, '0')
  ) AS time_formatted
FROM race_results rr
INNER JOIN race_events re ON rr.event_id = re.event_id
INNER JOIN api_zwiftracing_riders ar ON rr.rider_id = ar.rider_id
WHERE re.event_date >= NOW() - INTERVAL '7 days'
ORDER BY re.event_date DESC, rr.position ASC;

COMMENT ON VIEW v_dashboard_team_results IS 'Dashboard 3: Team results overzicht laatste 7 dagen';

-- ============================================================================
-- HELPER VIEW: EVENT STATISTICS
-- Statistieken per event voor dashboard gebruik
-- ============================================================================

CREATE OR REPLACE VIEW v_event_statistics AS
SELECT 
  re.event_id,
  re.event_name,
  re.event_date,
  COUNT(DISTINCT rr.rider_id) AS total_riders,
  COUNT(DISTINCT rr.category) AS total_categories,
  AVG(rr.avg_power) FILTER (WHERE rr.avg_power IS NOT NULL) AS avg_power_field,
  MAX(rr.avg_power) AS max_power,
  MIN(rr.time_seconds) FILTER (WHERE rr.time_seconds IS NOT NULL) AS fastest_time,
  -- Team participation
  COUNT(DISTINCT rr.rider_id) FILTER (
    WHERE rr.rider_id IN (SELECT rider_id FROM api_zwiftracing_riders)
  ) AS team_riders_count,
  -- Performance stats
  COUNT(*) FILTER (WHERE rr.position <= 3) AS podium_finishes,
  COUNT(*) FILTER (WHERE rr.position <= 10) AS top10_finishes,
  COUNT(*) FILTER (WHERE rr.dnf = TRUE) AS dnf_count
FROM race_events re
LEFT JOIN race_results rr ON re.event_id = rr.event_id
GROUP BY re.event_id, re.event_name, re.event_date
ORDER BY re.event_date DESC;

COMMENT ON VIEW v_event_statistics IS 'Event statistics voor dashboard aggregates';

-- ============================================================================
-- HELPER VIEW: RIDER PERFORMANCE SUMMARY
-- Samenvatting per rider voor dashboard gebruik
-- ============================================================================

CREATE OR REPLACE VIEW v_rider_performance_summary AS
SELECT 
  rr.rider_id,
  ar.name AS rider_name,
  ar.category AS current_category,
  ar.velo_live AS current_velo,
  -- Race counts
  COUNT(*) AS total_races,
  COUNT(*) FILTER (WHERE re.event_date >= NOW() - INTERVAL '7 days') AS races_last_7days,
  COUNT(*) FILTER (WHERE re.event_date >= NOW() - INTERVAL '30 days') AS races_last_30days,
  COUNT(*) FILTER (WHERE re.event_date >= NOW() - INTERVAL '90 days') AS races_last_90days,
  -- Performance
  AVG(rr.position) FILTER (WHERE rr.dnf = FALSE) AS avg_position,
  COUNT(*) FILTER (WHERE rr.position = 1) AS wins,
  COUNT(*) FILTER (WHERE rr.position <= 3) AS podiums,
  COUNT(*) FILTER (WHERE rr.position <= 10) AS top10,
  COUNT(*) FILTER (WHERE rr.dnf = TRUE) AS dnfs,
  -- Power stats
  AVG(rr.avg_power) FILTER (WHERE rr.avg_power IS NOT NULL) AS avg_power,
  MAX(rr.avg_power) AS max_power,
  AVG(rr.avg_wkg) FILTER (WHERE rr.avg_wkg IS NOT NULL) AS avg_wkg,
  MAX(rr.avg_wkg) AS max_wkg,
  -- vELO stats
  AVG(rr.velo_change) FILTER (WHERE rr.velo_change IS NOT NULL) AS avg_velo_change,
  SUM(rr.velo_change) FILTER (WHERE rr.velo_change IS NOT NULL) AS total_velo_change,
  -- Recent activity
  MAX(re.event_date) AS last_race_date,
  MIN(re.event_date) AS first_race_date
FROM race_results rr
INNER JOIN race_events re ON rr.event_id = re.event_id
LEFT JOIN api_zwiftracing_riders ar ON rr.rider_id = ar.rider_id
GROUP BY rr.rider_id, ar.name, ar.category, ar.velo_live
ORDER BY races_last_90days DESC, avg_position ASC;

COMMENT ON VIEW v_rider_performance_summary IS 'Rider performance statistics voor dashboard';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON v_dashboard_rider_results TO authenticated;
GRANT SELECT ON v_dashboard_race_details TO authenticated;
GRANT SELECT ON v_dashboard_team_results TO authenticated;
GRANT SELECT ON v_event_statistics TO authenticated;
GRANT SELECT ON v_rider_performance_summary TO authenticated;

GRANT SELECT ON v_dashboard_rider_results TO anon;
GRANT SELECT ON v_dashboard_race_details TO anon;
GRANT SELECT ON v_dashboard_team_results TO anon;
GRANT SELECT ON v_event_statistics TO anon;
GRANT SELECT ON v_rider_performance_summary TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check data for rider 150437
SELECT 'Rider Results (90d)' as view_name, COUNT(*) as rows 
FROM v_dashboard_rider_results WHERE rider_id = 150437
UNION ALL
SELECT 'Race Details', COUNT(*) 
FROM v_dashboard_race_details WHERE rider_id = 150437
UNION ALL
SELECT 'Team Results (7d)', COUNT(*) 
FROM v_dashboard_team_results WHERE rider_id = 150437
UNION ALL
SELECT 'Event Statistics', COUNT(*) 
FROM v_event_statistics
UNION ALL
SELECT 'Rider Performance', COUNT(*) 
FROM v_rider_performance_summary WHERE rider_id = 150437;
