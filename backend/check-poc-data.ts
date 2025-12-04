import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkPOC() {
  console.log('\n🔍 POC DATA CHECK - Rider 150437 & Event 5229579\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // 1. Check rider
  console.log('1️⃣  RIDER 150437:');
  const riderRes = await fetch(`${SUPABASE_URL}/rest/v1/riders?rider_id=eq.150437&select=*`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const riders = await riderRes.json();
  
  if (riders.length > 0) {
    const r = riders[0];
    console.log('   ✅ Gevonden in riders table');
    console.log(`      name: ${r.name}`);
    console.log(`      zp_ftp: ${r.zp_ftp}W`);
    console.log(`      power_w1200: ${r.power_w1200}W`);
    console.log(`      race_last_rating: ${r.race_last_rating}`);
  } else {
    console.log('   ❌ Niet gevonden in riders table');
  }
  
  const teamRes = await fetch(`${SUPABASE_URL}/rest/v1/my_team_members?zwift_id=eq.150437&select=*`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const team = await teamRes.json();
  console.log(team.length > 0 ? '   ✅ In my_team_members' : '   ❌ Niet in my_team_members');
  console.log('');
  
  // 2. Check event
  console.log('2️⃣  EVENT 5229579:');
  const eventRes = await fetch(`${SUPABASE_URL}/rest/v1/zwift_api_events?event_id=eq.5229579&select=*`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const events = await eventRes.json();
  
  if (events.length > 0) {
    const e = events[0];
    console.log('   ✅ Gevonden in zwift_api_events');
    console.log(`      name: ${e.name}`);
    console.log(`      event_date: ${e.event_date}`);
  } else {
    console.log('   ❌ Niet gevonden in zwift_api_events');
  }
  
  const resultsRes = await fetch(`${SUPABASE_URL}/rest/v1/zwift_api_race_results?event_id=eq.5229579&select=*`, {
    headers: { 
      'apikey': SUPABASE_KEY!,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const results = await resultsRes.json();
  
  console.log(`   Results: ${results.length} entries`);
  
  const rider150437 = results.find((r: any) => r.rider_id === 150437);
  if (rider150437) {
    console.log('   ✅ Rider 150437 result gevonden:');
    console.log(`      position: ${rider150437.position}`);
    console.log(`      avg_power: ${rider150437.avg_power}W`);
  } else {
    console.log('   ❌ Rider 150437 result niet gevonden');
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

checkPOC();
