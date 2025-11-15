/**
 * Check rider data voor rider 1175748
 * Zoek specifiek naar zFTP velden in de API response
 */

import { zwiftClient } from './backend/src/api/zwift-client.js';

async function checkRiderData() {
  try {
    console.log('🔍 Ophalen rider data voor rider 1175748...\n');
    
    const rider = await zwiftClient.getRider(1175748);
    
    console.log('📊 Rider Data:');
    console.log('='.repeat(50));
    console.log(`riderId: ${rider.riderId}`);
    console.log(`name: ${rider.name}`);
    console.log(`\n🔋 FTP Data:`);
    console.log('-'.repeat(50));
    
    // Check alle mogelijke FTP velden
    const ftpFields = [
      'zFTP',
      'zpFTP', 
      'ftp',
      'FTP',
      'estimatedFTP',
      'zftp'
    ];
    
    for (const field of ftpFields) {
      const value = (rider as any)[field];
      console.log(`${field}: ${value !== undefined ? value : '❌ NIET GEVONDEN'}`);
    }
    
    console.log(`\n⚡ Power Data:`);
    console.log('-'.repeat(50));
    if (rider.power) {
      console.log('power.CP (Critical Power):', rider.power.CP);
      console.log('power.AWC (Anaerobic Work Capacity):', rider.power.AWC);
      console.log('power.wkg60 (1min w/kg):', rider.power.wkg60);
      console.log('power.wkg300 (5min w/kg):', rider.power.wkg300);
      console.log('power.wkg1200 (20min w/kg):', rider.power.wkg1200);
      console.log('power.w60 (1min watts):', rider.power.w60);
      console.log('power.w300 (5min watts):', rider.power.w300);
      console.log('power.w1200 (20min watts):', rider.power.w1200);
    }
    
    console.log(`\n📦 Volledige response structure:`);
    console.log('-'.repeat(50));
    console.log(JSON.stringify(rider, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRiderData();
