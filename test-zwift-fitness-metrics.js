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
  
  console.log('\n=== FITNESS METRICS (zFTP, zMAP, VO2max) ===');
  console.log('ftp:', data.ftp);
  console.log('ftpWkg:', data.ftpWkg);
  console.log('zFTP:', data.zFTP);
  console.log('zMAP:', data.zMAP);
  console.log('vo2max:', data.vo2max);
  console.log('VO2max:', data.VO2max);
  console.log('maxOxygenUptake:', data.maxOxygenUptake);
  
  console.log('\n=== ALLE VELDEN MET "FTP" ===');
  Object.keys(data).forEach(key => {
    if (key.toLowerCase().includes('ftp')) {
      console.log(`${key}:`, data[key]);
    }
  });

  console.log('\n=== ALLE VELDEN MET "MAP" ===');
  Object.keys(data).forEach(key => {
    if (key.toLowerCase().includes('map')) {
      console.log(`${key}:`, data[key]);
    }
  });

  console.log('\n=== ALLE VELDEN MET "VO2" of "OXYGEN" ===');
  Object.keys(data).forEach(key => {
    if (key.toLowerCase().includes('vo2') || key.toLowerCase().includes('oxygen')) {
      console.log(`${key}:`, data[key]);
    }
  });

  console.log('\n=== ALLE VELDEN MET "FITNESS" ===');
  Object.keys(data).forEach(key => {
    if (key.toLowerCase().includes('fitness')) {
      console.log(`${key}:`, JSON.stringify(data[key], null, 2));
    }
  });

  console.log('\n=== POWER GERELATEERDE VELDEN ===');
  Object.keys(data).forEach(key => {
    if (key.toLowerCase().includes('power') || key.toLowerCase().includes('watt')) {
      console.log(`${key}:`, data[key]);
    }
  });

  console.log('\n=== WEIGHT (voor w/kg berekening) ===');
  console.log('weight:', data.weight, '(grams)');
  console.log('weight in kg:', data.weight ? (data.weight / 1000).toFixed(2) : 'null');
  
  if (data.ftp && data.weight) {
    const ftpWkg = data.ftp / (data.weight / 1000);
    console.log('Calculated FTP w/kg:', ftpWkg.toFixed(2));
  }
}

async function main() {
  try {
    const token = await login();
    await fetchProfile(150437, token);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
