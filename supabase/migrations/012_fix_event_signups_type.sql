-- ============================================================================
-- MIGRATION 012: Fix event_signups event_id Type (BIGINT → TEXT)
-- ============================================================================
-- Created: 2025-11-12
-- Purpose: Change event_id from BIGINT to TEXT to match API format
-- Reason: ZwiftRacing API returns event IDs as strings ("5129235")
-- ============================================================================

-- 1. Drop views first (they depend on event_signups.event_id)
DROP VIEW IF EXISTS view_upcoming_events CASCADE;
DROP VIEW IF EXISTS view_team_events CASCADE;

-- 2. Fix event_signups.event_id type
ALTER TABLE event_signups 
  ALTER COLUMN event_id TYPE TEXT USING event_id::TEXT;

-- 3. Update indexes
DROP INDEX IF EXISTS idx_event_signups_event_id;
CREATE INDEX idx_event_signups_event_id ON event_signups(event_id);

DROP INDEX IF EXISTS idx_event_signups_event_status;
CREATE INDEX idx_event_signups_event_status ON event_signups(event_id, status);

-- 4. Add pen columns if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='event_signups' AND column_name='pen_name') THEN
    ALTER TABLE event_signups ADD COLUMN pen_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='event_signups' AND column_name='pen_range_label') THEN
    ALTER TABLE event_signups ADD COLUMN pen_range_label TEXT;
  END IF;
END $$;

-- 5. Recreate views with correct event_id type (TEXT)

-- View: Upcoming events with signup counts
CREATE OR REPLACE VIEW view_upcoming_events AS
SELECT 
  e.*,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.status = 'confirmed') as confirmed_signups,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.status = 'tentative') as tentative_signups,
  COUNT(DISTINCT es.rider_id) as total_signups
FROM zwift_api_events e
LEFT JOIN event_signups es ON e.event_id = es.event_id
WHERE TO_TIMESTAMP(e.time_unix) > NOW() 
  AND TO_TIMESTAMP(e.time_unix) <= (NOW() + INTERVAL '48 hours')
GROUP BY e.id
ORDER BY e.time_unix ASC;

-- View: Events with team riders signed up
CREATE OR REPLACE VIEW view_team_events AS
SELECT 
  e.*,
  ARRAY_AGG(
    DISTINCT jsonb_build_object(
      'rider_id', r.rider_id,
      'name', r.name,
      'category', es.category,
      'status', es.status,
      'pen_name', es.pen_name,
      'zp_category', r.zp_category,
      'zp_ftp', r.zp_ftp,
      'weight', r.weight
    )
  ) FILTER (WHERE r.rider_id IS NOT NULL) as team_riders,
  COUNT(DISTINCT r.rider_id) as team_rider_count
FROM zwift_api_events e
INNER JOIN event_signups es ON e.event_id = es.event_id
INNER JOIN riders r ON es.rider_id = r.rider_id
WHERE TO_TIMESTAMP(e.time_unix) > NOW() 
  AND TO_TIMESTAMP(e.time_unix) <= (NOW() + INTERVAL '48 hours')
  AND es.status IN ('confirmed', 'tentative')
GROUP BY e.id
ORDER BY e.time_unix ASC;

COMMENT ON VIEW view_upcoming_events IS 'Upcoming events (next 48h) with signup counts';
COMMENT ON VIEW view_team_events IS 'Upcoming events with our team riders signed up';

-- Add pen_name column to event_signups if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='event_signups' AND column_name='pen_name') THEN
    ALTER TABLE event_signups ADD COLUMN pen_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='event_signups' AND column_name='pen_range_label') THEN
    ALTER TABLE event_signups ADD COLUMN pen_range_label TEXT;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
