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
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Zwift/1.0 (iOS)'
      }
    }
  );

  const token = response.data.access_token;
  console.log('✅ Logged in successfully\n');
  return token;
}

async function fetchProfile(riderId, token) {
  console.log(`📊 Fetching profile for rider ${riderId}...`);
  const response = await axios.get(
    `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Zwift/1.0 (iOS)'
      }
    }
  );

  const data = response.data;
  
  console.log('\n=== RACING SCORE VELDEN ===');
  console.log('competitionCategory:', data.competitionCategory);
  console.log('competitionRacingScore:', data.competitionRacingScore);
  console.log('competition:', JSON.stringify(data.competition, null, 2));
  
  console.log('\n=== ALLE VELDEN MET "RACING" ===');
  Object.keys(data).forEach(key => {
    if (key.toLowerCase().includes('racing') || key.toLowerCase().includes('competition')) {
      console.log(`${key}:`, data[key]);
    }
  });

  console.log('\n=== RAW DATA (eerste 50 velden) ===');
  const keys = Object.keys(data).slice(0, 50);
  keys.forEach(key => {
    const value = data[key];
    if (typeof value === 'object' && value !== null) {
      console.log(`${key}:`, JSON.stringify(value, null, 2).substring(0, 200));
    } else {
      console.log(`${key}:`, value);
    }
  });
}

async function main() {
  try {
    const token = await login();
    await fetchProfile(150437, token); // Jouw rider
    
    console.log('\n\n=== Testing andere rider ===');
    await fetchProfile(1495, token); // Andere rider
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

main();
