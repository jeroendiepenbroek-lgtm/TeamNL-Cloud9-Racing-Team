import 'dotenv/config';
import { supabase } from './src/services/supabase.service.js';
import { zwiftClient } from './src/api/zwift-client.js';

const RIDER_ID = 150437;

async function checkRider150437() {
  console.log('🔍 COMPLETE CHECK: Rider 150437 (JRøne CloudRacer-9)\n');
  console.log('═'.repeat(60));

  // 1. DATABASE: Race Results
  console.log('\n1️⃣  DATABASE: Race Results');
  console.log('─'.repeat(60));
  
  const { data: dbResults, error: dbError } = await supabase.client
    .from('zwift_api_race_results')
    .select('event_id, event_name, event_date, rank, time_seconds, avg_wkg, total_riders')
    .eq('rider_id', RIDER_ID)
    .order('event_date', { ascending: false });

  if (dbError) {
    console.log('❌ Error:', dbError.message);
  } else {
    console.log(`✅ Found ${dbResults?.length || 0} results in database\n`);
    
    if (dbResults && dbResults.length > 0) {
      console.log('📅 Most recent results:');
      dbResults.slice(0, 5).forEach((r: any, i: number) => {
        const date = new Date(r.event_date).toLocaleDateString('nl-NL');
        const time = r.time_seconds ? `${Math.floor(r.time_seconds / 60)}:${String(r.time_seconds % 60).padStart(2, '0')}` : 'N/A';
        console.log(`   ${i + 1}. ${r.event_name?.substring(0, 50)}...`);
        console.log(`      ${date} | Rank ${r.rank}/${r.total_riders || '?'} | ${r.avg_wkg || '?'} w/kg | ${time}`);
        console.log(`      Event ID: ${r.event_id}`);
      });
      
      const oldest = dbResults[dbResults.length - 1];
      const newest = dbResults[0];
      console.log(`\n   📊 Range: ${new Date(oldest.event_date).toLocaleDateString('nl-NL')} - ${new Date(newest.event_date).toLocaleDateString('nl-NL')}`);
    }
  }

  // 2. DATABASE: Event Signups
  console.log('\n\n2️⃣  DATABASE: Event Signups');
  console.log('─'.repeat(60));
  
  const { data: signups, error: signupsError } = await supabase.client
    .from('event_signups')
    .select('event_id, signed_up_at, category')
    .eq('rider_id', RIDER_ID)
    .order('signed_up_at', { ascending: false });

  if (signupsError) {
    console.log('❌ Error:', signupsError.message);
    if (signupsError.message.includes('does not exist')) {
      console.log('⚠️  Table event_signups does NOT exist in database');
    }
  } else {
    console.log(`✅ Found ${signups?.length || 0} signups in database\n`);
    
    if (signups && signups.length > 0) {
      console.log('📝 Recent signups:');
      signups.slice(0, 10).forEach((s: any, i: number) => {
        const date = new Date(s.signed_up_at).toLocaleDateString('nl-NL');
        console.log(`   ${i + 1}. Event ${s.event_id} | ${s.category || 'N/A'} | ${date}`);
      });
    } else {
      console.log('   ℹ️  No signups found (table exists but empty for this rider)');
    }
  }

  // 3. API: Fresh Rider Data
  console.log('\n\n3️⃣  API: Fresh Rider Profile');
  console.log('─'.repeat(60));
  
  try {
    const rider = await zwiftClient.getRider(RIDER_ID);
    console.log('✅ Rider profile fetched from ZwiftRacing.app\n');
    console.log(`   Name: ${rider.name}`);
    console.log(`   Club: ${rider.club?.name || 'N/A'}`);
    console.log(`   Country: ${rider.country}`);
    console.log(`   Age: ${rider.age || 'N/A'}`);
    console.log(`   Weight: ${rider.weight} kg`);
    
    if (rider.race) {
      console.log(`\n   🏁 Race Stats:`);
      console.log(`   - Total finishes: ${rider.race.finishes || 0}`);
      console.log(`   - Wins: ${rider.race.wins || 0}`);
      
      if (rider.race.last) {
        const lastRaceDate = new Date(rider.race.last.date * 1000);
        console.log(`   - Last race: ${lastRaceDate.toLocaleDateString('nl-NL')} ${lastRaceDate.toLocaleTimeString('nl-NL')}`);
        console.log(`   - Rating: ${rider.race.last.rating?.toFixed(2) || 'N/A'}`);
      }
      
      if (rider.race.current) {
        console.log(`   - Current rating: ${rider.race.current.rating?.toFixed(2) || 'N/A'}`);
        console.log(`   - Category: ${rider.race.current.category || 'N/A'}`);
      }
    }
    
    console.log('\n   ⚠️  Note: Rider endpoint does NOT have history field!');
    console.log('   ℹ️  To get race results, must call getEventResults(eventId) per event');
    
  } catch (error: any) {
    console.log('❌ Error fetching rider:', error.message);
  }

  // 4. Check Team Membership
  console.log('\n\n4️⃣  TEAM: Membership Status');
  console.log('─'.repeat(60));
  
  const { data: teamMember, error: teamError } = await supabase.client
    .from('my_team_members')
    .select('*')
    .eq('rider_id', RIDER_ID)
    .single();

  if (teamError) {
    if (teamError.code === 'PGRST116') {
      console.log('❌ Rider 150437 is NOT in my_team_members!');
    } else {
      console.log('❌ Error:', teamError.message);
    }
  } else {
    console.log('✅ Rider IS in my_team_members\n');
    console.log(`   Nickname: ${teamMember.nickname || 'N/A'}`);
    console.log(`   Favorite: ${teamMember.is_favorite ? '⭐' : 'No'}`);
    console.log(`   Added: ${new Date(teamMember.added_at).toLocaleDateString('nl-NL')}`);
    console.log(`   Notes: ${teamMember.notes || 'None'}`);
  }

  // 5. Check Unified Rider
  console.log('\n\n5️⃣  UNIFIED: Rider Profile');
  console.log('─'.repeat(60));
  
  const { data: unifiedRider, error: unifiedError } = await supabase.client
    .from('riders_unified')
    .select('rider_id, name, velo_rating, category, ftp, weight_kg, last_synced_zwift_racing')
    .eq('rider_id', RIDER_ID)
    .single();

  if (unifiedError) {
    if (unifiedError.code === 'PGRST116') {
      console.log('❌ Rider 150437 NOT in riders_unified table!');
      console.log('   → Need to run: POST /api/riders/sync');
    } else {
      console.log('❌ Error:', unifiedError.message);
    }
  } else {
    console.log('✅ Rider found in riders_unified\n');
    console.log(`   Name: ${unifiedRider.name}`);
    console.log(`   Velo Rating: ${unifiedRider.velo_rating || 'N/A'}`);
    console.log(`   Category: ${unifiedRider.category || 'N/A'}`);
    console.log(`   FTP: ${unifiedRider.ftp || 'N/A'} W`);
    console.log(`   Weight: ${unifiedRider.weight_kg || 'N/A'} kg`);
    console.log(`   Last synced: ${unifiedRider.last_synced_zwift_racing ? new Date(unifiedRider.last_synced_zwift_racing).toLocaleString('nl-NL') : 'Never'}`);
  }

  // Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Database results: ${dbResults?.length || 0} races`);
  console.log(`Database signups: ${signups?.length || 0} events (or table missing)`);
  console.log(`Team member: ${teamMember ? '✅ Yes' : '❌ No'}`);
  console.log(`Unified table: ${unifiedRider ? '✅ Yes' : '❌ No (needs sync)'}`);
  console.log(`API accessible: ✅ Yes`);
  
  console.log('\n💡 NEXT STEPS:');
  if (!unifiedRider) {
    console.log('   1. Run club sync to populate unified: POST /api/riders/sync');
  }
  if (dbResults && dbResults.length < 30) {
    console.log(`   2. Database has ${dbResults.length} results, might need more recent events synced`);
  }
  if (signupsError?.message.includes('does not exist')) {
    console.log('   3. Create event_signups table or check if signups tracked elsewhere');
  }
}

checkRider150437().catch(console.error);
