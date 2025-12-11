-- ============================================================================
-- GRANT PUBLIC ACCESS TO VIEWS
-- ============================================================================
-- Purpose: Allow anonymous access to views for frontend dashboard
-- Date: 10 december 2025
-- Issue: Invalid API key - ANON key mismatch tussen Railway en Supabase
-- Solution: Grant explicit permissions to anon role
-- ============================================================================

-- Grant SELECT on all tables to anon (read-only)
GRANT SELECT ON api_zwiftracing_riders TO anon;
GRANT SELECT ON api_zwift_api_profiles TO anon;

-- Grant SELECT on all views to anon (read-only)
GRANT SELECT ON v_rider_complete TO anon;

-- Verify grants
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- RESULT
-- ============================================================================
-- Expected output:
--   anon | public | api_zwiftracing_riders | SELECT
--   anon | public | api_zwift_api_profiles | SELECT
--   anon | public | v_rider_complete       | SELECT
-- ============================================================================
