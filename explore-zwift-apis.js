const axios = require('axios');

const USERNAME = 'jeroen.diepenbroek@gmail.com';
const PASSWORD = 'CloudRacer-9';
const RIDER_ID = 150437;

// Zwift API endpoints to test
const ZWIFT_URLS = {
  auth: 'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
  profile: 'https://us-or-rly101.zwift.com/api/profiles',
  activities: 'https://us-or-rly101.zwift.com/api/profiles/{id}/activities',
  followers: 'https://us-or-rly101.zwift.com/api/profiles/{id}/followers',
  followees: 'https://us-or-rly101.zwift.com/api/profiles/{id}/followees',
  achievements: 'https://us-or-rly101.zwift.com/api/profiles/{id}/achievements',
  power: 'https://us-or-rly101.zwift.com/api/profiles/{id}/power',
  segments: 'https://us-or-rly101.zwift.com/api/profiles/{id}/segments',
};

async function getAccessToken() {
  console.log('🔐 Authenticating with Zwift...');
  
  try {
    const response = await axios.post(
      ZWIFT_URLS.auth,
      new URLSearchParams({
        username: USERNAME,
        password: PASSWORD,
        client_id: 'Zwift_Mobile_Link',
        grant_type: 'password',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    console.log('   ✅ Access token obtained');
    return response.data.access_token;
  } catch (error) {
    console.error('   ❌ Auth failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testEndpoint(name, url, token) {
  console.log(`\n📊 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📦 Data type: ${Array.isArray(response.data) ? 'Array' : typeof response.data}`);
    
    if (Array.isArray(response.data)) {
      console.log(`   📊 Count: ${response.data.length} items`);
      if (response.data.length > 0) {
        console.log(`   🔑 First item keys: ${Object.keys(response.data[0]).slice(0, 10).join(', ')}...`);
      }
    } else if (typeof response.data === 'object') {
      const keys = Object.keys(response.data);
      console.log(`   🔑 Keys (${keys.length}): ${keys.slice(0, 15).join(', ')}${keys.length > 15 ? '...' : ''}`);
      
      // Search for racing-related fields
      const racingFields = keys.filter(k => 
        k.toLowerCase().includes('race') || 
        k.toLowerCase().includes('racing') || 
        k.toLowerCase().includes('score') ||
        k.toLowerCase().includes('elo') ||
        k.toLowerCase().includes('rating') ||
        k.toLowerCase().includes('competition')
      );
      
      if (racingFields.length > 0) {
        console.log(`   🏁 RACING FIELDS FOUND: ${racingFields.join(', ')}`);
        racingFields.forEach(field => {
          console.log(`      ${field}: ${JSON.stringify(response.data[field])}`);
        });
      }
    }
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log(`   ❌ Error ${error.response.status}: ${error.response.statusText}`);
      if (error.response.status === 404) {
        console.log(`   ℹ️  Endpoint not available`);
      }
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    return null;
  }
}

async function exploreAllEndpoints() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Zwift API Complete Exploration - Rider 150437          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  const token = await getAccessToken();
  
  const results = {};
  
  // Test Profile
  results.profile = await testEndpoint(
    'Profile',
    `${ZWIFT_URLS.profile}/${RIDER_ID}`,
    token
  );
  
  // Test Activities
  results.activities = await testEndpoint(
    'Activities',
    ZWIFT_URLS.activities.replace('{id}', RIDER_ID),
    token
  );
  
  // Test Followers
  results.followers = await testEndpoint(
    'Followers',
    ZWIFT_URLS.followers.replace('{id}', RIDER_ID),
    token
  );
  
  // Test Followees
  results.followees = await testEndpoint(
    'Followees',
    ZWIFT_URLS.followees.replace('{id}', RIDER_ID),
    token
  );
  
  // Test alternative endpoints
  const alternativeEndpoints = [
    ['Profile Events', `${ZWIFT_URLS.profile}/${RIDER_ID}/events`],
    ['Profile Races', `${ZWIFT_URLS.profile}/${RIDER_ID}/races`],
    ['Profile Results', `${ZWIFT_URLS.profile}/${RIDER_ID}/results`],
    ['Profile Stats', `${ZWIFT_URLS.profile}/${RIDER_ID}/stats`],
    ['Profile Power', `${ZWIFT_URLS.profile}/${RIDER_ID}/power`],
    ['Profile Metrics', `${ZWIFT_URLS.profile}/${RIDER_ID}/metrics`],
    ['Profile Competition', `${ZWIFT_URLS.profile}/${RIDER_ID}/competition`],
    ['Profile Racing', `${ZWIFT_URLS.profile}/${RIDER_ID}/racing`],
  ];
  
  for (const [name, url] of alternativeEndpoints) {
    results[name] = await testEndpoint(name, url, token);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY - Racing Score Search');
  console.log('═'.repeat(60));
  
  let foundRacingScore = false;
  for (const [endpoint, data] of Object.entries(results)) {
    if (data && typeof data === 'object') {
      const keys = Array.isArray(data) 
        ? (data[0] ? Object.keys(data[0]) : [])
        : Object.keys(data);
      
      const racingFields = keys.filter(k => 
        k.toLowerCase().includes('race') || 
        k.toLowerCase().includes('score') ||
        k.toLowerCase().includes('elo')
      );
      
      if (racingFields.length > 0) {
        console.log(`✅ ${endpoint}: ${racingFields.join(', ')}`);
        foundRacingScore = true;
      }
    }
  }
  
  if (!foundRacingScore) {
    console.log('❌ NO racing_score field found in any Zwift Official API endpoint');
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('CONCLUSION');
  console.log('═'.repeat(60));
  console.log('racing_score is ONLY available in ZwiftRacing.app API');
  console.log('Source: https://zwift-ranking.herokuapp.com');
  console.log('Already stored in: api_zwiftracing_public_* tables');
  console.log('═'.repeat(60));
}

exploreAllEndpoints().catch(console.error);
