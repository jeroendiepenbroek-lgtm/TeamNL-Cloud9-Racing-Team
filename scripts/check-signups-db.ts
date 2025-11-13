import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function main() {
  console.log('Checking signups voor event 5177697...');
  
  const { data, error } = await supabase
    .from('zwift_api_event_signups')
    .select('event_id, pen_name, rider_name')
    .eq('event_id', '5177697');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nTotal signups found: ${data.length}`);
  console.log('First 5:', data.slice(0, 5));
  
  // Also try as integer
  const { data: data2, error: error2 } = await supabase
    .from('zwift_api_event_signups')
    .select('event_id, pen_name')
    .eq('event_id', 5177697);
    
  console.log(`\nWith integer query: ${data2?.length || 0} signups`);
}

main();
