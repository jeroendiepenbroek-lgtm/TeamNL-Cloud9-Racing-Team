const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// OLD Supabase project (waar Railway naar wijst)
const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDczOTQ1MiwiZXhwIjoyMDQ2MzE1NDUyfQ.GXxGUBxnPh3u5Q-7PLy_dT9uc-FcqMVNqWj5hl9rAXM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigrations() {
  console.log('🚀 Running migrations on bktbeefdmrpxhsyyalvc.supabase.co\n');
  
  const migrations = [
    'migrations/001_multi_source_architecture.sql',
    'migrations/002_api_source_tables.sql',
    'migrations/002b_add_competition_metrics.sql',
    'migrations/003_hybrid_views.sql',
    'migrations/005_zwiftracing_riders_table.sql',
    'migrations/006_updated_views.sql'
  ];
  
  for (const file of migrations) {
    if (!fs.existsSync(file)) {
      console.log(`⚠️  Skipping ${file} (not found)`);
      continue;
    }
    
    console.log(`📄 Running: ${file}`);
    const sql = fs.readFileSync(file, 'utf-8');
    
    // Split op statements (voorzichtig met views die BEGIN/END hebben)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length < 10) continue; // Skip lege statements
      
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: stmt });
      
      if (error) {
        console.log(`   ❌ Statement ${i + 1}: ${error.message}`);
        // Probeer direct via REST
        console.log('   Trying direct SQL...');
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: stmt })
        });
        
        if (!response.ok) {
          const err = await response.text();
          console.log(`   ❌ Direct SQL failed: ${err}`);
        }
      } else {
        console.log(`   ✅ Statement ${i + 1} success`);
      }
    }
  }
  
  // Check result
  console.log('\n📊 Checking v_rider_complete view...');
  const { data, error, count } = await supabase
    .from('v_rider_complete')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log('❌ View check failed:', error.message);
    console.log('\n💡 Please run migrations manually in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new');
  } else {
    console.log(`✅ View exists with ${count} rows`);
  }
}

runMigrations().catch(console.error);
