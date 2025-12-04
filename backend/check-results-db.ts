import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkResults() {
  console.log('🔍 Checking rider 150437 results in database...\n');

  // First, get one row to see schema
  const { data: sample } = await supabase
    .from('zwift_api_race_results')
    .select('*')
    .limit(1);

  if (sample && sample.length > 0) {
    console.log('Available columns:', Object.keys(sample[0]).join(', '));
  }

  const { data, error, count } = await supabase
    .from('zwift_api_race_results')
    .select('*', { count: 'exact' })
    .eq('rider_id', 150437);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${count} results for rider 150437\n`);

  if (data && data.length > 0) {
    console.log('📊 Sample (first 3 results):');
    data.slice(0, 3).forEach((r, i) => {
      console.log(`\n${i + 1}. Event ${r.event_id}`);
      console.log(`   - Rank: ${r.rank}/${r.total_riders}`);
      console.log(`   - Time: ${r.time_seconds}s`);
      console.log(`   - Category: ${r.pen || 'N/A'}`);
      console.log(`   - Avg W/kg: ${r.avg_wkg || 'N/A'}`);
      if (r.synced_at) console.log(`   - Synced: ${r.synced_at}`);
    });

    // Check unique event IDs
    const uniqueEvents = [...new Set(data.map(r => r.event_id))];
    console.log(`\n📅 Unique events: ${uniqueEvents.length}`);
    console.log('Event IDs:', uniqueEvents.slice(0, 10).join(', '), '...');
  }
}

checkResults().catch(console.error);
