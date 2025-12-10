const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function cleanupClub11818() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Cleanup Club 11818 Mock Data                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Count data before deletion
  console.log('📊 Counting data before cleanup...\n');

  const { count: ridersCount } = await supabase
    .from('api_zwiftracing_public_clubs_riders')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', 11818);

  const { count: clubCount } = await supabase
    .from('api_zwiftracing_public_clubs')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', 11818);

  console.log(`Found ${ridersCount || 0} riders in club 11818`);
  console.log(`Found ${clubCount || 0} club record(s)\n`);

  if (!ridersCount && !clubCount) {
    console.log('✅ No club 11818 data found. Already clean!\n');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🗑️  DELETING DATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Delete riders (CASCADE will handle this if FK is set up correctly)
  console.log('Deleting riders from api_zwiftracing_public_clubs_riders...');
  const { error: ridersError } = await supabase
    .from('api_zwiftracing_public_clubs_riders')
    .delete()
    .eq('club_id', 11818);

  if (ridersError) {
    console.error('   ❌ Error deleting riders:', ridersError.message);
  } else {
    console.log(`   ✅ Deleted ${ridersCount} riders\n`);
  }

  // Delete club
  console.log('Deleting club from api_zwiftracing_public_clubs...');
  const { error: clubError } = await supabase
    .from('api_zwiftracing_public_clubs')
    .delete()
    .eq('club_id', 11818);

  if (clubError) {
    console.error('   ❌ Error deleting club:', clubError.message);
  } else {
    console.log(`   ✅ Deleted club 11818\n`);
  }

  // Verify deletion
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { count: remainingRiders } = await supabase
    .from('api_zwiftracing_public_clubs_riders')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', 11818);

  const { count: remainingClub } = await supabase
    .from('api_zwiftracing_public_clubs')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', 11818);

  console.log(`Remaining riders in club 11818: ${remainingRiders || 0}`);
  console.log(`Remaining club records: ${remainingClub || 0}\n`);

  if (remainingRiders === 0 && remainingClub === 0) {
    console.log('✅ All club 11818 data successfully removed!\n');
  } else {
    console.log('⚠️  Some data may still remain. Check manually.\n');
  }

  // Check views
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VIEW STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { count: teamRankingsCount } = await supabase
    .from('v_team_rankings')
    .select('*', { count: 'exact', head: true });

  console.log(`v_team_rankings now has: ${teamRankingsCount || 0} riders`);

  const { data: riderComplete } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, data_completeness')
    .limit(5);

  console.log(`\nv_rider_complete sample (${riderComplete?.length || 0} shown):`);
  riderComplete?.forEach(r => {
    console.log(`   ${r.rider_id} | ${r.full_name} | ${r.data_completeness}`);
  });

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('✅ CLEANUP COMPLETE!');
  console.log('════════════════════════════════════════════════════════════');
  console.log('\nClub 11818 was mock data - now removed.');
  console.log('Your database now only contains real data.');
  console.log('\n💡 Note: v_team_rankings view filters on club_id 11818');
  console.log('   Consider updating the WHERE clause to your actual club.');
}

cleanupClub11818().catch(console.error);
