#!/usr/bin/env npx tsx
/**
 * Alternatieve benadering: Haal rider history op via ZwiftPower
 * Dit geeft event IDs, dan kunnen we targeted sync doen
 */

import dotenv from 'dotenv';
dotenv.config();

const { zwiftPowerClient } = await import('./src/api/zwiftpower-client.js');

console.log('🔍 Fetching rider 150437 history via ZwiftPower...\n');

try {
  await zwiftPowerClient.authenticate();
  console.log('✅ Authenticated with ZwiftPower\n');
  
  // Probeer rider results op te halen
  const results = await zwiftPowerClient.getRiderResults(150437, 100);
  
  console.log(`Found ${results?.length || 0} results\n`);
  
  if (results && results.length > 0) {
    console.log('📋 Recent races:\n');
    results.slice(0, 10).forEach((r: any) => {
      console.log(`Event ID: ${r.event_id || r.eventId || r.zid}`);
      console.log(`  Name: ${r.name || r.event_name || 'Unknown'}`);
      console.log(`  Date: ${r.date || r.event_date || 'Unknown'}`);
      console.log(`  Rank: ${r.position || r.rank || '?'}\n`);
    });
    
    // Check for our specific events
    const has5206710 = results.find((r: any) => 
      String(r.event_id || r.eventId || r.zid) === '5206710'
    );
    const has5229579 = results.find((r: any) => 
      String(r.event_id || r.eventId || r.zid) === '5229579'
    );
    
    console.log(`\n Event 5206710: ${has5206710 ? '✅ Found' : '❌ Not found'}`);
    console.log(`Event 5229579: ${has5229579 ? '✅ Found' : '❌ Not found'}`);
  } else {
    console.log('⚠️  No results returned from ZwiftPower');
    console.log('Dit kan betekenen:');
    console.log('  - Rider heeft geen ZwiftPower profile');
    console.log('  - Results zijn niet publiek');
    console.log('  - API rate limit');
  }
  
} catch (error: any) {
  console.error('❌ Error:', error.message);
}
