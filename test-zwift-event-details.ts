/**
 * Test Zwift Official API - Event Details
 * Doel: Volledige event/race details ophalen van laatste race rider 150437
 */

const ZWIFT_USERNAME = 'jeroen.diepenbroek@gmail.com';
const ZWIFT_PASSWORD = 'CloudRacer-9';
const RIDER_ID = 150437;

// Laatste race van rider 150437 (uit eerdere test)
const LAST_RACE = {
  id: "2022697959300300800",
  name: "Zwift - Race: Zwift Epic Race - Snowman (B) on Snowman in Watopia",
  startDate: "2025-12-06T14:56:44.732+0000",
  distanceInMeters: 44571.9,
  duration: "77 minutes"
};

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getOAuthToken(): Promise<string> {
  console.log('🔐 OAuth 2.0 Token Request\n');
  
  const tokenUrl = 'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token';
  const params = new URLSearchParams({
    client_id: 'Zwift_Mobile_Link',
    username: ZWIFT_USERNAME,
    password: ZWIFT_PASSWORD,
    grant_type: 'password'
  });
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  if (!response.ok) {
    throw new Error(`OAuth failed: ${response.status}`);
  }
  
  const data: OAuthTokenResponse = await response.json();
  console.log('✅ Token received (expires in', data.expires_in, 'seconds)\n');
  
  return data.access_token;
}

async function testEndpoint(url: string, token: string, label: string): Promise<any> {
  console.log(`\n🔍 Testing: ${label}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      const fieldCount = typeof data === 'object' ? Object.keys(data).length : 0;
      console.log(`   ✅ Success! Fields: ${fieldCount}`);
      return { success: true, data, url };
    } else {
      const errorText = await response.text();
      console.log(`   ❌ Error: ${errorText.substring(0, 100)}`);
      return { success: false, error: errorText, url };
    }
  } catch (error) {
    console.log(`   ❌ Exception:`, error instanceof Error ? error.message : String(error));
    return { success: false, error: error instanceof Error ? error.message : String(error), url };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('ZWIFT OFFICIAL API - EVENT DETAILS TEST');
  console.log('='.repeat(80));
  console.log('Rider:', RIDER_ID);
  console.log('Last Race:', LAST_RACE.name);
  console.log('Activity ID:', LAST_RACE.id);
  console.log('Date:', LAST_RACE.startDate);
  console.log('='.repeat(80));
  
  // Step 1: Get OAuth token
  const token = await getOAuthToken();
  
  // Step 2: Test verschillende endpoints voor event details
  console.log('\n' + '='.repeat(80));
  console.log('TESTING EVENT/ACTIVITY ENDPOINTS');
  console.log('='.repeat(80));
  
  const baseUrl = 'https://us-or-rly101.zwift.com/api';
  const activityId = LAST_RACE.id;
  
  const endpointsToTest = [
    // Activity details
    { url: `${baseUrl}/activities/${activityId}`, label: 'Activity Details' },
    { url: `${baseUrl}/activity/${activityId}`, label: 'Activity (singular)' },
    
    // Profile activities (already tested, maar voor completeness)
    { url: `${baseUrl}/profiles/${RIDER_ID}/activities`, label: 'Profile Activities List' },
    { url: `${baseUrl}/profiles/${RIDER_ID}/activities?start=0&limit=1`, label: 'Profile Activities (paginated)' },
    
    // Event/Race specific
    { url: `${baseUrl}/events/${activityId}`, label: 'Event Details' },
    { url: `${baseUrl}/event/${activityId}`, label: 'Event (singular)' },
    
    // Results
    { url: `${baseUrl}/results/${activityId}`, label: 'Race Results' },
    { url: `${baseUrl}/activity/${activityId}/results`, label: 'Activity Results' },
    { url: `${baseUrl}/events/${activityId}/results`, label: 'Event Results' },
    
    // Segments/splits
    { url: `${baseUrl}/activities/${activityId}/segments`, label: 'Activity Segments' },
    { url: `${baseUrl}/activities/${activityId}/splits`, label: 'Activity Splits' },
    
    // Feed/streams
    { url: `${baseUrl}/activities/${activityId}/feed`, label: 'Activity Feed' },
    { url: `${baseUrl}/activities/${activityId}/streams`, label: 'Activity Streams' },
    
    // Alternative paths
    { url: `${baseUrl}/v1/activities/${activityId}`, label: 'Activity Details (v1)' },
    { url: `${baseUrl}/v1/events/${activityId}`, label: 'Event Details (v1)' },
  ];
  
  const results: any[] = [];
  
  for (const endpoint of endpointsToTest) {
    const result = await testEndpoint(endpoint.url, token, endpoint.label);
    results.push({ ...endpoint, ...result });
    
    // Small delay om rate limiting te vermijden
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Step 3: Samenvatting
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful endpoints: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.label}`);
    console.log(`     ${r.url}`);
  });
  
  console.log(`\n❌ Failed endpoints: ${failed.length}`);
  failed.forEach(r => {
    console.log(`   - ${r.label}`);
  });
  
  // Step 4: Details van succesvolle endpoints
  if (successful.length > 0) {
    console.log('\n\n' + '='.repeat(80));
    console.log('DETAILED DATA FROM SUCCESSFUL ENDPOINTS');
    console.log('='.repeat(80));
    
    for (const result of successful) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📊 ${result.label.toUpperCase()}`);
      console.log(`${'─'.repeat(80)}`);
      console.log('URL:', result.url);
      console.log('\nJSON Response:');
      console.log(JSON.stringify(result.data, null, 2));
      
      // Analyseer data structuur
      if (typeof result.data === 'object' && result.data !== null) {
        console.log(`\n📋 Data Structure (${Object.keys(result.data).length} fields):`);
        
        if (Array.isArray(result.data)) {
          console.log(`   - Array with ${result.data.length} items`);
          if (result.data.length > 0) {
            console.log(`   - First item keys:`, Object.keys(result.data[0]));
          }
        } else {
          const keys = Object.keys(result.data);
          keys.forEach(key => {
            const value = result.data[key];
            const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
            console.log(`   - ${key}: ${type}`);
          });
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
