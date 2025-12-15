#!/usr/bin/env node

/**
 * Test Zwift Ranking API voor rider wins data
 * API: https://zwift-ranking.herokuapp.com/public/riders/{rider_id}
 * 
 * Deze API heeft mogelijk betere race results data dan ZwiftRacing.app
 */

const https = require('https');

async function fetchZwiftRankingRider(riderId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'zwift-ranking.herokuapp.com',
      path: `/public/riders/${riderId}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TeamNL-Cloud9-Racing-Team/1.0',
        'Authorization': '650c6d2fc4ef6858d74cbef1'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function main() {
  const testRiders = [150437, 5574, 396624];

  console.log('🔍 Testing Zwift Ranking API for rider wins data\n');

  for (const riderId of testRiders) {
    console.log(`\n📊 Rider ${riderId}:`);
    console.log('━'.repeat(60));
    
    try {
      const result = await fetchZwiftRankingRider(riderId);
      
      if (result.status === 200) {
        const data = result.data;
        console.log(`✅ Success!`);
        console.log(`   Name: ${data.name || 'N/A'}`);
        console.log(`   Wins: ${data.wins || 0}`);
        console.log(`   Races: ${data.races || 0}`);
        console.log(`   Win Rate: ${data.wins && data.races ? ((data.wins / data.races) * 100).toFixed(1) : 0}%`);
        console.log(`   Category: ${data.category || 'N/A'}`);
        console.log(`   ZP Power: ${data.zp_power || 'N/A'}`);
        console.log(`   Rank: ${data.rank || 'N/A'}`);
        
        // Show all available fields
        console.log(`\n   📋 All fields:`, Object.keys(data).join(', '));
      } else if (result.status === 401) {
        console.log(`❌ Unauthorized - API requires authentication`);
        console.log(`   Response:`, JSON.stringify(result.data, null, 2));
      } else {
        console.log(`⚠️  Status ${result.status}`);
        console.log(`   Response:`, JSON.stringify(result.data, null, 2));
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    // Delay tussen requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '━'.repeat(60));
  console.log('\n💡 Notes:');
  console.log('   - API endpoint: https://zwift-ranking.herokuapp.com/public/riders/{id}');
  console.log('   - May require API key or authentication');
  console.log('   - Alternative to ZwiftRacing.app for race wins data');
  console.log('   - Could be integrated if auth is available\n');
}

main().catch(console.error);
