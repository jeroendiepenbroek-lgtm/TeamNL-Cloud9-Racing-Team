import axios from 'axios';

const API_TOKEN = '650c6d2fc4ef6858d74cbef1';

console.log('Testing MUCH lower eventIds...\n');

// Try much lower - go back 2 years worth
const testIds = [5200000, 5250000, 5270000, 5290000, 5295000];

for (const id of testIds) {
  try {
    const resp = await axios.get(
      `https://api.zwiftracing.app/api/public/results/${id}`,
      { headers: { 'Authorization': API_TOKEN }, timeout: 5000 }
    );
    const date = new Date(resp.data.time * 1000).toISOString();
    console.log(`✅ ${id}: ${date} - ${resp.data.title}`);
  } catch (err) {
    console.log(`❌ ${id}: Not found`);
  }
  await new Promise(r => setTimeout(r, 2000));
}

// If 5290000 works, try +1000 increments
console.log('\nTrying increments from 5290000...\n');

for (let offset = 1000; offset <= 5000; offset += 1000) {
  const id = 5290000 + offset;
  try {
    const resp = await axios.get(
      `https://api.zwiftracing.app/api/public/results/${id}`,
      { headers: { 'Authorization': API_TOKEN }, timeout: 5000 }
    );
    const date = new Date(resp.data.time * 1000).toISOString();
    console.log(`✅ ${id}: ${date}`);
  } catch (err) {
    console.log(`❌ ${id}: Not found`);
    break;
  }
  await new Promise(r => setTimeout(r, 2000));
}
