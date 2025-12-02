import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function fixVeloRating() {
  console.log('🔧 Fixing velo_rating NULL values...');
  
  // Update velo_rating = velo_max_30d WHERE velo_rating IS NULL AND velo_max_30d IS NOT NULL
  const { data, error } = await supabase
    .from('riders_unified')
    .update({ velo_rating: supabase.sql`velo_max_30d` })
    .is('velo_rating', null)
    .not('velo_max_30d', 'is', null)
    .select('rider_id, name, velo_rating, velo_max_30d');
  
  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  console.log(`✅ Updated ${data?.length || 0} riders`);
  if (data && data.length > 0) {
    console.log('\nUpdated riders:');
    data.forEach(r => console.log(`  - ${r.name} (${r.rider_id}): velo_rating = ${r.velo_rating}`));
  }
  
  // Verify rider 150437
  const { data: rider, error: riderError } = await supabase
    .from('riders_unified')
    .select('rider_id, name, velo_rating, velo_max_30d, velo_max_90d, velo_rank')
    .eq('rider_id', 150437)
    .single();
  
  if (!riderError && rider) {
    console.log('\n✅ Rider 150437 verification:');
    console.log(rider);
  }
}

fixVeloRating().catch(console.error);
