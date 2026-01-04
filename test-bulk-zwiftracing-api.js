// Test ZwiftRacing bulk POST endpoint
import axios from 'axios';

const ZWIFTRACING_API_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';

// Test met een paar bekende rider IDs
const testRiderIds = [
  150437,  // Known rider
  8,       // Example from docs
  5574     // Example from docs
];

console.log('🧪 Testing ZwiftRacing bulk POST endpoint...');
console.log(`   Requesting ${testRiderIds.length} riders: ${testRiderIds.join(', ')}`);
console.log('');

try {
  const response = await axios.post(
    'https://api.zwiftracing.app/api/public/riders',
    testRiderIds,
    {
      headers: { 
        'Authorization': ZWIFTRACING_API_TOKEN,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );
  
  console.log('✅ SUCCESS!');
  console.log(`   Status: ${response.status}`);
  console.log(`   Response type: ${Array.isArray(response.data) ? 'Array' : typeof response.data}`);
  
  if (Array.isArray(response.data)) {
    console.log(`   Riders returned: ${response.data.length}`);
    console.log('');
    
    response.data.forEach((rider, index) => {
      console.log(`   Rider ${index + 1}:`);
      console.log(`      Keys:`, Object.keys(rider).join(', '));
      console.log(`      ID (zwiftId): ${rider.zwiftId}`);
      console.log(`      ID (id): ${rider.id}`);
      console.log(`      Name: ${rider.name}`);
      console.log(`      Country: ${rider.country}`);
      console.log(`      Category: ${rider.zpCategory}`);
      console.log(`      FTP: ${rider.zpFTP}`);
      console.log(`      Velo Live: ${rider.race?.current?.rating || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('   Full response:', JSON.stringify(response.data, null, 2));
  }
  
} catch (error) {
  console.error('❌ FAILED');
  if (error.response) {
    console.error(`   Status: ${error.response.status}`);
    console.error(`   Message: ${error.response.statusText}`);
    console.error(`   Data:`, error.response.data);
  } else {
    console.error(`   Error: ${error.message}`);
  }
}
