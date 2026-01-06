#!/usr/bin/env node
/**
 * Test alle Zwift/ZwiftPower/ZwiftRacing APIs voor race results
 */

const axios = require('axios');
const crypto = require('crypto');

const ZWIFT_USERNAME = 'jeroen.diepenbroek@gmail.com';
const ZWIFT_PASSWORD = 'CloudRacer-9';
const TEST_RIDER_ID = 150437;
const TEST_EVENT_ID = 5296000;

// ============================================
// 1. ZWIFT.COM API (Official)
// ============================================
async function testZwiftAPI() {
  console.log('\n🔵 1. ZWIFT.COM API');
  console.log('='.repeat(50));
  
  try {
    // Login via Zwift OAuth
    const authResponse = await axios.post('https://secure.zwift.com/auth/rb_bf', {
      username: ZWIFT_USERNAME,
      password: ZWIFT_PASSWORD,
      client_id: 'Zwift_Mobile_Link'
    });
    
    const accessToken = authResponse.data.access_token;
    console.log('✅ Login successful');
    
    // Test profile endpoint
    const profileResponse = await axios.get(`https://us-or-rly101.zwift.com/api/profiles/${TEST_RIDER_ID}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log('✅ Profile endpoint works');
    console.log('   Fields:', Object.keys(profileResponse.data).slice(0, 10).join(', '));
    
    // Test activities/results endpoint
    try {
      const activitiesResponse = await axios.get(`https://us-or-rly101.zwift.com/api/profiles/${TEST_RIDER_ID}/activities`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { start: 0, limit: 10 }
      });
      console.log('✅ Activities endpoint works!');
      console.log(`   Found ${activitiesResponse.data.length} activities`);
      if (activitiesResponse.data[0]) {
        console.log('   Activity fields:', Object.keys(activitiesResponse.data[0]).slice(0, 10).join(', '));
      }
    } catch (e) {
      console.log('❌ Activities endpoint:', e.response?.status || e.message);
    }
    
    // Test race results
    try {
      const resultsResponse = await axios.get(`https://us-or-rly101.zwift.com/api/race-results`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        params: { riderId: TEST_RIDER_ID, limit: 10 }
      });
      console.log('✅ Race results endpoint works!');
      console.log(`   Found ${resultsResponse.data.length} race results`);
    } catch (e) {
      console.log('❌ Race results endpoint:', e.response?.status || e.message);
    }
    
  } catch (error) {
    console.log('❌ Zwift.com API error:', error.response?.data || error.message);
  }
}

// ============================================
// 2. ZWIFTPOWER API
// ============================================
async function testZwiftPowerAPI() {
  console.log('\n🟠 2. ZWIFTPOWER API');
  console.log('='.repeat(50));
  
  try {
    // ZwiftPower gebruikt Zwift SSO - redirect naar Zwift login
    // We moeten de hele OAuth flow volgen
    
    // Test public endpoints eerst
    const publicTests = [
      { name: 'Profile Results', url: `https://www.zwiftpower.com/api3.php?do=profile_results&zwift_id=${TEST_RIDER_ID}` },
      { name: 'Event Results', url: `https://www.zwiftpower.com/api3.php?do=event_results&zid=${TEST_EVENT_ID}` },
      { name: 'Profile', url: `https://www.zwiftpower.com/api3.php?do=profile&zwift_id=${TEST_RIDER_ID}` }
    ];
    
    for (const test of publicTests) {
      try {
        const response = await axios.get(test.url, { maxRedirects: 0 });
        if (response.headers['content-type']?.includes('json')) {
          console.log(`✅ ${test.name}: Works (JSON)`);
          const data = response.data;
          console.log(`   Data type:`, Array.isArray(data) ? `Array[${data.length}]` : typeof data);
        } else {
          console.log(`⚠️  ${test.name}: HTML response (needs login)`);
        }
      } catch (e) {
        if (e.response?.status === 307) {
          console.log(`⚠️  ${test.name}: Redirect (needs login)`);
        } else {
          console.log(`❌ ${test.name}:`, e.response?.status || e.message);
        }
      }
    }
    
  } catch (error) {
    console.log('❌ ZwiftPower API error:', error.message);
  }
}

// ============================================
// 3. ZWIFTRACING API
// ============================================
async function testZwiftRacingAPI() {
  console.log('\n🔴 3. ZWIFTRACING API');
  console.log('='.repeat(50));
  
  const ZWIFTRACING_TOKEN = process.env.ZWIFTRACING_API_TOKEN;
  
  if (!ZWIFTRACING_TOKEN) {
    console.log('❌ No ZWIFTRACING_API_TOKEN environment variable');
    return;
  }
  
  try {
    // Test event results (we weten dat dit werkt)
    const eventResponse = await axios.get(`https://api.zwiftracing.app/api/public/results/${TEST_EVENT_ID}`, {
      headers: { 'Authorization': `Bearer ${ZWIFTRACING_TOKEN}` }
    });
    console.log('✅ Event results endpoint works');
    console.log(`   Event: ${eventResponse.data.title}`);
    console.log(`   Results: ${eventResponse.data.results?.length || 0} riders`);
    
    // Test rider endpoint (we denken dat dit NIET werkt)
    try {
      const riderResponse = await axios.get(`https://api.zwiftracing.app/api/public/results/rider/${TEST_RIDER_ID}`, {
        headers: { 'Authorization': `Bearer ${ZWIFTRACING_TOKEN}` },
        params: { start: 0, limit: 10 }
      });
      console.log('✅ Rider results endpoint works!');
      console.log(`   Found ${riderResponse.data.results?.length || 0} results`);
    } catch (e) {
      console.log('❌ Rider results endpoint:', e.response?.status || e.message);
    }
    
    // Test search/filter endpoints
    const testEndpoints = [
      '/api/public/riders/search',
      '/api/public/events/recent',
      '/api/public/events/upcoming',
      '/api/public/results/recent'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await axios.get(`https://api.zwiftracing.app${endpoint}`, {
          headers: { 'Authorization': `Bearer ${ZWIFTRACING_TOKEN}` },
          timeout: 5000
        });
        console.log(`✅ ${endpoint}: Works`);
      } catch (e) {
        console.log(`❌ ${endpoint}:`, e.response?.status || e.message);
      }
    }
    
  } catch (error) {
    console.log('❌ ZwiftRacing API error:', error.response?.data || error.message);
  }
}

// ============================================
// RUN ALL TESTS
// ============================================
async function main() {
  console.log('🔍 TESTING ALL ZWIFT APIs');
  console.log('='.repeat(50));
  console.log(`Test rider: ${TEST_RIDER_ID}`);
  console.log(`Test event: ${TEST_EVENT_ID}`);
  
  await testZwiftAPI();
  await testZwiftPowerAPI();
  await testZwiftRacingAPI();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests complete');
}

main().catch(console.error);
