import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config({ path: 'backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const API_TOKEN = '650c6d2fc4ef6858d74cbef1';

console.log('🚀 Getting race events from rider profiles...\n');

// Get team riders
const { data: riders } = await supabase
  .from('v_rider_complete')
  .select('rider_id, racing_name')
  .eq('is_team_member', true)
  .limit(10); // Just first 10 for speed

console.log(`✅ Checking ${riders?.length} riders for recent races`);

const eventIds = new Set();

for (const rider of riders) {
  try {
    const resp = await axios.get(
      `https://api.zwiftracing.app/api/public/riders/${rider.rider_id}`,
      { headers: { 'Authorization': API_TOKEN }, timeout: 5000 }
    );
    
    if (resp.data.race?.last?.eventId) {
      eventIds.add(resp.data.race.last.eventId);
      const date = new Date(resp.data.race.last.date * 1000).toISOString().split('T')[0];
      console.log(`  ${rider.racing_name}: event ${resp.data.race.last.eventId} (${date})`);
    }
    
    await new Promise(r => setTimeout(r, 300)); // 5 per minute = 12s between, but be safe
  } catch (err) {
    console.log(`  ❌ ${rider.racing_name}: ${err.message}`);
  }
}

const sortedEvents = Array.from(eventIds).sort((a, b) => b - a);
console.log(`\n📊 Found ${eventIds.size} unique events`);
console.log(`   Range: ${Math.min(...sortedEvents)} to ${Math.max(...sortedEvents)}`);
console.log(`\n🎯 Max eventId: ${Math.max(...sortedEvents)}`);
