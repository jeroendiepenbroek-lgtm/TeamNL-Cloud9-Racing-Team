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
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  route TEXT,
  laps INTEGER,
  distance_meters INTEGER,
  total_elevation INTEGER,
  category TEXT, -- A/B/C/D or Mixed
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='events' AND column_name='zwift_event_id') THEN
    ALTER TABLE events ADD COLUMN zwift_event_id BIGINT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='events' AND column_name='event_type') THEN
    ALTER TABLE events ADD COLUMN event_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='events' AND column_name='description') THEN
    ALTER TABLE events ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='events' AND column_name='event_url') THEN
    ALTER TABLE events ADD COLUMN event_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='events' AND column_name='category_enforcement') THEN
    ALTER TABLE events ADD COLUMN category_enforcement BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='events' AND column_name='organizer') THEN
    ALTER TABLE events ADD COLUMN organizer TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='events' AND column_name='updated_at') THEN
    ALTER TABLE events ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

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