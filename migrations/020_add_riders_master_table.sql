-- ============================================================================
-- Migration 020: Add Central Riders Master Table
-- ============================================================================
-- Purpose: Create a central riders table to serve as the master reference
--          for all rider_ids, solving the FK constraint issue when riders
--          only exist in one API source (Official or Racing)
--
-- Issue: team_roster FK constraint references api_zwiftracing_riders, 
--        causing failures when riders only exist in api_zwift_api_profiles
-- ============================================================================

-- 1. CREATE CENTRAL RIDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS riders (
  rider_id INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_riders_updated ON riders(updated_at);

COMMENT ON TABLE riders IS 
  'Master table for all rider IDs. Acts as central reference for FK constraints.
   Populated automatically when rider data is added to any API source table.';

COMMENT ON COLUMN riders.rider_id IS 'Unique Zwift rider ID (primary key)';
COMMENT ON COLUMN riders.created_at IS 'When this rider was first added to any source table';
COMMENT ON COLUMN riders.updated_at IS 'Last time this rider appeared in any source table';

-- ============================================================================
-- 2. POPULATE FROM EXISTING DATA
-- ============================================================================

-- Insert all unique rider_ids from both API sources
INSERT INTO riders (rider_id, created_at, updated_at)
SELECT DISTINCT rider_id, NOW(), NOW()
FROM (
  SELECT rider_id FROM api_zwiftracing_riders
  UNION
  SELECT rider_id FROM api_zwift_api_profiles
) AS all_riders
ON CONFLICT (rider_id) DO NOTHING;

-- ============================================================================
-- 3. UPDATE TEAM_ROSTER FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Drop old FK constraint that references api_zwiftracing_riders
ALTER TABLE team_roster 
  DROP CONSTRAINT IF EXISTS fk_rider;

-- Add new FK constraint that references the riders master table
ALTER TABLE team_roster 
  ADD CONSTRAINT fk_rider 
  FOREIGN KEY (rider_id) 
  REFERENCES riders(rider_id) 
  ON DELETE CASCADE;

-- ============================================================================
-- 4. CREATE TRIGGERS TO AUTO-POPULATE RIDERS TABLE
-- ============================================================================

-- Function to automatically add riders to master table when they appear in source tables
CREATE OR REPLACE FUNCTION fn_sync_rider_to_master()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO riders (rider_id, updated_at)
  VALUES (NEW.rider_id, NOW())
  ON CONFLICT (rider_id) 
  DO UPDATE SET updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_sync_rider_to_master() IS 
  'Automatically syncs rider_ids to the riders master table when data is inserted/updated in API source tables';

-- Trigger for api_zwiftracing_riders
DROP TRIGGER IF EXISTS trg_sync_zwiftracing_rider ON api_zwiftracing_riders;
CREATE TRIGGER trg_sync_zwiftracing_rider
  AFTER INSERT OR UPDATE ON api_zwiftracing_riders
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_rider_to_master();

-- Trigger for api_zwift_api_profiles  
DROP TRIGGER IF EXISTS trg_sync_zwift_official_rider ON api_zwift_api_profiles;
CREATE TRIGGER trg_sync_zwift_official_rider
  AFTER INSERT OR UPDATE ON api_zwift_api_profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_rider_to_master();

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

-- Verify all existing team_roster entries have valid riders
DO $$
DECLARE
  invalid_count INTEGER;
  rider_count INTEGER;
  roster_count INTEGER;
BEGIN
  -- Count riders in master table
  SELECT COUNT(*) INTO rider_count FROM riders;
  
  -- Count roster entries
  SELECT COUNT(*) INTO roster_count FROM team_roster;
  
  -- Check for invalid references
  SELECT COUNT(*) INTO invalid_count
  FROM team_roster tr
  LEFT JOIN riders r ON tr.rider_id = r.rider_id
  WHERE r.rider_id IS NULL;
  
  RAISE NOTICE '✅ Migration 020 completed successfully';
  RAISE NOTICE '   📊 Riders in master table: %', rider_count;
  RAISE NOTICE '   📊 Team roster entries: %', roster_count;
  
  IF invalid_count > 0 THEN
    RAISE WARNING '   ⚠️  Found % team_roster entries without corresponding riders entries', invalid_count;
  ELSE
    RAISE NOTICE '   ✅ All team_roster entries have valid rider references';
  END IF;
END $$;
