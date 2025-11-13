import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function main() {
  console.log('Checking signups in database...');
  
  const { data, error } = await supabase
    .from('zwift_api_event_signups')
    .select('event_id, pen_name')
    .in('event_id', [5192468, 5192156, 5144531]);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nTotal signups found: ${data.length}`);
  console.log('\nBy event:');
  
  const byEvent: Record<number, number> = {};
  data.forEach((s: any) => {
    if (!byEvent[s.event_id]) byEvent[s.event_id] = 0;
    byEvent[s.event_id]++;
  });
  
  console.log(JSON.stringify(byEvent, null, 2));
  
  // Also check event types
  console.log('\nFirst few records:');
  console.log(data.slice(0, 3).map((s: any) => ({
    event_id: s.event_id,
    event_id_type: typeof s.event_id,
    pen_name: s.pen_name
  })));
}

main();
