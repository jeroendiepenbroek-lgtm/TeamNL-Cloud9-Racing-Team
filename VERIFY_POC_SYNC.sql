-- Verificatie POC Sync - Rider 150437

-- 1. Check rider in riders_unified
SELECT 
  rider_id,
  name,
  velo_rating,
  category,
  race_count_90d,
  ftp,
  weight_kg,
  country_code,
  followers_count,
  last_synced_zwift_racing,
  last_synced_zwift_official,
  last_synced_zwiftpower
FROM riders_unified
WHERE rider_id = 150437;

-- 2. Check activities count
SELECT 
  COUNT(*) as total_activities,
  MIN(start_date) as oldest_activity,
  MAX(start_date) as newest_activity
FROM rider_activities
WHERE rider_id = 150437;

-- 3. Check recent activities details
SELECT 
  name,
  sport,
  start_date,
  distance_meters / 1000 as distance_km,
  avg_watts,
  calories,
  elevation_meters
FROM rider_activities
WHERE rider_id = 150437
ORDER BY start_date DESC
LIMIT 5;

-- 4. Check rating history (should be empty for now)
SELECT COUNT(*) as history_points
FROM rider_rating_history
WHERE rider_id = 150437;

-- 5. Check sync logs
SELECT 
  sync_type,
  source,
  status,
  records_processed,
  records_created,
  records_updated,
  duration_ms,
  error_message,
  started_at,
  completed_at
FROM sync_status_unified
ORDER BY started_at DESC
LIMIT 5;
