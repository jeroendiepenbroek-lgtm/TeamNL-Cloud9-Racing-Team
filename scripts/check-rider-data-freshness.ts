/**
 * Check Rider Data Freshness
 * Compare database vs ZwiftRacing API for sample riders
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const zwiftApi = axios.create({
  baseURL: 'https://zwift-ranking.herokuapp.com',
  headers: {
    'Authorization': process.env.ZWIFT_RACING_API_KEY || ''
  }
});

async function checkRider(riderId: number, riderName: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Checking Rider: ${riderName} (${riderId})`);
  console.log('='.repeat(70));
  
  // 1. Database data
  console.log('\n📊 DATABASE:');
  const { data: dbRider } = await supabase
    .from('riders')
    .select('*')
    .eq('rider_id', riderId)
    .single();
  
  if (dbRider) {
    console.log(`   Name: ${dbRider.name}`);
    console.log(`   Weight: ${dbRider.weight_kg || 'NULL'}kg`);
    console.log(`   Height: ${dbRider.height_cm || 'NULL'}cm`);
    console.log(`   FTP: ${dbRider.ftp || 'NULL'}`);
    console.log(`   vELO: ${dbRider.velo_rating || 'NULL'}`);
    console.log(`   Power 5s (W/kg): ${dbRider.power_wkg5 || 'NULL'}`);
    console.log(`   Power 15s (W/kg): ${dbRider.power_wkg15 || 'NULL'}`);
    console.log(`   Power 1m (W/kg): ${dbRider.power_wkg60 || 'NULL'}`);
    console.log(`   Power 5m (W/kg): ${dbRider.power_wkg300 || 'NULL'}`);
    console.log(`   Last Synced: ${dbRider.last_synced || 'NULL'}`);
  } else {
    console.log('   ❌ NOT FOUND in database');
  }
  
  // 2. API data
  console.log('\n🌐 ZWIFT RACING API:');
  try {
    const response = await zwiftApi.get(`/api/riders/${riderId}`);
    const api = response.data;
    
    console.log(`   Name: ${api.name || 'NULL'}`);
    console.log(`   Weight: ${api.weight || 'NULL'}kg`);
    console.log(`   Height: ${api.height || 'NULL'}cm`);
    console.log(`   FTP: ${api.zpFTP || 'NULL'}`);
    console.log(`   vELO: ${api.race?.current?.rating || api.race?.last?.rating || 'NULL'}`);
    console.log(`   Power 5s (W/kg): ${api.power?.wkg5 || 'NULL'}`);
    console.log(`   Power 15s (W/kg): ${api.power?.wkg15 || 'NULL'}`);
    console.log(`   Power 1m (W/kg): ${api.power?.wkg60 || 'NULL'}`);
    console.log(`   Power 5m (W/kg): ${api.power?.wkg300 || 'NULL'}`);
    
    // 3. Comparison
    if (dbRider) {
      console.log('\n📊 COMPARISON:');
      
      const checks = [
        { field: 'Weight', db: dbRider.weight_kg, api: api.weight },
        { field: 'Height', db: dbRider.height_cm, api: api.height },
        { field: 'FTP', db: dbRider.ftp, api: api.zpFTP },
        { field: 'vELO', db: dbRider.velo_rating, api: api.race?.current?.rating || api.race?.last?.rating },
        { field: 'Power 5s', db: dbRider.power_wkg5, api: api.power?.wkg5 },
        { field: 'Power 15s', db: dbRider.power_wkg15, api: api.power?.wkg15 },
        { field: 'Power 1m', db: dbRider.power_wkg60, api: api.power?.wkg60 },
        { field: 'Power 5m', db: dbRider.power_wkg300, api: api.power?.wkg300 },
      ];
      
      let matches = 0;
      let mismatches = 0;
      let dbMissing = 0;
      
      checks.forEach(check => {
        const match = check.db === check.api || (check.db === null && check.api === null) || (check.db === undefined && check.api === undefined);
        const dbHas = check.db !== null && check.db !== undefined;
        const apiHas = check.api !== null && check.api !== undefined;
        
        let status = '';
        if (!dbHas && !apiHas) {
          status = '⚪ Both NULL';
          matches++;
        } else if (!dbHas && apiHas) {
          status = `❌ DB missing (API has: ${check.api})`;
          dbMissing++;
        } else if (dbHas && !apiHas) {
          status = '⚠️  API missing';
          mismatches++;
        } else if (match) {
          status = '✅ Match';
          matches++;
        } else {
          status = `❌ Mismatch (DB: ${check.db}, API: ${check.api})`;
          mismatches++;
        }
        
        console.log(`   ${check.field}: ${status}`);
      });
      
      console.log(`\n   Summary: ${matches} matches, ${mismatches} mismatches, ${dbMissing} missing in DB`);
      
      if (mismatches > 0 || dbMissing > 0) {
        console.log('   ⚠️  DATA IS OUTDATED - needs sync!');
      } else {
        console.log('   ✅ Data is up-to-date!');
      }
      
      // Time since last sync
      if (dbRider.last_synced) {
        const lastSync = new Date(dbRider.last_synced);
        const now = new Date();
        const minAgo = Math.floor((now.getTime() - lastSync.getTime()) / 1000 / 60);
        console.log(`   ⏰ Last synced ${minAgo} minutes ago`);
      }
    }
    
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.log('   ⚠️  Rate limit - try again later');
    } else if (error.response?.status === 404) {
      console.log('   ❌ Rider not found in API');
    } else {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🔍 Checking Rider Data Freshness');
  console.log('Comparing database vs ZwiftRacing API\n');
  
  // Get some sample riders from my_team_members
  const { data: sampleRiders } = await supabase
    .from('my_team_members')
    .select('rider_id')
    .limit(5);
  
  if (!sampleRiders || sampleRiders.length === 0) {
    console.log('❌ No riders in my_team_members');
    return;
  }
  
  // Get rider names
  const { data: riders } = await supabase
    .from('riders')
    .select('rider_id, name')
    .in('rider_id', sampleRiders.map(r => r.rider_id));
  
  console.log(`Testing ${riders?.length || 0} sample riders from your team:\n`);
  
  // Check each rider
  for (const rider of riders || []) {
    await checkRider(rider.rider_id, rider.name);
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Check last sync log
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 LAST SYNC LOG');
  console.log('='.repeat(70));
  
  const { data: lastSync } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('endpoint', 'RIDER_SYNC')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (lastSync) {
    const syncTime = new Date(lastSync.created_at);
    const now = new Date();
    const minAgo = Math.floor((now.getTime() - syncTime.getTime()) / 1000 / 60);
    
    console.log(`\n   Last Rider Sync: ${syncTime.toISOString()}`);
    console.log(`   Time Ago: ${minAgo} minutes ago`);
    console.log(`   Status: ${lastSync.status}`);
    console.log(`   Records: ${lastSync.records_processed}`);
    console.log(`   Message: ${lastSync.error_message || 'Success'}`);
    
    if (minAgo > 60) {
      console.log(`\n   ⚠️  Last sync was ${minAgo} minutes ago (should be < 60 min)`);
      console.log('   💡 Check if cron scheduler is running!');
    } else {
      console.log('\n   ✅ Sync is running on schedule (< 60 min ago)');
    }
  } else {
    console.log('\n   ❌ No sync logs found');
    console.log('   💡 Rider sync may not have run yet');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 RECOMMENDATION');
  console.log('='.repeat(70));
  console.log('\nIf data is outdated, trigger manual sync:');
  console.log('   POST http://localhost:3000/api/sync/riders');
  console.log('\nOr check if server is running with cron scheduler enabled.');
}

main().catch(console.error);
