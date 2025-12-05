-- ============================================================================
-- DATABASE MIGRATION: Add Missing Columns to riders_unified
-- ============================================================================
-- Project: TeamNL Cloud9 Racing Team
-- Date: 5 december 2025
-- Purpose: Complete field coverage voor Racing Matrix Dashboard
-- ============================================================================

-- PRIORITEIT 1: CRITICAL - phenotype_climber (4e phenotype score)
-- Dit is nodig voor volledige 4-axis phenotype radar chart
ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS phenotype_climber NUMERIC;

COMMENT ON COLUMN riders_unified.phenotype_climber IS 
  'Climber phenotype score 0-100 from ZwiftRacing API phenotype.scores.climber';

-- PRIORITEIT 2: HIGH - power_rating (overall power metric)
ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS power_rating NUMERIC;

COMMENT ON COLUMN riders_unified.power_rating IS 
  'Overall power rating from ZwiftRacing API power.powerRating';

-- PRIORITEIT 3: MEDIUM - last race tracking
ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS last_race_date TIMESTAMPTZ;

ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS last_race_velo NUMERIC;

COMMENT ON COLUMN riders_unified.last_race_date IS 
  'Date of last race from ZwiftRacing API race.last.date';

COMMENT ON COLUMN riders_unified.last_race_velo IS 
  'vELO rating at last race from ZwiftRacing API race.last.rating';

-- PRIORITEIT 4: OPTIONAL - phenotype_type string
ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS phenotype_type TEXT;

COMMENT ON COLUMN riders_unified.phenotype_type IS 
  'Phenotype type string from ZwiftRacing API phenotype.value (e.g., "Pursuiter", "Sprinter")';

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================

-- Check nieuwe kolommen bestaan
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'riders_unified'
  AND column_name IN (
    'phenotype_climber',
    'power_rating',
    'last_race_date',
    'last_race_velo',
    'phenotype_type'
  )
ORDER BY column_name;

-- Expected output: 5 rows met nieuwe kolommen

-- ============================================================================
-- POST-MIGRATION: Re-sync riders to populate new columns
-- ============================================================================

-- Run dit commando NADAT migration succesvol is:
-- npx tsx backend/services/unified-sync.service.ts --all

-- Dit zal alle 75 team members opnieuw synchroniseren met de nieuwe kolommen
-- Estimated duration: ~15 minutes (75 riders × 12s rate limit)

-- ============================================================================
-- VERIFY DATA AFTER SYNC
-- ============================================================================

-- Check phenotype_climber is gevuld voor team members
SELECT 
  rider_id,
  name,
  phenotype_sprinter,
  phenotype_climber,  -- Should NOT be NULL after sync
  phenotype_pursuiter,
  phenotype_puncheur,
  phenotype_type,
  last_synced_zwift_racing
FROM riders_unified
WHERE is_team_member = true
  AND last_synced_zwift_racing IS NOT NULL
ORDER BY velo_rating DESC NULLS LAST
LIMIT 10;

-- Expected: phenotype_climber heeft values (bijv. 45.2, 78.9, etc.)

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
