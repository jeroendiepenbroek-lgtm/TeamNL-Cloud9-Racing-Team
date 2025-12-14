require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseRacingScore() {
  console.log('🔍 Diagnosing missing Racing Score...\n');
  
  // Check raw Zwift.com API data
  console.log('=== Raw Zwift.com API Data ===\n');
  
  const { data: profiles, error: profileError } = await supabase
    .from('api_zwift_api_profiles')
    .select('rider_id, first_name, last_name, competition_category, competition_racing_score, fetched_at')
    .in('rider_id', [1076179, 3067920, 3137561, 4562003])
    .order('rider_id');
  
  if (profileError) {
    console.log('❌ Error:', profileError);
    return;
  }
  
  profiles.forEach(r => {
    console.log(`[${r.rider_id}] ${r.first_name} ${r.last_name}`);
    console.log(`  Category: ${r.competition_category || 'NULL'}`);
    console.log(`  Racing Score: ${r.competition_racing_score || 'NULL'}`);
    console.log(`  Fetched: ${r.fetched_at}`);
    console.log('');
  });
  
  console.log('\n=== Comparison: All team members ===\n');
  
  const { data: allProfiles } = await supabase
    .from('api_zwift_api_profiles')
    .select('rider_id, first_name, last_name, competition_category, competition_racing_score')
    .in('rider_id', await supabase.from('team_roster').select('rider_id').eq('is_active', true).then(r => r.data.map(x => x.rider_id)))
    .order('competition_racing_score');
  
  let hasScore = 0;
  let noScore = 0;
  let hasCategory = 0;
  let noCategory = 0;
  
  if (allProfiles) {
    allProfiles.forEach(r => {
      if (r.competition_racing_score !== null) hasScore++;
      else noScore++;
      
      if (r.competition_category !== null) hasCategory++;
      else noCategory++;
    });
  }
  
  console.log(`Total team members: ${allProfiles?.length || 0}`);
  console.log(`  Has Racing Score: ${hasScore}`);
  console.log(`  Missing Racing Score: ${noScore}`);
  console.log(`  Has Category: ${hasCategory}`);
  console.log(`  Missing Category: ${noCategory}`);
  
  console.log('\n=== Riders with NULL category or score ===\n');
  
  if (allProfiles) {
    allProfiles
      .filter(r => r.competition_category === null || r.competition_racing_score === null)
      .forEach(r => {
        console.log(`[${r.rider_id}] ${r.first_name} ${r.last_name}`);
        console.log(`  Category: ${r.competition_category || 'NULL'}`);
        console.log(`  Score: ${r.competition_racing_score || 'NULL'}`);
        console.log('');
      });
  }
  
  console.log('\n=== ANALYSIS ===\n');
  console.log('💡 Possible reasons for NULL values:');
  console.log('   1. Rider has not opted into Zwift Racing (no racing profile)');
  console.log('   2. Rider is brand new to Zwift Racing (no history yet)');
  console.log('   3. API returned incomplete data during sync');
  console.log('   4. Privacy settings prevent racing data from being shown');
  console.log('');
  console.log('🔧 Solution:');
  console.log('   - Category: Already fixed with fallback (use ZwiftRacing category)');
  console.log('   - Racing Score: Cannot fallback, only Zwift.com provides this metric');
  console.log('   - Frontend should handle NULL gracefully (show "N/A" or hide)');
}

diagnoseRacingScore().catch(console.error);
