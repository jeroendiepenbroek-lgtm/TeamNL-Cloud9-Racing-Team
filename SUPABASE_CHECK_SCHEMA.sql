-- Check current constraint en data types

-- 1. Check category constraint
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'riders_unified'::regclass
  AND contype = 'c';

-- 2. Check rider_activities columns
SELECT 
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rider_activities'
  AND column_name IN ('avg_watts', 'avg_heart_rate', 'distance_meters', 'elevation_meters')
ORDER BY column_name;

-- 3. Check riders_unified category column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'riders_unified'
  AND column_name = 'category';
