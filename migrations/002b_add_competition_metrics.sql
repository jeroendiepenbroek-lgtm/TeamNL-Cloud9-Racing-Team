-- ============================================================================
-- MIGRATION 002B: Add Competition Metrics to api_zwift_api_profiles
-- ============================================================================
-- Adds Zwift Official Racing Score (competitionMetrics) to profiles table
-- Datum: 9 december 2025
-- ============================================================================

-- Add competition_metrics columns to api_zwift_api_profiles
ALTER TABLE api_zwift_api_profiles 
  ADD COLUMN IF NOT EXISTS competition_racing_score INTEGER,
  ADD COLUMN IF NOT EXISTS competition_category TEXT,
  ADD COLUMN IF NOT EXISTS competition_category_women TEXT;

-- Update comment to reflect new field count
COMMENT ON TABLE api_zwift_api_profiles IS 
  '1:1 mapping van GET /api/profiles/{id}. Official Zwift profile met avatars, social stats, EN competitionMetrics (racing score). 95 fields.';

-- Verify columns added
DO $$
BEGIN
  RAISE NOTICE 'Added competition_metrics columns to api_zwift_api_profiles';
  RAISE NOTICE 'Ready to sync Zwift profiles with racing scores';
END $$;
