-- Debug query: Check race_results content
SELECT 
  COUNT(*) as total_results,
  COUNT(DISTINCT event_id) as total_events,
  COUNT(DISTINCT rider_id) as unique_riders,
  MIN(event_date) as earliest_race,
  MAX(event_date) as latest_race
FROM race_results;

-- Check if any rider_ids match team riders
SELECT 
  rr.rider_id,
  rr.rider_name,
  COUNT(*) as race_count,
  CASE WHEN rc.rider_id IS NOT NULL THEN 'TEAM RIDER' ELSE 'Not in team' END as status
FROM race_results rr
LEFT JOIN v_rider_complete rc ON rr.rider_id = rc.rider_id
GROUP BY rr.rider_id, rr.rider_name, rc.rider_id
ORDER BY race_count DESC
LIMIT 20;

-- Check scanner config
SELECT * FROM race_scan_config;

-- Check recent scan logs
SELECT 
  started_at,
  status,
  events_checked,
  events_saved,
  events_skipped,
  duration_seconds
FROM race_scan_log
ORDER BY started_at DESC
LIMIT 5;
