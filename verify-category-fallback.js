require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyCategoryFallback() {
  console.log('🧪 Verifying category fallback fix...\n');
  
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, zwift_official_category, zwift_official_racing_score, zwiftracing_category')
    .in('rider_id', [1076179, 3067920, 3137561, 4562003])
    .order('rider_id');
  
  if (error) {
    console.log('❌ Error:', error);
    return;
  }
  
  console.log('=== Test Results ===\n');
  
  let fixed = 0;
  let stillNull = 0;
  
  data.forEach(r => {
    const isFixed = r.zwift_official_category !== null;
    const status = isFixed ? '✅' : '❌';
    
    if (isFixed) fixed++;
    else stillNull++;
    
    console.log(`${status} [${r.rider_id}] ${r.full_name}`);
    console.log(`   Category: ${r.zwift_official_category || 'NULL'} (should be: ${r.zwiftracing_category})`);
    console.log(`   Score: ${r.zwift_official_racing_score || 'NULL (expected, Zwift.com data missing)'}`);
    console.log('');
  });
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Fixed (category now populated): ${fixed}/4`);
  console.log(`❌ Still NULL: ${stillNull}/4`);
  
  if (fixed === 4) {
    console.log('\n🎉 SUCCESS! All 4 riders now have a category via fallback.');
  } else {
    console.log('\n⚠️  View not yet updated. Run FIX_CATEGORY_FALLBACK.sql in Supabase SQL Editor.');
    console.log('   URL: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new');
  }
}

verifyCategoryFallback().catch(console.error);
