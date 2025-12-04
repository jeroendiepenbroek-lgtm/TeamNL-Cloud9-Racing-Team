import 'dotenv/config';
import { supabase } from './src/services/supabase.service.js';

async function checkEvents() {
  const now = Math.floor(Date.now() / 1000);
  console.log('Current Unix timestamp:', now);
  console.log('Current date:', new Date().toISOString());
  console.log('');
  
  const { data } = await supabase.client
    .from('zwift_api_events')
    .select('event_id, title, time_unix')
    .order('time_unix', { ascending: false })
    .limit(5);
    
  console.log('Latest 5 events in database:');
  data?.forEach((e: any) => {
    const date = new Date(e.time_unix * 1000);
    const isFuture = e.time_unix > now;
    console.log(`  ${e.event_id} | ${date.toISOString()} | ${isFuture ? 'FUTURE ✅' : 'PAST ❌'}`);
  });
  
  // Check future events
  const { data: future, count } = await supabase.client
    .from('zwift_api_events')
    .select('*', { count: 'exact', head: true })
    .gt('time_unix', now);
    
  console.log(`\nFuture events: ${count || 0}`);
}

checkEvents().catch(console.error);
