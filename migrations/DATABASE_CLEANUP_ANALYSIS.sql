-- ============================================
-- DATABASE CLEANUP: Functionele Tabellen/Views
-- ============================================
-- Analyse van welke tabellen/views nog gebruikt worden

-- ============================================
-- 1. FUNCTIONELE TABELLEN (ACTIEF IN GEBRUIK)
-- ============================================

-- ✅ team_roster - ACTIEF
-- Gebruikt door: /api/riders endpoint, v_rider_complete view
-- Doel: Team members lijst

-- ✅ api_zwiftracing_riders - ACTIEF  
-- Gebruikt door: Rider sync, v_rider_complete view
-- Doel: ZwiftRacing API data (vELO, power, phenotype)

-- ✅ zwift_official_profiles - ACTIEF
-- Gebruikt door: Rider sync, v_rider_complete view
-- Doel: Zwift Official API data (racing score, category)

-- ✅ v_rider_complete - ACTIEF VIEW
-- Gebruikt door: /api/riders, frontend roster
-- Doel: Gecombineerde rider data

-- ✅ race_results - NU ACTIEF (pas geüpgraded)
-- Gebruikt door: Race results dashboard (nieuw)
-- Doel: Race history met power intervals

-- ✅ sync_config - ACTIEF
-- Gebruikt door: Scheduler system
-- Doel: Sync configuratie

-- ✅ sync_logs - ACTIEF
-- Gebruikt door: Scheduler logging
-- Doel: Sync history tracking

-- ============================================
-- 2. LEGACY TABELLEN (NIET MEER GEBRUIKT)
-- ============================================

-- ❌ api_zwiftracing_public_clubs - LEGACY
-- Niet meer gebruikt sinds Smart Sync v5
-- Was voor: Bulk club data fetch
-- Replacement: Individual rider sync via /public/riders/{id}

-- ❌ api_zwiftracing_public_clubs_riders - LEGACY
-- Niet meer gebruikt sinds Smart Sync v5
-- Was voor: Riders binnen clubs
-- Replacement: team_roster + api_zwiftracing_riders

-- ❌ zwiftracing_riders - MOGELIJK DUPLICAAT?
-- Check: Is dit anders dan api_zwiftracing_riders?
-- Te onderzoeken of dit safe te droppen is

-- ❌ race_events - LEGACY/ONVOLLEDIG
-- Was voor: Event metadata 
-- Probleem: Weinig data, niet actief gevuld
-- Status: race_results heeft event data embedded

-- ❌ race_results_sync_log - MOGELIJK LEGACY
-- Was voor: Race results sync tracking
-- Check: Wordt dit nog gebruikt door nieuwe pipeline?

-- ============================================
-- 3. VIEWS STATUS
-- ============================================

-- ✅ v_rider_complete - ACTIEF
SELECT 'v_rider_complete' as view_name, 
       COUNT(*) as row_count,
       'ACTIEF - Primary rider view voor frontend' as status
FROM v_rider_complete;

-- Check andere views
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================
-- 4. AANBEVOLEN CLEANUP ACTIES
-- ============================================

-- OPTIE A: SOFT CLEANUP (rename, behoud data)
-- ALTER TABLE api_zwiftracing_public_clubs RENAME TO _deprecated_clubs;
-- ALTER TABLE api_zwiftracing_public_clubs_riders RENAME TO _deprecated_clubs_riders;

-- OPTIE B: HARD CLEANUP (drop, verwijder data)
-- DROP TABLE IF EXISTS api_zwiftracing_public_clubs CASCADE;
-- DROP TABLE IF EXISTS api_zwiftracing_public_clubs_riders CASCADE;

-- EERST: Verificatie dat deze tabellen niet gebruikt worden
SELECT 
  'api_zwiftracing_public_clubs' as table_name,
  COUNT(*) as row_count,
  MAX(fetched_at) as last_updated
FROM api_zwiftracing_public_clubs
WHERE fetched_at > NOW() - INTERVAL '30 days';

SELECT 
  'api_zwiftracing_public_clubs_riders' as table_name,
  COUNT(*) as row_count,
  MAX(fetched_at) as last_updated
FROM api_zwiftracing_public_clubs_riders
WHERE fetched_at > NOW() - INTERVAL '30 days';

-- ============================================
-- 5. HUIDIGE DATABASE OVERZICHT
-- ============================================

SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = tablename) as column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
