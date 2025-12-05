/**
 * Create sync_logs table via Supabase REST API
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bktbeefdmrpxhsyyalvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'
);

const SQL = `
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
`;

async function createTable() {
  console.log('🔄 Creating sync_logs table...\n');
  
  try {
    // Use raw SQL via RPC (if available) or show SQL to run manually
    console.log('📋 SQL TO RUN IN SUPABASE SQL EDITOR:');
    console.log('='.repeat(80));
    console.log(SQL);
    console.log('='.repeat(80));
    
    console.log('\n📍 Steps:');
    console.log('1. Go to https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new');
    console.log('2. Copy the SQL above');
    console.log('3. Click "Run"');
    console.log('4. Come back here and press ENTER to continue');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTable();
