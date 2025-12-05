-- Sync Logs Table voor US6: Monitor
CREATE TABLE IF NOT EXISTS sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'auto', 'single')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  rider_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
      ELSE NULL 
    END
  ) STORED
);

-- Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);

-- Comments
COMMENT ON TABLE sync_logs IS 'US6: Logging van alle sync activiteiten voor monitoring';
COMMENT ON COLUMN sync_logs.sync_type IS 'Type sync: manual (US7), auto (US5), single (individual rider)';
COMMENT ON COLUMN sync_logs.status IS 'Status: started, completed, failed';
COMMENT ON COLUMN sync_logs.rider_count IS 'Aantal riders in deze sync';
COMMENT ON COLUMN sync_logs.duration_seconds IS 'Auto-calculated duration';
