import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const API_TOKEN = '650c6d2fc4ef6858d74cbef1';

console.log('🚀 Scanning for recent races...\n');

// Get team riders
const { data: riders } = await supabase
  .from('v_rider_complete')
  .select('rider_id, racing_name')
  .eq('is_team_member', true);

console.log(`✅ ${riders?.length} team riders`);

const teamRiderIds = new Set(riders?.map(r => r.rider_id));

// Rider 150437 last race: 1767727800 (5 Jan 2026 19:10)
// Current time: ~1736278000 (7 Jan 2026 18:00)
// Hours ago: ~1.5 days = 36 hours
// Events since: 36 * 25 = 900 events
// So max event ~ 5298200 + 900 = 5299100

const estimatedMax = 5299100;
console.log(`\n🎯 Estimated max eventId: ${estimatedMax}`);
console.log(`   Scanning ${estimatedMax - 100} to ${estimatedMax + 20}...\n`);

let saved = 0;
let found = 0;

for (let offset = -100; offset <= 20; offset++) {
  const eventId = estimatedMax + offset;
  
  try {
    const resp = await axios.get(
      `https://api.zwiftracing.app/api/public/results/${eventId}`,
      { headers: { 'Authorization': API_TOKEN }, timeout: 5000 }
    );
    
    const teamResults = resp.data.results?.filter(r => teamRiderIds.has(r.riderId)) || [];
    
    if (teamResults.length > 0) {
      found++;
      const date = new Date(resp.data.time * 1000).toISOString().split('T')[0];
      console.log(`✅ ${eventId}: ${date} - ${resp.data.title} (${teamResults.length} riders)`);
      
      const records = teamResults.map(r => ({
        event_id: eventId,
        rider_id: r.riderId,
        rider_name: r.name,
        event_name: resp.data.title,
        event_date: new Date(resp.data.time * 1000).toISOString(),
        finish_position: r.position,
        finish_time_seconds: r.time,
        category: r.category,
        power_avg: r.power,
        total_riders: resp.data.results?.length || 0
      }));
      
      await supabase.from('race_results').upsert(records, { onConflict: 'event_id,rider_id' });
      saved += records.length;
    }
    
    await new Promise(r => setTimeout(r, 2000));
    
  } catch (err) {
    // Skip
  }
}

console.log(`\n✅ Scan complete: ${found} events, ${saved} results saved`);

const { count } = await supabase
  .from('race_results')
  .select('*', { count: 'exact', head: true });

console.log(`📊 Total in database: ${count}\n`);
