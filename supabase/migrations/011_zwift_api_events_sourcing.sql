-- ============================================================================
-- MIGRATION 011: Zwift API Events Sourcing Table (1:1 API Mapping)
-- ============================================================================
-- Created: 2025-11-12
-- Purpose: Store RAW events data from ZwiftRacing /api/events endpoint
-- Principle: Every API endpoint needs a dedicated sourcing table
-- ============================================================================

-- Drop old incomplete events table (backup eerst als je data hebt!)
-- DROP TABLE IF EXISTS events CASCADE;

-- Rename old events to backup
ALTER TABLE IF EXISTS events RENAME TO events_old_backup_20251112;

-- Raw events data from /api/events endpoint (1:1 with API response)
CREATE TABLE zwift_api_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- API Fields (exact match)
  mongo_id TEXT UNIQUE,               -- _id (MongoDB ID from ZwiftRacing API)
  event_id TEXT NOT NULL UNIQUE,      -- eventId (STRING in API, not number!)
  time_unix BIGINT NOT NULL,          -- time (Unix timestamp seconds)
  title TEXT NOT NULL,                -- title
  event_type TEXT,                    -- type (Race, Group Ride, Workout)
  sub_type TEXT,                      -- subType (Scratch, Time Trial, Points Race, etc)
  distance_meters INTEGER,            -- distance
  elevation_meters INTEGER,           -- elevation
  route_name TEXT,                    -- route.name
  route_world TEXT,                   -- route.world (Watopia, London, etc)
  organizer TEXT,                     -- organizer (WTRL, ZwiftHQ, etc)
  category_enforcement TEXT,          -- categoryEnforcement (zPower, category, none)
  
  -- Complex nested data stored as JSONB
  pens JSONB,                         -- pens[] array - includes signups, categories, start times
  route_full JSONB,                   -- route{} object - full route details
  raw_response JSONB,                 -- Full API response for debugging/future fields
  
  -- Metadata
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_zwift_events_event_id ON zwift_api_events(event_id);
CREATE INDEX idx_zwift_events_time ON zwift_api_events(time_unix);
CREATE INDEX idx_zwift_events_time_future ON zwift_api_events(time_unix) WHERE time_unix > EXTRACT(EPOCH FROM NOW());
CREATE INDEX idx_zwift_events_type ON zwift_api_events(event_type);
CREATE INDEX idx_zwift_events_organizer ON zwift_api_events(organizer);
CREATE INDEX idx_zwift_events_pens_gin ON zwift_api_events USING GIN(pens);  -- JSONB search

-- RLS Policies
ALTER TABLE zwift_api_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON zwift_api_events
  FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON zwift_api_events
  FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_zwift_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_zwift_events_updated_at
  BEFORE UPDATE ON zwift_api_events
  FOR EACH ROW
  EXECUTE FUNCTION update_zwift_events_updated_at();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE zwift_api_events;

COMMENT ON TABLE zwift_api_events IS 'Raw events data from ZwiftRacing /api/events endpoint (1:1 mapping)';
COMMENT ON COLUMN zwift_api_events.mongo_id IS 'MongoDB _id from ZwiftRacing API';
COMMENT ON COLUMN zwift_api_events.event_id IS 'Zwift event ID (STRING format: "5129235")';
COMMENT ON COLUMN zwift_api_events.time_unix IS 'Event start time as Unix timestamp (seconds)';
COMMENT ON COLUMN zwift_api_events.pens IS 'JSONB array of pens with signups (A/B/C/D categories)';
COMMENT ON COLUMN zwift_api_events.raw_response IS 'Full API response for future-proofing';

-- ============================================================================
-- Application-friendly VIEW (maintains backwards compatibility)
-- ============================================================================

CREATE OR REPLACE VIEW events AS
SELECT 
  id,
  event_id::BIGINT as event_id,      -- Cast to BIGINT for backwards compatibility
  title as name,                      -- Rename to 'name' for existing code
  TO_TIMESTAMP(time_unix) as event_date,
  event_type,
  sub_type,
  distance_meters,
  elevation_meters,
  route_name as route,
  route_world,
  organizer,
  category_enforcement::BOOLEAN as category_enforcement,  -- Cast to boolean
  NULL::INTEGER as laps,              -- Not in API, set to NULL
  NULL::TEXT as description,          -- Not in API
  NULL::TEXT as event_url,            -- Not in API
  last_synced,
  created_at,
  updated_at
FROM zwift_api_events;

COMMENT ON VIEW events IS 'Application-friendly view of zwift_api_events (backwards compatible)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
