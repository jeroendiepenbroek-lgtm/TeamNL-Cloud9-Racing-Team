-- Migration: Add V2 columns to sync_logs table
-- Date: 2025-11-16
-- Purpose: Support new sync-v2.service.ts logging format

-- Add new columns for V2 sync service
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS endpoint TEXT,
ADD COLUMN IF NOT EXISTS records_processed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS details TEXT;

-- Create index for endpoint filtering (used by getLatestMetrics)
CREATE INDEX IF NOT EXISTS idx_sync_logs_endpoint ON sync_logs(endpoint);

-- Create index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_synced_at ON sync_logs(synced_at DESC);

-- Update old logs to have endpoint value from operation (backward compatibility)
UPDATE sync_logs 
SET endpoint = COALESCE(endpoint, operation)
WHERE endpoint IS NULL;

COMMENT ON COLUMN sync_logs.endpoint IS 'Sync type identifier: RIDER_SYNC, NEAR_EVENT_SYNC, FAR_EVENT_SYNC';
COMMENT ON COLUMN sync_logs.records_processed IS 'Number of records successfully synced';
COMMENT ON COLUMN sync_logs.error_message IS 'Error message if status=error';
COMMENT ON COLUMN sync_logs.details IS 'Additional context: intervals, thresholds, counts';
