import dotenv from 'dotenv';
dotenv.config();

const { supabase } = await import('./src/services/supabase.service.js');

console.log('Testing direct query...');

// Test 1: Simple count
const { count, error: countError } = await (supabase as any).client
  .from('zwift_api_race_results')
  .select('*', { count: 'exact', head: true })
  .eq('rider_id', 150437);

console.log('Count query:', { count, error: countError });

// Test 2: Simple select with limit 1
const { data, error } = await (supabase as any).client
  .from('zwift_api_race_results')
  .select('*')
  .eq('rider_id', 150437)
  .limit(1);

console.log('Select query:', { rows: data?.length, error });
if (data && data.length > 0) {
  console.log('Sample:', data[0]);
}
