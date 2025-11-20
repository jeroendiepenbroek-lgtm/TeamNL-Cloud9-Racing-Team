/**
 * Verify Results Database Structure
 * Checks if migration columns exist, if not - instructs manual migration
 * Run: npx tsx scripts/run-results-migration.ts
 */

import { supabase } from '../backend/src/services/supabase.service.js';

async function verifyMigration() {
  console.log('🔍 Verifying Results Dashboard Database Structure...\n');
  
  // Check if new columns exist by trying to query them
  console.log('1️⃣  Checking zwift_api_race_results columns...');
  const { data: resultsCheck, error: resultsError } = await supabase.client
    .from('zwift_api_race_results')
    .select('event_id, power_5s, velo_rating, effort_score, event_name, event_date')
    .limit(1);
  
  if (resultsError) {
    console.error(`❌ New columns NOT found: ${resultsError.message}\n`);
    console.log('⚠️  Migration needed! Follow these steps:\n');
    console.log('📋 Steps:');
    console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('   2. Navigate to: SQL Editor');
    console.log('   3. Create new query');
    console.log('   4. Copy/paste contents of: backend/migrations/SUPABASE_ADD_RESULTS_COLUMNS.sql');
    console.log('   5. Click "Run"');
    console.log('   6. Re-run this script to verify\n');
    process.exit(1);
  }
  
  console.log('✅ Results table columns verified!\n');
  
  // Check if PR table exists
  console.log('2️⃣  Checking rider_personal_records table...');
  const { data: prCheck, error: prError } = await supabase.client
    .from('rider_personal_records')
    .select('id')
    .limit(1);
  
  if (prError) {
    if (prError.message.includes('does not exist')) {
      console.error(`❌ Personal Records table NOT found\n`);
      console.log('⚠️  Please run the full migration SQL in Supabase SQL Editor (see steps above)\n');
      process.exit(1);
    } else {
      console.log(`✅ Personal Records table exists (currently empty)\n`);
    }
  } else {
    console.log(`✅ Personal Records table verified!\n`);
  }
  
  // Check existing data
  console.log('3️⃣  Checking existing results data...');
  const { data: existingResults, error: existingError } = await supabase.client
    .from('zwift_api_race_results')
    .select('event_id, rider_id, power_5s, velo_rating')
    .not('event_id', 'is', null)
    .limit(10);
  
  if (existingError) {
    console.error(`❌ Error querying results: ${existingError.message}`);
  } else {
    const total = existingResults?.length || 0;
    const withPower = existingResults?.filter(r => r.power_5s !== null).length || 0;
    const withVelo = existingResults?.filter(r => r.velo_rating !== null).length || 0;
    
    console.log(`   📊 Total results: ${total}`);
    console.log(`   ⚡ Results with power data: ${withPower}`);
    console.log(`   🎯 Results with vELO: ${withVelo}\n`);
    
    if (total === 0) {
      console.log('⚠️  No results data found. Ready to seed!\n');
      console.log('🌱 Next step: Seed test data');
      console.log('   Run: npx tsx scripts/seed-results-data.ts\n');
    } else if (withPower === 0) {
      console.log('⚠️  Results exist but missing power data. Seed will add test data.\n');
      console.log('🌱 Next step: Seed test data');
      console.log('   Run: npx tsx scripts/seed-results-data.ts\n');
    } else {
      console.log('✅ Database has results with power data! Dashboard ready to use.\n');
      console.log('🌐 View dashboard: http://localhost:3001/results\n');
    }
  }
  
  console.log('✨ Verification complete!\n');
}

verifyMigration()
  .then(() => {
    console.log('✅ Verification script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
