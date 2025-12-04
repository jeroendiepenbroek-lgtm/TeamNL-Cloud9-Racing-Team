import dotenv from 'dotenv';
dotenv.config();

const zwiftPowerClient = (await import('./src/api/zwiftpower-client.js')).zwiftPowerClient;

(async () => {
  console.log('🔍 Getting rider 150437 results from ZwiftPower...\n');
  
  // Authenticate first
  await zwiftPowerClient.authenticate();
  console.log('✅ Authenticated with ZwiftPower\n');
  
  // Get rider results
  const results = await zwiftPowerClient.getRiderResults(150437, 100); // Last 100 results
  
  if (results && results.length > 0) {
    console.log(`✅ Found ${results.length} race results!\n`);
    
    console.log('First result sample:');
    console.log(JSON.stringify(results[0], null, 2));
    
    console.log('\n📊 Last 10 races:');
    results.slice(0, 10).forEach((r: any, i: number) => {
      console.log(`${i + 1}. ${r.event_title || r.name} | Date: ${r.event_date || r.date} | Pos: ${r.position || r.rank} | Event ID: ${r.event_id || r.zid}`);
    });
    
    // Extract unique event IDs
    const eventIds = [...new Set(results.map((r: any) => r.event_id || r.zid || r.eventId).filter(Boolean))];
    console.log(`\n📋 Unique event IDs (${eventIds.length}):`, eventIds.slice(0, 20));
    
  } else {
    console.log('⚠️  No results found');
  }
})();
