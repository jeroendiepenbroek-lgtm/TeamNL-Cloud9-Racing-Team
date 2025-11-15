/**
 * Test en activeer ZwiftRacing API sync met error checking
 */

import { zwiftClient } from './backend/src/api/zwift-client.js';
import { supabase } from './backend/src/services/supabase.service.js';
import { syncService } from './backend/src/services/sync.service.js';

const TEAM_CLUB_ID = 11818;

async function testAndActivateSync() {
  console.log('🧪 Testing ZwiftRacing API Sync\n');
  console.log('='.repeat(80));
  
  try {
    // 1. TEST: Check API connectivity
    console.log('\n1️⃣ TEST: API Connectivity');
    console.log('-'.repeat(80));
    
    try {
      const testRider = await zwiftClient.getRider(150437);
      console.log('✅ API accessible');
      console.log(`   Test rider: ${testRider.name} (${testRider.riderId})`);
    } catch (error: any) {
      console.error('❌ API connection failed:', error.message);
      throw new Error('Cannot proceed - API not accessible');
    }
    
    // 2. TEST: Check database connectivity
    console.log('\n2️⃣ TEST: Database Connectivity');
    console.log('-'.repeat(80));
    
    try {
      const teamMembers = await supabase.getMyTeamMembers();
      console.log('✅ Database accessible');
      console.log(`   Team members count: ${teamMembers.length}`);
      
      if (teamMembers.length === 0) {
        console.warn('⚠️  No team members found - sync will not update any data');
      }
    } catch (error: any) {
      console.error('❌ Database connection failed:', error.message);
      throw new Error('Cannot proceed - Database not accessible');
    }
    
    // 3. TEST: Check recent sync history
    console.log('\n3️⃣ CHECK: Recent Sync History');
    console.log('-'.repeat(80));
    
    try {
      const logs = await supabase.getSyncLogs(5);
      
      if (logs.length === 0) {
        console.log('ℹ️  No previous sync logs found');
      } else {
        console.log(`Found ${logs.length} recent sync logs:`);
        logs.forEach(log => {
          const icon = log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⚠️';
          console.log(`  ${icon} ${log.created_at} - ${log.endpoint} (${log.records_processed} records)`);
        });
        
        const lastLog = logs[0];
        const timeSinceLastSync = new Date().getTime() - new Date(lastLog.created_at).getTime();
        const hoursSince = Math.floor(timeSinceLastSync / (1000 * 60 * 60));
        const daysSince = Math.floor(hoursSince / 24);
        
        if (daysSince > 0) {
          console.log(`\n⏰ Last sync: ${daysSince} days and ${hoursSince % 24} hours ago`);
        } else {
          console.log(`\n⏰ Last sync: ${hoursSince} hours ago`);
        }
      }
    } catch (error: any) {
      console.warn('⚠️  Could not fetch sync logs:', error.message);
    }
    
    // 4. TEST: Check rider data freshness
    console.log('\n4️⃣ CHECK: Rider Data Freshness');
    console.log('-'.repeat(80));
    
    const riders = await supabase.getRiders();
    const now = new Date();
    
    const syncCounts = {
      fresh: 0,      // < 24h
      recent: 0,     // 24h - 7d
      stale: 0,      // 7d - 30d
      veryStale: 0,  // > 30d
      never: 0,      // NULL
    };
    
    riders.forEach(r => {
      if (!r.last_synced) {
        syncCounts.never++;
      } else {
        const syncDate = new Date(r.last_synced);
        const daysSince = (now.getTime() - syncDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSince < 1) syncCounts.fresh++;
        else if (daysSince < 7) syncCounts.recent++;
        else if (daysSince < 30) syncCounts.stale++;
        else syncCounts.veryStale++;
      }
    });
    
    console.log(`Total riders: ${riders.length}`);
    console.log(`  ✅ Fresh (< 24h):     ${syncCounts.fresh}`);
    console.log(`  🟡 Recent (1-7d):     ${syncCounts.recent}`);
    console.log(`  🟠 Stale (7-30d):     ${syncCounts.stale}`);
    console.log(`  🔴 Very stale (> 30d): ${syncCounts.veryStale}`);
    console.log(`  ⚪ Never synced:      ${syncCounts.never}`);
    
    const needsSync = syncCounts.recent + syncCounts.stale + syncCounts.veryStale + syncCounts.never;
    if (needsSync > 0) {
      console.log(`\n⚠️  ${needsSync} riders need sync!`);
    }
    
    // 5. PERFORM SYNC
    console.log('\n\n5️⃣ PERFORMING SYNC');
    console.log('='.repeat(80));
    console.log('Starting rider sync...\n');
    
    const startTime = Date.now();
    
    try {
      const syncedRiders = await syncService.syncRiders(TEAM_CLUB_ID);
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n✅ SYNC SUCCESSFUL!');
      console.log('-'.repeat(80));
      console.log(`Duration: ${duration}s`);
      console.log(`Riders synced: ${syncedRiders.length}`);
      
      // Show sample of synced riders
      console.log('\nSample of synced riders:');
      syncedRiders.slice(0, 5).forEach((r: any) => {
        console.log(`  - ${r.name} (${r.rider_id})`);
        console.log(`    zp_ftp: ${r.zp_ftp || 'N/A'}, w1200: ${r.power_w1200 || 'N/A'}, rating: ${r.race_last_rating || 'N/A'}`);
      });
      
      if (syncedRiders.length > 5) {
        console.log(`  ... and ${syncedRiders.length - 5} more`);
      }
      
      // Check rider 1175748 specifically
      const jos = syncedRiders.find((r: any) => r.rider_id === 1175748);
      if (jos) {
        console.log('\n🎯 Rider 1175748 (Jos Castelijns) synced:');
        console.log(`   zp_ftp: ${jos.zp_ftp}`);
        console.log(`   power_w1200: ${jos.power_w1200}`);
        console.log(`   power_cp: ${jos.power_cp}`);
        console.log(`   weight: ${jos.weight}`);
        
        if (jos.power_w1200 && jos.weight) {
          const estimatedFTP = Math.round(jos.power_w1200 * 0.95);
          console.log(`   💡 Estimated FTP: ${estimatedFTP} watts (${(estimatedFTP / jos.weight).toFixed(2)} w/kg)`);
        }
      }
      
    } catch (syncError: any) {
      console.error('\n❌ SYNC FAILED!');
      console.error('-'.repeat(80));
      console.error(`Error: ${syncError.message}`);
      console.error(`Stack: ${syncError.stack}`);
      
      // Check if partial sync happened
      const afterRiders = await supabase.getRiders();
      console.log(`\nRiders in DB after failed sync: ${afterRiders.length}`);
      
      throw syncError;
    }
    
    // 6. VERIFY SYNC
    console.log('\n\n6️⃣ VERIFY SYNC RESULTS');
    console.log('='.repeat(80));
    
    const afterRiders = await supabase.getRiders();
    const freshRiders = afterRiders.filter(r => {
      if (!r.last_synced) return false;
      const syncDate = new Date(r.last_synced);
      const minsSince = (now.getTime() - syncDate.getTime()) / (1000 * 60);
      return minsSince < 5; // Synced in last 5 minutes
    });
    
    console.log(`✅ ${freshRiders.length} riders have fresh data (< 5 min old)`);
    
    // 7. FINAL RECOMMENDATION
    console.log('\n\n7️⃣ ACTIVATION RECOMMENDATION');
    console.log('='.repeat(80));
    
    if (freshRiders.length > 0) {
      console.log('✅ Sync is working correctly!');
      console.log('\n📋 To enable automatic sync:');
      console.log('\nOption 1: Update .env file:');
      console.log('   ENABLE_AUTO_SYNC=true');
      console.log('   SYNC_INTERVAL_HOURS=6  # Sync every 6 hours');
      console.log('   SCHEDULER_ENABLED=true');
      console.log('\nOption 2: Use API (runtime):');
      console.log('   curl -X PUT http://localhost:3000/api/sync-config \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"riderSyncEnabled": true, "riderSyncIntervalMinutes": 360}\'');
      console.log('\nThen restart the server to apply changes.');
    } else {
      console.log('⚠️  Sync completed but no fresh data found - investigate further');
    }
    
  } catch (error: any) {
    console.error('\n\n❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error(error.message);
    console.error('\nCannot activate sync - fix errors above first');
    process.exit(1);
  }
}

testAndActivateSync();
