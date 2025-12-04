#!/usr/bin/env npx tsx

/**
 * Test Production Results API
 */

import https from 'https';

const url = 'https://teamnl-cloud9-racing-team-production.up.railway.app/api/results/rider/150437?days=30';

console.log('Testing production:', url, '\n');

https.get(url, { timeout: 10000 }, (res) => {
  console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        console.log('\n✅ SUCCESS:', {
          success: json.success,
          count: json.count,
          rider_id: json.rider_id
        });
      } catch (e) {
        console.log('\nResponse:', data.substring(0, 300));
      }
    } else {
      console.log('\n❌ Error response:', data.substring(0, 500));
    }
  });
}).on('error', (e) => {
  console.error('❌ Request failed:', e.message);
}).on('timeout', () => {
  console.error('⏱️ Timeout after 10 seconds');
});
