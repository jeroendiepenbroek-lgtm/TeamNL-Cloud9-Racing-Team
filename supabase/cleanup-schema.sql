-- ============================================================================
-- CLEANUP SCRIPT - Verwijder oude schema voordat mvp-schema.sql uitgevoerd wordt
-- ============================================================================
-- ⚠️  WAARSCHUWING: Dit verwijdert ALLE bestaande data in deze tabellen!
-- ============================================================================
-- 
-- Gebruik dit alleen als je een CLEAN SLATE wilt voor MVP productie.
--
-- Run dit in Supabase SQL Editor:
-- https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql
--
-- Stappen:
--   1. Run dit script eerst (cleanup)
--   2. Dan run supabase/mvp-schema.sql (nieuw schema)
-- ============================================================================

-- Drop alle bestaande tabellen (CASCADE verwijdert ook foreign keys)
DROP TABLE IF EXISTS event_results CASCADE;
DROP TABLE IF EXISTS rider_snapshots CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS club_members CASCADE;
DROP TABLE IF EXISTS riders CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;

-- Drop oude views (als die bestaan)
DROP VIEW IF EXISTS top_riders_ranking CASCADE;
DROP VIEW IF EXISTS top_riders_wkg CASCADE;
DROP VIEW IF EXISTS club_stats CASCADE;
DROP VIEW IF EXISTS recent_events CASCADE;

-- Drop oude indexes (CASCADE doet dit al, maar voor de zekerheid)
DROP INDEX IF EXISTS idx_clubs_club_id CASCADE;
DROP INDEX IF EXISTS idx_clubs_name CASCADE;
DROP INDEX IF EXISTS idx_club_members_club_id CASCADE;
DROP INDEX IF EXISTS idx_club_members_rider_id CASCADE;
DROP INDEX IF EXISTS idx_riders_zwift_id CASCADE;
DROP INDEX IF EXISTS idx_riders_club_id CASCADE;
DROP INDEX IF EXISTS idx_riders_ranking CASCADE;
DROP INDEX IF EXISTS idx_riders_watts_per_kg CASCADE;
DROP INDEX IF EXISTS idx_rider_snapshots_rider_id CASCADE;
DROP INDEX IF EXISTS idx_rider_snapshots_timestamp CASCADE;
DROP INDEX IF EXISTS idx_events_event_id CASCADE;
DROP INDEX IF EXISTS idx_events_date CASCADE;
DROP INDEX IF EXISTS idx_event_results_event_id CASCADE;
DROP INDEX IF EXISTS idx_event_results_rider_id CASCADE;
DROP INDEX IF EXISTS idx_sync_logs_type CASCADE;
DROP INDEX IF EXISTS idx_sync_logs_timestamp CASCADE;

-- Drop oude functies/triggers (als die bestaan)
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP TRIGGER IF EXISTS update_clubs_updated_at ON clubs;
DROP TRIGGER IF EXISTS update_riders_updated_at ON riders;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;

-- ============================================================================
-- RESULTAAT
-- ============================================================================
-- Database is nu schoon en klaar voor mvp-schema.sql
-- 
-- ✅ Volgende stap:
--    Kopieer en run supabase/mvp-schema.sql in SQL Editor
-- ============================================================================

SELECT 'Cleanup voltooid! Database is klaar voor mvp-schema.sql' AS status;
