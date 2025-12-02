import 'dotenv/config';
import { ZwiftPowerClient } from './src/api/zwiftpower-client.js';

async function testEventFetch() {
  const client = new ZwiftPowerClient();
  
  console.log('\n🔍 Testing ZwiftPower event 5229579 fetch...\n');
  
  try {
    const result = await client.getRiderFromEvent(5229579, 150437);
    
    if (result) {
      console.log('✅ Event fetch successful:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Event fetch returned null - rider not found in event');
      
      console.log('\n🔍 Trying profile cache as fallback...\n');
      const fallback = await client.getRider(150437);
      console.log('Profile cache result:');
      console.log(JSON.stringify(fallback, null, 2));
    }
  } catch (error) {
    console.error('❌ Error during fetch:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testEventFetch();
