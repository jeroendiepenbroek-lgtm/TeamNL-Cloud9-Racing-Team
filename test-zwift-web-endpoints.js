#!/usr/bin/env node

const axios = require('axios');

const ZWIFT_USERNAME = process.env.ZWIFT_USERNAME;
const ZWIFT_PASSWORD = process.env.ZWIFT_PASSWORD;

async function loginWeb() {
  console.log('🔐 Logging in via Web Auth...');
  
  // Web-based login (different from mobile)
  const response = await axios.post(
    'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
    new URLSearchParams({
      username: ZWIFT_USERNAME,
      password: ZWIFT_PASSWORD,
      grant_type: 'password',
      client_id: 'Zwift_Cycling'  // Web client ID instead of Mobile
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const token = response.data.access_token;
  console.log('✅ Web login successful\n');
  return token;
}

async function testWebEndpoints(riderId, token) {
  const endpoints = [
    // Web API endpoints (what the website uses)
    `https://www.zwift.com/api/profiles/${riderId}`,
    `https://www.zwift.com/api/profiles/${riderId}/fitness`,
    `https://www.zwift.com/api/profiles/${riderId}/power`,
    
    // My Zwift endpoints
    `https://my.zwift.com/api/profiles/${riderId}`,
    `https://my.zwift.com/api/profiles/${riderId}/fitness`,
    `https://my.zwift.com/api/profiles/${riderId}/metrics`,
    
    // Launcher API (desktop app)
    `https://launcher.zwift.com/api/profiles/${riderId}`,
    
    // CDN/Static data
    `https://cdn.zwift.com/gameassets/profiles/${riderId}/fitness`,
    
    // Internal API
    `https://us-or-rly101.zwift.com/relay/profiles/${riderId}`,
    `https://us-or-rly101.zwift.com/relay/profiles/${riderId}/fitness`,
    
    // Activity feed with fitness
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/activities?limit=1`,
    
    // Power curve endpoint
    `https://us-or-rly101.zwift.com/api/power-curve?athleteId=${riderId}`,
    `https://us-or-rly101.zwift.com/api/athletes/${riderId}/power-curve`,
    
    // Fitness estimates
    `https://us-or-rly101.zwift.com/api/athletes/${riderId}/fitness-estimates`,
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}/fitness-estimates`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 ${endpoint.replace(/https:\/\/[^\/]+/, '')}`);
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Origin': 'https://www.zwift.com',
          'Referer': `https://www.zwift.com/eu/athlete/${riderId}`
        }
      });
      
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      const data = response.data;
      
      // Check for fitness-related fields
      const fitnessFields = ['zFTP', 'zftp', 'zMAP', 'zmap', 'vo2max', 'VO2max', 'VO2Max', 
                            'fitness', 'fitnessEstimate', 'estimatedFtp', 'estimatedMap'];
      
      const checkObject = (obj, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (fitnessFields.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
            console.log(`   🎯 ${fullKey}:`, obj[key]);
          }
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            checkObject(obj[key], fullKey);
          }
        });
      };
      
      checkObject(data);
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${error.response.status}`);
      } else {
        console.log(`❌ ${error.message}`);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

async function main() {
  try {
    const token = await loginWeb();
    await testWebEndpoints(150437, token);
    
  } catch (error) {
    console.error('❌ Login error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

main();
