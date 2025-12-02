import { ZwiftApiClient } from './src/api/zwift-client.js';

(async () => {
  const client = new ZwiftApiClient();
  const rider = await client.getRider(150437);
  
  console.log('\n=== RACE OBJECT ===');
  console.log(JSON.stringify(rider.race, null, 2));
  
  console.log('\n=== VELO RATING PATH ===');
  console.log('rider.race.current:', rider.race?.current);
  console.log('rider.race.current.rating:', rider.race?.current?.rating);
  console.log('rider.race.current.mixed:', rider.race?.current?.mixed);
  console.log('rider.race.current.mixed.rating:', rider.race?.current?.mixed?.rating);
})();
