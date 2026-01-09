import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config({ path: 'backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const API_TOKEN = '650c6d2fc4ef6858d74cbef1';

console.log('🚀 Quick Setup - Race Results\n');

// 1. Get team riders
console.log('1️⃣ Fetching team riders...');
const { data: riders } = await supabase
  .from('v_rider_complete')
  .select('rider_id, racing_name')
  .eq('is_team_member', true);

console.log(`✅ Found ${riders?.length || 0} team riders`);

// 2. Quick scan - just check last 100 eventIds for team riders
console.log('\n2️⃣ Quick scan - checking recent 100 events (3 min)...');

const { data: maxEvent } = await supabase
  .from('race_results')
  .select('event_id')
  .order('event_id', { ascending: false })
  .limit(1)
  .single();

const maxEventId = maxEvent?.event_id || 5298200;
const teamRiderIds = new Set(riders?.map(r => r.rider_id) || []);

console.log(`   Scanning events ${maxEventId - 99} to ${maxEventId}...`);

let found = 0;
let saved = 0;
let checked = 0;

for (let i = 0; i < 100; i++) {
  const eventId = maxEventId - i;
  
  try {
    const resp = await axios.get(
      `https://api.zwiftracing.app/api/public/results/${eventId}`,
      { headers: { 'Authorization': API_TOKEN }, timeout: 5000 }
    );
    
    checked++;
    const teamResults = resp.data.results?.filter(r => teamRiderIds.has(r.riderId)) || [];
    
    if (teamResults.length > 0) {
      found++;
      console.log(`   ✅ Event ${eventId}: ${resp.data.title} - ${teamResults.length} rider(s)`);
      
      const records = teamResults.map(r => ({
        event_id: eventId,
        rider_id: r.riderId,
        rider_name: r.name,
        event_name: resp.data.title || 'Unknown',
        event_date: new Date(resp.data.time * 1000).toISOString(),
        finish_position: r.position,
        finish_time_seconds: r.time,
        category: r.category,
        power_avg: r.power,
        total_riders: resp.data.results?.length || 0
      }));
      
      const { error } = await supabase
        .from('race_results')
        .upsert(records, { onConflict: 'event_id,rider_id' });
      
      if (!error) {
        saved += records.length;
      }
    }
    
    if (checked % 10 === 0) {
      console.log(`   Progress: ${checked}/100 checked, ${found} events found, ${saved} results saved`);
    }
    
    await new Promise(r => setTimeout(r, 2000)); // 2s delay = ~3 minutes total
    
  } catch (err) {
    // Skip 404s and errors
  }
}

console.log(`\n✅ Quick scan complete: ${checked} checked, ${found} events, ${saved} results saved`);

// 3. Check total results
const { count } = await supabase
  .from('race_results')
  .select('*', { count: 'exact', head: true });

console.log(`📊 Total results in database: ${count || 0}`);

// 4. Show recent
if (count > 0) {
  const { data: recent } = await supabase
    .from('race_results')
    .select('event_name, event_date, rider_name, finish_position')
    .order('event_date', { ascending: false })
    .limit(10);
  
  console.log('\n🏆 Recent results:');
  recent?.forEach((r, i) => {
    const date = new Date(r.event_date).toISOString().split('T')[0];
    console.log(`   ${i+1}. ${date} - ${r.rider_name} in ${r.event_name} (P${r.finish_position})`);
  });
}

console.log('\n✅ Setup complete! Dashboard should now show data.');
