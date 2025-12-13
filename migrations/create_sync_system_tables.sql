-- ============================================
-- MODERN SYNC SCHEDULER & LOGGING SYSTEM
-- ============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS sync_config CASCADE;

-- Sync Configuration Table
CREATE TABLE sync_config (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL UNIQUE, -- 'team_riders', 'club_data', etc.
  enabled BOOLEAN NOT NULL DEFAULT true,
  interval_minutes INTEGER NOT NULL DEFAULT 60,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync Logs Table
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'team_riders', 'club_data', etc.
  trigger_type TEXT NOT NULL, -- 'auto', 'manual', 'upload', 'api'
  status TEXT NOT NULL, -- 'running', 'success', 'partial', 'failed'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Stats
  total_items INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Details
  error_message TEXT,
  metadata JSONB, -- Extra info (user_id, rider_ids, etc.)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config for team riders sync
INSERT INTO sync_config (sync_type, enabled, interval_minutes)
VALUES ('team_riders', true, 60)
ON CONFLICT (sync_type) DO NOTHING;

-- Indexes for performance
CREATE INDEX idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX idx_sync_logs_trigger_type ON sync_logs(trigger_type);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX idx_sync_config_sync_type ON sync_config(sync_type);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON sync_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sync_config TO anon;
GRANT ALL ON sync_config TO service_role;

GRANT SELECT, INSERT, UPDATE ON sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON sync_logs TO anon;
GRANT ALL ON sync_logs TO service_role;

GRANT USAGE, SELECT ON SEQUENCE sync_config_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sync_config_id_seq TO anon;
GRANT ALL ON SEQUENCE sync_config_id_seq TO service_role;

GRANT USAGE, SELECT ON SEQUENCE sync_logs_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE sync_logs_id_seq TO anon;
GRANT ALL ON SEQUENCE sync_logs_id_seq TO service_role;

-- Views for easy querying
CREATE OR REPLACE VIEW v_sync_status AS
SELECT 
  sc.sync_type,
  sc.enabled,
  sc.interval_minutes,
  sc.last_run_at,
  sc.next_run_at,
  (SELECT COUNT(*) FROM sync_logs WHERE sync_type = sc.sync_type) as total_runs,
  (SELECT COUNT(*) FROM sync_logs WHERE sync_type = sc.sync_type AND status = 'success') as successful_runs,
  (SELECT COUNT(*) FROM sync_logs WHERE sync_type = sc.sync_type AND status = 'failed') as failed_runs,
  (SELECT started_at FROM sync_logs WHERE sync_type = sc.sync_type ORDER BY started_at DESC LIMIT 1) as last_sync_at
FROM sync_config sc;

-- Recent sync logs view (last 100)
CREATE OR REPLACE VIEW v_recent_sync_logs AS
SELECT 
  id,
  sync_type,
  trigger_type,
  status,
  started_at,
  completed_at,
  duration_ms,
  total_items,
  success_count,
  failed_count,
  error_message,
  metadata
FROM sync_logs
ORDER BY started_at DESC
LIMIT 100;

GRANT SELECT ON v_sync_status TO authenticated, anon, service_role;
GRANT SELECT ON v_recent_sync_logs TO authenticated, anon, service_role;

COMMENT ON TABLE sync_config IS 'Configuration for scheduled sync jobs';
COMMENT ON TABLE sync_logs IS 'History of all sync operations with detailed stats';
COMMENT ON VIEW v_sync_status IS 'Overview of sync health and statistics';
COMMENT ON VIEW v_recent_sync_logs IS 'Most recent 100 sync operations';
