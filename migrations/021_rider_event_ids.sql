-- Migration: 021_rider_event_ids
-- Create table to map riders to event IDs (for ZPDataFetch results)

CREATE TABLE IF NOT EXISTS rider_event_ids (
  rider_id INTEGER NOT NULL,
  event_id BIGINT NOT NULL,
  event_date TIMESTAMPTZ,
  source TEXT DEFAULT 'zpdatafetch',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (rider_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_rider_event_ids_rider ON rider_event_ids(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_event_ids_event_date ON rider_event_ids(event_date DESC);

GRANT ALL ON rider_event_ids TO service_role;
GRANT SELECT ON rider_event_ids TO authenticated;
GRANT SELECT ON rider_event_ids TO anon;
