require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCategoryData() {
  console.log('\n🔍 Checking category data for team members...\n');
  
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, zwift_official_category, zwift_official_racing_score, zwiftracing_category, data_completeness')
    .eq('is_team_member', true)
    .order('rider_id');
  
  if (error) {
    console.log('❌ Error:', JSON.stringify(error, null, 2));
    return;
  }
  
  let missingBoth = 0;
  let missingZwiftCom = 0;
  let hasZwiftCom = 0;
  
  data.forEach(r => {
    const hasOfficial = r.zwift_official_category != null;
    const hasRacing = r.zwiftracing_category != null;
    
    if (!hasOfficial && !hasRacing) {
      missingBoth++;
    } else if (!hasOfficial && hasRacing) {
      missingZwiftCom++;
    } else if (hasOfficial) {
      hasZwiftCom++;
    }
    
    console.log(`[${r.rider_id}] ${r.full_name}`);
    console.log(`  Zwift.com: ${r.zwift_official_category || 'NULL'} (score: ${r.zwift_official_racing_score || 'NULL'})`);
    console.log(`  ZwiftRacing: ${r.zwiftracing_category || 'NULL'}`);
    console.log(`  Data: ${r.data_completeness}`);
    console.log('');
  });
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Has Zwift.com category: ${hasZwiftCom}`);
  console.log(`⚠️  Missing Zwift.com but has ZwiftRacing: ${missingZwiftCom}`);
  console.log(`❌ Missing both: ${missingBoth}`);
  console.log(`📊 Total team members: ${data.length}`);
  
  // Check raw tables
  console.log('\n\n🔍 Checking raw API tables...\n');
  
  const { data: profileData } = await supabase
    .from('api_zwift_api_profiles')
    .select('rider_id, first_name, last_name, competition_category, competition_racing_score')
    .in('rider_id', data.map(r => r.rider_id));
  
  const { data: racingData } = await supabase
    .from('api_zwiftracing_riders')
    .select('rider_id, name, category')
    .in('rider_id', data.map(r => r.rider_id));
  
  console.log('api_zwift_api_profiles:', profileData?.length || 0, 'records');
  console.log('api_zwiftracing_riders:', racingData?.length || 0, 'records');
  
  if (missingZwiftCom > 0) {
    console.log('\n\n💡 Solution: Update v_rider_complete view to use ZwiftRacing category as fallback');
    console.log('   Currently: zwift_official_category (can be NULL)');
    console.log('   Should be: COALESCE(zwift_official_category, zwiftracing_category)');
  }
}

checkCategoryData().catch(console.error);
