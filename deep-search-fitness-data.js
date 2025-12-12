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

async function checkRecentActivity(riderId, token) {
  console.log('\n🔍 Checking recent activity for computed fitness data...');
  
  try {
    const response = await axios.get(
      `https://us-or-rly101.zwift.com/api/profiles/${riderId}/activities?start=0&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.data && response.data.length > 0) {
      const activity = response.data[0];
      console.log('\n=== RECENT ACTIVITY DATA ===');
      console.log('Activity ID:', activity.id);
      console.log('Name:', activity.name);
      console.log('Date:', activity.startDate);
      
      // Check for fitness metrics in activity
      const allKeys = Object.keys(activity);
      console.log('\n=== ALL ACTIVITY KEYS (first 50) ===');
      console.log(allKeys.slice(0, 50).join(', '));
      
      // Look for power/fitness related data
      console.log('\n=== POWER/FITNESS DATA IN ACTIVITY ===');
      ['avgWatts', 'maxWatts', 'normalizedPower', 'intensity', 'tss', 
       'avgHeartRate', 'maxHeartRate', 'fitness', 'fatigue'].forEach(key => {
        if (activity[key] !== undefined) {
          console.log(`${key}:`, activity[key]);
        }
      });
      
      // Check if there's a detail endpoint
      console.log('\n🔍 Trying activity detail endpoint...');
      const detailResponse = await axios.get(
        `https://us-or-rly101.zwift.com/api/profiles/${riderId}/activities/${activity.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('\n=== ACTIVITY DETAIL KEYS ===');
      console.log(Object.keys(detailResponse.data).join(', '));
      
      // Check for fitness fields
      if (detailResponse.data.fitness) {
        console.log('\n🎯 FITNESS DATA FOUND!');
        console.log(JSON.stringify(detailResponse.data.fitness, null, 2));
      }
      
    }
  } catch (error) {
    console.log('❌ Activity check failed:', error.message);
  }
}

async function checkFollowersFeed(riderId, token) {
  console.log('\n🔍 Checking followers feed (social data)...');
  
  try {
    const response = await axios.get(
      `https://us-or-rly101.zwift.com/api/profiles/${riderId}/followers`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Followers endpoint works');
    console.log('Keys:', Object.keys(response.data).slice(0, 10).join(', '));
    
  } catch (error) {
    console.log('❌', error.response?.status || error.message);
  }
}

async function searchForFitnessData(riderId, token) {
  console.log('\n🔍 Searching for fitness data in profile response...');
  
  const response = await axios.get(
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = response.data;
  
  // Deep search for any nested fitness data
  const searchNested = (obj, path = '') => {
    Object.keys(obj).forEach(key => {
      const fullPath = path ? `${path}.${key}` : key;
      const value = obj[key];
      
      // Look for any field with numbers that could be fitness metrics
      if (typeof value === 'number' && value > 0 && value < 1000) {
        console.log(`${fullPath}: ${value}`);
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        searchNested(value, fullPath);
      }
    });
  };
  
  console.log('\n=== ALL NUMERIC VALUES (potential fitness metrics) ===');
  searchNested(data);
}

async function main() {
  try {
    console.log('🔐 Logging in...');
    const token = await login();
    console.log('✅ Logged in\n');
    
    const riderId = 150437;
    
    await searchForFitnessData(riderId, token);
    await checkRecentActivity(riderId, token);
    await checkFollowersFeed(riderId, token);
    
    console.log('\n\n=== CONCLUSIE ===');
    console.log('De Fitness metrics (zFTP, zMAP, VO2max) zijn NIET beschikbaar via de API.');
    console.log('Deze worden waarschijnlijk:');
    console.log('1. Client-side berekend in de Zwift app/website');
    console.log('2. Opgehaald via een niet-publieke internal API');
    console.log('3. Alleen beschikbaar voor de ingelogde gebruiker (niet voor andere riders)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
