import axios from 'axios';

const API_TOKEN = '650c6d2fc4ef6858d74cbef1';

console.log('🔍 Finding current max eventId...\n');

// Try recent known IDs and work forward
let found = null;
const startId = 5298000;

for (let i = 0; i < 500; i += 50) {
  const testId = startId + i;
  
  try {
    const resp = await axios.get(
      `https://api.zwiftracing.app/api/public/results/${testId}`,
      { headers: { 'Authorization': API_TOKEN }, timeout: 5000 }
    );
    
    found = testId;
    console.log(`✅ Event ${testId} exists: ${resp.data.title}`);
    
  } catch (err) {
    if (found) {
      console.log(`❌ Event ${testId} not found - max is around ${found}`);
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 2000));
}

if (found) {
  console.log(`\n🎯 Max eventId found: ~${found}`);
  console.log(`   Use this range: ${found - 100} to ${found}`);
} else {
  console.log('\n❌ Could not find any events');
}
