-- ============================================
-- CLEANUP: Verwijder alle data en lege tabellen
-- ============================================

-- Check huidige counts
SELECT 'VOOR CLEANUP:' as status;
SELECT 'team_roster' as table_name, COUNT(*) as count FROM team_roster
UNION ALL
SELECT 'api_zwift_api_profiles', COUNT(*) FROM api_zwift_api_profiles
UNION ALL
SELECT 'api_zwiftracing_riders', COUNT(*) FROM api_zwiftracing_riders
UNION ALL
SELECT 'sync_logs', COUNT(*) FROM sync_logs
UNION ALL
SELECT 'sync_config', COUNT(*) FROM sync_config;

-- Verwijder alle riders uit team_roster
DELETE FROM team_roster;

-- Verwijder alle API cache data (optioneel, alleen als je wilt)
-- DELETE FROM api_zwift_api_profiles;
-- DELETE FROM api_zwiftracing_riders;

-- Verwijder sync logs (optioneel)
-- DELETE FROM sync_logs;

-- Reset sequences (optioneel)
-- ALTER SEQUENCE team_roster_id_seq RESTART WITH 1;

-- Verwijder lege/ongebruikte tabellen (als die bestaan)
DROP TABLE IF EXISTS riders CASCADE;
DROP TABLE IF EXISTS club_events CASCADE;
DROP TABLE IF EXISTS club_riders CASCADE;
DROP TABLE IF EXISTS club_data CASCADE;
DROP TABLE IF EXISTS zwift_profiles CASCADE;
DROP TABLE IF EXISTS zwiftracing_riders CASCADE;
DROP TABLE IF EXISTS old_riders CASCADE;
DROP TABLE IF EXISTS app_config CASCADE;

-- Check na cleanup
SELECT 'NA CLEANUP:' as status;
SELECT 'team_roster' as table_name, COUNT(*) as count FROM team_roster
UNION ALL
SELECT 'api_zwift_api_profiles', COUNT(*) FROM api_zwift_api_profiles
UNION ALL
SELECT 'api_zwiftracing_riders', COUNT(*) FROM api_zwiftracing_riders;
