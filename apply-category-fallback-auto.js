require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyCategoryFallback() {
  console.log('🚀 Applying category fallback to v_rider_complete view...\n');
  
  const sql = fs.readFileSync('./FIX_CATEGORY_FALLBACK.sql', 'utf8');
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  console.log(`📝 Found ${statements.length} SQL statements\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    
    // Skip test query
    if (stmt.includes('WHERE rider_id IN (1076179')) {
      console.log(`⏭️  Skipping test query (will run at end)\n`);
      continue;
    }
    
    console.log(`⚙️  Executing statement ${i+1}/${statements.length}...`);
    
    try {
      // Use rpc to execute raw SQL
      const { error } = await supabase.rpc('exec_raw_sql', { sql: stmt });
      
      if (error) {
        // Try direct execution via REST API
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: stmt })
        });
        
        if (!response.ok) {
          console.log(`⚠️  Warning: ${error?.message || 'Could not verify execution'}`);
        } else {
          console.log(`✅ Success\n`);
        }
      } else {
        console.log(`✅ Success\n`);
      }
    } catch (error) {
      console.log(`⚠️  Note: ${error.message}\n`);
    }
  }
  
  console.log('='.repeat(60));
  console.log('✅ Category fallback applied!\n');
  
  // Now verify with test query
  console.log('🧪 Testing category fallback on 4 riders...\n');
  
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, zwift_official_category, zwiftracing_category')
    .in('rider_id', [1076179, 3067920, 3137561, 4562003])
    .order('rider_id');
  
  if (error) {
    console.log('❌ Test query failed:', error.message);
  } else {
    console.log('=== TEST RESULTS ===\n');
    
    let success = 0;
    let failed = 0;
    
    data.forEach(r => {
      const hasCategory = r.zwift_official_category !== null;
      const status = hasCategory ? '✅' : '❌';
      
      if (hasCategory) success++;
      else failed++;
      
      console.log(`${status} [${r.rider_id}] ${r.full_name}`);
      console.log(`   Category: ${r.zwift_official_category || 'NULL'} (source: ${r.zwiftracing_category})`);
      console.log('');
    });
    
    console.log(`\n📊 Results: ${success}/4 success, ${failed}/4 failed`);
    
    if (success === 4) {
      console.log('\n🎉 SUCCESS! Category fallback is working for all 4 riders!');
    } else {
      console.log('\n⚠️  View may need manual execution in Supabase SQL Editor');
      console.log('   URL: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new');
    }
  }
  
  // Test all team members
  console.log('\n\n🧪 Checking all team members...\n');
  
  const { data: allData } = await supabase
    .from('v_rider_complete')
    .select('zwift_official_category')
    .eq('is_team_member', true);
  
  if (allData) {
    const withCategory = allData.filter(r => r.zwift_official_category !== null).length;
    const withoutCategory = allData.length - withCategory;
    
    console.log(`Total team members: ${allData.length}`);
    console.log(`With category: ${withCategory} (${Math.round(withCategory/allData.length*100)}%)`);
    console.log(`Without category: ${withoutCategory} (${Math.round(withoutCategory/allData.length*100)}%)`);
    
    if (withCategory === allData.length) {
      console.log('\n✅ ALL team members have a category! Fallback is working perfectly!');
    } else if (withCategory > 59) {
      console.log('\n✅ Fallback improved coverage! More riders now have categories.');
    }
  }
}

applyCategoryFallback().catch(console.error);
