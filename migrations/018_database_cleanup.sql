-- ============================================================================
-- DATABASE CLEANUP - RACE RESULTS PRODUCTION
-- ============================================================================
-- Verwijdert oude/ongebruikte views en lege tabellen
-- Behoudt: race_events, race_results, race_results_sync_log, api_zwiftracing_riders
-- ============================================================================

-- ============================================================================
-- STAP 1: IDENTIFICEER OUDE VIEWS
-- ============================================================================

-- Check welke views nog bestaan
SELECT 
    schemaname, 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%race%' OR viewname LIKE '%rider%' OR viewname LIKE '%result%'
ORDER BY viewname;

-- ============================================================================
-- STAP 2: DROP OUDE POC/TEST VIEWS (indien aanwezig)
-- ============================================================================

-- Deze views waren voor POC/testing en zijn niet meer nodig
DROP VIEW IF EXISTS v_recent_race_results CASCADE;
DROP VIEW IF EXISTS v_teamnl_race_results CASCADE;
DROP VIEW IF EXISTS v_rider_race_stats CASCADE;

-- Oude rider views (pre-race-results)
DROP VIEW IF EXISTS v_rider_current_fitness CASCADE;
DROP VIEW IF EXISTS v_rider_fitness_trends CASCADE;

-- ============================================================================
-- STAP 3: IDENTIFICEER LEGE/ONGEBRUIKTE TABELLEN
-- ============================================================================

-- Check alle tabellen met row counts
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM public.zwift_racing_riders) as row_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('zwift_racing_riders', 'rider_fitness_data', 'fitness_sync_log')
ORDER BY tablename;

-- ============================================================================
-- STAP 4: DROP LEGE/DEPRECATED TABELLEN
-- ============================================================================

-- zwift_racing_riders is leeg en vervangen door api_zwiftracing_riders
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'zwift_racing_riders'
    ) THEN
        -- Check if empty
        IF (SELECT COUNT(*) FROM zwift_racing_riders) = 0 THEN
            DROP TABLE IF EXISTS zwift_racing_riders CASCADE;
            RAISE NOTICE 'Dropped empty table: zwift_racing_riders';
        ELSE
            RAISE NOTICE 'Table zwift_racing_riders is NOT empty, skipping drop';
        END IF;
    END IF;
END $$;

-- Oude fitness tabellen (pre-race-results)
DROP TABLE IF EXISTS rider_fitness_data CASCADE;
DROP TABLE IF EXISTS fitness_sync_log CASCADE;

-- ============================================================================
-- STAP 5: CLEANUP OUDE CONSTRAINTS/INDEXES
-- ============================================================================

-- Remove indexes die niet meer nodig zijn
DROP INDEX IF EXISTS idx_fitness_rider_date CASCADE;
DROP INDEX IF EXISTS idx_fitness_date CASCADE;
DROP INDEX IF EXISTS idx_race_results_rider_event CASCADE; -- oude naam

-- ============================================================================
-- STAP 6: VERIFICATIE - WELKE TABELLEN BLIJVEN OVER
-- ============================================================================

-- Production tables die moeten blijven
SELECT 
    'PRODUCTION TABLES' as category,
    tablename,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = pg_tables.tablename) as column_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'race_events',
      'race_results', 
      'race_results_sync_log',
      'api_zwiftracing_riders',
      'riders',
      'teams',
      'lineups',
      'lineup_positions'
  )
ORDER BY tablename;

-- Production views die moeten blijven
SELECT 
    'PRODUCTION VIEWS' as category,
    viewname
FROM pg_views
WHERE schemaname = 'public'
  AND (
      viewname LIKE 'v_dashboard_%' OR
      viewname LIKE 'v_event_statistics' OR
      viewname LIKE 'v_rider_performance_summary' OR
      viewname = 'api_zwiftracing_riders'
  )
ORDER BY viewname;

-- ============================================================================
-- STAP 7: CLEANUP OUDE SYNC LOGS (OPTIONEEL)
-- ============================================================================

-- Bewaar alleen laatste 100 sync logs
DELETE FROM race_results_sync_log
WHERE id NOT IN (
    SELECT id 
    FROM race_results_sync_log 
    ORDER BY completed_at DESC NULLS LAST 
    LIMIT 100
);

-- ============================================================================
-- SAMENVATTING
-- ============================================================================

SELECT 
    'CLEANUP SUMMARY' as summary,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') as total_views,
    (SELECT COUNT(*) FROM race_events) as race_events,
    (SELECT COUNT(*) FROM race_results) as race_results,
    (SELECT COUNT(DISTINCT rider_id) FROM race_results) as unique_riders,
    (SELECT COUNT(*) FROM api_zwiftracing_riders) as team_riders;

-- Toon alle resterende tabellen
\dt public.*

-- Toon alle resterende views  
\dv public.*
