import { supabase } from './src/services/supabase.service.js';

async function checkSyncSystem() {
  console.log('=== SYNC SYSTEM DIAGNOSTIC ===\n');
  
  // 1. Check sync logs
  const logs = await supabase.getSyncLogs(15);
  console.log(`📋 Laatste ${logs.length} sync logs:`);
  logs.forEach(log => {
    const date = new Date(log.created_at);
    const time = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const status = log.status === 'success' ? '✅' : '❌';
    console.log(`  ${status} [${time}] ${log.endpoint.padEnd(20)} - ${log.records_processed || 0} records`);
  });
  
  // 2. Check my_team_members
  const riders = await supabase.getAllTeamRiderIds();
  console.log(`\n👥 MY_TEAM_MEMBERS: ${riders.length} riders`);
  
  // 3. Check riders table
  const allRiders = await supabase.query('SELECT COUNT(*) as count FROM riders');
  console.log(`📊 RIDERS table: ${allRiders[0]?.count || 0} total riders`);
  
  // 4. Check laatste RIDER_SYNC
  const riderSyncs = logs.filter(l => l.endpoint === 'RIDER_SYNC');
  if (riderSyncs.length > 0) {
    const last = riderSyncs[0];
    const timeSince = Date.now() - new Date(last.created_at).getTime();
    const minutesSince = Math.floor(timeSince / 60000);
    console.log(`\n🔄 Laatste RIDER_SYNC:`);
    console.log(`  Status: ${last.status}`);
    console.log(`  Records: ${last.records_processed}`);
    console.log(`  Tijd geleden: ${minutesSince} minuten`);
  } else {
    console.log(`\n⚠️  Geen RIDER_SYNC logs gevonden!`);
  }
  
  // 5. Check oude data in riders
  const oldRiders = await supabase.query(`
    SELECT 
      COUNT(*) as count,
      MAX(updated_at) as latest_update
    FROM riders
    WHERE updated_at < NOW() - INTERVAL '1 day'
  `);
  
  if (oldRiders[0]?.count > 0) {
    console.log(`\n⚠️  OUDE DATA GEVONDEN:`);
    console.log(`  ${oldRiders[0].count} riders niet ge-update in 24+ uur`);
    console.log(`  Laatste update: ${oldRiders[0].latest_update}`);
  } else {
    console.log(`\n✅ Alle riders zijn recent ge-update`);
  }
}

checkSyncSystem().catch(console.error);
