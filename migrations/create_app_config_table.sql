-- Create app_config table for persistent application settings
-- This table stores key-value configuration that persists across server restarts

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_config_updated_at ON app_config(updated_at);

-- Insert default auto-sync config
INSERT INTO app_config (key, value, updated_at)
VALUES (
  'auto_sync_settings',
  '{"enabled": true, "intervalMinutes": 60}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Grant access
GRANT SELECT, INSERT, UPDATE ON app_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON app_config TO anon;
GRANT ALL ON app_config TO service_role;

COMMENT ON TABLE app_config IS 'Application configuration settings that persist across server restarts';
COMMENT ON COLUMN app_config.key IS 'Unique configuration key identifier';
COMMENT ON COLUMN app_config.value IS 'Configuration value as JSONB for flexibility';
COMMENT ON COLUMN app_config.updated_at IS 'Last update timestamp';
