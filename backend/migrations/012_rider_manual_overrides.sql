-- Migration: Add manual_overrides table for rider data corrections
-- Allows manual FTP/Category updates when API data is stale

CREATE TABLE IF NOT EXISTS rider_manual_overrides (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL UNIQUE REFERENCES riders(rider_id) ON DELETE CASCADE,
  
  -- Override fields (NULL = no override, use API data)
  override_zp_ftp INTEGER,
  override_zp_category VARCHAR(1) CHECK (override_zp_category IN ('A', 'B', 'C', 'D', 'E')),
  override_weight DECIMAL(5, 2),
  
  -- Metadata
  override_reason TEXT,
  set_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Optional: auto-expire override
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rider_manual_overrides_rider_id 
  ON rider_manual_overrides(rider_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rider_override_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rider_override_update_timestamp
  BEFORE UPDATE ON rider_manual_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_rider_override_timestamp();

-- Example: Set manual override for rider 150437
-- INSERT INTO rider_manual_overrides (rider_id, override_zp_ftp, override_zp_category, override_reason, set_by)
-- VALUES (150437, 234, 'C', 'Recent category change not yet in API', 'admin');

COMMENT ON TABLE rider_manual_overrides IS 'Manual overrides for rider data when API is stale or incorrect';
COMMENT ON COLUMN rider_manual_overrides.override_zp_ftp IS 'Manual FTP override (Watts)';
COMMENT ON COLUMN rider_manual_overrides.override_zp_category IS 'Manual category override (A/B/C/D/E)';
COMMENT ON COLUMN rider_manual_overrides.expires_at IS 'Optional expiry - override removed after this date';
