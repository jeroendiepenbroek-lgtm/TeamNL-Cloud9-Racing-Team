-- ============================================================================
-- COMPLETE FIX voor riders_unified en rider_activities
-- ============================================================================
-- Probleem 1: Category constraint te strikt (moet NULL toestaan)
-- Probleem 2: rider_activities heeft INT ipv DECIMAL voor float waarden
-- ============================================================================

-- FIX 1: Category constraint - allow NULL en A+ ook
ALTER TABLE riders_unified 
  DROP CONSTRAINT IF EXISTS riders_unified_category_check;

ALTER TABLE riders_unified 
  ADD CONSTRAINT riders_unified_category_check 
  CHECK (category IS NULL OR category IN ('A', 'B', 'C', 'D', 'E', 'A+'));

-- FIX 2: rider_activities data types - DECIMAL ipv INT voor float waarden
ALTER TABLE rider_activities 
  ALTER COLUMN avg_watts TYPE DECIMAL(10,2),
  ALTER COLUMN avg_heart_rate TYPE DECIMAL(5,2),
  ALTER COLUMN distance_meters TYPE DECIMAL(12,2),
  ALTER COLUMN elevation_meters TYPE DECIMAL(10,2);

-- ============================================================================
-- VERIFICATIE
-- ============================================================================

-- 1. Check category constraint
SELECT 
  'Category constraint' as check_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'riders_unified'::regclass
  AND conname = 'riders_unified_category_check';

-- 2. Check rider_activities data types
SELECT 
  'Activities data types' as check_name,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_name = 'rider_activities'
  AND column_name IN ('avg_watts', 'avg_heart_rate', 'distance_meters', 'elevation_meters')
ORDER BY column_name;
