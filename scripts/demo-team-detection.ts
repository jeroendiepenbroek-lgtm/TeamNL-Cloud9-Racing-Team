/**
 * Demo: Team Rider Detection in Events
 * 
 * Dit script demonstreert de team rider detectie functionaliteit
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

async function demo() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Demo: Team Rider Detection in Events                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 1. Haal team riders op
  console.log('📊 Step 1: Team riders ophalen...');
  const ridersResponse = await axios.get(`${API_BASE}/api/riders`);
  const teamRiders = ridersResponse.data.riders || [];
  console.log(`✅ Team heeft ${teamRiders.length} riders\n`);
  
  if (teamRiders.length > 0) {
    console.log('   Voorbeelden:');
    teamRiders.slice(0, 5).forEach((r: any) => {
      console.log(`   - ${r.name} (ID: ${r.rider_id})`);
    });
    console.log('');
  }

  // 2. Haal upcoming events op
  console.log('📊 Step 2: Upcoming events ophalen (48h)...');
  const eventsResponse = await axios.get(`${API_BASE}/api/events/upcoming?hours=48`);
  const events = eventsResponse.data.events || [];
  console.log(`✅ ${events.length} events gevonden\n`);

  // 3. Filter events met signups
  const eventsWithSignups = events.filter((e: any) => e.total_signups > 0);
  console.log(`📊 Step 3: Events met signups analyseren...`);
  console.log(`✅ ${eventsWithSignups.length} events hebben signups\n`);

  if (eventsWithSignups.length > 0) {
    console.log('┌────────────────────────────────────────────────────────────┐');
    console.log('│ Event                          │ Signups │ Team Riders    │');
    console.log('├────────────────────────────────────────────────────────────┤');
    
    eventsWithSignups.slice(0, 10).forEach((event: any) => {
      const title = event.title.substring(0, 30).padEnd(30);
      const signups = String(event.total_signups).padStart(7);
      const teamCount = String(event.team_rider_count).padStart(4);
      const indicator = event.team_rider_count > 0 ? ' ⭐' : '   ';
      
      console.log(`│ ${title} │ ${signups} │ ${teamCount}${indicator}        │`);
    });
    
    console.log('└────────────────────────────────────────────────────────────┘\n');
  }

  // 4. Zoek events met team riders
  const teamEvents = events.filter((e: any) => e.team_rider_count > 0);
  console.log(`📊 Step 4: Events met team riders...`);
  
  if (teamEvents.length > 0) {
    console.log(`✅ ${teamEvents.length} events hebben team riders!\n`);
    
    teamEvents.forEach((event: any) => {
      console.log(`🏁 ${event.title}`);
      console.log(`   Event ID: ${event.event_id}`);
      console.log(`   Total signups: ${event.total_signups}`);
      console.log(`   Team riders: ${event.team_rider_count}`);
      console.log('   Riders:');
      
      event.team_riders.forEach((rider: any) => {
        console.log(`   - ${rider.rider_name} (Pen ${rider.pen_name})`);
      });
      console.log('');
    });
  } else {
    console.log(`⚠️  Geen team riders gevonden in aankomende events`);
    console.log(`   Dit kan betekenen dat:`);
    console.log(`   1. Signups nog niet zijn gesynchroniseerd`);
    console.log(`   2. Team riders nog niet zijn ingeschreven voor events`);
    console.log(`   3. Er zijn geen aankomende events in de volgende 48h\n`);
  }

  // 5. Test hasTeamRiders filter
  console.log('📊 Step 5: Test hasTeamRiders filter...');
  const filteredResponse = await axios.get(`${API_BASE}/api/events/upcoming?hours=48&hasTeamRiders=true`);
  const filteredEvents = filteredResponse.data.events || [];
  console.log(`✅ ${filteredEvents.length} events met team riders filter\n`);

  // Summary
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Summary                                                 ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Team riders in database:     ${String(teamRiders.length).padStart(4)}                       ║`);
  console.log(`║  Upcoming events (48h):       ${String(events.length).padStart(4)}                       ║`);
  console.log(`║  Events with signups:         ${String(eventsWithSignups.length).padStart(4)}                       ║`);
  console.log(`║  Events with team riders:     ${String(teamEvents.length).padStart(4)}                       ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

demo().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
