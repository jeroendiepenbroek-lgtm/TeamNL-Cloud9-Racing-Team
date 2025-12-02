import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function verify() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data, error } = await supabase
    .from('riders_unified')
    .select('name, weight_kg, ftp, zp_category, race_count_90d, velo_rank, last_synced_zwiftpower')
    .eq('rider_id', 150437)
    .single();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('\n✅ Rider 150437 data from database:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Name:          ${data.name}`);
  console.log(`Weight:        ${data.weight_kg} kg ← Expected: 74 kg`);
  console.log(`FTP:           ${data.ftp} W`);
  console.log(`ZP Category:   ${data.zp_category}`);
  console.log(`Races (90d):   ${data.race_count_90d}`);
  console.log(`vELO Rank:     ${data.velo_rank}`);
  console.log(`Last ZP sync:  ${data.last_synced_zwiftpower}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (data.weight_kg === 74) {
    console.log('🎯 SUCCESS: Weight correct (74kg from event 5229579)');
  } else {
    console.log(`⚠️  WARNING: Weight is ${data.weight_kg}kg (expected 74kg)`);
  }
  
  process.exit(0);
}

verify();
