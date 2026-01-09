-- ============================================
-- CLEANUP: Verwijder ongebruikte/lege views en tabellen
-- Execute in Supabase SQL Editor AFTER Race Results sync completes
-- ============================================

-- ============================================
-- STAP 1: IDENTIFICEER LEGE TABELLEN
-- ============================================

DO $$ 
DECLARE
    r RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SCANNING FOR EMPTY TABLES';
    RAISE NOTICE '============================================';
    
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT IN ('race_events', 'race_results', 'race_results_sync_log', 'zwift_racing_riders', 'team_lineups', 'lineup_positions')
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', r.tablename) INTO row_count;
        IF row_count = 0 THEN
            RAISE NOTICE 'EMPTY TABLE: % (0 rows)', r.tablename;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- STAP 2: DROP DEPRECATED/POC TABELLEN
-- ============================================

-- Drop old POC/test tabellen (if they exist)
DROP TABLE IF EXISTS poc_race_results CASCADE;
DROP TABLE IF EXISTS poc_events CASCADE;
DROP TABLE IF EXISTS test_race_results CASCADE;
DROP TABLE IF EXISTS race_results_cache CASCADE;
DROP TABLE IF EXISTS event_cache CASCADE;
DROP TABLE IF EXISTS rider_stats_cache CASCADE;
DROP TABLE IF EXISTS temp_race_data CASCADE;
DROP TABLE IF EXISTS zwift_results CASCADE;

-- ============================================
-- STAP 3: DROP DEPRECATED VIEWS
-- ============================================

-- Drop old race results views
DROP VIEW IF EXISTS v_rider_race_history CASCADE;
DROP VIEW IF EXISTS v_event_leaderboard CASCADE;
DROP VIEW IF EXISTS v_team_race_summary CASCADE;
DROP VIEW IF EXISTS v_race_performance CASCADE;

-- Drop team_riders related views (replaced by zwift_racing_riders)
DROP VIEW IF EXISTS v_team_riders_performance CASCADE;
DROP VIEW IF EXISTS v_active_team_riders CASCADE;
DROP VIEW IF EXISTS v_team_rider_stats CASCADE;

-- Drop old lineup views if they're not used
-- (Uncomment if lineup system is deprecated)
-- DROP VIEW IF EXISTS v_team_lineups CASCADE;
-- DROP VIEW IF EXISTS v_lineup_analysis CASCADE;

-- ============================================
-- STAP 4: VERIFICATIE - HUIDIGE STATE
-- ============================================

-- Show all remaining tables with size
SELECT 
    'TABLE' as type,
    tablename as name, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = schemaname 
     AND table_name = tablename) as columns
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Show all views
SELECT 
    'VIEW' as type,
    viewname as name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||viewname)) as size
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================
-- STAP 5: RACE RESULTS STATUS CHECK
-- ============================================

-- race_events tabel
SELECT 
    'race_events' as table_name,
    COUNT(*) as total_rows,
    MIN(event_date) as earliest_event,
    MAX(event_date) as latest_event,
    COUNT(DISTINCT source) as sources
FROM race_events;

-- race_results tabel  
SELECT 
    'race_results' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT event_id) as unique_events,
    COUNT(DISTINCT rider_id) as unique_riders,
    MIN(created_at) as earliest_insert,
    MAX(created_at) as latest_insert
FROM race_results;

-- race_results_sync_log
SELECT 
    'race_results_sync_log' as table_name,
    status,
    COUNT(*) as sync_count,
    MAX(started_at) as last_sync,
    SUM(riders_processed) as total_riders_processed,
    SUM(events_processed) as total_events_processed,
    SUM(results_saved) as total_results_saved
FROM race_results_sync_log
GROUP BY status
ORDER BY last_sync DESC;

-- ============================================
-- STAP 6: VIEWS DATA CHECK
-- ============================================

-- v_recent_race_results (last 30 days)
SELECT 
    'v_recent_race_results' as view_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT event_id) as unique_events,
    COUNT(DISTINCT rider_id) as unique_riders
FROM v_recent_race_results;

-- v_teamnl_race_results (TeamNL only)
SELECT 
    'v_teamnl_race_results' as view_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT event_id) as unique_events,
    COUNT(DISTINCT rider_id) as unique_riders
FROM v_teamnl_race_results;

-- v_rider_race_stats (aggregated stats)
SELECT 
    'v_rider_race_stats' as view_name,
    COUNT(*) as row_count,
    MAX(total_races) as max_races_per_rider,
    AVG(avg_power) as overall_avg_power
FROM v_rider_race_stats;

-- ============================================
-- STAP 7: IDENTIFY UNUSED FOREIGN KEYS
-- ============================================

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- CLEANUP COMPLETED
-- ============================================

-- Summary message
DO $$ 
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CLEANUP COMPLETED';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Review the output above to verify:';
    RAISE NOTICE '1. Empty tables have been identified';
    RAISE NOTICE '2. Deprecated views/tables dropped';
    RAISE NOTICE '3. Race Results tables populated';
    RAISE NOTICE '4. Views contain data';
    RAISE NOTICE '============================================';
END $$;
