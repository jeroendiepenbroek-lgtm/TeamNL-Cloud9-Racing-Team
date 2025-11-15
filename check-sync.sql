-- Check sync status in database
-- Run: psql $DATABASE_URL -f check-sync.sql

-- 1. Check laatste sync logs
SELECT 
  id,
  endpoint,
  status,
  records_processed,
  created_at,
  error_message
FROM sync_logs
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check riders last_synced timestamps
SELECT 
  DATE(last_synced) as sync_date,
  COUNT(*) as rider_count
FROM riders
WHERE last_synced IS NOT NULL
GROUP BY DATE(last_synced)
ORDER BY sync_date DESC;

-- 3. Check riders zonder sync
SELECT COUNT(*) as never_synced
FROM riders
WHERE last_synced IS NULL;

-- 4. Check meest recent gesynced riders
SELECT 
  rider_id,
  name,
  last_synced
FROM riders
WHERE last_synced IS NOT NULL
ORDER BY last_synced DESC
LIMIT 5;

-- 5. Check my_team_members count
SELECT COUNT(*) as team_member_count
FROM my_team_members;

-- 6. Check rider 1175748 specifiek
SELECT 
  rider_id,
  name,
  zp_ftp,
  power_w1200,
  power_cp,
  weight,
  last_synced
FROM riders
WHERE rider_id = 1175748;
