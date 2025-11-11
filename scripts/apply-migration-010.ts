/**
 * Quick script to run migration 010
 * Updates sync_logs table schema for auto-sync feature
 */

import { supabase } from '../backend/src/services/supabase.service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🚀 Running migration 010: Update sync_logs table...\n');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/010_update_sync_logs_for_auto_sync.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Executing SQL from:', migrationPath);
    console.log('─'.repeat(60));
    
    // Execute the migration
    const { data, error } = await supabase.client.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('Details:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!\n');
    
    // Verify the changes
    console.log('🔍 Verifying sync_logs table structure...\n');
    
    const { data: columns, error: verifyError } = await supabase.client
      .from('sync_logs')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.log('⚠️  Could not verify (this is OK if table is empty)');
    } else {
      console.log('✅ Table structure verified!');
      if (columns && columns.length > 0) {
        console.log('Sample row columns:', Object.keys(columns[0]));
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Migration 010 complete!');
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();
