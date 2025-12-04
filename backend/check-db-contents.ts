import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkDB() {
  console.log('\n📊 DATABASE CONTENTS\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Riders count
  const ridersRes = await fetch(`${SUPABASE_URL}/rest/v1/riders?select=count`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  console.log(`riders: ${ridersRes.headers.get('content-range')?.split('/')[1] || '?'} rows`);
  
  // My team count
  const teamRes = await fetch(`${SUPABASE_URL}/rest/v1/my_team_members?select=count`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  console.log(`my_team_members: ${teamRes.headers.get('content-range')?.split('/')[1] || '?'} rows`);
  
  // Events count
  const eventsRes = await fetch(`${SUPABASE_URL}/rest/v1/zwift_api_events?select=count`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  console.log(`zwift_api_events: ${eventsRes.headers.get('content-range')?.split('/')[1] || '?'} rows`);
  
  // Results count
  const resultsRes = await fetch(`${SUPABASE_URL}/rest/v1/zwift_api_race_results?select=count`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  console.log(`zwift_api_race_results: ${resultsRes.headers.get('content-range')?.split('/')[1] || '?'} rows`);
  
  console.log('');
  
  // Sample riders
  const sampleRes = await fetch(`${SUPABASE_URL}/rest/v1/riders?select=rider_id,name&limit=5`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const sample = await sampleRes.json();
  
  if (sample.length > 0) {
    console.log('Sample riders:');
    sample.forEach((r: any) => console.log(`  - ${r.rider_id}: ${r.name}`));
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

checkDB();
