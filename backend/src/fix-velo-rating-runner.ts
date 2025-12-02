/**
 * Fix velo_rating NULL values
 * Update velo_rating from velo_max_30d where rating is NULL
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixVeloRating() {
  console.log('🔧 Fixing velo_rating NULL values...\n');
  
  // First, check current state
  const { data: nullRatings, error: checkError } = await supabase
    .from('riders_unified')
    .select('rider_id, name, velo_rating, velo_max_30d, velo_max_90d')
    .is('velo_rating', null)
    .not('velo_max_30d', 'is', null);
  
  if (checkError) {
    console.error('❌ Error checking:', checkError);
    process.exit(1);
  }
  
  console.log(`Found ${nullRatings?.length || 0} riders with NULL velo_rating but valid velo_max_30d\n`);
  
  if (nullRatings && nullRatings.length > 0) {
    console.log('Updating riders:');
    
    // Update each rider individually
    for (const rider of nullRatings) {
      const { error: updateError } = await supabase
        .from('riders_unified')
        .update({ velo_rating: rider.velo_max_30d })
        .eq('rider_id', rider.rider_id);
      
      if (updateError) {
        console.error(`  ❌ ${rider.name} (${rider.rider_id}):`, updateError);
      } else {
        console.log(`  ✅ ${rider.name} (${rider.rider_id}): ${rider.velo_rating} → ${rider.velo_max_30d}`);
      }
    }
  }
  
  // Verify rider 150437 specifically
  console.log('\n📊 Verifying rider 150437:');
  const { data: rider, error: riderError } = await supabase
    .from('riders_unified')
    .select('rider_id, name, velo_rating, velo_max_30d, velo_max_90d, velo_rank')
    .eq('rider_id', 150437)
    .single();
  
  if (!riderError && rider) {
    console.log(JSON.stringify(rider, null, 2));
  } else {
    console.error('❌ Error:', riderError);
  }
  
  console.log('\n✅ velo_rating fix complete!');
}

fixVeloRating().catch(console.error);
