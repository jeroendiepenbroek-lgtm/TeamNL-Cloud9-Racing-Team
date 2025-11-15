/**
 * Check rider data in database voor rider 1175748
 */

import { supabase } from './backend/src/services/supabase.service.js';

async function checkRiderInDB() {
  try {
    console.log('🔍 Ophalen rider 1175748 uit database...\n');
    
    const rider = await supabase.getRider(1175748);
    
    if (!rider) {
      console.log('❌ Rider 1175748 niet gevonden in database');
      return;
    }
    
    console.log('📊 Database Rider Data:');
    console.log('='.repeat(50));
    console.log(`rider_id: ${rider.rider_id}`);
    console.log(`name: ${rider.name}`);
    console.log(`\n🔋 FTP Data:`);
    console.log('-'.repeat(50));
    console.log(`zp_ftp: ${rider.zp_ftp} watts`);
    console.log(`weight: ${rider.weight} kg`);
    
    if (rider.zp_ftp && rider.weight) {
      const wkg = (rider.zp_ftp / rider.weight).toFixed(2);
      console.log(`Calculated FTP w/kg: ${wkg}`);
    }
    
    console.log(`\n⚡ Power Data (from power curve):`);
    console.log('-'.repeat(50));
    console.log(`power_cp (Critical Power): ${rider.power_cp} watts`);
    console.log(`power_w60 (1min): ${rider.power_w60} watts`);
    console.log(`power_w300 (5min): ${rider.power_w300} watts`);
    console.log(`power_w1200 (20min): ${rider.power_w1200} watts`);
    console.log(`power_wkg60: ${rider.power_wkg60} w/kg`);
    console.log(`power_wkg300: ${rider.power_wkg300} w/kg`);
    console.log(`power_wkg1200: ${rider.power_wkg1200} w/kg`);
    
    // FTP estimate van 20min power curve
    if (rider.power_w1200 && rider.weight) {
      const estimatedFTP = Math.round(rider.power_w1200 * 0.95);
      const estimatedFTPwkg = (estimatedFTP / rider.weight).toFixed(2);
      console.log(`\n💡 Estimated FTP (95% van 20min): ${estimatedFTP} watts (${estimatedFTPwkg} w/kg)`);
    }
    
    console.log(`\n📅 Last synced: ${rider.last_synced || 'Never'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRiderInDB();
