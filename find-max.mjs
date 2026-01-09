import axios from 'axios';

const API_TOKEN = '650c6d2fc4ef6858d74cbef1';

console.log('Finding current max eventId...\n');

// Start lower
const testIds = [5298000, 5298200, 5298400, 5298600, 5298800, 5299000];

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
