#!/usr/bin/env node
/**
 * Test Supabase Upsert met verschillende keys
 */

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;

// Test beide keys
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQxNTE5NCwiZXhwIjoyMDQ4OTkxMTk0fQ.iPF2XFBZV19TEBKmjzoWlhN22FJM-JG8YW-F8VGJjh0";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTQ2MzEsImV4cCI6MjA3NzUzMDYzMX0.HHa7K3J-pmR73hm063w0JJhA4pFASYS65DFI-BZGAqw";

async function testKey(keyName: string, key: string) {
  console.log(`\n🔐 Testing ${keyName}...`);
  
  const supabase = createClient(SUPABASE_URL, key);
  
  // Test 1: Read
  const { data: readData, error: readError } = await supabase
    .from('riders_unified')
    .select('rider_id, name')
    .eq('rider_id', 150437)
    .single();
  
  if (readError) {
    console.log(`   ❌ Read failed: ${readError.message}`);
  } else {
    console.log(`   ✅ Read OK: ${readData?.name}`);
  }
  
  // Test 2: Upsert
  const { data: upsertData, error: upsertError } = await supabase
    .from('riders_unified')
    .upsert({
      rider_id: 150437,
      name: 'JRøne  CloudRacer-9 @YT (TeamNL)',
      phenotype_climber: 45.5, // Test nieuwe kolom
      power_rating: 350,
      updated_at: new Date().toISOString()
    })
    .select();
  
  if (upsertError) {
    console.log(`   ❌ Upsert failed: ${upsertError.message}`);
  } else {
    console.log(`   ✅ Upsert OK!`);
  }
}

(async () => {
  await testKey('Service Key (oude)', serviceKey);
  await testKey('Anon Key', anonKey);
})();
