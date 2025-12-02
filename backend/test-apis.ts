import 'dotenv/config';
import { ZwiftApiClient } from './src/api/zwift-client.js';

const client = new ZwiftApiClient();

console.log('\n🔍 Testing ZwiftRacing.app API structure...\n');

try {
  const rider = await client.getRider(150437);
  
  console.log('✅ Rider Data Structure:');
  console.log(JSON.stringify(rider, null, 2));
  
} catch (error: any) {
  console.error('❌ Error:', error.message);
}

process.exit(0);
