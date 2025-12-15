// Check Rider Mix-up: 4876589 & 5610202
// Verify the data issue and fix it

const API_BASE = process.env.VITE_API_URL || 'https://teamnl-cloud9-racing-team-production.up.railway.app';

async function checkRiders() {
  console.log('\n🔍 CHECKING RIDER MIX-UP...\n');
  
  // Check our API
  console.log('1️⃣ Checking our database via API...');
  const response = await fetch(`${API_BASE}/api/riders`);
  const data = await response.json();
  
  const rider5610202 = data.riders.find(r => r.rider_id === 5610202);
  const rider4876589 = data.riders.find(r => r.rider_id === 4876589);
  
  console.log('\n📊 Our Database:');
  if (rider5610202) {
    console.log(`Rider 5610202:
    - full_name: ${rider5610202.full_name}
    - racing_name: ${rider5610202.racing_name}
    - weight: ${rider5610202.weight_kg} kg
    - velo: ${rider5610202.velo_live}`);
  } else {
    console.log('Rider 5610202: NOT FOUND');
  }
  
  if (rider4876589) {
    console.log(`\nRider 4876589:
    - full_name: ${rider4876589.full_name}
    - racing_name: ${rider4876589.racing_name}
    - weight: ${rider4876589.weight_kg} kg
    - velo: ${rider4876589.velo_live}`);
  } else {
    console.log('\nRider 4876589: NOT FOUND');
  }
  
  // Check ZwiftRacing API
  console.log('\n\n2️⃣ Checking ZwiftRacing API (correct source)...');
  const zr5610202 = await fetch('https://zwift-ranking.herokuapp.com/api/riders/5610202').then(r => r.json());
  const zr4876589 = await fetch('https://zwift-ranking.herokuapp.com/api/riders/4876589').then(r => r.json());
  
  console.log('\n✅ ZwiftRacing API (CORRECT):');
  console.log(`Rider 5610202:
    - name: ${zr5610202.name}
    - weight: ${zr5610202.weight} kg
    - category: ${zr5610202.zpCat || 'N/A'}`);
  
  console.log(`\nRider 4876589:
    - name: ${zr4876589.name}
    - weight: ${zr4876589.weight} kg
    - category: ${zr4876589.zpCat || 'N/A'}`);
  
  // Analysis
  console.log('\n\n🧐 ANALYSIS:');
  if (rider5610202) {
    const racingNameMismatch = rider5610202.racing_name !== zr5610202.name;
    const weightMismatch = Math.abs(rider5610202.weight_kg - zr5610202.weight) > 1;
    
    if (racingNameMismatch) {
      console.log(`❌ Rider 5610202 has WRONG racing_name:`);
      console.log(`   Database: "${rider5610202.racing_name}"`);
      console.log(`   Should be: "${zr5610202.name}"`);
    }
    if (weightMismatch) {
      console.log(`❌ Rider 5610202 has WRONG weight:`);
      console.log(`   Database: ${rider5610202.weight_kg} kg`);
      console.log(`   Should be: ${zr5610202.weight} kg`);
    }
    
    // Check if it has 4876589's data
    if (rider5610202.racing_name === zr4876589.name) {
      console.log(`\n🚨 CONFIRMED: Rider 5610202 has data from rider 4876589!`);
    }
  }
  
  console.log('\n\n💡 SOLUTION:');
  console.log('1. Delete both riders from api_zwiftracing_riders table');
  console.log('2. Re-sync via POST /api/admin/riders with body: {"rider_ids": [4876589, 5610202]}');
}

checkRiders().catch(console.error);
