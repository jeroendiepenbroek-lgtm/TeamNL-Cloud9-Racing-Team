const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkSyncStatus() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Data Sync Status Check                                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Count riders in club
  const { data: clubRiders, error: clubError } = await supabase
    .from('api_zwiftracing_public_clubs_riders')
    .select('rider_id, name')
    .eq('club_id', 11818);

  if (clubError) {
    console.error('❌ Error fetching club riders:', clubError.message);
    return;
  }

  console.log(`📊 Club 11818 heeft ${clubRiders.length} riders\n`);

  // Count Zwift Official profiles
  const { data: profiles, error: profileError } = await supabase
    .from('api_zwift_api_profiles')
    .select('rider_id, first_name, last_name, competition_racing_score, competition_category');

  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError.message);
    return;
  }

  console.log(`📊 Zwift Official profiles: ${profiles.length}\n`);

  // Check which club riders have profiles
  const profileMap = new Map(profiles.map(p => [p.rider_id, p]));
  const withProfiles = [];
  const withoutProfiles = [];
  const withCompetitionMetrics = [];

  for (const rider of clubRiders) {
    const profile = profileMap.get(rider.rider_id);
    if (profile) {
      withProfiles.push(rider);
      if (profile.competition_racing_score) {
        withCompetitionMetrics.push({ ...rider, ...profile });
      }
    } else {
      withoutProfiles.push(rider);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SYNC STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`✅ Riders met Zwift Official profile: ${withProfiles.length}/${clubRiders.length}`);
  console.log(`🏁 Riders met competition_racing_score: ${withCompetitionMetrics.length}/${clubRiders.length}`);
  console.log(`❌ Riders zonder profile: ${withoutProfiles.length}/${clubRiders.length}\n`);

  if (withCompetitionMetrics.length > 0) {
    console.log('🏁 Riders met Racing Score:');
    withCompetitionMetrics.slice(0, 10).forEach(r => {
      console.log(`   ${r.rider_id} | ${r.first_name} ${r.last_name} | Score: ${r.competition_racing_score} | Cat: ${r.competition_category}`);
    });
    if (withCompetitionMetrics.length > 10) {
      console.log(`   ... en ${withCompetitionMetrics.length - 10} meer\n`);
    }
  }

  // Test v_rider_complete view
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('VIEW TEST: v_rider_complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: viewData, error: viewError } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, zwiftracing_score, zwift_official_racing_score, zwift_official_category, data_completeness')
    .limit(10);

  if (viewError) {
    console.error('❌ View error:', viewError.message);
  } else {
    console.log('Sample data from v_rider_complete:\n');
    viewData.forEach(r => {
      console.log(`${r.rider_id} | ${r.full_name}`);
      console.log(`   ZwiftRacing Score: ${r.zwiftracing_score || 'N/A'}`);
      console.log(`   Zwift Official Score: ${r.zwift_official_racing_score || 'N/A'} (${r.zwift_official_category || 'N/A'})`);
      console.log(`   Completeness: ${r.data_completeness}\n`);
    });
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log('💡 Next Steps:');
  console.log('   • Run bulk sync to fetch all Zwift Official profiles');
  console.log('   • Focus on riders with ZwiftRacing data for complete view');
  console.log('════════════════════════════════════════════════════════════');
}

checkSyncStatus();
