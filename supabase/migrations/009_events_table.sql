-- ============================================================================
-- MIGRATION 009: Events Table (Feature 1 - Events Page)
-- ============================================================================
-- Created: 2025-11-12
-- Purpose: Create events table for tracking Zwift racing events
-- Feature: Events Page (48h lookforward)
-- ============================================================================

-- Events Table
-- Stores Zwift racing events (races, group rides, workouts)
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL UNIQUE, -- Zwift event ID
  zwift_event_id BIGINT, -- Alternative Zwift event ID (if different)
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT, -- race, group_ride, workout
  route TEXT,
  laps INTEGER,
  distance_meters INTEGER,
  total_elevation INTEGER,
  category TEXT, -- A/B/C/D or Mixed
  description TEXT,
  event_url TEXT,
  category_enforcement BOOLEAN DEFAULT false,
  organizer TEXT,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(event_date) WHERE event_date > NOW();
CREATE INDEX IF NOT EXISTS idx_events_recent ON events(event_date) WHERE event_date < NOW();

-- Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public events read access" ON events
  FOR SELECT USING (true);

CREATE POLICY "Authenticated events write access" ON events
  FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- Enable Realtime (after table is fully created)
ALTER PUBLICATION supabase_realtime ADD TABLE events;

COMMENT ON TABLE events IS 'Zwift racing events (races, group rides, workouts)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================