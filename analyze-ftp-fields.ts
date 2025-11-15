/**
 * Analyze ALL possible FTP fields in ZwiftRacing API
 */

import { zwiftClient } from './backend/src/api/zwift-client.js';

async function analyzeFTPFields() {
  try {
    console.log('🔍 Analyzing FTP fields for rider 1175748...\n');
    
    const rider = await zwiftClient.getRider(1175748);
    
    console.log('📋 COMPLETE API RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(rider, null, 2));
    console.log('='.repeat(80));
    
    console.log('\n🔋 FTP FIELD ANALYSIS:');
    console.log('='.repeat(80));
    
    // Check alle mogelijke FTP velden
    const possibleFields = [
      'zpFTP',
      'zFTP', 
      'ftp',
      'FTP',
      'estimatedFTP',
      'functionalThresholdPower',
      'threshold',
      'w20',
      'power.ftp',
      'power.threshold',
      'power.zFTP',
    ];
    
    console.log('\nDirect fields:');
    possibleFields.forEach(field => {
      const parts = field.split('.');
      let value: any = rider;
      for (const part of parts) {
        value = value?.[part];
      }
      const status = value !== undefined ? `✅ ${value}` : '❌ NOT FOUND';
      console.log(`  ${field.padEnd(30)} : ${status}`);
    });
    
    console.log('\n⚡ POWER CURVE DATA (available):');
    console.log('-'.repeat(80));
    if (rider.power) {
      Object.entries(rider.power).forEach(([key, value]) => {
        console.log(`  ${key.padEnd(20)} : ${value}`);
      });
    }
    
    console.log('\n💡 FTP CALCULATION OPTIONS:');
    console.log('-'.repeat(80));
    
    if (rider.power?.w1200) {
      const ftp95 = Math.round(rider.power.w1200 * 0.95);
      console.log(`  Option 1 - 95% of 20min (w1200)     : ${ftp95} watts`);
      if (rider.weight) {
        console.log(`            w/kg                       : ${(ftp95 / rider.weight).toFixed(2)} w/kg`);
      }
    }
    
    if (rider.power?.CP) {
      const ftpCP = Math.round(rider.power.CP);
      console.log(`  Option 2 - Critical Power (CP)      : ${ftpCP} watts`);
      if (rider.weight) {
        console.log(`            w/kg                       : ${(ftpCP / rider.weight).toFixed(2)} w/kg`);
      }
    }
    
    if (rider.power?.w300) {
      const ftp90 = Math.round(rider.power.w300 * 0.90);
      console.log(`  Option 3 - 90% of 5min (w300)       : ${ftp90} watts`);
      if (rider.weight) {
        console.log(`            w/kg                       : ${(ftp90 / rider.weight).toFixed(2)} w/kg`);
      }
    }
    
    if (rider.zpFTP && rider.zpFTP > 0) {
      console.log(`  Option 4 - ZwiftPower FTP (zpFTP)   : ${rider.zpFTP} watts`);
      if (rider.weight) {
        console.log(`            w/kg                       : ${(rider.zpFTP / rider.weight).toFixed(2)} w/kg`);
      }
    } else {
      console.log(`  Option 4 - ZwiftPower FTP (zpFTP)   : ❌ NOT AVAILABLE (value: ${rider.zpFTP})`);
    }
    
    console.log('\n🎯 RECOMMENDED APPROACH:');
    console.log('-'.repeat(80));
    console.log(`  Use zpFTP when available (> 0)`);
    console.log(`  Fallback to 95% of w1200 (20min power)`);
    console.log(`  Secondary fallback to CP (Critical Power)`);
    console.log(`  Tertiary fallback to 90% of w300 (5min power)`);
    
    // Test met een andere rider die misschien wel zpFTP heeft
    console.log('\n\n🔍 Testing another rider for comparison...');
    console.log('='.repeat(80));
    
    const testRider = await zwiftClient.getRider(150437); // Test met andere rider
    console.log(`\nRider ${testRider.riderId} (${testRider.name}):`);
    console.log(`  zpFTP: ${testRider.zpFTP}`);
    console.log(`  w1200: ${testRider.power?.w1200}`);
    console.log(`  CP: ${testRider.power?.CP}`);
    
    if (testRider.zpFTP && testRider.zpFTP > 0) {
      console.log(`  ✅ This rider HAS zpFTP data!`);
    } else {
      console.log(`  ❌ This rider also has zpFTP = 0`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

analyzeFTPFields();
