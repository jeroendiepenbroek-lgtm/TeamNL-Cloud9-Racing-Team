-- Rider Race State Tracking Table
-- Gebruikt voor het detecteren van nieuwe races door polling

CREATE TABLE IF NOT EXISTS rider_race_state (
  rider_id INTEGER PRIMARY KEY,
  last_race_date INTEGER,  -- Epoch timestamp van laatste race
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL,
  race_finishes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_race_state_last_checked 
  ON rider_race_state(last_checked);

CREATE INDEX IF NOT EXISTS idx_rider_race_state_last_race 
  ON rider_race_state(last_race_date);

COMMENT ON TABLE rider_race_state IS 'Tracks last known race state per rider for change detection via polling';
COMMENT ON COLUMN rider_race_state.last_race_date IS 'Epoch timestamp (no milliseconds) of riders last race from ZwiftRacing API';
COMMENT ON COLUMN rider_race_state.last_checked IS 'When we last polled this riders data';
