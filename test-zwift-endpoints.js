#!/usr/bin/env node

const axios = require('axios');

const ZWIFT_USERNAME = process.env.ZWIFT_USERNAME;
const ZWIFT_PASSWORD = process.env.ZWIFT_PASSWORD;

async function login() {
  console.log('🔐 Logging in to Zwift...');
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

async function testEndpoints(riderId, token) {
  const endpoints = [
    // Profile endpoints
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/fitness`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/power-curve`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/metrics`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/activities`,
    
    // Analytics endpoints
    `https://us-or-rly101.zwift.com/api/analytics/profiles/${riderId}`,
    `https://us-or-rly101.zwift.com/api/analytics/profiles/${riderId}/fitness`,
    
    // Stats endpoints
    `https://us-or-rly101.zwift.com/api/stats/profiles/${riderId}`,
    
    // Power profile
    `https://us-or-rly101.zwift.com/api/power-profile/${riderId}`,
    
    // Fitness score
    `https://us-or-rly101.zwift.com/api/fitness-score/${riderId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint}`);
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Zwift/1.0 (iOS)'
        }
      });
      
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log('Response keys:', Object.keys(response.data).slice(0, 20).join(', '));
      
      // Check for fitness metrics
      const data = response.data;
      const fitnessKeys = ['zFTP', 'zMAP', 'vo2max', 'VO2max', 'fitness', 'ftp', 'map'];
      const found = fitnessKeys.filter(key => data[key] !== undefined);
      if (found.length > 0) {
        console.log('🎯 FITNESS METRICS FOUND:', found.join(', '));
        found.forEach(key => {
          console.log(`   ${key}:`, data[key]);
        });
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${error.response.status}: ${error.response.statusText}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function main() {
  try {
    const token = await login();
    console.log('✅ Logged in\n');
    await testEndpoints(150437, token);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
