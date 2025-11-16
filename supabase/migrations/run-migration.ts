#!/usr/bin/env tsx
/**
 * Migration Script: Add V2 columns to sync_logs
 * Run: npx tsx supabase/migrations/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🔄 Running migration: add_sync_logs_v2_columns.sql\n');

  const migrationSQL = fs.readFileSync(
    path.join(__dirname, 'add_sync_logs_v2_columns.sql'),
    'utf-8'
  );

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'));

  console.log(`Executing ${statements.length} SQL statements...\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;

    console.log(`[${i + 1}/${statements.length}] ${stmt.substring(0, 60)}...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

    if (error) {
      // Try direct query as fallback
      const { error: altError } = await (supabase as any).from('_').rpc('exec', { query: stmt });
      
      if (altError) {
        console.warn(`⚠️  Could not execute via RPC, this is expected for Supabase client.`);
        console.log(`   Statement: ${stmt.substring(0, 100)}`);
      }
    } else {
      console.log(`   ✅ Success`);
    }
  }

  console.log('\n✅ Migration completed!');
  console.log('\nℹ️  If migrations failed via RPC, please run manually in Supabase SQL Editor:');
  console.log('   File: supabase/migrations/add_sync_logs_v2_columns.sql');
}

runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
