/**
 * STANDALONE TEST - Results Sync voor Rider 150437
 * Test zonder andere services te raken
 */

import { ZwiftApiClient } from './src/api/zwift-client.js';
import { SupabaseService } from './src/services/supabase.service.js';

async function testRiderResultsSync() {
  console.log('🧪 Testing Results Sync for Rider 150437');
  console.log('='.repeat(60));

  const zwiftApi = new ZwiftApiClient();
  const supabase = new SupabaseService();
  
  try {
    // Step 1: Fetch rider data with history
    console.log('\n📥 Step 1: Fetching rider 150437 from ZwiftRacing API...');
    const riderData = await zwiftApi.getRider(150437);
    
    console.log(`✅ Rider: ${riderData.name}`);
    console.log(`   Race finishes: ${riderData.race?.finishes || 0}`);
    console.log(`   Rating: ${riderData.race?.rating || 'N/A'}`);
    
    // Step 2: Check history field
    console.log('\n📜 Step 2: Checking history field...');
    const history = (riderData as any).history;
    
    if (!history) {
      console.error('❌ No history field found!');
      console.log('Available fields:', Object.keys(riderData));
      return;
    }
    
    console.log(`✅ Found ${history.length} history items`);
    
    if (history.length > 0) {
      const sample = history[0];
      console.log('\n📊 Sample history item:');
      console.log(JSON.stringify(sample, null, 2));
    }
    
    // Step 3: Try to save first result
    console.log('\n💾 Step 3: Saving first result to database...');
    
    if (history.length > 0) {
      const firstResult = history[0];
      
      const resultData = {
        event_id: parseInt(firstResult.event?.id || 0),
        rider_id: firstResult.riderId,
        position: firstResult.position,
        time_seconds: firstResult.time,
        power_avg: firstResult.power?.avg || null,
        power_max: firstResult.power?.max || null,
        heartrate_avg: firstResult.heartRate?.avg || null,
        heartrate_max: firstResult.heartRate?.max || null,
        weight: firstResult.weight || null,
        height: firstResult.height || null,
        category: firstResult.category || null,
        rating_before: firstResult.ratingBefore || null,
        rating_after: firstResult.rating || null,
        rating_change: firstResult.ratingDelta || null,
        event_date: new Date(firstResult.event.time * 1000).toISOString(),
        finish_status: firstResult.dnf ? 'DNF' : 'FINISHED'
      };
      
      console.log('Saving:', resultData);
      
      await supabase.saveRaceResult(resultData);
      
      console.log('✅ Result saved successfully!');
    }
    
    // Step 4: Verify in database
    console.log('\n🔍 Step 4: Verifying in database...');
    const results = await supabase.getRiderResults(150437, 90, 5);
    console.log(`✅ Found ${results.length} results in database`);
    
    if (results.length > 0) {
      console.log('\n📊 First result from DB:');
      console.log(JSON.stringify(results[0], null, 2));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    
  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testRiderResultsSync();
