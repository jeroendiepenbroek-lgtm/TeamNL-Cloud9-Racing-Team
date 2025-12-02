import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('📊 Checking race results for rider 150437...\n');

// Check zwift_api_race_results table - first check what columns exist
const { data: schema } = await supabase
  .from('zwift_api_race_results')
  .select('*')
  .limit(1);

if (schema && schema[0]) {
  console.log('📋 Available columns:', Object.keys(schema[0]).join(', '), '\n');
}

// Check zwift_api_race_results table
const { data: results, error } = await supabase
  .from('zwift_api_race_results')
  .select('*')
  .eq('rider_id', 150437)
  .order('event_date', { ascending: false })
  .limit(5);

if (error) {
  console.error('❌ Error:', error);
} else if (results && results.length > 0) {
  console.log(`✅ Found ${results.length} results in zwift_api_race_results:\n`);
  results.forEach((r, i) => {
    console.log(`  ${i+1}. Event ${r.event_id}: ${r.event_name || 'Unknown'}`);
    console.log(`     Date: ${r.event_date}`);
    console.log(`     Data: ${JSON.stringify(r, null, 2)}\n`);
  });
} else {
  console.log('❌ No results found in zwift_api_race_results table');
}

// Check if rider exists in riders table  
const { data: rider } = await supabase
  .from('riders')
  .select('id, name, race_results_last_90_days, race_current_rating, race_last_event_date')
  .eq('id', 150437)
  .single();

if (rider) {
  console.log('\n📋 Rider info from riders table:');
  console.log(`   Name: ${rider.name}`);
  console.log(`   Results (90d): ${rider.race_results_last_90_days || 0}`);
  console.log(`   Current vELO: ${rider.race_current_rating || 'N/A'}`);
  console.log(`   Last race: ${rider.race_last_event_date || 'Never'}`);
} else {
  console.log('\n❌ Rider not found in riders table');
}

// Check my_team_members view
const { data: teamMember } = await supabase
  .from('my_team_members')
  .select('rider_id, name, race_results_last_90_days, race_current_rating')
  .eq('rider_id', 150437)
  .single();

if (teamMember) {
  console.log('\n👥 Team member info from my_team_members view:');
  console.log(`   Name: ${teamMember.name}`);
  console.log(`   Results (90d): ${teamMember.race_results_last_90_days || 0}`);
  console.log(`   Current vELO: ${teamMember.race_current_rating || 'N/A'}`);
}

console.log('\n' + '='.repeat(60));
console.log('CONCLUSION:');
console.log('='.repeat(60));
console.log('\nResults Dashboard gebruikt 2 data bronnen:');
console.log('1. zwift_api_race_results → Race results (Results Sync)');
console.log('2. riders/my_team_members → Rider metadata (Rider Sync)');
console.log('\nDeze kunnen PARALLEL syncen omdat:');
console.log('- Results Sync vult zwift_api_race_results');
console.log('- Rider Sync vult riders met aggregated stats');
console.log('- Geen dependencies tussen beiden');
