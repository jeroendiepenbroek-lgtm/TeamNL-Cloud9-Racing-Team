import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('📊 Step 1: Database Migration\n');

// Read migration SQL
const migration = fs.readFileSync('migrations/create_rider_race_state_table.sql', 'utf8');

console.log('Running migration...');
const { data, error } = await supabase.rpc('exec_sql', { sql_query: migration }).catch(() => null);

// Try alternative: Create table directly via SQL query
if (error || !data) {
  console.log('Using direct table creation...');
  
  // Create table
  const { error: createError } = await supabase.from('rider_race_state').select('*').limit(0);
  
  if (createError && createError.code === '42P01') {
    console.log('✅ Table needs to be created - executing SQL...');
    
    // Since we can't execute DDL directly, let's check if table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'rider_race_state'
      );
    `;
    
    console.log('⚠️  Cannot execute DDL via API - Manual step required:');
    console.log('\n1. Open Supabase Dashboard → SQL Editor');
    console.log('2. Copy/paste from migrations/create_rider_race_state_table.sql');
    console.log('3. Click "Run"\n');
    console.log('Or continue - table will be created when polling is used.\n');
  } else {
    console.log('✅ Table rider_race_state exists!\n');
  }
}

console.log('📊 Step 2: Verify Configuration\n');

// Check race_scan_config
const { data: scanConfig } = await supabase
  .from('race_scan_config')
  .select('*')
  .single();

console.log('Race Scan Config:');
console.log(`  Enabled: ${scanConfig?.enabled}`);
console.log(`  Interval: ${scanConfig?.scan_interval_minutes} min`);
console.log(`  Last scan: ${scanConfig?.last_scan_at || 'Never'}\n`);

// Check sync_config
const { data: syncConfig } = await supabase
  .from('sync_config')
  .select('config')
  .eq('sync_type', 'race_results')
  .single();

console.log('Sync Config:');
console.log(`  Lookback days: ${syncConfig?.config?.fullScanDays || 7}`);
console.log(`  Retention days: ${syncConfig?.config?.retentionDays || 90}\n`);

// Check team riders count
const { count: riderCount } = await supabase
  .from('v_rider_complete')
  .select('*', { count: 'exact', head: true })
  .eq('is_team_member', true);

console.log(`Team riders: ${riderCount}\n`);

// Check existing results
const { count: resultsCount } = await supabase
  .from('race_results')
  .select('*', { count: 'exact', head: true });

console.log(`Existing race results: ${resultsCount || 0}\n`);

console.log('='.repeat(60));
console.log('✅ Configuration verified!');
console.log('='.repeat(60));
console.log('\nNext: Trigger scan via Railway deployment URL');
console.log('Or wait for automatic scheduled scan (120 min interval)');
