import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;

(async () => {
  console.log('🔍 Checking rider 150437 race history...\n');
  
  const rider = await zwiftClient.getRider(150437);
  
  console.log('Available fields:', Object.keys(rider));
  console.log('\nRace data:', JSON.stringify(rider.race, null, 2));
  
  // Check if there's a history or results field
  if (rider.history) {
    console.log('\n📜 History found:', rider.history);
  }
  
  if (rider.results) {
    console.log('\n🏁 Results found:', rider.results);
  }
  
  if (rider.races) {
    console.log('\n🏆 Races found:', rider.races);
  }
})();
