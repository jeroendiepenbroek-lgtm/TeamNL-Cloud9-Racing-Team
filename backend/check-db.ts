import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data, error } = await supabase
  .from('riders_unified')
  .select('name, weight_kg, ftp, zp_category, last_synced_zwiftpower')
  .eq('rider_id', 150437)
  .single();

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log('\n📊 Database data voor rider 150437:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Weight:      ${data.weight_kg} kg`);
  console.log(`FTP:         ${data.ftp} W`);
  console.log(`Category:    ${data.zp_category}`);
  console.log(`Last sync:   ${data.last_synced_zwiftpower}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (data.weight_kg === 74) {
    console.log('✅ Correct: 74kg uit event 5229579');
  } else {
    console.log(`⚠️  Probleem: Database heeft ${data.weight_kg}kg in plaats van 74kg`);
  }
}

process.exit(0);
