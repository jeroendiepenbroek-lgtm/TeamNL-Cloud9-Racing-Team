import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testRiderResults() {
  console.log('🧪 Testing rider results query...\n');

  const riderId = 150437;
  const days = 90;
  const limit = 50;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  console.log(`Params:`);
  console.log(`  - Rider ID: ${riderId}`);
  console.log(`  - Days: ${days}`);
  console.log(`  - Cutoff date: ${cutoffDate.toISOString()}`);
  console.log(`  - Limit: ${limit}\n`);

  const { data, error } = await supabase
    .from('zwift_api_race_results')
    .select('*')
    .eq('rider_id', riderId)
    .gte('event_date', cutoffDate.toISOString())
    .order('event_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('❌ Error:', error);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
  }

  if (data) {
    console.log(`✅ Success! Found ${data.length} results\n`);
    
    if (data.length > 0) {
      console.log('Sample result:', JSON.stringify(data[0], null, 2));
    }
  }
}

testRiderResults().catch(console.error);
