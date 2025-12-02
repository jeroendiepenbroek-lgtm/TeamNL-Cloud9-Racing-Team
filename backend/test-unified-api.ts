import 'dotenv/config';

async function testUnifiedAPI() {
  const API_BASE = process.env.API_URL || 'http://localhost:3000';
  
  console.log('\n🔍 Testing Unified Dashboard API v2...\n');
  
  try {
    // Test 1: Rider detailed endpoint (POC rider 150437)
    console.log('📊 Test 1: GET /api/v2/riders/150437/detailed\n');
    
    const riderResponse = await fetch(`${API_BASE}/api/v2/riders/150437/detailed`);
    const riderData = await riderResponse.json();
    
    if (riderData.success) {
      console.log('✅ Rider detailed data:');
      console.log(`   Name: ${riderData.rider.name}`);
      console.log(`   vELO: ${riderData.rider.velo_current} (${riderData.rider.velo_tier})`);
      console.log(`   FTP: ${riderData.rider.ftp}W`);
      console.log(`   Weight: ${riderData.rider.weight_kg}kg`);
      console.log(`   W/kg: ${riderData.rider.watts_per_kg}`);
      console.log(`   ZP Category: ${riderData.rider.zp_category}`);
      console.log(`   Data Completeness: ${riderData.rider.data_completeness}%`);
      console.log(`   Races (90d): ${riderData.rider.race_finishes} finishes, ${riderData.rider.race_wins} wins, ${riderData.rider.race_podiums} podiums`);
      console.log(`   Recent Activities: ${riderData.recent_activities.length} rides`);
      console.log(`   vELO History Points: ${riderData.velo_history.length}`);
    } else {
      console.error('❌ Error:', riderData.error);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test 2: Matrix endpoint (all team riders)
    console.log('📊 Test 2: GET /api/v2/riders/matrix\n');
    
    const matrixResponse = await fetch(`${API_BASE}/api/v2/riders/matrix`);
    const matrixData = await matrixResponse.json();
    
    if (matrixData.success) {
      console.log(`✅ Matrix data: ${matrixData.count} team riders`);
      console.log(`   Top 3 by vELO:`);
      matrixData.riders.slice(0, 3).forEach((r: any, i: number) => {
        console.log(`   ${i+1}. ${r.name} - ${r.race_last_rating || 'N/A'} vELO`);
      });
    } else {
      console.error('❌ Error:', matrixData.error);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testUnifiedAPI();
