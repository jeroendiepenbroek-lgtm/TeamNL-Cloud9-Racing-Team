#!/usr/bin/env tsx
/**
 * Test ZwiftPower Service & Category Berekening
 * 
 * Test alle functies van de ZwiftPower service:
 * - Direct data ophalen
 * - Category berekening
 * - Vergelijking met database
 * - Bulk sync
 */

import { zwiftPowerService } from './src/services/zwiftpower.service.js';
import { supabase } from './src/services/supabase.service.js';

const TEST_RIDER_ID = 150437; // JRøne CloudRacer-9

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 ZWIFTPOWER SERVICE TEST');
console.log('═══════════════════════════════════════════════════════════');
console.log();

async function test1_ConnectionTest() {
  console.log('📡 Test 1: Connectie Test');
  console.log('─────────────────────────────────────────────────────────');
  
  const success = await zwiftPowerService.testConnection();
  
  if (success) {
    console.log('✅ Test 1 GESLAAGD');
  } else {
    console.log('❌ Test 1 GEFAALD');
  }
  console.log();
}

async function test2_GetRiderData() {
  console.log('📊 Test 2: Rider Data Ophalen');
  console.log('─────────────────────────────────────────────────────────');
  
  const data = await zwiftPowerService.getRiderData(TEST_RIDER_ID);
  
  if (data.success && data.data) {
    console.log(`✅ Data opgehaald voor: ${data.data.name}`);
    console.log(`   FTP: ${data.data.ftp}W`);
    console.log(`   Gewicht: ${data.data.weight_kg}kg`);
    console.log(`   W/kg: ${(data.data.ftp / data.data.weight_kg).toFixed(2)}`);
    console.log(`   Category: ${data.data.category}`);
    console.log(`   Team: ${data.data.team_name}`);
    console.log(`   Races: ${data.race_count}`);
    console.log('✅ Test 2 GESLAAGD');
  } else {
    console.log(`❌ Test 2 GEFAALD: ${data.error}`);
  }
  console.log();
}

async function test3_CategoryCalculation() {
  console.log('🎯 Test 3: Category Berekening');
  console.log('─────────────────────────────────────────────────────────');
  
  // Test verschillende W/kg waarden
  const testCases = [
    { ftp: 234, weight: 76, expected: 'C', desc: 'Rider 150437' },
    { ftp: 350, weight: 75, expected: 'A+', desc: 'A+ rider (4.67 W/kg)' },
    { ftp: 320, weight: 80, expected: 'A', desc: 'A rider (4.0 W/kg)' },
    { ftp: 280, weight: 80, expected: 'B', desc: 'B rider (3.5 W/kg)' },
    { ftp: 220, weight: 80, expected: 'C', desc: 'C rider (2.75 W/kg)' },
    { ftp: 180, weight: 80, expected: 'D', desc: 'D rider (2.25 W/kg)' },
  ];
  
  let allPassed = true;
  
  for (const test of testCases) {
    const result = zwiftPowerService.calculateCategory(test.ftp, test.weight, 'male');
    const passed = result.calculated_category === test.expected;
    
    console.log(`${passed ? '✅' : '❌'} ${test.desc}:`);
    console.log(`   ${test.ftp}W / ${test.weight}kg = ${result.wkg} W/kg → ${result.calculated_category} (verwacht: ${test.expected})`);
    
    if (!passed) allPassed = false;
  }
  
  console.log();
  if (allPassed) {
    console.log('✅ Test 3 GESLAAGD - Alle category berekeningen correct');
  } else {
    console.log('❌ Test 3 GEFAALD - Sommige berekeningen incorrect');
  }
  console.log();
}

async function test4_CompareWithDatabase() {
  console.log('🔄 Test 4: Vergelijking met Database');
  console.log('─────────────────────────────────────────────────────────');
  
  // Haal database data op via getRiders
  const allRiders = await supabase.getRiders();
  const dbRider = allRiders.find(r => r.rider_id === TEST_RIDER_ID);
  
  if (!dbRider) {
    console.log('❌ Test 4 GEFAALD: Rider niet gevonden in database');
    console.log();
    return;
  }
  
  console.log(`Database data voor ${dbRider.name}:`);
  console.log(`   FTP: ${dbRider.zp_ftp}W`);
  console.log(`   Category: ${dbRider.zp_category}`);
  console.log(`   Weight: ${dbRider.weight}kg`);
  console.log();
  
  // Vergelijk met ZwiftPower
  const comparison = await zwiftPowerService.compareWithZwiftRacing(
    TEST_RIDER_ID,
    dbRider.zp_ftp || 0,
    dbRider.zp_category || 'D'
  );
  
  if (comparison) {
    console.log('ZwiftPower data:');
    console.log(`   FTP: ${comparison.zwiftpower.ftp}W`);
    console.log(`   Category: ${comparison.zwiftpower.category}`);
    console.log(`   Weight: ${comparison.zwiftpower.weight}kg`);
    console.log();
    
    if (comparison.differences.ftp_changed || comparison.differences.category_changed) {
      console.log('⚠️  Verschillen gedetecteerd:');
      if (comparison.differences.ftp_changed) {
        console.log(`   FTP verschil: ${comparison.differences.ftp_diff > 0 ? '+' : ''}${comparison.differences.ftp_diff}W`);
      }
      if (comparison.differences.category_changed) {
        console.log(`   Category wijziging: ${comparison.zwiftRacing.category} → ${comparison.zwiftpower.category}`);
      }
      console.log(`   → ${comparison.differences.recommendation}`);
    } else {
      console.log('✅ Database en ZwiftPower zijn synchroon');
    }
    
    console.log('✅ Test 4 GESLAAGD');
  } else {
    console.log('❌ Test 4 GEFAALD: Kon geen vergelijking maken');
  }
  console.log();
}

async function test5_BulkRiderData() {
  console.log('📦 Test 5: Bulk Rider Data (kleine batch)');
  console.log('─────────────────────────────────────────────────────────');
  
  // Test met 3 riders uit TeamNL
  const testRiders = [150437, 191642, 123456]; // Voeg echte rider IDs toe
  
  console.log(`Ophalen van ${testRiders.length} riders...`);
  const results = await zwiftPowerService.getBulkRiderData(testRiders, 2);
  
  const successCount = results.filter(r => r.success).length;
  console.log();
  console.log(`Resultaat: ${successCount}/${testRiders.length} riders succesvol opgehaald`);
  
  // Toon summary
  for (const result of results) {
    if (result.success && result.data) {
      console.log(`   ✅ ${result.data.name}: ${result.data.ftp}W, Cat ${result.data.category}`);
    } else {
      console.log(`   ❌ Rider fout: ${result.error}`);
    }
  }
  
  if (successCount > 0) {
    console.log('✅ Test 5 GESLAAGD');
  } else {
    console.log('❌ Test 5 GEFAALD');
  }
  console.log();
}

async function runAllTests() {
  try {
    await test1_ConnectionTest();
    await test2_GetRiderData();
    await test3_CategoryCalculation();
    await test4_CompareWithDatabase();
    await test5_BulkRiderData();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ALLE TESTS VOLTOOID');
    console.log('═══════════════════════════════════════════════════════════');
  } catch (error: any) {
    console.error('❌ TEST FOUT:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
