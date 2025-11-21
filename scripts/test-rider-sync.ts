#!/usr/bin/env tsx

/**
 * Test script: Verify rider sync with array extraction fix
 * Tests that power data arrays [value, percentile, rank] are correctly extracted
 */

import { SyncServiceV2 } from '../backend/src/services/sync-v2.service.js';
import { ZwiftApiClient } from '../backend/src/api/zwift-client.js';
import { SupabaseService } from '../backend/src/database/supabase.service.js';

async function testRiderSync() {
  console.log('🧪 Testing Rider Sync with Array Extraction Fix\n');

  try {
    // Initialize services
    const zwiftClient = new ZwiftApiClient();
    const supabase = new SupabaseService();
    const syncService = new SyncServiceV2(zwiftClient, supabase);

    // Run rider sync
    console.log('🔄 Running rider sync...');
    const result = await syncService.syncRiders();

    console.log('\n✅ Sync Complete!');
    console.log(`   Processed: ${result.riders_processed}`);
    console.log(`   Updated: ${result.riders_updated}`);
    console.log(`   New: ${result.riders_new}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Duration: ${result.duration_ms}ms`);

    // Test specific rider (150437 - JRøne)
    console.log('\n🔍 Testing rider 150437 (JRøne)...');
    const rider = await supabase.getRider(150437);

    if (rider) {
      console.log('   ✅ Rider found in database');
      console.log(`   Name: ${rider.name}`);
      console.log(`   Weight: ${rider.weight_kg}kg ${rider.weight_kg ? '✅' : '❌ NULL'}`);
      console.log(`   Height: ${rider.height_cm}cm ${rider.height_cm ? '✅' : '❌ NULL'}`);
      console.log(`   FTP: ${rider.ftp}W ${rider.ftp ? '✅' : '❌ NULL'}`);
      console.log(`   Power 5s: ${rider.power_wkg5} W/kg ${rider.power_wkg5 ? '✅' : '❌ NULL'}`);
      console.log(`   Power 1m: ${rider.power_wkg60} W/kg ${rider.power_wkg60 ? '✅' : '❌ NULL'}`);
      console.log(`   Power 20m: ${rider.power_wkg1200} W/kg ${rider.power_wkg1200 ? '✅' : '❌ NULL'}`);
      console.log(`   Power 5s: ${rider.power_w5}W ${rider.power_w5 ? '✅' : '❌ NULL'}`);
      console.log(`   Critical Power: ${rider.power_cp}W ${rider.power_cp ? '✅' : '❌ NULL'}`);

      // Check if values look correct (should be numbers, not arrays)
      const checks = [
        { field: 'weight_kg', value: rider.weight_kg, expected: 74 },
        { field: 'height_cm', value: rider.height_cm, expected: 183 },
        { field: 'power_wkg5', value: rider.power_wkg5, expected: 13.027 },
        { field: 'power_w5', value: rider.power_w5, expected: 964 },
      ];

      console.log('\n🎯 Value Checks:');
      checks.forEach(check => {
        const isCorrect = check.value && Math.abs(check.value - check.expected) < 10;
        const status = isCorrect ? '✅' : '❌';
        console.log(`   ${status} ${check.field}: ${check.value} (expected ~${check.expected})`);
      });
    } else {
      console.log('   ❌ Rider not found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRiderSync();
