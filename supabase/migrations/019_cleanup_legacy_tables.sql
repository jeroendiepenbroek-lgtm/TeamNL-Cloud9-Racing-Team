-- ============================================================================
-- Migration 019: Database Cleanup - Remove Legacy Tables
-- ============================================================================
-- Doel: Opschonen database na introductie unified schema (018)
-- 
-- BEHOUDEN:
-- - riders_unified, rider_rating_history, rider_activities (NEW)
-- - events_unified, event_signups_unified, race_results_unified (NEW)
-- - sync_status_unified (NEW)
-- - zwift_api_* tables (sourcing - nodig voor sync)
-- - zwiftpower_* tables (sourcing - nodig voor enrichment)
--
-- VERWIJDEREN:
-- - riders, clubs, events (legacy tables, vervangen door unified)
-- - event_signups, event_results (legacy, vervangen door unified)
-- - sync_logs (vervangen door sync_status_unified)
-- - *_backup_* tables (oude backups)
-- - Oude views (vervangen door queries op unified tables)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: DROP OLD VIEWS (safe - geen data verlies)
-- ============================================================================

DROP VIEW IF EXISTS riders_computed CASCADE;
DROP VIEW IF EXISTS view_upcoming_events CASCADE;
DROP VIEW IF EXISTS view_team_events CASCADE;
DROP MATERIALIZED VIEW IF EXISTS view_team_recent_results CASCADE;
DROP VIEW IF EXISTS rider_stats_view CASCADE;
DROP VIEW IF EXISTS event_summary_view CASCADE;

COMMENT ON SCHEMA public IS 'Phase 1 complete: Old views dropped';

-- ============================================================================
-- PHASE 2: DROP LEGACY TABLES (data replaced in unified schema)
-- ============================================================================

-- Legacy core tables
DROP TABLE IF EXISTS riders CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP VIEW IF EXISTS events CASCADE;  -- events is a VIEW, not a table
DROP TABLE IF EXISTS event_signups CASCADE;
DROP TABLE IF EXISTS event_results CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS routes CASCADE;

-- Legacy personal records (vervangen door race_results_unified analytics)
DROP TABLE IF EXISTS rider_personal_records CASCADE;

COMMENT ON SCHEMA public IS 'Phase 2 complete: Legacy tables/views dropped';

-- ============================================================================
-- PHASE 3: DROP BACKUP TABLES (oude migratie backups)
-- ============================================================================

DROP TABLE IF EXISTS riders_backup_20251106 CASCADE;
DROP TABLE IF EXISTS riders_backup_20251107 CASCADE;
DROP TABLE IF EXISTS clubs_backup CASCADE;
DROP TABLE IF EXISTS events_backup CASCADE;

COMMENT ON SCHEMA public IS 'Phase 3 complete: Backup tables dropped';

-- ============================================================================
-- PHASE 4: DROP OLD SOURCING TABLES (if duplicated)
-- ============================================================================

-- Check: als zwift_api_race_results EN zwift_api_zp_results bestaan
-- maar data is gemerged in race_results_unified, dan kunnen ze weg
-- MAAR: laat deze staan als ze gebruikt worden in sync process!

-- DROP TABLE IF EXISTS zwift_api_race_results CASCADE;
-- DROP TABLE IF EXISTS zwift_api_zp_results CASCADE;

-- ⚠️  COMMENT OUT ABOVE IF STILL NEEDED FOR SYNC

COMMENT ON SCHEMA public IS 'Phase 4 complete: Old sourcing tables evaluated';

-- ============================================================================
-- PHASE 5: VERIFY REMAINING TABLES
-- ============================================================================

-- Expected tables after cleanup:
-- NEW UNIFIED SCHEMA:
--   ✅ riders_unified
--   ✅ rider_rating_history
--   ✅ rider_activities
--   ✅ events_unified
--   ✅ event_signups_unified
--   ✅ race_results_unified
--   ✅ sync_status_unified
--
-- SOURCING (KEEP):
--   📦 zwift_api_events
--   📦 zwift_api_event_signups
--   📦 zwift_api_race_results (optioneel - check sync usage)
--   📦 zwift_api_zp_results (optioneel - check sync usage)
--   📦 zwiftpower_riders (if exists)
--   📦 zwiftpower_results (if exists)

-- Create audit log
CREATE TABLE IF NOT EXISTS _cleanup_audit (
  id SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL DEFAULT '019_cleanup_legacy_tables',
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  tables_dropped TEXT[] DEFAULT ARRAY[
    'riders',
    'clubs', 
    'events',
    'event_signups',
    'event_results',
    'sync_logs',
    'routes',
    'rider_personal_records',
    'riders_backup_20251106',
    'riders_backup_20251107'
  ],
  views_dropped TEXT[] DEFAULT ARRAY[
    'riders_computed',
    'view_upcoming_events',
    'view_team_events',
    'view_team_recent_results'
  ]
);

COMMENT ON TABLE _cleanup_audit IS 'Audit log for migration 019 - tracks dropped tables/views';

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify cleanup:

/*

-- 1. List all remaining tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Expected output:
-- _cleanup_audit
-- event_signups_unified
-- events_unified
-- race_results_unified
-- rider_activities
-- rider_rating_history
-- riders_unified
-- sync_status_unified
-- zwift_api_event_signups
-- zwift_api_events
-- zwift_api_race_results (optional)
-- zwift_api_zp_results (optional)

-- 2. Check for any remaining views
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public';

-- Expected: (empty) or only new views you create

-- 3. Verify unified tables have correct structure
\d riders_unified
\d events_unified
\d race_results_unified

*/
