/**
 * Test Sync Services - Verify all new US1-US4 features
 */

import 'dotenv/config';

async function testSyncServices() {
  const BASE_URL = process.env.API_URL || 'http://localhost:3000';
  
  console.log('🧪 Testing Sync Services...\n');
  console.log(`API Base URL: ${BASE_URL}\n`);
  
  // Test 1: Smart Scheduler Status
  console.log('1️⃣  Testing Smart Scheduler Status (US4)...');
  try {
    const res = await fetch(`${BASE_URL}/api/scheduler/status`);
    const data = await res.json();
    
    if (data.success) {
      console.log('   ✅ Smart Scheduler Status:');
      console.log(`      Running: ${data.running}`);
      console.log(`      Mode: ${data.currentMode}`);
      console.log(`      Current Hour: ${data.currentHour}`);
      console.log(`      Intervals:`, data.intervals);
    } else {
      console.log('   ⚠️  Smart Scheduler might be disabled (USE_SMART_SCHEDULER=false)');
      console.log('      Response:', data);
    }
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('');
  
  // Test 2: Rider Deltas (US2)
  console.log('2️⃣  Testing Rider Deltas API (US2)...');
  try {
    const res = await fetch(`${BASE_URL}/api/riders/deltas?hours=24`);
    const data = await res.json();
    
    if (data.success) {
      console.log('   ✅ Rider Deltas:');
      console.log(`      Total changes: ${data.count}`);
      console.log(`      Time range: ${data.hours}h`);
      if (data.deltas && data.deltas.length > 0) {
        console.log(`      Recent changes:`, data.deltas.slice(0, 3));
      } else {
        console.log('      No recent changes (run rider sync first)');
      }
    } else {
      console.log('   ❌ Error:', data.error);
    }
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('');
  
  // Test 3: Results Dashboard Data (US1)
  console.log('3️⃣  Testing Results Dashboard Data (US1)...');
  try {
    const res = await fetch(`${BASE_URL}/api/results/team/recent?days=7&limit=5`);
    const data = await res.json();
    
    if (data.success) {
      console.log('   ✅ Results Dashboard:');
      console.log(`      Events: ${data.events_count}`);
      console.log(`      Total results: ${data.count}`);
      
      if (data.events && data.events.length > 0) {
        const firstEvent = data.events[0];
        console.log(`      Latest event: ${firstEvent.event_name}`);
        console.log(`      Results count: ${firstEvent.results.length}`);
        
        if (firstEvent.results.length > 0) {
          const firstResult = firstEvent.results[0];
          console.log(`      Sample result fields:`, {
            rider_name: firstResult.rider_name,
            position_in_category: firstResult.position_in_category,
            heartrate_avg: firstResult.heartrate_avg,
            heartrate_max: firstResult.heartrate_max,
            velo_rating: firstResult.velo_rating,
          });
        }
      }
    } else {
      console.log('   ❌ Error:', data.error);
    }
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('');
  
  // Test 4: Sync Logs
  console.log('4️⃣  Testing Sync Logs...');
  try {
    const res = await fetch(`${BASE_URL}/api/sync-logs?limit=5`);
    const data = await res.json();
    
    if (data.logs) {
      console.log('   ✅ Recent Sync Logs:');
      data.logs.forEach((log: any) => {
        console.log(`      ${log.endpoint}: ${log.status} (${log.records_processed} records)`);
      });
    } else {
      console.log('   ❌ No logs found');
    }
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('');
  
  // Test 5: Health Check
  console.log('5️⃣  Testing Health Endpoint...');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    
    if (data.status === 'ok') {
      console.log('   ✅ Health Check:');
      console.log(`      Status: ${data.status}`);
      console.log(`      Service: ${data.service}`);
      console.log(`      Version: ${data.version}`);
    } else {
      console.log('   ❌ Health check failed:', data);
    }
  } catch (error: any) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('\n✅ Test Suite Complete!\n');
  
  // Summary
  console.log('📋 Deployment Checklist:');
  console.log('   □ Smart Scheduler running (USE_SMART_SCHEDULER=true)');
  console.log('   □ Rider deltas API accessible');
  console.log('   □ Results dashboard returns heartrate fields');
  console.log('   □ Sync logs show recent activity');
  console.log('   □ Health endpoint returns OK');
  console.log('\n💡 If tests fail, check Railway logs and environment variables\n');
}

// Run tests
testSyncServices().catch(console.error);
