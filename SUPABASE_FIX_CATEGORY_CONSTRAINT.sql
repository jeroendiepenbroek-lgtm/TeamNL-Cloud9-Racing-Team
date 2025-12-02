-- Fix category constraint - allow NULL
ALTER TABLE riders_unified DROP CONSTRAINT IF EXISTS riders_unified_category_check;

ALTER TABLE riders_unified ADD CONSTRAINT riders_unified_category_check 
  CHECK (category IS NULL OR category IN ('A', 'B', 'C', 'D', 'E'));
