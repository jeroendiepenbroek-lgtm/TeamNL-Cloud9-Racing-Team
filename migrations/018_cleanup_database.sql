-- ============================================================================
-- DATABASE CLEANUP SCRIPT
-- ============================================================================
-- Verwijdert oude, lege en ongebruikte tabellen/views
-- 
-- BELANGRIJK: Controleer eerst wat je wilt behouden!
-- Run dit handmatig in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STAP 1: VERWIJDER LEGE EN ONGEBRUIKTE TABELLEN
-- ============================================================================

-- zwift_racing_riders is leeg en vervangen door api_zwiftracing_riders
DROP TABLE IF EXISTS zwift_racing_riders CASCADE;

-- zwift_racing_results vervangen door race_results
DROP TABLE IF EXISTS zwift_racing_results CASCADE;

-- race_results_poc was POC tabel
DROP TABLE IF EXISTS race_results_poc CASCADE;

-- Oude backup tabellen (als die bestaan)
DROP TABLE IF EXISTS race_results_old CASCADE;
DROP TABLE IF EXISTS race_results_backup CASCADE;
DROP TABLE IF EXISTS riders_backup CASCADE;
DROP TABLE IF EXISTS teams_backup CASCADE;

-- ============================================================================
-- STAP 2: VERWIJDER OUDE/DEPRECATED VIEWS
-- ============================================================================

-- Oude rider views
DROP VIEW IF EXISTS v_riders_with_power_metrics CASCADE;
DROP VIEW IF EXISTS v_teambuilder_riders CASCADE;
DROP VIEW IF EXISTS v_riders_old CASCADE;

-- Oude race views
DROP VIEW IF EXISTS v_race_results_old CASCADE;
DROP VIEW IF EXISTS v_race_results_poc CASCADE;

-- Backup views
DROP VIEW IF EXISTS v_team_roster_old CASCADE;
DROP VIEW IF EXISTS v_lineups_backup CASCADE;

-- ============================================================================
-- STAP 3: CLEANUP SYNC LOG (optioneel - alleen als je geschiedenis wilt wissen)
-- ============================================================================

-- UITGESCHAKELD: Uncomment om sync log te wissen
-- TRUNCATE TABLE race_results_sync_log;

-- ============================================================================
-- STAP 4: VACUUM VOOR RUIMTE TERUGWINNEN
-- ============================================================================

VACUUM FULL;
ANALYZE;

-- ============================================================================
-- VERIFICATIE: TOON OVERGEBLEVEN TABELLEN EN VIEWS
-- ============================================================================

SELECT 
    schemaname,
    tablename as name,
    'table' as type,
    pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.' || tablename) DESC;

SELECT 
    schemaname,
    viewname as name,
    'view' as type
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================================================
-- VERWACHTE OVERGEBLEVEN STRUCTUUR
-- ============================================================================

-- TABELLEN (moet je hebben):
-- ✅ race_events (27 rows)
-- ✅ race_results (2200 rows)  
-- ✅ race_results_sync_log (sync geschiedenis)
-- ✅ api_zwiftracing_riders (78 rows)
-- ✅ riders (94 rows)
-- ✅ teams
-- ✅ team_riders
-- ✅ lineups
-- ✅ lineup_riders
-- ✅ rider_categories
-- ✅ rider_power_intervals
-- ✅ migrations

-- VIEWS (moet je hebben):
-- ✅ v_dashboard_rider_results (Dashboard 1)
-- ✅ v_dashboard_race_details (Dashboard 2)
-- ✅ v_dashboard_team_results (Dashboard 3)
-- ✅ v_event_statistics (Helper)
-- ✅ v_rider_performance_summary (Helper)
-- ✅ v_recent_race_results (TeamBuilder)
-- ✅ v_teamnl_race_results (TeamBuilder)
-- ✅ v_rider_race_stats (TeamBuilder)
-- ✅ v_riders_with_categories (Riders)
-- ✅ v_team_roster (Teams)

-- ============================================================================
-- KLAAR!
-- ============================================================================
