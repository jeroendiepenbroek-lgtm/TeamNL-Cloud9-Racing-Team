-- ============================================================================
-- MIGRATION 014: Create Event Signups Sourcing Table
-- ============================================================================
-- Purpose: 1:1 mapping of /api/events/{eventId}/signups endpoint
-- Source: https://zwift-ranking.herokuapp.com/api/events/{eventId}/signups
-- ============================================================================

CREATE TABLE IF NOT EXISTS zwift_api_event_signups (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  pen_name TEXT NOT NULL,                    -- "A", "B", "C", "D", "E"
  avg_rating DECIMAL(10,2),
  rated_riders INTEGER DEFAULT 0,
  rider_id INTEGER NOT NULL,
  rider_name TEXT NOT NULL,
  weight DECIMAL(5,1),
  height INTEGER,
  club_id INTEGER,
  club_name TEXT,
  power_wkg5 DECIMAL(6,2),
  power_wkg30 DECIMAL(6,2),
  power_cp DECIMAL(8,2),
  race_rating DECIMAL(10,2),
  race_finishes INTEGER DEFAULT 0,
  race_wins INTEGER DEFAULT 0,
  race_podiums INTEGER DEFAULT 0,
  phenotype TEXT,                            -- "Sprinter", "All-Rounder", etc.
  raw_data JSONB,                            -- Full API response
  last_synced TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Composite unique constraint
  CONSTRAINT unique_event_pen_rider UNIQUE(event_id, pen_name, rider_id)
);

-- Indexes
CREATE INDEX idx_signups_event_id ON zwift_api_event_signups(event_id);
CREATE INDEX idx_signups_rider_id ON zwift_api_event_signups(rider_id);
CREATE INDEX idx_signups_pen ON zwift_api_event_signups(event_id, pen_name);

COMMENT ON TABLE zwift_api_event_signups IS '1:1 API mapping: /api/events/{eventId}/signups';
COMMENT ON COLUMN zwift_api_event_signups.raw_data IS 'Full rider object from API';
