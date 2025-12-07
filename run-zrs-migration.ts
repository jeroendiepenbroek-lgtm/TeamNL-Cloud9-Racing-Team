/**
 * Quick script to run ZRS migration via Supabase client
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  console.log('🔄 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('📝 Adding ZRS column to riders_unified...');
  
  // Run migration SQL
  const { data, error } = await supabase.rpc('exec', {
    sql: `
      ALTER TABLE riders_unified 
      ADD COLUMN IF NOT EXISTS zrs INTEGER;
      
      COMMENT ON COLUMN riders_unified.zrs IS 
        'Zwift Racing Score (ZRS) from Zwift Official API - Integer racing ability score';
    `
  });
  
  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual SQL needed in Supabase Dashboard:');
    console.log('ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS zrs INTEGER;');
    return;
  }
  
  console.log('✅ ZRS column added successfully!');
  
  // Verify
  console.log('\n🔍 Verifying column exists...');
  const { data: columns, error: verifyError } = await supabase
    .from('riders_unified')
    .select('zrs')
    .limit(1);
    
  if (verifyError) {
    console.error('Verification error:', verifyError.message);
  } else {
    console.log('✅ ZRS column verified!');
  }
}

runMigration().catch(console.error);
