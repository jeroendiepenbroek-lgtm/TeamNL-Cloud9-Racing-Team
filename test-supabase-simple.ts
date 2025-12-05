/**
 * Simple Supabase Health Check
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function testSupabase() {
  console.log('🔍 Testing Supabase connection...\n');
  
  if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_KEY not set!');
    process.exit(1);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    // Test 1: Count riders
    console.log('Test 1: Count riders in database...');
    const { count: riderCount, error: riderError } = await supabase
      .from('riders')
      .select('*', { count: 'exact', head: true });
    
    if (riderError) {
      console.error('❌ Riders query failed:', riderError.message);
    } else {
      console.log(`✅ Riders table: ${riderCount} rows`);
    }
    
    // Test 2: Count events
    console.log('\nTest 2: Count events in database...');
    const { count: eventCount, error: eventError } = await supabase
      .from('zwift_api_events')
      .select('*', { count: 'exact', head: true });
    
    if (eventError) {
      console.error('❌ Events query failed:', eventError.message);
    } else {
      console.log(`✅ Events table: ${eventCount} rows`);
    }
    
    // Test 3: Count race results
    console.log('\nTest 3: Count race results in database...');
    const { count: resultCount, error: resultError } = await supabase
      .from('zwift_api_race_results')
      .select('*', { count: 'exact', head: true });
    
    if (resultError) {
      console.error('❌ Results query failed:', resultError.message);
    } else {
      console.log(`✅ Race results table: ${resultCount} rows`);
    }
    
    // Test 4: Check if rider 150437 exists
    console.log('\nTest 4: Check rider 150437...');
    const { data: rider, error: rider150437Error } = await supabase
      .from('riders')
      .select('zwift_id, name, ftp, ranking, last_synced')
      .eq('zwift_id', 150437)
      .single();
    
    if (rider150437Error) {
      console.log('⚠️  Rider 150437 not found in database');
    } else {
      console.log('✅ Rider 150437 exists:');
      console.log(`   Name: ${rider.name}`);
      console.log(`   FTP: ${rider.ftp}W`);
      console.log(`   vELO: ${rider.ranking}`);
      console.log(`   Last synced: ${rider.last_synced || 'Never'}`);
    }
    
    console.log('\n✅ Supabase connection is healthy!');
    
  } catch (error: any) {
    console.error('\n❌ Supabase test failed:', error.message);
    process.exit(1);
  }
}

testSupabase();
