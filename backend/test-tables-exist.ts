import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './src/services/supabase.service.js';

(async () => {
  const tables = ['riders', 'riders_unified', 'riders_computed'];
  
  console.log('🔍 Checking which rider tables exist in database:\n');
  
  for (const table of tables) {
    const { error } = await (supabase as any).client
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    console.log(error ? `❌ ${table}: ${error.message}` : `✅ ${table}: EXISTS`);
  }
  
  console.log('\n📊 Current data in riders_unified:');
  const { data, error } = await (supabase as any).client
    .from('riders_unified')
    .select('rider_id, name, zp_ftp')
    .limit(5);
  
  if (data) {
    console.log(`Found ${data.length} rider(s):`);
    data.forEach((r: any) => console.log(`  - ${r.rider_id}: ${r.name} (FTP: ${r.zp_ftp})`));
  } else {
    console.log('Error:', error);
  }
})();
