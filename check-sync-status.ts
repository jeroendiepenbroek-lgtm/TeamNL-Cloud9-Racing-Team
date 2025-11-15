/**
 * Check sync status en laatste sync timestamps
 */

import { supabase } from './backend/src/services/supabase.service.js';

async function checkSyncStatus() {
  try {
    console.log('🔍 Checking sync status...\n');
    
    // 1. Check sync logs
    console.log('📊 SYNC LOGS (laatste 10):');
    console.log('='.repeat(80));
    const logs = await supabase.getSyncLogs(10);
    
    if (logs.length === 0) {
      console.log('❌ Geen sync logs gevonden');
    } else {
      logs.forEach(log => {
        const status = log.status === 'success' ? '✅' : log.status === 'error' ? '❌' : '⚠️';
        console.log(`${status} ${log.created_at} | ${log.endpoint}`);
        console.log(`   Records: ${log.records_processed} | Status: ${log.status}`);
        if (log.error_message) {
          console.log(`   Error: ${log.error_message}`);
        }
      });
    }
    
    // 2. Check laatste sync timestamps in riders tabel
    console.log('\n\n📅 RIDERS TABLE - Last Synced:');
    console.log('='.repeat(80));
    
    const riders = await supabase.getRiders();
    
    if (riders.length === 0) {
      console.log('❌ Geen riders in database');
    } else {
      // Group by last_synced timestamp
      const bySync = new Map<string, number>();
      const noSync: any[] = [];
      
      riders.forEach(r => {
        if (r.last_synced) {
          const date = r.last_synced.split('T')[0]; // Extract date part
          bySync.set(date, (bySync.get(date) || 0) + 1);
        } else {
          noSync.push(r);
        }
      });
      
      console.log(`Total riders: ${riders.length}`);
      console.log(`\nSyncs by date:`);
      const sortedDates = Array.from(bySync.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      sortedDates.forEach(([date, count]) => {
        console.log(`  ${date}: ${count} riders`);
      });
      
      if (noSync.length > 0) {
        console.log(`\n⚠️  ${noSync.length} riders never synced`);
      }
      
      // Show some recent syncs
      const recentSyncs = riders
        .filter(r => r.last_synced)
        .sort((a, b) => (b.last_synced || '').localeCompare(a.last_synced || ''))
        .slice(0, 5);
      
      console.log(`\n🕐 Most recent syncs:`);
      recentSyncs.forEach(r => {
        console.log(`  ${r.last_synced} - ${r.name} (rider_id: ${r.rider_id})`);
      });
    }
    
    // 3. Check environment config
    console.log('\n\n⚙️  ENVIRONMENT CONFIG:');
    console.log('='.repeat(80));
    console.log(`ENABLE_AUTO_SYNC: ${process.env.ENABLE_AUTO_SYNC || 'not set'}`);
    console.log(`SYNC_INTERVAL_HOURS: ${process.env.SYNC_INTERVAL_HOURS || 'not set'}`);
    console.log(`SYNC_INTERVAL_MINUTES: ${process.env.SYNC_INTERVAL_MINUTES || 'not set'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    
    // 4. Check my_team_members
    console.log('\n\n👥 MY TEAM MEMBERS:');
    console.log('='.repeat(80));
    const teamMembers = await supabase.getMyTeamMembers();
    console.log(`Total team members: ${teamMembers.length}`);
    
    if (teamMembers.length > 0) {
      console.log('\nTeam riders:');
      teamMembers.slice(0, 10).forEach((m: any) => {
        console.log(`  - ${m.name || 'Unknown'} (rider_id: ${m.rider_id})`);
      });
      
      if (teamMembers.length > 10) {
        console.log(`  ... and ${teamMembers.length - 10} more`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkSyncStatus();
