import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🔍 Verifying Setup for Hybrid Scanner\n');
console.log('='.repeat(60));

// Check race_scan_config
const { data: scanConfig } = await supabase
  .from('race_scan_config')
  .select('*')
  .single();

console.log('\n📊 RACE SCAN CONFIG:');
console.log(`  Enabled: ${scanConfig?.enabled ? '✅' : '❌'}`);
console.log(`  Interval: ${scanConfig?.scan_interval_minutes} minutes`);
console.log(`  Last scan: ${scanConfig?.last_scan_at || 'Never'}`);
console.log(`  Next scan: ${scanConfig?.next_scan_at || 'Not scheduled'}`);

// Check sync_config
const { data: syncConfig } = await supabase
  .from('sync_config')
  .select('*')
  .eq('sync_type', 'race_results')
  .single();

console.log('\n⚙️  SYNC CONFIG:');
console.log(`  Lookback: ${syncConfig?.config?.fullScanDays || 7} days`);
console.log(`  Retention: ${syncConfig?.config?.retentionDays || 90} days`);
console.log(`  Enabled: ${syncConfig?.enabled ? '✅' : '❌'}`);

// Check team riders
const { count: riderCount } = await supabase
  .from('v_rider_complete')
  .select('*', { count: 'exact', head: true })
  .eq('is_team_member', true);

console.log('\n👥 TEAM RIDERS:');
console.log(`  Count: ${riderCount}`);

// Check existing results
const { count: resultsCount } = await supabase
  .from('race_results')
  .select('*', { count: 'exact', head: true });

console.log('\n📈 RACE RESULTS:');
console.log(`  Current count: ${resultsCount || 0}`);

// Check recent sync logs
const { data: recentLogs } = await supabase
  .from('sync_log')
  .select('*')
  .eq('sync_type', 'race_results_hybrid')
  .order('created_at', { ascending: false })
  .limit(3);

console.log('\n📝 RECENT SYNC LOGS:');
if (recentLogs && recentLogs.length > 0) {
  recentLogs.forEach(log => {
    const date = new Date(log.created_at).toLocaleString('nl-NL');
    console.log(`  ${date}: ${log.status} (${log.method || 'unknown'})`);
  });
} else {
  console.log('  No hybrid scans yet');
}

// Get Railway deployment URL from env
const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.BACKEND_URL;

console.log('\n='.repeat(60));
console.log('\n🚀 NEXT STEPS:\n');

if (!scanConfig?.enabled) {
  console.log('❌ Scanner is DISABLED!');
  console.log('   Enable via: UPDATE race_scan_config SET enabled = true;');
} else if (resultsCount === 0) {
  console.log('⚠️  No results yet - need to trigger first scan!');
  
  if (railwayUrl) {
    console.log(`\n   Trigger scan:`);
    console.log(`   curl -X POST ${railwayUrl}/api/sync/race-results/trigger`);
  } else {
    console.log('\n   Option 1: Start local server');
    console.log('   cd backend && npm start');
    console.log('   Then: curl -X POST http://localhost:3001/api/sync/race-results/trigger');
    console.log('\n   Option 2: Wait for automatic schedule (next: ' + scanConfig?.next_scan_at + ')');
  }
} else {
  console.log('✅ Setup looks good!');
  console.log(`   Dashboard should show ${resultsCount} results`);
}

console.log('\n='.repeat(60));
