import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
  console.log('🔍 Checking Supabase Schema...\n');
  
  // Check riders table structure
  const { data: ridersColumns, error: ridersError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'riders')
    .order('ordinal_position');
    
  console.log('📋 RIDERS TABLE:');
  console.log(JSON.stringify(ridersColumns, null, 2));
  
  // Check clubs table structure
  const { data: clubsColumns, error: clubsError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'clubs')
    .order('ordinal_position');
    
  console.log('\n📋 CLUBS TABLE:');
  console.log(JSON.stringify(clubsColumns, null, 2));
  
  // Get sample data from riders
  const { data: sampleRider, error: sampleError } = await supabase
    .from('riders')
    .select('*')
    .limit(1)
    .single();
    
  console.log('\n📊 SAMPLE RIDER DATA:');
  console.log(JSON.stringify(sampleRider, null, 2));
}

checkSchema().catch(console.error);
