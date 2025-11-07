-- ============================================================================
-- MIGRATION 007: Pure 1:1 API → DB Mapping
-- ============================================================================
-- Datum: 2025-11-07
-- Doel: Verwijder computed columns, voeg alle 61 API velden toe
-- Impact: BREAKING CHANGE - hernoem zwift_id → rider_id
-- 
-- WAARSCHUWING: Test eerst in development!
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: BACKUP CURRENT DATA
-- ============================================================================
-- Create backup table (optional but recommended)
CREATE TABLE IF NOT EXISTS riders_backup_20251107 AS 
SELECT * FROM riders;

COMMENT ON TABLE riders_backup_20251107 IS 'Backup before migration 007 - Pure API mapping';

-- ============================================================================
-- STEP 2: DROP COMPUTED/DEPRECATED COLUMNS
-- ============================================================================
-- Deze kolommen waren berekend of inconsistent met API
ALTER TABLE riders DROP COLUMN IF EXISTS watts_per_kg CASCADE;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking CASCADE;
ALTER TABLE riders DROP COLUMN IF EXISTS ranking_score CASCADE;
ALTER TABLE riders DROP COLUMN IF EXISTS updated_at CASCADE;

-- ============================================================================
-- STEP 3: RENAME COLUMNS VOOR API CONSISTENCY
-- ============================================================================
-- zwift_id → rider_id (matches API "riderId")
ALTER TABLE riders RENAME COLUMN zwift_id TO rider_id;

-- Backup oude FTP/category velden (voor fallback)
ALTER TABLE riders RENAME COLUMN ftp TO ftp_deprecated;
ALTER TABLE riders RENAME COLUMN category_racing TO category_racing_deprecated;
ALTER TABLE riders RENAME COLUMN category_zftp TO category_zftp_deprecated;

-- ============================================================================
-- STEP 4: ADD ALL NEW API FIELDS (40 nieuwe kolommen)
-- ============================================================================

-- === Core Fields (was al deels aanwezig) ===
-- name, gender, country, age, height, weight blijven zoals ze zijn

-- === Zwift Performance (2 velden) ===
ALTER TABLE riders ADD COLUMN IF NOT EXISTS zp_category TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS zp_ftp INTEGER;

-- === Power Data (14 velden) ===
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg5 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg15 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg30 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg60 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg120 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg300 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_wkg1200 NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w5 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w15 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w30 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w60 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w120 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w300 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_w1200 INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_cp NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_awc NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_compound_score NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS power_rating NUMERIC;

-- === Race Stats (12 velden) ===
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_last_rating NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_last_date BIGINT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_last_category TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_last_number INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_current_rating NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_current_date BIGINT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_max30_rating NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_max30_expires BIGINT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_max90_rating NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_max90_expires BIGINT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_finishes INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_dnfs INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_wins INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS race_podiums INTEGER;

-- === Handicaps (4 velden) ===
ALTER TABLE riders ADD COLUMN IF NOT EXISTS handicap_flat NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS handicap_rolling NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS handicap_hilly NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS handicap_mountainous NUMERIC;

-- === Phenotype (7 velden) ===
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_sprinter NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_puncheur NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_pursuiter NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_climber NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_tt NUMERIC;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_value TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS phenotype_bias NUMERIC;

-- ============================================================================
-- STEP 5: DROP FOREIGN KEYS EERST (voordat we constraint kunnen droppen)
-- ============================================================================
-- Drop alle FK constraints die afhangen van riders.zwift_id
ALTER TABLE my_team_members DROP CONSTRAINT IF EXISTS fk_my_team_members_rider;
ALTER TABLE my_team_members DROP CONSTRAINT IF EXISTS fk_my_team_rider;
ALTER TABLE my_team_members DROP CONSTRAINT IF EXISTS my_team_members_zwift_id_fkey;

-- ============================================================================
-- STEP 6: UPDATE CONSTRAINTS
-- ============================================================================
-- Drop oude constraint op zwift_id (nu rider_id)
ALTER TABLE riders DROP CONSTRAINT IF EXISTS riders_zwift_id_key CASCADE;

-- Add new unique constraint op rider_id
ALTER TABLE riders ADD CONSTRAINT riders_rider_id_key UNIQUE (rider_id);

-- ============================================================================
-- STEP 7: CREATE COMPUTED VIEW (voor backwards compatibility)
-- ============================================================================
DROP VIEW IF EXISTS riders_computed CASCADE;

CREATE VIEW riders_computed AS
SELECT 
  *,
  -- Computed: watts per kg
  CASE 
    WHEN weight > 0 THEN ROUND((zp_ftp::NUMERIC / weight), 2)
    ELSE NULL 
  END AS watts_per_kg,
  
  -- Backwards compatibility: map oude velden
  race_current_rating AS ranking,
  race_finishes AS total_races_compat,
  race_wins AS total_wins_compat,
  race_podiums AS total_podiums_compat
FROM riders;

COMMENT ON VIEW riders_computed IS 'Riders met computed velden (watts_per_kg) voor backwards compatibility';

-- ============================================================================
-- STEP 8: UPDATE my_team_members FOREIGN KEY
-- ============================================================================
-- Rename kolom van zwift_id naar rider_id
ALTER TABLE my_team_members RENAME COLUMN zwift_id TO rider_id;

-- Add nieuwe FK constraint naar riders(rider_id)
ALTER TABLE my_team_members 
  ADD CONSTRAINT my_team_members_rider_id_fkey 
  FOREIGN KEY (rider_id) 
  REFERENCES riders(rider_id) 
  ON DELETE CASCADE;

-- ============================================================================
-- STEP 9: RECREATE view_my_team MET NIEUWE STRUCTUUR
-- ============================================================================
DROP VIEW IF EXISTS view_my_team CASCADE;

CREATE VIEW view_my_team AS
SELECT 
  r.*,
  r.watts_per_kg,  -- From riders_computed
  r.club_name,     -- Club name is nu in riders tabel zelf (van API)
  m.added_at AS team_added_at,
  m.is_favorite
FROM my_team_members m
JOIN riders_computed r ON r.rider_id = m.rider_id
ORDER BY r.race_current_rating DESC NULLS LAST;

COMMENT ON VIEW view_my_team IS 'My team riders met computed velden en club info';

-- ============================================================================
-- STEP 10: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON COLUMN riders.rider_id IS 'Zwift Rider ID (was: zwift_id) - matches API riderId';
COMMENT ON COLUMN riders.zp_category IS 'Zwift Racing category (A/B/C/D/E)';
COMMENT ON COLUMN riders.zp_ftp IS 'Zwift FTP from API';
COMMENT ON COLUMN riders.power_wkg5 IS '5 second power in W/kg';
COMMENT ON COLUMN riders.power_w5 IS '5 second power in Watts';
COMMENT ON COLUMN riders.race_current_rating IS 'Current ZwiftRacing rating';
COMMENT ON COLUMN riders.race_finishes IS 'Total races finished (was: total_races)';
COMMENT ON COLUMN riders.phenotype_value IS 'Rider phenotype: Sprinter/Climber/TT/etc';

-- ============================================================================
-- STEP 11: DATA MIGRATION (fallback values)
-- ============================================================================
-- Kopieer oude FTP/category data naar nieuwe velden als fallback
UPDATE riders 
SET 
  zp_ftp = ftp_deprecated,
  zp_category = category_zftp_deprecated
WHERE zp_ftp IS NULL AND ftp_deprecated IS NOT NULL;

-- Kopieer race stats naar nieuwe velden
UPDATE riders
SET
  race_finishes = total_races,
  race_wins = total_wins,
  race_podiums = total_podiums
WHERE race_finishes IS NULL;

-- ============================================================================
-- STEP 12: VALIDATION QUERIES
-- ============================================================================
-- Run deze queries NA de migration om te valideren:

-- Check hoeveel riders er zijn
-- SELECT COUNT(*) as total_riders FROM riders;

-- Check of rider_id unique is
-- SELECT COUNT(*) as total, COUNT(DISTINCT rider_id) as unique_ids FROM riders;

-- Check of nieuwe velden klaargezet zijn
-- SELECT COUNT(*) FROM information_schema.columns 
-- WHERE table_name = 'riders' AND column_name LIKE 'power_%';

-- Check view_my_team werkt
-- SELECT COUNT(*) FROM view_my_team;

-- ============================================================================
COMMIT;

-- ============================================================================
-- ROLLBACK PROCEDURE (in geval van nood)
-- ============================================================================
-- BEGIN;
-- DROP TABLE riders;
-- ALTER TABLE riders_backup_20251107 RENAME TO riders;
-- COMMIT;
-- ============================================================================
