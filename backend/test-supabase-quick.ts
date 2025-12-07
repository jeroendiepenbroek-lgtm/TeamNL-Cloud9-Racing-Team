import { supabase } from './src/services/supabase.service.js';

async function test() {
  console.log('Testing Supabase connection...');
  
  const riders = await supabase.getMyTeamMembers();
  console.log(`\n✅ Found ${riders.length} team members`);
  
  if (riders.length > 0) {
    const sample = riders[0];
    console.log('\nSample rider:', {
      id: sample.rider_id,
      name: sample.name,
      ftp: sample.ftp,
      weight: sample.weight_kg,
      power_w60: sample.power_w60,
      has_data: !!(sample.ftp && sample.weight_kg)
    });
  }
}

test().catch(console.error);
