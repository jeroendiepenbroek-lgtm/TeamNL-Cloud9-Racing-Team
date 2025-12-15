#!/usr/bin/env node

/**
 * Test script for sync config endpoints
 * Tests GET, POST, and persistence of configuration
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function testGetConfig() {
  console.log('\n📖 TEST 1: GET sync config');
  console.log('='.repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/api/admin/sync-config`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ GET /api/admin/sync-config SUCCESS');
      console.log('Response:', JSON.stringify(data, null, 2));
      return data;
    } else {
      console.log('❌ GET /api/admin/sync-config FAILED');
      console.log('Error:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function testUpdateConfig(intervalMinutes) {
  console.log(`\n✏️  TEST 2: POST sync config (interval=${intervalMinutes})`);
  console.log('='.repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/api/admin/sync-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        intervalMinutes
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ POST /api/admin/sync-config SUCCESS');
      console.log('Response:', JSON.stringify(data, null, 2));
      return data;
    } else {
      console.log('❌ POST /api/admin/sync-config FAILED');
      console.log('Error:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function testGetSyncLogs() {
  console.log('\n📋 TEST 3: GET sync logs');
  console.log('='.repeat(50));
  
  try {
    const response = await fetch(`${API_URL}/api/admin/sync-logs?limit=5`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ GET /api/admin/sync-logs SUCCESS');
      console.log(`Found ${data.logs.length} recent logs:`);
      
      data.logs.forEach((log, i) => {
        const emoji = log.trigger_type === 'auto' ? '🤖' : 
                     log.trigger_type === 'manual' ? '👤' : 
                     log.trigger_type === 'upload' ? '📤' : '🔧';
        
        console.log(`  ${i + 1}. ${emoji} ${log.sync_type} (${log.trigger_type}): ${log.success_count} success, ${log.failed_count} failed - ${new Date(log.started_at).toLocaleTimeString()}`);
      });
      
      return data;
    } else {
      console.log('❌ GET /api/admin/sync-logs FAILED');
      console.log('Error:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 TESTING SYNC CONFIG ENDPOINTS');
  console.log('API URL:', API_URL);
  console.log('='.repeat(50));
  
  // Test 1: Get current config
  const currentConfig = await testGetConfig();
  if (!currentConfig) {
    console.log('\n❌ Failed to get config, stopping tests');
    return;
  }
  
  const originalInterval = currentConfig.intervalMinutes || 60;
  
  // Test 2: Update to 30 minutes
  const updated30 = await testUpdateConfig(30);
  if (!updated30) {
    console.log('\n❌ Failed to update config to 30 minutes');
    return;
  }
  
  // Test 3: Verify persistence by getting config again
  console.log('\n🔍 TEST 3: Verify persistence');
  console.log('='.repeat(50));
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
  
  const verifyConfig = await testGetConfig();
  if (verifyConfig && verifyConfig.intervalMinutes === 30) {
    console.log('✅ Config persisted correctly! intervalMinutes = 30');
  } else {
    console.log(`❌ Config NOT persisted! Expected 30, got ${verifyConfig?.intervalMinutes}`);
  }
  
  // Test 4: Get sync logs
  await testGetSyncLogs();
  
  // Test 5: Restore original interval
  console.log(`\n♻️  TEST 5: Restore original interval (${originalInterval})`);
  console.log('='.repeat(50));
  
  const restored = await testUpdateConfig(originalInterval);
  if (restored && restored.config.intervalMinutes === originalInterval) {
    console.log(`✅ Config restored to ${originalInterval} minutes`);
  } else {
    console.log(`⚠️  Config may not be restored correctly`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✨ ALL TESTS COMPLETE');
  console.log('='.repeat(50) + '\n');
}

runTests().catch(console.error);
