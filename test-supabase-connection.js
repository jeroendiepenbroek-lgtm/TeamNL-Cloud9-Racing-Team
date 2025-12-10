#!/usr/bin/env node

/**
 * Test Supabase connection en check of migrations zijn uitgevoerd
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3Mzk0NTIsImV4cCI6MjA0NjMxNTQ1Mn0.6hHXDxq_OOMM89GrSfN1CRd0XgGMqU72gBHG9CYmUE4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Test 1: Check if table exists
  const { data: tables, error: tableError } = await supabase
    .from('api_zwiftracing_api_events_upcoming')
    .select('event_id')
    .limit(1);
  
  if (tableError) {
    if (tableError.code === '42P01') {
      console.log('❌ Table api_zwiftracing_api_events_upcoming does not exist');
      console.log('📋 You need to run migrations first!\n');
      console.log('Go to: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/editor\n');
      console.log('Run these migrations IN ORDER:');
      console.log('1. migrations/002_api_source_tables.sql');
      console.log('2. migrations/003_hybrid_views.sql\n');
      return false;
    }
    console.error('❌ Error:', tableError.message);
    return false;
  }
  
  console.log('✅ Connection successful!');
  console.log('✅ Tables exist!\n');
  
  // Check if data exists
  const { count } = await supabase
    .from('api_zwiftracing_api_events_upcoming')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Current data in Supabase:`);
  console.log(`   Events: ${count || 0}\n`);
  
  if (count === 0) {
    console.log('📤 Ready to upload data from local SQLite!\n');
  } else {
    console.log('⚠️  Data already exists. Upload will UPSERT (update/insert).\n');
  }
  
  return true;
}

testConnection().then(success => {
  if (success) {
    console.log('Next step: Set service key and run upload-to-supabase.js');
    console.log('\nGet service key from:');
    console.log('https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/settings/api\n');
    console.log('Then run:');
    console.log('export SUPABASE_SERVICE_KEY="your-key"');
    console.log('node upload-to-supabase.js\n');
  }
  process.exit(success ? 0 : 1);
});
