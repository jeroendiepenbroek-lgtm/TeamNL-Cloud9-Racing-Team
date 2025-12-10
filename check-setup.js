const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tfsepzumkireferencer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY1Mjg3NCwiZXhwIjoyMDQ5MjI4ODc0fQ.w_OaLXZ-VvGJV0_6n1zP9rH7YXElxyoTqDcg0p_7W7s'
);

async function checkSetup() {
  console.log('🔍 Checking database setup...\n');
  
  // Check if new table exists by trying to query it
  const { data: ridersData, error: ridersError } = await supabase
    .from('api_zwiftracing_riders')
    .select('count')
    .limit(1);
  
  if (ridersError) {
    console.log('❌ Table api_zwiftracing_riders NOT found');
    console.log('   Error:', ridersError.message);
    console.log('');
    console.log('⚠️  Please run migrations first:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/tfsepzumkireferencer/sql/new');
    console.log('   2. Paste SQL from /tmp/run_migrations.sql');
    console.log('   3. Click Run');
    console.log('');
    return false;
  }
  
  console.log('✅ Table api_zwiftracing_riders exists');
  
  // Check view
  const { data: viewData, error: viewError } = await supabase
    .from('v_rider_complete')
    .select('rider_id')
    .eq('rider_id', 150437)
    .single();
  
  if (viewError) {
    console.log('⚠️  View v_rider_complete error:', viewError.message);
  } else {
    console.log('✅ View v_rider_complete exists');
    console.log('');
    console.log('📊 Current data for rider 150437:');
    console.log('   Data completeness:', viewData?.data_completeness || 'N/A');
  }
  
  // Check Zwift Official data
  const { data: zwiftData, error: zwiftError } = await supabase
    .from('api_zwift_api_profiles')
    .select('rider_id, first_name, last_name, competition_racing_score, ftp, weight')
    .eq('rider_id', 150437)
    .single();
  
  if (zwiftData) {
    console.log('');
    console.log('✅ Zwift Official data present:');
    console.log('   Name:', zwiftData.first_name, zwiftData.last_name);
    console.log('   Racing Score:', zwiftData.competition_racing_score);
    console.log('   FTP:', zwiftData.ftp + 'W');
    console.log('   Weight:', (zwiftData.weight / 1000) + 'kg');
  }
  
  console.log('');
  console.log('✅ Setup complete! Ready to sync ZwiftRacing data.');
  console.log('');
  console.log('Run: node fetch-zwiftracing-rider.js 150437');
  
  return true;
}

checkSetup().catch(console.error);
