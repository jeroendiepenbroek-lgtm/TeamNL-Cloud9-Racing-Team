import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;

(async () => {
  const results = await zwiftClient.getEventResults(5229579);
  console.log('Results count:', results.length);
  console.log('\nFirst result keys:', Object.keys(results[0]));
  console.log('\nFirst result sample:', JSON.stringify(results[0], null, 2));
})();
