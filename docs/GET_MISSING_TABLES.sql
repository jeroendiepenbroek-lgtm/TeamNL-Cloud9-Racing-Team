-- ============================================================================
-- SUPABASE MISSING TABLES - Get schemas for newly discovered tables
-- ============================================================================
-- Date: 2025-11-05
-- Purpose: Get schemas for club_members, event_results, rider_snapshots
-- ============================================================================

-- Query for all 3 missing tables in one go:
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('club_members', 'event_results', 'rider_snapshots')
ORDER BY 
  CASE table_name
    WHEN 'club_members' THEN 1
    WHEN 'event_results' THEN 2
    WHEN 'rider_snapshots' THEN 3
  END,
  ordinal_position;
