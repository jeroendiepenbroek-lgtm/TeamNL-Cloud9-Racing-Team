import { supabase } from './src/services/supabase.service.js';

async function checkTables() {
  // Check race_results
  const { data: d1, error: e1 } = await supabase.client
    .from('race_results')
    .select('count', { count: 'exact', head: true });
  
  console.log('race_results:', e1 ? `❌ ${e1.message}` : '✅ EXISTS');
  
  // Check zwift_api_race_results  
  const { data: d2, error: e2 } = await supabase.client
    .from('zwift_api_race_results')
    .select('count', { count: 'exact', head: true });
    
  console.log('zwift_api_race_results:', e2 ? `❌ ${e2.message}` : '✅ EXISTS');
  
  process.exit(0);
}

checkTables();
