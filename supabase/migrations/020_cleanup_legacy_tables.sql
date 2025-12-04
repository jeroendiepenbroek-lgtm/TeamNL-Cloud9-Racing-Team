-- Migration 020: Cleanup Legacy Tables voor Clean Sourcing Strategy
-- Datum: 3 December 2025
-- POC: Rider 150437, Event 5229579

BEGIN;

-- Logging start van cleanup
INSERT INTO sync_logs (endpoint, status, records_processed, synced_at, error_message)
VALUES ('migration_020_start', 'info', 0, NOW(), 
        'Start database cleanup - verwijderen 8 legacy tabellen');

-- STAP 1: Verwijder oude _unified tabellen (vervangen door zwift_api_*)
-- Deze zijn vervangen door de POC tabellen met cleane naming

DROP TABLE IF EXISTS event_signups_unified CASCADE;
DROP TABLE IF EXISTS events_unified CASCADE;
DROP TABLE IF EXISTS race_results_unified CASCADE;
DROP TABLE IF EXISTS sync_status_unified CASCADE;

-- STAP 2: Verwijder nooit geïmplementeerde tabellen

DROP TABLE IF EXISTS rider_activities CASCADE;

-- STAP 3: Verwijder oude tabellen vervangen door nieuwe

DROP TABLE IF EXISTS rider_rating_history CASCADE;
DROP TABLE IF EXISTS club_members CASCADE;

-- STAP 4: Verwijder fallback view (gebruik view_my_team)

DROP VIEW IF EXISTS view_racing_data_matrix CASCADE;

-- STAP 5: Verwijder oude backups (> 1 maand oud)

DROP TABLE IF EXISTS riders_backup_20251106 CASCADE;
DROP TABLE IF EXISTS riders_backup_20251107 CASCADE;

-- Logging einde van cleanup
INSERT INTO sync_logs (endpoint, status, records_processed, synced_at, error_message)
VALUES ('migration_020_complete', 'success', 8, NOW(), 
        'Database cleanup voltooid - 8 legacy tabellen verwijderd. Core tables intact: riders (61 velden), view_my_team, zwift_api_*');

-- Verify core tables still exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('riders', 'my_team_members', 'zwift_api_events', 'zwift_api_race_results', 'zwift_api_event_signups');
    
    IF table_count != 5 THEN
        RAISE EXCEPTION 'CRITICAL: Core tables missing after cleanup! Expected 5, found %', table_count;
    END IF;
    
    RAISE NOTICE '✅ Verification passed: All 5 core tables intact';
END $$;

COMMIT;
