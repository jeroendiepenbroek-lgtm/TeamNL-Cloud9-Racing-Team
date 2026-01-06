-- Add config column to sync_config table for storing JSON settings
ALTER TABLE sync_config 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Add comment
COMMENT ON COLUMN sync_config.config IS 'JSON configuration: fullScanDays, retentionDays, etc';

-- Set default config for race_results
UPDATE sync_config 
SET config = '{"fullScanDays": 7, "retentionDays": 90}'::jsonb
WHERE sync_type = 'race_results' AND config = '{}'::jsonb;
