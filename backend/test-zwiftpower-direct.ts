#!/usr/bin/env npx tsx
/**
 * Test ZwiftPower API direct met axios
 */

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const ZWIFTPOWER_EMAIL = process.env.ZWIFTPOWER_EMAIL;
const ZWIFTPOWER_PASSWORD = process.env.ZWIFTPOWER_PASSWORD;

console.log('🔍 Testing ZwiftPower API direct...\n');

const client = axios.create({
  baseURL: 'https://zwiftpower.com',
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0',
  },
});

try {
  // Step 1: Login
  console.log('1. Logging in...');
  const loginResponse = await client.post('/ucp.php?mode=login', 
    new URLSearchParams({
      username: ZWIFTPOWER_EMAIL!,
      password: ZWIFTPOWER_PASSWORD!,
      login: 'Login',
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400,
    }
  );

  // Extract cookies
  const cookies = loginResponse.headers['set-cookie'];
  if (!cookies) {
    console.log('❌ No cookies received');
    process.exit(1);
  }

  const cookieHeader = cookies.map((c: string) => c.split(';')[0]).join('; ');
  console.log('✅ Logged in, got cookies\n');

  // Step 2: Get rider results
  console.log('2. Fetching rider 150437 results...');
  const resultsResponse = await client.get('/api3.php', {
    params: {
      do: 'rider_results',
      zwift_id: 150437,
      limit: 50,
    },
    headers: {
      Cookie: cookieHeader,
    },
  });

  const results = resultsResponse.data?.data || [];
  console.log(`✅ Got ${results.length} results\n`);

  if (results.length > 0) {
    console.log('📋 Recent races:\n');
    results.slice(0, 10).forEach((r: any, i: number) => {
      console.log(`${i + 1}. Event ${r.zid || r.event_id}`);
      console.log(`   Name: ${r.name || 'Unknown'}`);
      console.log(`   Date: ${r.date || 'Unknown'}`);
      console.log(`   Rank: ${r.position || r.rank || '?'}\n`);
    });

    // Check for specific events
    const has5206710 = results.find((r: any) => String(r.zid || r.event_id) === '5206710');
    const has5229579 = results.find((r: any) => String(r.zid || r.event_id) === '5229579');

    console.log(`🔎 Checking events:`);
    console.log(`   5206710: ${has5206710 ? '✅ Found' : '❌ Missing'}`);
    console.log(`   5229579: ${has5229579 ? '✅ Found' : '❌ Missing'}`);
  }

} catch (error: any) {
  console.error('❌ Error:', error.message);
  if (error.response) {
    console.error('   Status:', error.response.status);
    console.error('   Data:', error.response.data);
  }
}
