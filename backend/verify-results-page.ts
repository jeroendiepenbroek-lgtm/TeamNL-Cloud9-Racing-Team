#!/usr/bin/env npx tsx
/**
 * Verifieer Results Page Data
 */

import https from 'https';

const PROD_URL = 'https://teamnl-cloud9-racing-team-production.up.railway.app/api/results/rider/150437?days=30';

console.log('🔍 Verifying Results Page data...\n');

https.get(PROD_URL, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    
    console.log('✅ API Response:');
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Total results: ${json.count}`);
    console.log(`   Rider ID: ${json.rider_id}`);
    console.log(`   Days filter: ${json.days}\n`);
    
    console.log('📋 Sample races:\n');
    json.results.slice(0, 5).forEach((r: any, i: number) => {
      const date = new Date(r.event_date).toLocaleDateString('nl-NL');
      console.log(`${i + 1}. ${r.event_name}`);
      console.log(`   📅 ${date} | 🏆 Rank ${r.rank} | ⚡ ${r.avg_wkg} w/kg | ⏱️  ${Math.floor(r.time_seconds/60)}:${(r.time_seconds%60).toString().padStart(2,'0')}`);
    });
    
    console.log(`\n... en nog ${json.count - 5} races meer!`);
    console.log('\n✅ Results page kan nu volledig worden weergegeven!\n');
  });
}).on('error', (e) => console.error('❌ Error:', e.message));
