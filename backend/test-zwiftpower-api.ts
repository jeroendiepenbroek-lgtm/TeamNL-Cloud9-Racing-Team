import { zwiftClient } from './src/api/zwift-client.js';

const TEST_RIDER_ID = 150437;

async function testZwiftPowerAPI() {
  console.log('=== ZWIFTPOWER API TEST ===\n');
  console.log(`Testing rider: ${TEST_RIDER_ID}\n`);
  
  try {
    // Test 1: Direct rider endpoint
    console.log('1. Testing GET /public/riders/${TEST_RIDER_ID}');
    const riderData = await zwiftClient.getRider(TEST_RIDER_ID);
    console.log(`   ✅ ZwiftRacing API: FTP=${riderData.zpFTP}, Category=${riderData.zpCategory}`);
    
    // Test 2: Try to find a recent event with this rider
    console.log('\n2. Looking for recent race with ZwiftPower results...');
    
    // Known event IDs to test (replace with actual event IDs)
    const testEventIds = [5190621, 5190620, 5190619]; // Recent events
    
    for (const eventId of testEventIds) {
      try {
        console.log(`\n   Testing event ${eventId}...`);
        
        // Try ZwiftRacing results
        const racingResults = await zwiftClient.getEventResults(eventId);
        const riderInRacing = racingResults.find(r => r.riderId === TEST_RIDER_ID);
        
        if (riderInRacing) {
          console.log(`   ✅ Found rider in ZwiftRacing results`);
          console.log(`      Position: ${riderInRacing.position}`);
          console.log(`      Result keys:`, Object.keys(riderInRacing));
        }
        
        // Try ZwiftPower results
        const zpResults = await zwiftClient.getEventResultsZwiftPower(eventId);
        console.log(`   ZwiftPower results count: ${zpResults.length}`);
        
        if (zpResults.length > 0) {
          console.log(`   First result keys:`, Object.keys(zpResults[0]));
          
          // Try to find rider
          const riderInZP = zpResults.find(r => 
            r.zwid === TEST_RIDER_ID || 
            r.rider_id === TEST_RIDER_ID ||
            r.riderId === TEST_RIDER_ID
          );
          
          if (riderInZP) {
            console.log(`   ✅ Found rider in ZwiftPower results!`);
            console.log(`      Full data:`, JSON.stringify(riderInZP, null, 2));
            
            // Extract FTP and category
            const zpFtp = riderInZP.ftp || riderInZP.rider_ftp || riderInZP.zFTP;
            const zpCat = riderInZP.category || riderInZP.cat || riderInZP.zpCategory;
            
            console.log(`\n   📊 ZwiftPower extracted data:`);
            console.log(`      FTP: ${zpFtp}W`);
            console.log(`      Category: ${zpCat}`);
            
            return; // Found data, exit
          }
        }
        
      } catch (error: any) {
        console.log(`   ⚠️  Event ${eventId}: ${error.message}`);
      }
    }
    
    console.log('\n⚠️  No ZwiftPower results found with rider data');
    console.log('💡 Try adding more event IDs or use direct ZwiftPower cache endpoint');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testZwiftPowerAPI();
