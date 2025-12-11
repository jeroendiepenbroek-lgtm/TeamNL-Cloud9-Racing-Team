const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY niet gezet');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkPermissions() {
  console.log('🔍 Checking Supabase permissions...\n');
  
  // Check if view exists
  const { data: viewData, error: viewError } = await supabase
    .from('v_rider_complete')
    .select('rider_id')
    .limit(1);
    
  if (viewError) {
    console.error('❌ View access error:', viewError);
  } else {
    console.log('✅ v_rider_complete view accessible with service key');
    console.log('   Data:', viewData);
  }
  
  // Check RLS policies
  console.log('\n📋 Checking if RLS is enabled...');
  const { data: policies, error: policyError } = await supabase.rpc('exec', {
    query: `
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename IN ('api_zwiftracing_riders', 'api_zwift_api_profiles')
    `
  }).catch(() => ({ data: null, error: 'Cannot check RLS' }));
  
  console.log('   RLS Check:', policies || policyError);
}

checkPermissions().catch(console.error);
