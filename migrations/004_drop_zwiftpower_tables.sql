-- ============================================================================
-- MIGRATION 004: Remove ZwiftPower Tables
-- ============================================================================
-- Datum: 9 december 2025
-- Reden: ZwiftPower.com API deprecated, bot-protected, data niet meer relevant
-- Nieuwe architectuur: Alleen ZwiftRacing.app + Zwift Official API
-- ============================================================================

-- Drop ZwiftPower table (if exists)
DROP TABLE IF EXISTS api_zwiftpower_cache3_profile_races CASCADE;

-- Clean up any ZwiftPower references in sync log
DELETE FROM api_sync_log WHERE source_api = 'zwiftpower.com';

-- Verify cleanup
DO $$
DECLARE
  zwiftpower_tables INTEGER;
BEGIN
  SELECT COUNT(*) INTO zwiftpower_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE '%zwiftpower%';
  
  IF zwiftpower_tables = 0 THEN
    RAISE NOTICE '✅ All ZwiftPower tables removed successfully';
  ELSE
    RAISE WARNING '⚠️  Found % remaining ZwiftPower tables', zwiftpower_tables;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- New architecture: 2-source model
-- 1. ZwiftRacing.app (racing metrics, power data)
-- 2. Zwift Official API (official racing score, avatars, social)
-- ============================================================================
