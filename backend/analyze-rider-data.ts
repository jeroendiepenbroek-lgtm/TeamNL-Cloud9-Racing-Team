import dotenv from 'dotenv';
dotenv.config();

const zwiftClient = (await import('./src/api/zwift-client.js')).zwiftClient;

(async () => {
  console.log('🔍 Analyzing rider 150437 complete data structure...\n');
  
  const rider = await zwiftClient.getRider(150437);
  
  // Show all top-level keys
  console.log('📋 Top-level keys:');
  Object.keys(rider).sort().forEach(key => {
    const value = rider[key];
    const type = Array.isArray(value) ? `Array(${value.length})` : typeof value;
    console.log(`  ${key}: ${type}`);
  });
  
  // Deep dive into race object
  if (rider.race) {
    console.log('\n🏁 Race object structure:');
    console.log(JSON.stringify(rider.race, null, 2));
  }
  
  // Check for any array fields that might contain race history
  console.log('\n📊 Array fields:');
  Object.keys(rider).forEach(key => {
    if (Array.isArray(rider[key]) && rider[key].length > 0) {
      console.log(`\n${key} (${rider[key].length} items):`);
      console.log('First item:', JSON.stringify(rider[key][0], null, 2).substring(0, 300));
    }
  });
})();
