-- ============================================================================
-- MIGRATION 014: Create Event Signups Sourcing Table
-- ============================================================================
-- Purpose: 1:1 mapping van /api/events/{eventId}/signups endpoint
-- Date: 2025-11-13
-- US1: Datastructuren voor api/events/{eventId}/signups vastleggen
-- ============================================================================

-- Sourcing table: zwift_api_event_signups
-- Stores RAW API response from /api/events/{eventId}/signups
CREATE TABLE IF NOT EXISTS zwift_api_event_signups (
  id SERIAL PRIMARY KEY,
  
  -- Foreign key to event
  event_id TEXT NOT NULL REFERENCES zwift_api_events(event_id) ON DELETE CASCADE,
  
  -- Pen/Category information
  pen_name TEXT NOT NULL,              -- "A", "B", "C", "D", "E"
  avg_rating NUMERIC,                  -- Average rating of riders in pen (can be null)
  rated_riders INTEGER DEFAULT 0,      -- Number of rated riders
  
  -- Rider data (array of objects from API)
  rider_id INTEGER NOT NULL,           -- Unique rider identifier
  rider_name TEXT NOT NULL,            -- Full name (may contain HTML entities)
  weight NUMERIC,                      -- kg
  height INTEGER,                      -- cm
  
  -- Club information (nested object in API)
  club_id INTEGER,
  club_name TEXT,
  club_background_color TEXT,
  club_text_color TEXT,
  club_border_color TEXT,
  
  -- Power profile (nested object)
  power_wkg5 NUMERIC,                  -- 5s power/kg
  power_wkg15 NUMERIC,                 -- 15s power/kg
  power_wkg30 NUMERIC,                 -- 30s power/kg
  power_wkg60 NUMERIC,                 -- 60s power/kg
  power_wkg120 NUMERIC,                -- 120s power/kg
  power_wkg300 NUMERIC,                -- 300s power/kg
  power_wkg1200 NUMERIC,               -- 1200s power/kg
  power_cp NUMERIC,                    -- Critical Power
  power_awc NUMERIC,                   -- Anaerobic Work Capacity
  
  -- Race statistics (nested object)
  race_rating NUMERIC,                 -- ZwiftPower rating
  race_finishes INTEGER,
  race_wins INTEGER,
  race_podiums INTEGER,
  race_dnfs INTEGER,
  
  -- Phenotype (nested object)
  phenotype_value TEXT,                -- "Sprinter", "All-Rounder", "Climber", etc.
  
  -- Rider visibility
  visibility TEXT DEFAULT 'public',    -- "public" or "private"
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(event_id, pen_name, rider_id),  -- One rider per pen per event
  CHECK (pen_name IN ('A', 'B', 'C', 'D', 'E'))
);

-- Indexes for query performance
CREATE INDEX idx_event_signups_event_id ON zwift_api_event_signups(event_id);
CREATE INDEX idx_event_signups_rider_id ON zwift_api_event_signups(rider_id);
CREATE INDEX idx_event_signups_pen_name ON zwift_api_event_signups(pen_name);
CREATE INDEX idx_event_signups_synced_at ON zwift_api_event_signups(synced_at);

-- Composite index for team rider lookups
CREATE INDEX idx_event_signups_event_rider ON zwift_api_event_signups(event_id, rider_id);

-- Comments
COMMENT ON TABLE zwift_api_event_signups IS 
  '1:1 sourcing table for /api/events/{eventId}/signups endpoint';

COMMENT ON COLUMN zwift_api_event_signups.event_id IS 
  'Links to zwift_api_events.event_id';

COMMENT ON COLUMN zwift_api_event_signups.pen_name IS 
  'Category/pen: A (strongest) to E (weakest)';

COMMENT ON COLUMN zwift_api_event_signups.power_cp IS 
  'Critical Power - sustainable power output';

COMMENT ON COLUMN zwift_api_event_signups.power_awc IS 
  'Anaerobic Work Capacity - energy above CP';

-- ============================================================================
-- View: Event signups with team rider indication
-- ============================================================================
CREATE OR REPLACE VIEW view_event_signups_with_team AS
SELECT 
  es.*,
  CASE 
    WHEN r.rider_id IS NOT NULL THEN true 
    ELSE false 
  END as is_team_rider,
  r.name as team_rider_name,
  r.zp_category as team_rider_category
FROM zwift_api_event_signups es
LEFT JOIN riders r ON es.rider_id = r.rider_id;

COMMENT ON VIEW view_event_signups_with_team IS 
  'Event signups with team rider indication for US4';

-- ============================================================================
-- MIGRATION COMPLETE
-- Ready for sync service to populate data from /api/events/{eventId}/signups
-- ============================================================================
