/**
 * Cleanup Orphaned Riders
 * Verwijdert alle riders die NIET in my_team_members staan
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('🧹 Cleanup Orphaned Riders\n');
  
  // STAP 1: Check huidige situatie
  console.log('📊 STAP 1: Checking current situation...\n');
  
  const { count: teamCount } = await supabase
    .from('my_team_members')
    .select('*', { count: 'exact', head: true });
  
  const { count: ridersCount } = await supabase
    .from('riders')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   my_team_members: ${teamCount} riders`);
  console.log(`   riders table:    ${ridersCount} riders`);
  console.log(`   Difference:      ${ridersCount! - teamCount!} orphaned riders\n`);
  
  if (ridersCount === teamCount) {
    console.log('✅ No orphaned riders found! Tables are already in sync.');
    return;
  }
  
  // STAP 2: Toon sample van orphaned riders
  console.log('📋 STAP 2: Sample orphaned riders (first 10)...\n');
  
  const { data: teamIds } = await supabase
    .from('my_team_members')
    .select('rider_id');
  
  const teamRiderIds = teamIds?.map(r => r.rider_id) || [];
  
  const { data: allRiders } = await supabase
    .from('riders')
    .select('rider_id, name, club_name');
  
  const orphanedRiders = allRiders?.filter(r => !teamRiderIds.includes(r.rider_id)) || [];
  
  console.log(`   Found ${orphanedRiders.length} orphaned riders:\n`);
  orphanedRiders.slice(0, 10).forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.name} (ID: ${r.rider_id}) - ${r.club_name || 'No club'}`);
  });
  
  if (orphanedRiders.length > 10) {
    console.log(`   ... and ${orphanedRiders.length - 10} more\n`);
  } else {
    console.log('');
  }
  
  // STAP 3: Confirm deletion
  console.log('⚠️  STAP 3: DELETE CONFIRMATION\n');
  console.log(`   About to DELETE ${orphanedRiders.length} riders from riders table`);
  console.log(`   These riders are NOT in my_team_members\n`);
  
  // Auto-proceed (no user input in script)
  console.log('🗑️  Proceeding with deletion...\n');
  
  // STAP 4: Delete orphaned riders
  const orphanedIds = orphanedRiders.map(r => r.rider_id);
  
  const { error, count: deletedCount } = await supabase
    .from('riders')
    .delete({ count: 'exact' })
    .in('rider_id', orphanedIds);
  
  if (error) {
    console.error('❌ Delete failed:', error);
    throw error;
  }
  
  console.log(`✅ Successfully deleted ${deletedCount} orphaned riders\n`);
  
  // STAP 5: Verificatie
  console.log('🔍 STAP 5: Verification...\n');
  
  const { count: newRidersCount } = await supabase
    .from('riders')
    .select('*', { count: 'exact', head: true });
  
  const { count: newTeamCount } = await supabase
    .from('my_team_members')
    .select('*', { count: 'exact', head: true });
  
  const { count: viewCount } = await supabase
    .from('view_my_team')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   riders table:     ${newRidersCount} riders`);
  console.log(`   my_team_members:  ${newTeamCount} riders`);
  console.log(`   view_my_team:     ${viewCount} riders\n`);
  
  if (newRidersCount === newTeamCount && newTeamCount === viewCount) {
    console.log('✅ SUCCESS! All tables are now in sync!');
    console.log(`   Only your ${newTeamCount} team members remain in riders table.\n`);
  } else {
    console.log('⚠️  Warning: Counts do not match. Check database state.');
  }
  
  // Summary
  console.log('=' .repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));
  console.log(`Before:  ${ridersCount} riders in table`);
  console.log(`Deleted: ${deletedCount} orphaned riders`);
  console.log(`After:   ${newRidersCount} riders in table`);
  console.log(`Team:    ${newTeamCount} riders in my_team_members`);
  console.log('='.repeat(60));
  console.log('\n✅ Cleanup complete! Rider sync will now only update your team members.');
}

main().catch(console.error);
