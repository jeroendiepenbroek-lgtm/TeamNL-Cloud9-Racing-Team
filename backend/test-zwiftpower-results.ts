import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const zwiftPowerClient = (await import('./src/api/zwiftpower-client.js')).zwiftPowerClient;

(async () => {
  console.log('🧪 Testing ZwiftPower Results API\n');
  
  // Authenticate
  await zwiftPowerClient.authenticate();
  
  // Try different API endpoints
  const zwiftId = 150437;
  
  console.log('1. Testing api3.php?do=rider_results...');
  try {
    const result = await (zwiftPowerClient as any).client.get('/api3.php', {
      params: { do: 'rider_results', zwift_id: zwiftId, limit: 10 }
    });
    console.log('   Status:', result.status);
    console.log('   Data keys:', Object.keys(result.data || {}));
    console.log('   Data:', JSON.stringify(result.data, null, 2).substring(0, 500));
  } catch (e: any) {
    console.log('   Error:', e.message);
  }
  
  console.log('\n2. Testing cache3/profile endpoint...');
  try {
    const result = await (zwiftPowerClient as any).client.get(`/cache3/profile/${zwiftId}_all.json`);
    console.log('   Status:', result.status);
    console.log('   Data keys:', Object.keys(result.data || {}));
    if (result.data?.data?.zRaceResults) {
      console.log('   Race results found:', result.data.data.zRaceResults.length);
    }
  } catch (e: any) {
    console.log('   Error:', e.message);
  }
  
  console.log('\n3. Alternative: Check zwiftracing.app for recent events...');
  const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;
  try {
    const rider = await zwiftClient.getRider(zwiftId);
    console.log('   Rider race stats:');
    console.log('     Finishes:', rider.race?.finishes);
    console.log('     Last race date:', rider.race?.last?.date ? new Date(rider.race.last.date * 1000).toISOString() : 'N/A');
    console.log('     Last rating:', rider.race?.last?.rating);
  } catch (e: any) {
    console.log('   Error:', e.message);
  }
})();
