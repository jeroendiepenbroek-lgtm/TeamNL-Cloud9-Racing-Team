/**
 * COMPLETE API STRUCTURE TEST - Rider 150437
 * Test alle ZwiftRacing.app endpoints en log volledige response structure
 */

const API_KEY = '650c6d2fc4ef6858d74cbef1';
const BASE_URL = 'https://zwift-ranking.herokuapp.com';
const RIDER_ID = 150437;

interface TestResult {
  endpoint: string;
  status: number;
  hasHistory: boolean;
  historyCount?: number;
  topLevelKeys: string[];
  nestedStructure: any;
}

async function testEndpoint(endpoint: string, description: string): Promise<TestResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Testing: ${description}`);
  console.log(`📍 Endpoint: ${endpoint}`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Authorization': API_KEY }
    });
    
    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: ${response.statusText}\n`);
      return {
        endpoint,
        status: response.status,
        hasHistory: false,
        topLevelKeys: [],
        nestedStructure: null
      };
    }
    
    const data = await response.json();
    
    // Check if array or object
    const isArray = Array.isArray(data);
    const sample = isArray ? data[0] : data;
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📦 Type: ${isArray ? 'Array' : 'Object'}`);
    if (isArray) console.log(`📊 Count: ${data.length} items`);
    console.log('');
    
    // Top-level keys
    const topKeys = Object.keys(sample || {}).sort();
    console.log(`🔑 Top-level keys (${topKeys.length}):`);
    topKeys.forEach(key => {
      const val = sample[key];
      const type = Array.isArray(val) ? `Array[${val.length}]` : typeof val;
      console.log(`   - ${key}: ${type}`);
    });
    
    // Check for history
    const hasHistory = 'history' in (sample || {});
    let historyCount = 0;
    
    if (hasHistory) {
      historyCount = Array.isArray(sample.history) ? sample.history.length : 0;
      console.log(`\n🎯 HISTORY FOUND!`);
      console.log(`   Count: ${historyCount} items`);
      
      if (historyCount > 0) {
        console.log(`   Sample history item keys:`, Object.keys(sample.history[0]).sort());
        console.log(`\n   First 3 history items:`);
        sample.history.slice(0, 3).forEach((h: any, i: number) => {
          console.log(`   [${i}] ${JSON.stringify(h).substring(0, 150)}...`);
        });
      }
    } else {
      console.log(`\n⚠️  NO 'history' field found`);
    }
    
    // Nested structure analysis
    console.log(`\n📂 Nested structures:`);
    topKeys.forEach(key => {
      const val = sample[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const nestedKeys = Object.keys(val);
        console.log(`   ${key}: { ${nestedKeys.join(', ')} }`);
      }
    });
    
    // Full sample (first 2000 chars)
    console.log(`\n📄 Sample data (first 2000 chars):`);
    console.log(JSON.stringify(sample, null, 2).substring(0, 2000));
    console.log('...\n');
    
    return {
      endpoint,
      status: response.status,
      hasHistory,
      historyCount,
      topLevelKeys: topKeys,
      nestedStructure: sample
    };
    
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}\n`);
    return {
      endpoint,
      status: 0,
      hasHistory: false,
      topLevelKeys: [],
      nestedStructure: null
    };
  }
}

async function testAllEndpoints() {
  console.log('\n🚀 COMPLETE API STRUCTURE TEST - Rider 150437\n');
  
  const results: TestResult[] = [];
  
  // Test 1: GET /public/riders/{riderId}
  results.push(await testEndpoint(
    `/public/riders/${RIDER_ID}`,
    'GET /public/riders/{riderId} - Current rider data'
  ));
  
  await new Promise(r => setTimeout(r, 13000)); // Rate limit
  
  // Test 2: GET /public/riders/{riderId}/{timestamp} (30 dagen geleden)
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
  results.push(await testEndpoint(
    `/public/riders/${RIDER_ID}/${thirtyDaysAgo}`,
    `GET /public/riders/{riderId}/{timestamp} - Historical snapshot (30d ago)`
  ));
  
  await new Promise(r => setTimeout(r, 13000)); // Rate limit
  
  // Test 3: POST /public/riders (bulk met 1 rider)
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Testing: POST /public/riders - Bulk fetch (1 rider)`);
  console.log(`📍 Endpoint: POST /public/riders`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const bulkResponse = await fetch(`${BASE_URL}/public/riders`, {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([RIDER_ID])
    });
    
    if (bulkResponse.ok) {
      const bulkData = await bulkResponse.json();
      const bulkSample = bulkData[0];
      
      console.log(`✅ Status: ${bulkResponse.status}`);
      console.log(`📦 Type: Array`);
      console.log(`📊 Count: ${bulkData.length} items`);
      console.log('');
      
      const bulkKeys = Object.keys(bulkSample).sort();
      console.log(`🔑 Top-level keys (${bulkKeys.length}):`);
      bulkKeys.forEach(key => {
        const val = bulkSample[key];
        const type = Array.isArray(val) ? `Array[${val.length}]` : typeof val;
        console.log(`   - ${key}: ${type}`);
      });
      
      const bulkHasHistory = 'history' in bulkSample;
      if (bulkHasHistory) {
        const bulkHistoryCount = Array.isArray(bulkSample.history) ? bulkSample.history.length : 0;
        console.log(`\n🎯 HISTORY FOUND!`);
        console.log(`   Count: ${bulkHistoryCount} items`);
      } else {
        console.log(`\n⚠️  NO 'history' field found`);
      }
      
      results.push({
        endpoint: 'POST /public/riders',
        status: bulkResponse.status,
        hasHistory: bulkHasHistory,
        historyCount: bulkHasHistory ? bulkSample.history.length : 0,
        topLevelKeys: bulkKeys,
        nestedStructure: bulkSample
      });
    } else {
      console.log(`❌ HTTP ${bulkResponse.status}: ${bulkResponse.statusText}`);
    }
  } catch (err: any) {
    console.log(`❌ Error: ${err.message}`);
  }
  
  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 SUMMARY - HISTORY FIELD ANALYSIS`);
  console.log(`${'='.repeat(80)}\n`);
  
  results.forEach(r => {
    console.log(`${r.hasHistory ? '✅' : '❌'} ${r.endpoint}`);
    console.log(`   Status: ${r.status}`);
    console.log(`   Keys: ${r.topLevelKeys.length}`);
    console.log(`   History: ${r.hasHistory ? `YES (${r.historyCount} items)` : 'NO'}`);
    console.log('');
  });
  
  // Final verdict
  const hasHistoryAnywhere = results.some(r => r.hasHistory);
  console.log(`${'='.repeat(80)}`);
  if (hasHistoryAnywhere) {
    console.log(`🎉 CONCLUSIE: HISTORY FIELD GEVONDEN!`);
    const withHistory = results.filter(r => r.hasHistory);
    console.log(`\nEndpoints met history:`);
    withHistory.forEach(r => {
      console.log(`   - ${r.endpoint}: ${r.historyCount} items`);
    });
  } else {
    console.log(`⚠️  CONCLUSIE: GEEN HISTORY FIELD IN RIDER ENDPOINTS`);
    console.log(`\nVoor race history moet je per event de results ophalen:`);
    console.log(`   GET /public/results/{eventId}`);
  }
  console.log(`${'='.repeat(80)}\n`);
}

testAllEndpoints();
