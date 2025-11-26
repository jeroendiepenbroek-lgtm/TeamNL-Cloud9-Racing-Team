import { zwiftClient } from './src/api/zwift-client.js';
import { supabase } from './src/services/supabase.service.js';

const TEST_RIDER_ID = 150437;

async function verifyRiderData() {
  console.log('=== DATA ACTUALITEIT VERIFICATIE ===');
  console.log(`Test Rider: ${TEST_RIDER_ID}\n`);
  
  try {
    // 1. Haal data uit ZwiftRacing API
    console.log('📡 Fetching data van ZwiftRacing API...');
    const apiData = await zwiftClient.getRider(TEST_RIDER_ID);
    
    console.log('\n=== API DATA (ZwiftRacing.app) ===');
    console.log(`Name: ${apiData.name}`);
    console.log(`ZP Category: ${apiData.zpCategory || 'N/A'}`);
    console.log(`ZP FTP: ${apiData.zpFTP || 'N/A'}`);
    console.log(`Weight: ${apiData.weight || 'N/A'} kg`);
    console.log(`Height: ${apiData.height || 'N/A'} cm`);
    console.log(`Race Finishes: ${apiData.race?.finishes || 0}`);
    console.log(`vELO Rating: ${apiData.race?.current?.rating || apiData.race?.last?.rating || 'N/A'}`);
    
    console.log('\nPower Profile (W/kg):');
    const extractPower = (val: any) => Array.isArray(val) ? val[0] : val;
    console.log(`  5s:   ${extractPower(apiData.power?.wkg5) || 'N/A'}`);
    console.log(`  15s:  ${extractPower(apiData.power?.wkg15) || 'N/A'}`);
    console.log(`  1min: ${extractPower(apiData.power?.wkg60) || 'N/A'}`);
    console.log(`  5min: ${extractPower(apiData.power?.wkg300) || 'N/A'}`);
    console.log(`  20min: ${extractPower(apiData.power?.wkg1200) || 'N/A'}`);
    console.log(`  CP: ${apiData.power?.CP || 'N/A'} W`);
    
    // 2. Haal data uit database
    console.log('\n📊 Fetching data uit database...');
    const dbRiders = await supabase.getRiders();
    const dbData = dbRiders.find(r => r.rider_id === TEST_RIDER_ID);
    
    if (!dbData) {
      console.log('\n❌ PROBLEEM: Rider niet gevonden in database!');
      console.log('Run: POST /api/sync-control/trigger/riders om te synchroniseren');
      return;
    }
    
    console.log('\n=== DATABASE DATA (Supabase) ===');
    console.log(`Name: ${dbData.name}`);
    console.log(`ZP Category: ${dbData.zp_category || 'N/A'}`);
    console.log(`ZP FTP: ${dbData.zp_ftp || 'N/A'}`);
    console.log(`Weight: ${dbData.weight || 'N/A'} kg`);
    console.log(`Height: ${dbData.height || 'N/A'} cm`);
    console.log(`Race Finishes: ${dbData.race_finishes || 0}`);
    console.log(`vELO Rating: ${dbData.race_current_rating || 'N/A'}`);
    console.log(`Last Synced: ${dbData.last_synced || dbData.updated_at || 'N/A'}`);
    
    console.log('\nPower Profile (W/kg):');
    console.log(`  5s:   ${dbData.power_wkg5 || 'N/A'}`);
    console.log(`  15s:  ${dbData.power_wkg15 || 'N/A'}`);
    console.log(`  1min: ${dbData.power_wkg60 || 'N/A'}`);
    console.log(`  5min: ${dbData.power_wkg300 || 'N/A'}`);
    console.log(`  20min: ${dbData.power_wkg1200 || 'N/A'}`);
    console.log(`  CP: ${dbData.power_cp || 'N/A'} W`);
    
    // 3. Vergelijk actualiteit
    console.log('\n=== ACTUALITEIT CHECK ===');
    
    const lastSync = new Date(dbData.last_synced || dbData.updated_at || 0);
    const timeSince = Date.now() - lastSync.getTime();
    const hoursSince = Math.floor(timeSince / 3600000);
    const minutesSince = Math.floor((timeSince % 3600000) / 60000);
    
    console.log(`⏱️  Laatste sync: ${hoursSince}u ${minutesSince}min geleden`);
    
    if (timeSince > 3600000) { // > 1 uur
      console.log('⚠️  WAARSCHUWING: Data is meer dan 1 uur oud!');
    } else {
      console.log('✅ Data is actueel (< 1 uur oud)');
    }
    
    // 4. Vergelijk waarden
    console.log('\n=== DATA VERGELIJKING ===');
    const differences: string[] = [];
    
    const apiVelo = apiData.race?.current?.rating || apiData.race?.last?.rating;
    if (apiVelo !== dbData.race_current_rating) {
      differences.push(`vELO: API=${apiVelo} vs DB=${dbData.race_current_rating}`);
    }
    
    if (apiData.zpFTP !== dbData.zp_ftp) {
      differences.push(`ZP FTP: API=${apiData.zpFTP} vs DB=${dbData.zp_ftp}`);
    }
    
    const apiPower5 = extractPower(apiData.power?.wkg5);
    if (apiPower5 !== dbData.power_wkg5) {
      differences.push(`5s Power: API=${apiPower5} vs DB=${dbData.power_wkg5}`);
    }
    
    if (differences.length > 0) {
      console.log('⚠️  VERSCHILLEN GEVONDEN:');
      differences.forEach(diff => console.log(`   ${diff}`));
      console.log('\n💡 Actie: Run POST /api/sync-control/trigger/riders om te updaten');
    } else {
      console.log('✅ Alle belangrijke velden komen overeen');
    }
    
    // 5. Check dashboard endpoints
    console.log('\n=== DASHBOARD ENDPOINTS CHECK ===');
    console.log('Testing GET /api/riders...');
    
    const allRiders = await supabase.getRiders();
    console.log(`✅ Riders endpoint: ${allRiders.length} riders beschikbaar`);
    
    const teamRiderIds = await supabase.getAllTeamRiderIds();
    console.log(`✅ MY_TEAM_MEMBERS: ${teamRiderIds.length} riders`);
    
    const isInTeam = teamRiderIds.includes(TEST_RIDER_ID);
    console.log(`${isInTeam ? '✅' : '❌'} Test rider ${TEST_RIDER_ID} ${isInTeam ? 'IS' : 'IS NIET'} in MY_TEAM_MEMBERS`);
    
    if (!isInTeam) {
      console.log('\n💡 Actie: Voeg rider toe met POST /api/riders/my-team');
      console.log(`   Body: { "rider_ids": [${TEST_RIDER_ID}] }`);
    }
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.statusText);
    }
  }
}

verifyRiderData().catch(console.error);
