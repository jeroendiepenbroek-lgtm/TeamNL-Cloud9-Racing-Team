import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSchema() {
  console.log('\n📋 SUPABASE SCHEMA CHECK\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Try both table names
  const tables = ['riders', 'riders_unified', 'my_team_members', 'my_team_members_unified'];
  
  for (const table of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ ${table} exists (${data.length} rows sampled)`);
      if (data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).slice(0, 10).join(', ')}...`);
      }
    } else {
      console.log(`❌ ${table} not found`);
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

checkSchema();
