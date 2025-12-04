import 'dotenv/config';
import { supabase } from './src/services/supabase.service.js';

async function checkColumns() {
  const { data, error } = await supabase.client
    .from('zwift_api_race_results')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (data?.[0]) {
    console.log('✅ Kolommen in zwift_api_race_results:');
    console.log(Object.keys(data[0]).sort().join('\n'));
  } else {
    console.log('⚠️  Geen data gevonden');
  }
}

checkColumns().catch(console.error);
