import 'dotenv/config';
import { supabase } from './src/services/supabase.service.js';

async function checkColumns() {
  const { data, error } = await supabase.client
    .from('zwift_api_events')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (data?.[0]) {
    console.log('✅ Kolommen in zwift_api_events:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\n📊 Sample event:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️  Geen data gevonden in zwift_api_events');
  }
}

checkColumns().catch(console.error);
