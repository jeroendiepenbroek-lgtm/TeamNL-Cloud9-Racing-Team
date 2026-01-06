-- Update race_results sync config met lookback en retention settings
UPDATE sync_config 
SET config = jsonb_set(
  jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{fullScanDays}',
    '7'::jsonb
  ),
  '{retentionDays}',
  '90'::jsonb
)
WHERE sync_type = 'race_results';

-- Als config nog niet bestaat, maak hem aan
INSERT INTO sync_config (sync_type, config, is_enabled)
VALUES ('race_results', '{"fullScanDays": 7, "retentionDays": 90}'::jsonb, true)
ON CONFLICT (sync_type) 
DO UPDATE SET config = '{"fullScanDays": 7, "retentionDays": 90}'::jsonb;
