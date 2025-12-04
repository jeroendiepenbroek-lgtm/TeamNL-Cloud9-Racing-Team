import 'dotenv/config';
import { supabase } from './src/services/supabase.service.js';

const RIDER_ID = 150437;

async function testBasisFunctionaliteit() {
  console.log('🧪 TEST BASIS FUNCTIONALITEIT\n');
  console.log('═'.repeat(70));
  console.log('POC Rider: 150437 (JRøne CloudRacer-9 - Admin)\n');

  let allGood = true;

  // ============================================================================
  // TEST 1: Results ophalen voor rider 150437
  // ============================================================================
  console.log('\n1️⃣  TEST: Results ophalen voor RiderID ' + RIDER_ID);
  console.log('─'.repeat(70));
  
  const { data: results, error: resultsError } = await supabase.client
    .from('zwift_api_race_results')
    .select('event_id, event_name, event_date, rank, time_seconds, avg_wkg, position_in_category, velo_rating')
    .eq('rider_id', RIDER_ID)
    .order('event_date', { ascending: false });

  if (resultsError) {
    console.log('❌ FOUT:', resultsError.message);
    allGood = false;
  } else {
    console.log(`✅ SUCCESS: ${results?.length || 0} race results gevonden\n`);
    
    if (results && results.length > 0) {
      // Toon recente results
      console.log('📅 Laatste 5 races:');
      results.slice(0, 5).forEach((r: any, i: number) => {
        const date = r.event_date ? new Date(r.event_date).toLocaleDateString('nl-NL') : 'Onbekend';
        const time = r.time_seconds ? `${Math.floor(r.time_seconds / 60)}:${String(r.time_seconds % 60).padStart(2, '0')}` : 'DNF';
        const name = r.event_name || `Event ${r.event_id}`;
        console.log(`   ${i + 1}. ${name.substring(0, 50)}`);
        console.log(`      ${date} | Pos: ${r.position_in_category || r.rank || '?'} | ${time} | ${r.avg_wkg || '?'} w/kg | Rating: ${r.velo_rating || '?'}`);
      });
      
      console.log(`\n   📊 Totaal: ${results.length} races`);
      console.log(`   📅 Range: ${new Date(results[results.length - 1].event_date || '').toLocaleDateString('nl-NL')} - ${new Date(results[0].event_date || '').toLocaleDateString('nl-NL')}`);
    } else {
      console.log('⚠️  Geen results gevonden!');
      allGood = false;
    }
  }

  // ============================================================================
  // TEST 2: Sign-ups ophalen voor rider 150437
  // ============================================================================
  console.log('\n\n2️⃣  TEST: Sign-ups ophalen voor RiderID ' + RIDER_ID);
  console.log('─'.repeat(70));
  
  const { data: signups, error: signupsError } = await supabase.client
    .from('event_signups')
    .select('event_id, signed_up_at, category')
    .eq('rider_id', RIDER_ID)
    .order('signed_up_at', { ascending: false });

  if (signupsError) {
    console.log('❌ FOUT:', signupsError.message);
    
    if (signupsError.message.includes('does not exist')) {
      console.log('\n⚠️  PROBLEEM: Tabel event_signups bestaat NIET in database!');
      console.log('\n💡 OPLOSSINGEN:');
      console.log('   a) Maak tabel aan:');
      console.log('      ```sql');
      console.log('      CREATE TABLE event_signups (');
      console.log('        id SERIAL PRIMARY KEY,');
      console.log('        event_id TEXT NOT NULL,');
      console.log('        rider_id INTEGER NOT NULL,');
      console.log('        signed_up_at TIMESTAMPTZ DEFAULT NOW(),');
      console.log('        category TEXT,');
      console.log('        UNIQUE(event_id, rider_id)');
      console.log('      );');
      console.log('      ```');
      console.log('   b) Of gebruik alternatieve bron (Zwift Companion, handmatig)');
      console.log('   c) Of track signups via andere tabel (bijv. rider_events)');
    }
    allGood = false;
  } else {
    console.log(`✅ SUCCESS: ${signups?.length || 0} sign-ups gevonden\n`);
    
    if (signups && signups.length > 0) {
      console.log('📝 Recente sign-ups:');
      signups.slice(0, 10).forEach((s: any, i: number) => {
        const date = new Date(s.signed_up_at).toLocaleDateString('nl-NL');
        console.log(`   ${i + 1}. Event ${s.event_id} | ${s.category || 'N/A'} | Signed up: ${date}`);
      });
    } else {
      console.log('⚠️  Geen sign-ups gevonden (tabel bestaat maar is leeg voor deze rider)');
    }
  }

  // ============================================================================
  // TEST 3: Toekomstige events ophalen (ZONDER eigen rider ingeschreven)
  // ============================================================================
  console.log('\n\n3️⃣  TEST: Toekomstige events (ZONDER rider ' + RIDER_ID + ' ingeschreven)');
  console.log('─'.repeat(70));
  
  const now = Math.floor(Date.now() / 1000); // Unix timestamp
  
  const { data: futureEvents, error: eventsError } = await supabase.client
    .from('zwift_api_events')
    .select('event_id, title, time_unix, event_type, sub_type, organizer, route_name')
    .gt('time_unix', now)
    .order('time_unix', { ascending: true })
    .limit(20);

  if (eventsError) {
    console.log('❌ FOUT:', eventsError.message);
    allGood = false;
  } else {
    console.log(`✅ SUCCESS: ${futureEvents?.length || 0} toekomstige events gevonden\n`);
    
    if (futureEvents && futureEvents.length > 0) {
      // Filter events waar rider NIET is ingeschreven
      // (als event_signups bestaat)
      let eventsToShow = futureEvents;
      
      if (!signupsError) {
        // We hebben signups data, filter
        const signedUpEventIds = new Set(signups?.map((s: any) => s.event_id) || []);
        eventsToShow = futureEvents.filter((e: any) => !signedUpEventIds.has(e.event_id));
        console.log(`   Filtering: ${futureEvents.length} totaal → ${eventsToShow.length} zonder inschrijving\n`);
      }
      
      console.log('📅 Aankomende events (eerste 10):');
      eventsToShow.slice(0, 10).forEach((e: any, i: number) => {
        const date = new Date(e.time_unix * 1000);
        const dateStr = date.toLocaleDateString('nl-NL');
        const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        console.log(`   ${i + 1}. ${e.title?.substring(0, 50) || 'Unnamed event'}`);
        console.log(`      ${dateStr} ${timeStr} | ${e.event_type} - ${e.sub_type || 'N/A'}`);
        console.log(`      Route: ${e.route_name || 'Unknown'} | Event ID: ${e.event_id}`);
      });
      
      if (eventsToShow.length === 0) {
        console.log('   ℹ️  Alle toekomstige events: rider is al ingeschreven!');
      }
    } else {
      console.log('⚠️  Geen toekomstige events gevonden!');
    }
  }

  // ============================================================================
  // TEST 4: API Endpoint check
  // ============================================================================
  console.log('\n\n4️⃣  TEST: API Endpoints beschikbaar?');
  console.log('─'.repeat(70));
  
  console.log('Checking routes...\n');
  
  const endpoints = [
    { method: 'GET', path: '/api/results/rider/:riderId', description: 'Results voor rider' },
    { method: 'GET', path: '/api/riders/team', description: 'Team riders' },
    { method: 'GET', path: '/api/events', description: 'Events lijst' },
    { method: 'POST', path: '/api/signups/:eventId', description: 'Inschrijven voor event' },
  ];
  
  endpoints.forEach(ep => {
    console.log(`   ${ep.method.padEnd(6)} ${ep.path.padEnd(35)} → ${ep.description}`);
  });
  
  console.log('\n   ℹ️  Test endpoints met:');
  console.log('      curl http://localhost:3000/api/results/rider/150437?days=90');
  console.log('      curl http://localhost:3000/api/riders/team');
  console.log('      curl http://localhost:3000/api/events?future=true');

  // ============================================================================
  // CONCLUSIE
  // ============================================================================
  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 CONCLUSIE');
  console.log('═'.repeat(70));
  
  const checks = [
    { name: 'Results ophalen', status: !resultsError && results && results.length > 0 },
    { name: 'Sign-ups ophalen', status: !signupsError && signups !== null },
    { name: 'Toekomstige events', status: !eventsError && futureEvents && futureEvents.length > 0 },
  ];
  
  console.log('\n✅ Werkende functionaliteit:');
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`   ${icon} ${check.name}`);
  });
  
  if (!signupsError || signupsError.message.includes('does not exist')) {
    console.log('\n⚠️  KRITIEK:');
    console.log('   - event_signups tabel bestaat NIET');
    console.log('   - Sign-ups functionaliteit werkt NIET zonder deze tabel');
    console.log('   - Dashboard "Events waarvoor ik sta ingeschreven" zal leeg zijn');
  }
  
  console.log('\n💡 AANBEVELING:');
  if (!signupsError || signupsError.message.includes('does not exist')) {
    console.log('   1. URGENT: Maak event_signups tabel aan (zie SQL hierboven)');
    console.log('   2. Voeg signup endpoint toe: POST /api/events/:eventId/signup');
    console.log('   3. Test inschrijven voor toekomstig event');
    console.log('   4. Verifieer filtering werkt (events zonder inschrijving tonen)');
  } else {
    console.log('   1. Test API endpoints met curl');
    console.log('   2. Test frontend integratie');
    console.log('   3. Verifieer filtering logic (signed up vs available events)');
  }
  
  const overallStatus = checks.every(c => c.status);
  console.log('\n' + (overallStatus ? '✅ BASIS FUNCTIONALITEIT: VOLLEDIG WERKEND' : '⚠️  BASIS FUNCTIONALITEIT: GEDEELTELIJK WERKEND'));
  console.log('═'.repeat(70) + '\n');
  
  return overallStatus;
}

testBasisFunctionaliteit().catch(console.error);
