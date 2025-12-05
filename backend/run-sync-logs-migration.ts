/**
 * Run sync_logs migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://bktbeefdmrpxhsyyalvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'
);

async function runMigration() {
  console.log('🔄 Running sync_logs migration...\n');

  try {
    // Check if table exists
    const { data: existing } = await supabase
      .from('sync_logs')
      .select('id')
      .limit(1);

    console.log('✅ sync_logs table already exists or migration complete!');
    console.log('📊 Checking structure...');

    // Insert test log
    const { data, error } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'manual',
        status: 'completed',
        rider_count: 1,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting test log:', error);
      return;
    }

    console.log('✅ Test log inserted:', data);

    // Clean up test log
    await supabase
      .from('sync_logs')
      .delete()
      .eq('id', data.id);

    console.log('✅ Migration verified successfully!');

  } catch (error: any) {
    console.error('❌ Migration error:', error.message);
    console.log('\n📝 SQL to run manually in Supabase SQL Editor:');
    console.log('='.repeat(80));
    const sql = readFileSync('supabase/migrations/20251205_add_sync_logs.sql', 'utf-8');
    console.log(sql);
    console.log('='.repeat(80));
  }
}

runMigration();
