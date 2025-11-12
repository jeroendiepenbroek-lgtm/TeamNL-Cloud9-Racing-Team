/**
 * Test script: Explore ZwiftRacing API endpoints
 * Determine if /api/events is for upcoming or past events
 */

import axios from 'axios';

const API_KEY = '650c6d2fc4ef6858d74cbef1';
const BASE_URL = 'https://zwift-ranking.herokuapp.com';

async function testEventsAPI() {
  console.log('🔍 Testing ZwiftRacing.app /api/events endpoint...\n');
  
  const now = Math.floor(Date.now() / 1000);
  const future = now + (7 * 24 * 3600); // +7 days
  
  console.log(`Current time: ${now} (${new Date(now * 1000).toISOString()})`);
  console.log(`Future time:  ${future} (${new Date(future * 1000).toISOString()})\n`);
  
  // Test 1: No parameters
  console.log('📍 Test 1: GET /api/events (no params)');
  try {
    const response = await axios.get(`${BASE_URL}/api/events`, {
      headers: { Authorization: API_KEY },
      params: { limit: 10 }
    });
    
    const events = response.data.events;
    console.log(`  ✅ Total results: ${response.data.totalResults}`);
    console.log(`  📊 Returned: ${events.length} events`);
    
    if (events.length > 0) {
      const first = events[0];
      const last = events[events.length - 1];
      const firstDate = new Date(first.time * 1000);
      const lastDate = new Date(last.time * 1000);
      
      console.log(`  🕐 First event: ${first.title}`);
      console.log(`     Time: ${firstDate.toISOString()} (${first.time < now ? 'PAST' : 'FUTURE'})`);
      console.log(`  🕐 Last event: ${last.title}`);
      console.log(`     Time: ${lastDate.toISOString()} (${last.time < now ? 'PAST' : 'FUTURE'})`);
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  console.log('\n📍 Test 2: GET /api/events?from={future}&to={future+7days}');
  try {
    const response = await axios.get(`${BASE_URL}/api/events`, {
      headers: { Authorization: API_KEY },
      params: { 
        from: future,
        to: future + (7 * 24 * 3600),
        limit: 10 
      }
    });
    
    const events = response.data.events;
    console.log(`  ✅ Total results: ${response.data.totalResults}`);
    console.log(`  📊 Returned: ${events.length} events`);
    
    if (events.length > 0) {
      console.log('  📋 Sample events:');
      events.slice(0, 3).forEach((e: any) => {
        const date = new Date(e.time * 1000);
        const status = e.time < now ? 'PAST' : (e.time > future ? 'FAR FUTURE' : 'NEAR FUTURE');
        console.log(`     • ${e.title}`);
        console.log(`       Time: ${date.toISOString()} [${status}]`);
      });
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  console.log('\n📍 Test 3: GET /api/events?from={now}&to={now+48h}');
  try {
    const response = await axios.get(`${BASE_URL}/api/events`, {
      headers: { Authorization: API_KEY },
      params: { 
        from: now,
        to: now + (48 * 3600),
        limit: 50
      }
    });
    
    const events = response.data.events;
    console.log(`  ✅ Total results: ${response.data.totalResults}`);
    console.log(`  📊 Returned: ${events.length} events`);
    
    // Count future vs past
    const futureEvents = events.filter((e: any) => e.time > now);
    const pastEvents = events.filter((e: any) => e.time <= now);
    
    console.log(`  ⏩ Future events: ${futureEvents.length}`);
    console.log(`  ⏪ Past events: ${pastEvents.length}`);
    
    if (futureEvents.length > 0) {
      console.log('\n  🎯 TRUE UPCOMING EVENTS FOUND:');
      futureEvents.slice(0, 5).forEach((e: any) => {
        const date = new Date(e.time * 1000);
        const hoursFromNow = (e.time - now) / 3600;
        console.log(`     • ${e.title}`);
        console.log(`       ${date.toISOString()} (in ${hoursFromNow.toFixed(1)}h)`);
      });
    } else {
      console.log('  ⚠️  NO FUTURE EVENTS in next 48h');
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  console.log('\n✅ API exploration complete!');
}

testEventsAPI().catch(console.error);
