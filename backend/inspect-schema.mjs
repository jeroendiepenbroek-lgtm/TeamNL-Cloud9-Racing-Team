import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchema() {
  console.log('🔍 Inspecting Supabase Schema...\n');
  
  // Get sample rider to see all columns
  const { data: riders, error: ridersError } = await supabase
    .from('riders')
    .select('*')
    .limit(1);
    
  if (ridersError) {
    console.error('❌ Riders error:', ridersError);
  } else if (riders && riders.length > 0) {
    console.log('📋 RIDERS TABLE COLUMNS:');
    Object.keys(riders[0]).forEach(col => {
      console.log(`  - ${col}: ${typeof riders[0][col]} (value: ${riders[0][col]})`);
    });
  }
  
  // Get sample club
  const { data: clubs, error: clubsError } = await supabase
    .from('clubs')
    .select('*')
    .limit(1);
    
  if (clubsError) {
    console.error('❌ Clubs error:', clubsError);
  } else if (clubs && clubs.length > 0) {
    console.log('\n📋 CLUBS TABLE COLUMNS:');
    Object.keys(clubs[0]).forEach(col => {
      console.log(`  - ${col}: ${typeof clubs[0][col]} (value: ${clubs[0][col]})`);
    });
  }
  
  // Full sample data
  console.log('\n📊 FULL SAMPLE RIDER:');
  console.log(JSON.stringify(riders[0], null, 2));
  
  console.log('\n📊 FULL SAMPLE CLUB:');
  console.log(JSON.stringify(clubs[0], null, 2));
}

inspectSchema().catch(console.error);
