-- ============================================
-- ANALYSE: Database relaties en sourcing
-- ============================================

-- 1. Check foreign key constraints op team_roster
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'team_roster' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- 2. Check hoe v_rider_complete view is opgebouwd
SELECT pg_get_viewdef('v_rider_complete', true);

-- 3. Hoeveel riders in elke tabel?
SELECT 'team_roster' as table_name, COUNT(*) as count FROM team_roster
UNION ALL
SELECT 'api_zwiftracing_riders', COUNT(*) FROM api_zwiftracing_riders
UNION ALL
SELECT 'api_zwift_api_profiles', COUNT(*) FROM api_zwift_api_profiles
UNION ALL
SELECT 'v_rider_complete (ALL)', COUNT(*) FROM v_rider_complete
UNION ALL
SELECT 'v_rider_complete (team members)', COUNT(*) FROM v_rider_complete WHERE is_team_member = true;

-- 4. Welke riders zijn in api_zwiftracing_riders maar NIET in team_roster?
SELECT 'Missing in team_roster' as issue, COUNT(*) as count
FROM api_zwiftracing_riders r
LEFT JOIN team_roster tr ON tr.rider_id = r.rider_id
WHERE tr.rider_id IS NULL;

-- 5. Toon de ontbrekende riders
SELECT r.rider_id, r.name, r.country, r.category
FROM api_zwiftracing_riders r
LEFT JOIN team_roster tr ON tr.rider_id = r.rider_id
WHERE tr.rider_id IS NULL
ORDER BY r.rider_id
LIMIT 20;

-- 6. Check sync_logs tabel
SELECT COUNT(*) as sync_logs_count FROM sync_logs;
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10;
