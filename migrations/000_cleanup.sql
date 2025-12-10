-- ============================================================================
-- MIGRATION 000: Cleanup - Verwijder alle bestaande API tabellen en indexes
-- ============================================================================
-- Gebruik dit script ALLEEN als je opnieuw wilt beginnen
-- ============================================================================

-- Drop alle indexes (moet eerst vanwege dependencies)
DROP INDEX IF EXISTS idx_api_zwiftracing_public_clubs_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_clubs_riders_club CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_clubs_riders_velo CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_clubs_riders_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_clubs_riders_name CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_riders_bulk_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_riders_bulk_request CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_riders_individual_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_api_events_upcoming_start CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_api_events_upcoming_type CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_api_events_upcoming_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_api_events_signups_event CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_api_events_signups_rider CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_api_events_signups_category CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_api_events_signups_rating CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_results_event CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_results_rider CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftracing_public_results_position CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_name CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_country CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_activities_rider CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_activities_start CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_activities_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_followers_rider CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_followers_follower CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_followers_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_followees_rider CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_followees_followee CASCADE;
DROP INDEX IF EXISTS idx_api_zwift_api_profiles_followees_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftpower_cache3_profile_races_rider CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftpower_cache3_profile_races_date CASCADE;
DROP INDEX IF EXISTS idx_api_zwiftpower_cache3_profile_races_fetched CASCADE;
DROP INDEX IF EXISTS idx_api_sync_log_started CASCADE;
DROP INDEX IF EXISTS idx_api_sync_log_api CASCADE;
DROP INDEX IF EXISTS idx_api_sync_log_status CASCADE;

-- Drop alle tabellen (cascade zorgt voor foreign keys)
DROP TABLE IF EXISTS api_sync_log CASCADE;
DROP TABLE IF EXISTS api_zwiftpower_cache3_profile_races CASCADE;
DROP TABLE IF EXISTS api_zwift_api_profiles_followees CASCADE;
DROP TABLE IF EXISTS api_zwift_api_profiles_followers CASCADE;
DROP TABLE IF EXISTS api_zwift_api_profiles_activities CASCADE;
DROP TABLE IF EXISTS api_zwift_api_profiles CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_results CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_api_events_signups CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_api_events_upcoming CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_riders_individual CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_riders_bulk_requests CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_riders_bulk CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_clubs_riders CASCADE;
DROP TABLE IF EXISTS api_zwiftracing_public_clubs CASCADE;

-- Verify cleanup
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'api_%';
  
  RAISE NOTICE '✅ Cleanup complete. Remaining API tables: %', table_count;
END $$;
