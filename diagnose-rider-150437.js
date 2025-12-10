const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tfsepzumkireferencer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2NTI4NzQsImV4cCI6MjA0OTIyODg3NH0.4N8_yEoKxGxXDqkv7uP5BvXYvqGZvHj_rGHJdKLN3Rk'
);

async function diagnose() {
  console.log('🔍 DIAGNOSING RIDER 150437 DATA SOURCES\n');
  
  // Check ZwiftRacing source
  console.log('1️⃣  ZwiftRacing.app Source (api_zwiftracing_public_clubs_riders):');
  const { data: racing, error: racingErr } = await supabase
    .from('api_zwiftracing_public_clubs_riders')
    .select('rider_id, name, club_id, velo, racing_score, ftp, weight')
    .eq('rider_id', 150437)
    .maybeSingle();
  
  if (racing) {
    console.log('   ✅ FOUND in ZwiftRacing');
    console.log(`   Club: ${racing.club_id}, Name: ${racing.name}`);
    console.log(`   vELO: ${racing.velo}, Racing Score: ${racing.racing_score}`);
    console.log(`   FTP: ${racing.ftp}W, Weight: ${racing.weight}kg`);
  } else {
    console.log('   ❌ NOT FOUND in ZwiftRacing');
    console.log(`   Error: ${racingErr?.message || 'No data'}`);
  }
  
  // Check Zwift Official source
  console.log('\n2️⃣  Zwift Official API Source (api_zwift_api_profiles):');
  const { data: official, error: officialErr } = await supabase
    .from('api_zwift_api_profiles')
    .select('rider_id, first_name, last_name, competition_racing_score, weight, ftp, image_src')
    .eq('rider_id', 150437)
    .maybeSingle();
  
  if (official) {
    console.log('   ✅ FOUND in Zwift Official');
    console.log(`   Name: ${official.first_name} ${official.last_name}`);
    console.log(`   🏁 Competition Racing Score: ${official.competition_racing_score}`);
    console.log(`   Weight: ${official.weight}g (${official.weight/1000}kg), FTP: ${official.ftp}W`);
    console.log(`   Avatar: ${official.image_src ? '✅ Yes' : '❌ No'}`);
  } else {
    console.log('   ❌ NOT FOUND in Zwift Official');
    console.log(`   Error: ${officialErr?.message || 'No data'}`);
  }
  
  // Check view result
  console.log('\n3️⃣  View Result (v_rider_complete):');
  const { data: view, error: viewErr } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, zwiftracing_score, zwift_official_racing_score, weight_kg, ftp_watts, avatar_url, data_completeness')
    .eq('rider_id', 150437)
    .maybeSingle();
  
  if (view) {
    console.log('   ✅ FOUND in view');
    console.log(`   Full Name: ${view.full_name}`);
    console.log(`   ZwiftRacing Score: ${view.zwiftracing_score || 'NULL'}`);
    console.log(`   🏁 Zwift Official Score: ${view.zwift_official_racing_score || 'NULL'}`);
    console.log(`   Weight: ${view.weight_kg}kg, FTP: ${view.ftp_watts}W`);
    console.log(`   Avatar: ${view.avatar_url ? '✅ Yes' : '❌ No'}`);
    console.log(`   Data Completeness: ${view.data_completeness}`);
  } else {
    console.log('   ❌ NOT FOUND in view');
    console.log(`   Error: ${viewErr?.message || 'No data'}`);
  }
  
  // Conclusion
  console.log('\n�� DIAGNOSIS:');
  if (racing && official) {
    console.log('   ✅ Both sources have data - FULL OUTER JOIN should work');
  } else if (racing && !official) {
    console.log('   ⚠️  Only ZwiftRacing data exists - fetch Zwift Official profile');
    console.log('   💡 Run: node fetch-zwift-profile-150437.js');
  } else if (!racing && official) {
    console.log('   ⚠️  Only Zwift Official data exists - rider not in any club');
    console.log('   💡 This is NORMAL - view shows profile_only data');
    console.log('   💡 ZwiftRacing data will be NULL (no club membership)');
  } else {
    console.log('   ❌ NO DATA in either source');
    console.log('   💡 Fetch data first!');
  }
}

diagnose().catch(console.error);
