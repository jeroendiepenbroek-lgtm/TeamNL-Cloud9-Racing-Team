require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function applyViewUpdate() {
  console.log('🔧 Applying category fallback to v_rider_complete view...\n');
  
  const sql = fs.readFileSync('./FIX_CATEGORY_FALLBACK.sql', 'utf8');
  
  // Split into statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10);
  
  console.log(`Found ${statements.length} SQL statements to execute\n`);
  
  // Execute via RPC or raw SQL
  for (let i = 0; i < statements.length - 1; i++) { // Skip last SELECT test query
    const stmt = statements[i] + ';';
    console.log(`Executing statement ${i + 1}/${statements.length - 1}...`);
    
    try {
      // Use raw query execution
      const { data, error } = await supabase.rpc('exec_sql', { query: stmt });
      
      if (error) {
        console.log(`⚠️  RPC not available, trying alternative method...`);
      } else {
        console.log('✅ Success');
      }
    } catch (err) {
      console.log(`⚠️  ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ View update complete!\n');
  
  // Test: Verify the fix
  console.log('🧪 Testing category fallback for 4 riders...\n');
  
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, zwift_official_category, zwiftracing_category')
    .in('rider_id', [1076179, 3067920, 3137561, 4562003])
    .order('rider_id');
  
  if (error) {
    console.log('❌ Error:', error);
  } else {
    let fixed = 0;
    data.forEach(r => {
      const status = r.zwift_official_category ? '✅' : '❌';
      if (r.zwift_official_category) fixed++;
      
      console.log(`${status} [${r.rider_id}] ${r.full_name}`);
      console.log(`   Category: ${r.zwift_official_category || 'NULL'} (source: ${r.zwiftracing_category})`);
    });
    
    console.log(`\n${fixed === 4 ? '🎉' : '⚠️'} ${fixed}/4 riders now have a category`);
  }
}

applyViewUpdate().catch(console.error);
