import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;

(async () => {
  console.log('�� Getting rider 150437 complete data including history...\n');
  
  const rider = await zwiftClient.getRider(150437);
  
  console.log('Rider:', rider.name);
  console.log('Race stats:', rider.race);
  
  // Check all top-level keys
  const keys = Object.keys(rider).sort();
  console.log('\n📋 All rider keys:', keys.join(', '));
  
  // Check for history or results fields
  if (rider.history) {
    console.log('\n✅ History field exists!');
    console.log('History items:', rider.history.length);
    if (rider.history.length > 0) {
      console.log('\nFirst history item:');
      console.log(JSON.stringify(rider.history[0], null, 2));
      
      console.log('\nLast 5 history items:');
      rider.history.slice(-5).forEach((h: any, i: number) => {
        console.log(`${i + 1}. Date: ${new Date(h.date * 1000).toISOString()} | Rating: ${h.rating} | Event: ${h.eventId || 'N/A'}`);
      });
    }
  } else {
    console.log('\n⚠️  No history field found');
  }
  
  // Check for any results-related fields
  const resultKeys = keys.filter(k => k.toLowerCase().includes('result') || k.toLowerCase().includes('race') || k.toLowerCase().includes('event'));
  if (resultKeys.length > 0) {
    console.log('\n📊 Result-related keys:', resultKeys.join(', '));
    resultKeys.forEach(key => {
      console.log(`\n${key}:`, JSON.stringify(rider[key], null, 2).substring(0, 200));
    });
  }
})();
