import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;

(async () => {
  const event = await zwiftClient.getEventDetails(5229579);
  console.log('Event keys:', Object.keys(event));
  console.log('\nEvent sample:', JSON.stringify(event, null, 2));
})();
