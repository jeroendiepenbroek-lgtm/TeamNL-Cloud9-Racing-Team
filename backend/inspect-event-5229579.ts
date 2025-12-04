import 'dotenv/config';
import { zwiftClient } from './src/api/zwift-client.js';

async function inspectEvent() {
  const eventId = 5229579; // 30-11 race
  
  console.log(`🔍 Inspecting Event ${eventId}\n`);
  
  try {
    const results = await zwiftClient.getEventResults(eventId);
    
    console.log(`✅ Got ${results.length} riders\n`);
    
    // Find rider 150437
    const rider = results.find((r: any) => r.riderId === 150437);
    
    if (rider) {
      console.log('🎯 Rider 150437 RAW data:');
      console.log(JSON.stringify(rider, null, 2));
      
      console.log('\n📋 Available fields:');
      console.log(Object.keys(rider).sort().join(', '));
    } else {
      console.log('❌ Rider 150437 not found');
      console.log('\n Sample rider structure:');
      console.log(JSON.stringify(results[0], null, 2));
    }
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

inspectEvent().catch(console.error);
