import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function main() {
  console.log('Checking zwift_api_events table structure...\n');
  
  // Get one event to see all columns
  const { data, error } = await supabase
    .from('zwift_api_events')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Column names:');
    console.log(Object.keys(data[0]).sort());
    
    console.log('\n\nSample event data:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

main();
