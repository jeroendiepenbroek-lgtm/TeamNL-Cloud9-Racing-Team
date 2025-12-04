import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;

(async () => {
  console.log('🔍 Checking rider 150437 race results...\n');
  
  // Get rider details first
  const rider = await zwiftClient.getRider(150437);
  console.log('Rider:', rider.name);
  console.log('Race stats:', {
    finishes: rider.race?.finishes,
    wins: rider.race?.wins,
    podiums: rider.race?.podiums,
    dnfs: rider.race?.dnfs
  });
  console.log('\n📊 Checking API client methods...');
  
  // Check available methods
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(zwiftClient))
    .filter(m => m !== 'constructor');
  
  console.log('Available methods:', methods.join(', '));
  
  // Check if there's a rider results endpoint
  if (methods.includes('getRiderResults')) {
    console.log('\n✅ getRiderResults method exists!');
    const results = await (zwiftClient as any).getRiderResults(150437);
    console.log('Results:', results?.length || 0, 'races');
    if (results?.[0]) {
      console.log('\nFirst result sample:', JSON.stringify(results[0], null, 2));
    }
  } else {
    console.log('\n⚠️  No getRiderResults method found');
    console.log('Need to check ZwiftRacing API docs for rider results endpoint');
  }
})();
