-- Migration: Add ZRS (Zwift Racing Score) to riders_unified
-- Date: 2025-12-07
-- Purpose: Add Zwift Racing Score from Zwift Official API

-- Add ZRS column
ALTER TABLE riders_unified 
ADD COLUMN IF NOT EXISTS zrs INTEGER;

-- Add comment
COMMENT ON COLUMN riders_unified.zrs IS 
  'Zwift Racing Score (ZRS) from Zwift Official API - Integer racing ability score';

-- Verify column added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'riders_unified'
  AND column_name = 'zrs';
