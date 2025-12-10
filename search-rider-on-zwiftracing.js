const axios = require('axios');

async function searchRider(riderId) {
  console.log(`🔍 Searching for rider ${riderId} on ZwiftRacing.app...\n`);
  
  // Try some known large clubs to see if rider exists anywhere
  const testClubs = [
    2281,  // TeamNL
    11818, // TeamNL Cloud9 (old mock)
    1,     // Some large club
    10,    // Another test
    100,   // Another test
  ];
  
  for (const clubId of testClubs) {
    try {
      console.log(`   Checking club ${clubId}...`);
      const response = await axios.get(`https://zwiftracing.app/api/public/clubs/${clubId}`);
      
      if (response.data && response.data.riders) {
        const rider = response.data.riders.find(r => r.id === riderId);
        if (rider) {
          console.log(`\n✅ FOUND rider ${riderId} in club ${clubId}!`);
          console.log(`   Name: ${rider.name}`);
          console.log(`   vELO: ${rider.velo}`);
          console.log(`   Racing Score: ${rider.racing_score}`);
          console.log(`   FTP: ${rider.ftp}W`);
          console.log(`   Weight: ${rider.weight}kg`);
          console.log(`   Phenotype: ${rider.phenotype}`);
          console.log(`   Race Count: ${rider.race_count}`);
          console.log(`\n💡 You ARE registered on ZwiftRacing.app!`);
          console.log(`💡 Run: node fetch-club-with-riders.js ${clubId}`);
          return rider;
        }
      }
    } catch (error) {
      // Club doesn't exist or error, continue
      if (error.response?.status !== 404) {
        console.log(`      Error: ${error.message}`);
      }
    }
  }
  
  console.log(`\n❌ Rider ${riderId} NOT found on ZwiftRacing.app in tested clubs`);
  console.log(`\n📊 ALTERNATIVE: ZwiftRacing.app has a SEARCH API`);
  console.log(`   Try: https://zwiftracing.app/api/riders/${riderId}`);
  console.log(`   Or search by name: https://zwiftracing.app/search`);
  
  // Try direct rider endpoint
  console.log(`\n🔍 Trying direct rider lookup...`);
  try {
    const response = await axios.get(`https://zwiftracing.app/api/riders/${riderId}`);
    if (response.data) {
      console.log(`✅ FOUND via direct API!`);
      console.log(JSON.stringify(response.data, null, 2));
      return response.data;
    }
  } catch (error) {
    console.log(`❌ Direct rider lookup failed: ${error.response?.status || error.message}`);
  }
  
  console.log(`\n💡 CONCLUSION:`);
  console.log(`   Rider ${riderId} is NOT registered on ZwiftRacing.app`);
  console.log(`   This means NO vELO, power curve, or phenotype data available`);
  console.log(`   Only Zwift Official data (racing score 553) will be shown`);
}

searchRider(150437);
