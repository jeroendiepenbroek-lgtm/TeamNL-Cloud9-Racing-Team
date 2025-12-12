#!/usr/bin/env node

const axios = require('axios');

const ZWIFT_USERNAME = process.env.ZWIFT_USERNAME;
const ZWIFT_PASSWORD = process.env.ZWIFT_PASSWORD;

async function login() {
  const response = await axios.post(
    'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
    new URLSearchParams({
      username: ZWIFT_USERNAME,
      password: ZWIFT_PASSWORD,
      grant_type: 'password',
      client_id: 'Zwift_Mobile_Link'
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data.access_token;
}

async function testFeedEndpoints(riderId, token) {
  const feedEndpoints = [
    // Feed API endpoints
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/feed`,
    `https://us-or-rly101.zwift.com/api/feed`,
    `https://us-or-rly101.zwift.com/feed/api/profile/${riderId}`,
    
    // Activity feed variants
    `https://us-or-rly101.zwift.com/api/activity-feed/feed/${riderId}`,
    `https://us-or-rly101.zwift.com/api/activity-feed/profile/${riderId}`,
    
    // Stats/summary endpoints
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/stats`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/summary`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/dashboard`,
    
    // Personal bests
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/personal-bests`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/records`,
    
    // Goal/fitness tracking
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/goals`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/training`,
  ];

  for (const endpoint of feedEndpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint}`);
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Zwift/1.0 (iOS)',
          'Accept': 'application/json'
        }
      });
      
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      
      const data = response.data;
      
      // Check structure
      if (Array.isArray(data)) {
        console.log(`   📋 Array with ${data.length} items`);
        if (data.length > 0) {
          console.log(`   First item keys:`, Object.keys(data[0]).slice(0, 15).join(', '));
        }
      } else if (typeof data === 'object') {
        console.log(`   📦 Object keys:`, Object.keys(data).slice(0, 20).join(', '));
      }
      
      // Deep search for fitness terms
      const searchForFitness = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return;
        
        Object.keys(obj).forEach(key => {
          const fullPath = path ? `${path}.${key}` : key;
          const value = obj[key];
          
          // Check if key contains fitness-related terms
          const fitnessTerms = ['ftp', 'map', 'vo2', 'fitness', 'zftp', 'zmap', 'power', 'estimate'];
          if (fitnessTerms.some(term => key.toLowerCase().includes(term))) {
            console.log(`   🎯 ${fullPath}:`, value);
          }
          
          // Recurse into objects and arrays
          if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value) && value.length > 0) {
              searchForFitness(value[0], `${fullPath}[0]`);
            } else {
              searchForFitness(value, fullPath);
            }
          }
        });
      };
      
      searchForFitness(data);
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${error.response.status}: ${error.response.statusText}`);
      } else {
        console.log(`❌ ${error.message}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
  }
}

async function checkProfileWithMoreParams(riderId, token) {
  console.log('\n\n🔍 Checking profile endpoint with different parameters...\n');
  
  const params = [
    '?include=fitness',
    '?include=metrics',
    '?include=powerCurve',
    '?include=all',
    '?fields=fitness,power,ftp',
    '?expand=fitness',
    '?detailed=true',
  ];
  
  for (const param of params) {
    try {
      console.log(`Testing: /api/profiles/${riderId}${param}`);
      const response = await axios.get(
        `https://us-or-rly101.zwift.com/api/profiles/${riderId}${param}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log(`✅ Status: ${response.status}`);
      
      // Check if response has different keys than base profile
      const keys = Object.keys(response.data);
      const fitnessKeys = keys.filter(k => 
        k.toLowerCase().includes('fit') || 
        k.toLowerCase().includes('map') || 
        k.toLowerCase().includes('vo2')
      );
      
      if (fitnessKeys.length > 0) {
        console.log(`🎯 FITNESS KEYS FOUND:`, fitnessKeys.join(', '));
        fitnessKeys.forEach(k => {
          console.log(`   ${k}:`, response.data[k]);
        });
      }
      
    } catch (error) {
      console.log(`❌ ${error.response?.status || error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

async function main() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Logged in\n');
    
    const riderId = 150437;
    
    await testFeedEndpoints(riderId, token);
    await checkProfileWithMoreParams(riderId, token);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
