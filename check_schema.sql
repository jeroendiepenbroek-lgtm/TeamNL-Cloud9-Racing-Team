-- Check riders_unified schema voor race_ kolommen
SELECT 
  column_name, 
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'riders_unified'
  AND column_name LIKE '%race%'
ORDER BY ordinal_position;
