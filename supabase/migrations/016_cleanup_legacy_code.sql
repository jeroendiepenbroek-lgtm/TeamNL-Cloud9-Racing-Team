-- ============================================
-- Migration 016: Cleanup Legacy Code
-- Datum: 2025-11-17
-- Doel: Verwijder redundante tables en kolommen
-- ============================================

-- Drop backup tables (migration 006/007)
DROP TABLE IF EXISTS riders_backup_20251106;
DROP TABLE IF EXISTS riders_backup_20251107;

-- Drop oude event_signups tabel (vervangen door zwift_api_event_signups)
DROP TABLE IF EXISTS event_signups;

-- Drop club_roster (redundant met riders.club_id)
DROP TABLE IF EXISTS club_roster;

-- Drop deprecated kolommen in riders
ALTER TABLE riders DROP COLUMN IF EXISTS ftp_deprecated;
ALTER TABLE riders DROP COLUMN IF EXISTS category_racing_deprecated;
ALTER TABLE riders DROP COLUMN IF EXISTS category_zftp_deprecated;

-- Verificatie
DO $$
BEGIN
  RAISE NOTICE 'Cleanup completed successfully';
  RAISE NOTICE 'Remaining active tables: riders, zwift_api_events, zwift_api_event_signups, sync_logs, access_requests, user_roles';
  RAISE NOTICE 'Remaining future-use tables: clubs, race_results, rider_history';
END $$;
