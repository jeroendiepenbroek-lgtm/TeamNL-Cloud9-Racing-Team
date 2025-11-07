-- ============================================================================
-- MIGRATION: ZwiftRacing API 1:1 Mapping
-- ============================================================================
-- Date: 2025-11-06
-- Purpose: Transform riders table to exact 1:1 mapping with ZwiftRacing API
-- Impact: BREAKING - drops computed columns, adds 44+ new columns
-- 
-- BEFORE RUNNING:
-- 1. Backup: CREATE TABLE riders_backup_20251106 AS SELECT * FROM riders;
-- 2. Test in development first!
-- 3. Update TypeScript types after migration
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: BACKUP & SAFETY
-- ============================================================================

-- Create backup table
CREATE TABLE IF NOT EXISTS riders_backup_20251106 AS 
SELECT * FROM riders;

COMMENT ON TABLE riders_backup_20251106 IS 
'Backup before 1:1 API mapping migration on 2025-11-06';

-- ============================================================================
-- PHASE 2: REMOVE COMPUTED/INVALID COLUMNS
-- ============================================================================

-- Remove computed column (ftp/weight) - NOT IN API!
ALTER TABLE riders DROP COLUMN IF EXISTS watts_per_kg;

-- Remove unknown source columns - NOT IN API!
ALTER TABLE riders DROP COLUMN IF EXISTS ranking;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking_score;

-- ============================================================================
-- PHASE 3: FIX MISMATCHED COLUMNS
-- ============================================================================

-- Rename ftp → zp_ftp (API: zpFTP)
ALTER TABLE riders RENAME COLUMN ftp TO zp_ftp;

-- Rename category_racing → race_category_current (API: race.current.mixed.category)
ALTER TABLE riders 
RENAME COLUMN category_racing TO race_category_current;

-- Rename category_zftp → zp_category (API: zpCategory)
ALTER TABLE riders 
RENAME COLUMN category_zftp TO zp_category;

-- Fix age type: INTEGER → TEXT (API gives "Vet", "40-44", etc.)
ALTER TABLE riders 
ALTER COLUMN age TYPE text USING age::text;

-- Rename total_races → race_finishes (API: race.finishes)
ALTER TABLE riders 
RENAME COLUMN total_races TO race_finishes;

-- Rename total_wins → race_wins (API: race.wins)
ALTER TABLE riders 
RENAME COLUMN total_wins TO race_wins;

-- Rename total_podiums → race_podiums (API: race.podiums)
ALTER TABLE riders 
RENAME COLUMN total_podiums TO race_podiums;

-- ============================================================================
-- PHASE 4: ADD MISSING API COLUMNS
-- ============================================================================

-- ========== CORE IDENTITY (missing) ==========
ALTER TABLE riders ADD COLUMN IF NOT EXISTS height INTEGER;

-- ========== RACE DETAILS (from API.race) ==========
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_rating_current NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_rating_last NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_rating_max30 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_rating_max90 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_category_number INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_dnfs INTEGER DEFAULT 0;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_last_date BIGINT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_max30_expires BIGINT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_max90_expires BIGINT;

-- ========== POWER CURVE (from API.power) ==========
-- W/kg values (relative power)
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg5 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg15 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg30 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg60 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg120 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg300 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg1200 NUMERIC;

-- Watt values (absolute power)
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w5 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w15 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w30 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w60 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w120 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w300 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w1200 INTEGER;

-- Critical Power model
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_cp NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_awc NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_compound_score NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_rating NUMERIC;

-- ========== HANDICAPS (from API.handicaps.profile) ==========
ALTER TABLE riders ADD COLUMN IF NOT EXISTS handicap_flat NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS handicap_rolling NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS handicap_hilly NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS handicap_mountainous NUMERIC;

-- ========== PHENOTYPE (from API.phenotype) ==========
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_value TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_bias NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_sprinter NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_puncheur NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_pursuiter NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_climber NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_tt NUMERIC;

-- ============================================================================
-- PHASE 5: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN riders.zwift_id IS 'API: riderId';
COMMENT ON COLUMN riders.name IS 'API: name';
COMMENT ON COLUMN riders.age IS 'API: age (STRING like "Vet", "40-44")';
COMMENT ON COLUMN riders.gender IS 'API: gender';
COMMENT ON COLUMN riders.country IS 'API: country';
COMMENT ON COLUMN riders.height IS 'API: height (cm)';
COMMENT ON COLUMN riders.weight IS 'API: weight (kg)';
COMMENT ON COLUMN riders.zp_category IS 'API: zpCategory (A+, A, B, C, D, E)';
COMMENT ON COLUMN riders.zp_ftp IS 'API: zpFTP (watts)';
COMMENT ON COLUMN riders.club_id IS 'API: club.id';
COMMENT ON COLUMN riders.club_name IS 'API: club.name (denormalized)';

COMMENT ON COLUMN riders.race_rating_current IS 'API: race.current.rating';
COMMENT ON COLUMN riders.race_rating_last IS 'API: race.last.rating';
COMMENT ON COLUMN riders.race_rating_max30 IS 'API: race.max30.rating';
COMMENT ON COLUMN riders.race_rating_max90 IS 'API: race.max90.rating';
COMMENT ON COLUMN riders.race_category_current IS 'API: race.current.mixed.category (Diamond, Sapphire, etc.)';
COMMENT ON COLUMN riders.race_category_number IS 'API: race.current.mixed.number';
COMMENT ON COLUMN riders.race_finishes IS 'API: race.finishes';
COMMENT ON COLUMN riders.race_dnfs IS 'API: race.dnfs';
COMMENT ON COLUMN riders.race_wins IS 'API: race.wins';
COMMENT ON COLUMN riders.race_podiums IS 'API: race.podiums';

COMMENT ON COLUMN riders.power_wkg5 IS 'API: power.wkg5 (5sec W/kg)';
COMMENT ON COLUMN riders.power_w5 IS 'API: power.w5 (5sec watts)';
-- ... (add more comments as needed)

COMMENT ON COLUMN riders.phenotype_value IS 'API: phenotype.value (Sprinter, Climber, etc.)';

-- ============================================================================
-- PHASE 6: VERIFY MIGRATION
-- ============================================================================

-- Count columns before/after
SELECT 
  'riders_backup' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'riders_backup_20251106'
UNION ALL
SELECT 
  'riders_new' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'riders';

-- Show new schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'riders'
ORDER BY ordinal_position;

COMMIT;

-- ============================================================================
-- POST-MIGRATION CHECKLIST
-- ============================================================================
/*
✅ 1. Verify column count increased from ~21 to ~65
✅ 2. Check no data loss: SELECT COUNT(*) FROM riders vs riders_backup_20251106
✅ 3. Update TypeScript types in backend/src/types/index.ts
✅ 4. Update sync code in backend/src/services/auto-sync.service.ts
✅ 5. Update sync code in backend/src/api/endpoints/riders.ts
✅ 6. Test sync: POST /api/auto-sync/trigger
✅ 7. Verify no "cannot insert" errors in logs
✅ 8. Check data populated: SELECT * FROM riders WHERE zwift_id = 150437
✅ 9. Drop backup after verification: DROP TABLE riders_backup_20251106
*/
