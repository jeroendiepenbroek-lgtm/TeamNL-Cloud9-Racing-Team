-- ============================================================================
-- MIGRATION 009: Event Signups (Feature 1 - Events Page)
-- ============================================================================
-- Created: 2025-11-12
-- Purpose: Track rider signups/registrations for events
-- Feature: Events Page (48h lookforward)
-- ============================================================================

-- Event Signups Table
-- Links riders to events they're registered for
CREATE TABLE IF NOT EXISTS event_signups (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL,
  rider_id BIGINT NOT NULL,
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  category TEXT, -- A/B/C/D - category rider is racing in
  status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  team_name TEXT, -- Team name if racing as team
  notes TEXT, -- Optional notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: rider can only signup once per event
  UNIQUE(event_id, rider_id),
  
  -- Foreign keys (soft references - allow data even if source deleted)
  -- We don't enforce FK constraints to allow historical data
  CONSTRAINT fk_event CHECK (event_id > 0),
  CONSTRAINT fk_rider CHECK (rider_id > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_signups_event_id ON event_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_rider_id ON event_signups(rider_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_status ON event_signups(status);
CREATE INDEX IF NOT EXISTS idx_event_signups_created ON event_signups(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_event_signups_event_status ON event_signups(event_id, status);

-- Enable Realtime (for live updates in dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE event_signups;

-- Row Level Security
ALTER TABLE event_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public event signups read access" ON event_signups
  FOR SELECT USING (true);

CREATE POLICY "Authenticated event signups write access" ON event_signups
  FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_signups_updated_at
  BEFORE UPDATE ON event_signups
  FOR EACH ROW
  EXECUTE FUNCTION update_event_signups_updated_at();

-- ============================================================================
-- Extend events table with additional fields for Feature 1
-- ============================================================================

-- Add missing fields to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type TEXT; -- race, group_ride, workout
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_enforcement BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS zwift_event_id BIGINT; -- Original Zwift event ID

-- Index for filtering by event type
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- Index for upcoming events (most common query)
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(event_date) WHERE event_date > NOW();

-- ============================================================================
-- Helper Views
-- ============================================================================

-- View: Upcoming events with signup counts
CREATE OR REPLACE VIEW view_upcoming_events AS
SELECT 
  e.*,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.status = 'confirmed') as confirmed_signups,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.status = 'tentative') as tentative_signups,
  COUNT(DISTINCT es.rider_id) as total_signups
FROM events e
LEFT JOIN event_signups es ON e.event_id = es.event_id
WHERE e.event_date > NOW() 
  AND e.event_date <= (NOW() + INTERVAL '48 hours')
GROUP BY e.id, e.event_id, e.name, e.event_date, e.route, e.laps, e.distance_meters, 
         e.total_elevation, e.category, e.last_synced, e.created_at, e.event_type, 
         e.description, e.event_url, e.category_enforcement, e.organizer, e.zwift_event_id
ORDER BY e.event_date ASC;

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
      'zp_category', r.zp_category,
      'zp_ftp', r.zp_ftp,
      'weight', r.weight
    )
  ) FILTER (WHERE r.rider_id IS NOT NULL) as team_riders
FROM events e
INNER JOIN event_signups es ON e.event_id = es.event_id
INNER JOIN riders r ON es.rider_id = r.rider_id
WHERE e.event_date > NOW() 
  AND e.event_date <= (NOW() + INTERVAL '48 hours')
  AND es.status IN ('confirmed', 'tentative')
GROUP BY e.id, e.event_id, e.name, e.event_date, e.route, e.laps, e.distance_meters, 
         e.total_elevation, e.category, e.last_synced, e.created_at, e.event_type, 
         e.description, e.event_url, e.category_enforcement, e.organizer, e.zwift_event_id
ORDER BY e.event_date ASC;

COMMENT ON TABLE event_signups IS 'Tracks rider registrations/signups for events';
COMMENT ON VIEW view_upcoming_events IS 'Upcoming events (next 48h) with signup counts';
COMMENT ON VIEW view_team_events IS 'Upcoming events with our team riders signed up';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Run this migration with:
-- psql $DATABASE_URL -f supabase/migrations/009_event_signups.sql
-- ============================================================================
