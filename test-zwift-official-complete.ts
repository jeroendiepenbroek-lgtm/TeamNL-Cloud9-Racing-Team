/**
 * Complete Zwift Official API Test voor Rider 150437
 * Test alle endpoints + troubleshoot 307 redirect issue
 */

const ZWIFT_USERNAME = 'jeroen.diepenbroek@gmail.com';
const ZWIFT_PASSWORD = 'CloudRacer-9';
const RIDER_ID = 150437;

// Alle mogelijke base URLs (troubleshoot 307)
const BASE_URLS = [
  'https://us-or-rly101.zwift.com/api',
  'https://us-or-rly111.zwift.com/api',
  'https://secure.zwift.com/api',
  'https://eu-central-1.zwift.com/api',
  'https://api.zwift.com',
];

// Alle mogelijke endpoint paths
const PROFILE_ENDPOINTS = [
  '/profiles/{id}',
  '/profile/{id}',
  '/player/{id}',
  '/v1/profiles/{id}',
  '/v1/profile/{id}',
];

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope?: string;
}

async function getOAuthToken(): Promise<string> {
  console.log('🔐 STEP 1: OAuth 2.0 Token Request');
  console.log('='.repeat(80));
  
  const tokenUrl = 'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token';
  
  const params = new URLSearchParams({
    client_id: 'Zwift_Mobile_Link',
    username: ZWIFT_USERNAME,
    password: ZWIFT_PASSWORD,
    grant_type: 'password'
  });
  
  console.log('🌐 URL:', tokenUrl);
  console.log('📝 Grant Type: password');
  console.log('👤 Client ID: Zwift_Mobile_Link');
  console.log('✉️  Username:', ZWIFT_USERNAME);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth failed: ${response.status} ${response.statusText}\n${errorText}`);
  }
  
  const data: OAuthTokenResponse = await response.json();
  
  console.log('\n✅ Token Response:');
  console.log('   Access Token:', data.access_token.substring(0, 50) + '...');
  console.log('   Token Type:', data.token_type);
  console.log('   Expires In:', data.expires_in, 'seconds (', Math.floor(data.expires_in / 3600), 'hours )');
  console.log('   Scope:', data.scope || 'N/A');
  
  return data.access_token;
}

async function testEndpoint(baseUrl: string, path: string, token: string): Promise<any> {
  const url = `${baseUrl}${path.replace('{id}', RIDER_ID.toString())}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      redirect: 'manual'  // Don't follow redirects automatically
    });
    
    const status = response.status;
    const statusText = response.statusText;
    
    if (status === 307 || status === 301 || status === 302) {
      const location = response.headers.get('location');
      return {
        status,
        statusText,
        redirect: true,
        location,
        url
      };
    }
    
    if (status === 200) {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        return {
          status,
          statusText,
          redirect: false,
          url,
          data
        };
      } else {
        const text = await response.text();
        return {
          status,
          statusText,
          redirect: false,
          url,
          data: text
        };
      }
    }
    
    return {
      status,
      statusText,
      redirect: false,
      url,
      error: await response.text()
    };
    
  } catch (error) {
    return {
      status: 0,
      statusText: 'ERROR',
      redirect: false,
      url,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testAllEndpoints(token: string) {
  console.log('\n\n' + '='.repeat(80));
  console.log('🔍 STEP 2: Test All Base URL + Path Combinations');
  console.log('='.repeat(80));
  console.log(`Testing ${BASE_URLS.length} base URLs × ${PROFILE_ENDPOINTS.length} paths = ${BASE_URLS.length * PROFILE_ENDPOINTS.length} combinations\n`);
  
  let successCount = 0;
  let redirectCount = 0;
  let errorCount = 0;
  let workingEndpoint: any = null;
  
  for (const baseUrl of BASE_URLS) {
    console.log(`\n📡 Base URL: ${baseUrl}`);
    console.log('-'.repeat(80));
    
    for (const path of PROFILE_ENDPOINTS) {
      const result = await testEndpoint(baseUrl, path, token);
      
      const statusEmoji = result.status === 200 ? '✅' : 
                          result.redirect ? '↪️' : 
                          result.status === 0 ? '❌' : '⚠️';
      
      console.log(`${statusEmoji} ${result.status} ${result.statusText.padEnd(20)} ${path}`);
      
      if (result.redirect && result.location) {
        console.log(`   └─ Redirects to: ${result.location}`);
        redirectCount++;
      }
      
      if (result.error) {
        console.log(`   └─ Error: ${result.error.substring(0, 100)}`);
        errorCount++;
      }
      
      if (result.status === 200 && result.data) {
        console.log(`   └─ ✅ SUCCESS! Data received`);
        successCount++;
        workingEndpoint = { baseUrl, path, result };
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Success: ${successCount}`);
  console.log(`↪️  Redirects: ${redirectCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  return workingEndpoint;
}

async function fetchProfileData(baseUrl: string, path: string, token: string) {
  console.log('\n\n' + '='.repeat(80));
  console.log('📥 STEP 3: Fetch Complete Profile Data');
  console.log('='.repeat(80));
  
  const url = `${baseUrl}${path.replace('{id}', RIDER_ID.toString())}`;
  console.log('🌐 URL:', url);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  console.log('✅ Response Status:', response.status);
  console.log('📦 Content-Type:', response.headers.get('content-type'));
  console.log('📏 Content-Length:', response.headers.get('content-length'));
  
  return data;
}

async function analyzeProfileData(data: any) {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 STEP 4: Profile Data Analysis');
  console.log('='.repeat(80));
  
  // Count total fields
  const fieldCount = Object.keys(data).length;
  console.log(`\n📋 Total Fields: ${fieldCount}`);
  
  // Categorize fields
  const categories: { [key: string]: string[] } = {
    'Identity': [],
    'Physical Stats': [],
    'Power Metrics': [],
    'Social': [],
    'Equipment': [],
    'Activity': [],
    'Location': [],
    'Preferences': [],
    'Other': []
  };
  
  Object.keys(data).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    if (['id', 'firstname', 'lastname', 'name', 'avatar', 'imageSrc', 'profileId'].some(k => lowerKey.includes(k))) {
      categories['Identity'].push(key);
    } else if (['weight', 'height', 'age', 'gender', 'ftp'].some(k => lowerKey.includes(k))) {
      categories['Physical Stats'].push(key);
    } else if (['power', 'watt', 'cp', 'awc'].some(k => lowerKey.includes(k))) {
      categories['Power Metrics'].push(key);
    } else if (['follow', 'friend', 'social'].some(k => lowerKey.includes(k))) {
      categories['Social'].push(key);
    } else if (['bike', 'frame', 'wheel', 'equipment'].some(k => lowerKey.includes(k))) {
      categories['Equipment'].push(key);
    } else if (['activity', 'ride', 'distance', 'duration'].some(k => lowerKey.includes(k))) {
      categories['Activity'].push(key);
    } else if (['country', 'timezone', 'location'].some(k => lowerKey.includes(k))) {
      categories['Location'].push(key);
    } else if (['privacy', 'preference', 'setting'].some(k => lowerKey.includes(k))) {
      categories['Preferences'].push(key);
    } else {
      categories['Other'].push(key);
    }
  });
  
  console.log('\n📂 Fields by Category:');
  Object.entries(categories).forEach(([category, fields]) => {
    if (fields.length > 0) {
      console.log(`\n   ${category} (${fields.length} fields):`);
      fields.forEach(field => {
        const value = data[field];
        const type = Array.isArray(value) ? 'array' : typeof value;
        const preview = type === 'object' ? '{...}' :
                       type === 'array' ? `[${value.length}]` :
                       String(value).substring(0, 30);
        console.log(`      • ${field}: ${type} = ${preview}`);
      });
    }
  });
  
  // Key rider info
  console.log('\n\n' + '='.repeat(80));
  console.log('👤 KEY RIDER INFORMATION');
  console.log('='.repeat(80));
  
  const keyFields = [
    'id', 'firstName', 'lastName', 'male', 'age',
    'countryCode', 'timezone', 'weight', 'height',
    'ftp', 'powerSourceType', 'totalDistanceInMeters',
    'totalGold', 'totalExperiencePoints', 'achievementLevel'
  ];
  
  keyFields.forEach(field => {
    if (data[field] !== undefined) {
      console.log(`   ${field}: ${JSON.stringify(data[field])}`);
    }
  });
  
  // Social stats if available
  if (data.socialFacts || data.followersCount !== undefined) {
    console.log('\n\n' + '='.repeat(80));
    console.log('👥 SOCIAL STATISTICS');
    console.log('='.repeat(80));
    
    if (data.socialFacts) {
      console.log(JSON.stringify(data.socialFacts, null, 2));
    } else {
      if (data.followersCount !== undefined) {
        console.log(`   Followers: ${data.followersCount}`);
      }
      if (data.followeesCount !== undefined) {
        console.log(`   Following: ${data.followeesCount}`);
      }
    }
  }
}

async function fetchActivities(baseUrl: string, token: string) {
  console.log('\n\n' + '='.repeat(80));
  console.log('🚴 STEP 5: Fetch Recent Activities');
  console.log('='.repeat(80));
  
  const activitiesUrl = `${baseUrl}/profiles/${RIDER_ID}/activities`;
  console.log('🌐 URL:', activitiesUrl);
  
  try {
    const response = await fetch(activitiesUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      redirect: 'manual'
    });
    
    console.log('📊 Response Status:', response.status, response.statusText);
    
    if (response.status === 307) {
      console.log('↪️  Redirect Location:', response.headers.get('location'));
      return null;
    }
    
    if (!response.ok) {
      console.log('❌ Failed to fetch activities');
      return null;
    }
    
    const activities = await response.json();
    console.log('✅ Activities Retrieved:', Array.isArray(activities) ? activities.length : 'N/A');
    
    if (Array.isArray(activities) && activities.length > 0) {
      console.log('\n📋 Recent Activity:');
      activities.slice(0, 3).forEach((activity, i) => {
        console.log(`\n   Activity ${i + 1}:`);
        console.log('      ID:', activity.id);
        console.log('      Name:', activity.name);
        console.log('      Date:', activity.startDate);
        console.log('      Distance:', activity.distanceInMeters, 'm');
        console.log('      Duration:', Math.floor(activity.movingTimeInMs / 60000), 'min');
      });
    }
    
    return activities;
    
  } catch (error) {
    console.log('❌ Error fetching activities:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function fetchFollowers(baseUrl: string, token: string) {
  console.log('\n\n' + '='.repeat(80));
  console.log('👥 STEP 6: Fetch Followers');
  console.log('='.repeat(80));
  
  const followersUrl = `${baseUrl}/profiles/${RIDER_ID}/followers`;
  console.log('🌐 URL:', followersUrl);
  
  try {
    const response = await fetch(followersUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      redirect: 'manual'
    });
    
    console.log('📊 Response Status:', response.status, response.statusText);
    
    if (response.status === 307) {
      console.log('↪️  Redirect Location:', response.headers.get('location'));
      return null;
    }
    
    if (!response.ok) {
      console.log('❌ Failed to fetch followers');
      return null;
    }
    
    const followers = await response.json();
    console.log('✅ Followers Count:', Array.isArray(followers) ? followers.length : 'N/A');
    
    return followers;
    
  } catch (error) {
    console.log('❌ Error fetching followers:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function main() {
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' ZWIFT OFFICIAL API - COMPLETE DATA TEST '.padStart(50).padEnd(78) + '║');
  console.log('║' + ` Rider ID: ${RIDER_ID} (JRøne CloudRacer-9 @YT TeamNL) `.padStart(55).padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  
  try {
    // Step 1: Get OAuth token
    const token = await getOAuthToken();
    
    // Step 2: Test all endpoint combinations
    const workingEndpoint = await testAllEndpoints(token);
    
    if (!workingEndpoint) {
      console.log('\n❌ NO WORKING ENDPOINT FOUND!');
      console.log('\n📋 CONCLUSION:');
      console.log('   All tested combinations resulted in redirects or errors.');
      console.log('   Possible reasons:');
      console.log('   1. Zwift changed API base URLs');
      console.log('   2. Endpoint paths have been updated');
      console.log('   3. API requires different authentication method');
      console.log('   4. Regional restrictions or server selection logic');
      console.log('\n💡 RECOMMENDATION:');
      console.log('   - Skip Zwift Official API for now');
      console.log('   - Focus 100% on ZwiftRacing.app (working & complete)');
      console.log('   - Zwift Official only adds avatars/social (nice-to-have)');
      return;
    }
    
    console.log('\n\n' + '🎉'.repeat(40));
    console.log('✅ WORKING ENDPOINT FOUND!');
    console.log(`   Base URL: ${workingEndpoint.baseUrl}`);
    console.log(`   Path: ${workingEndpoint.path}`);
    console.log('🎉'.repeat(40));
    
    // Step 3: Fetch complete profile data
    const profileData = await fetchProfileData(
      workingEndpoint.baseUrl,
      workingEndpoint.path,
      token
    );
    
    // Step 4: Analyze profile data
    await analyzeProfileData(profileData);
    
    // Step 5: Try to fetch activities
    await fetchActivities(workingEndpoint.baseUrl, token);
    
    // Step 6: Try to fetch followers
    await fetchFollowers(workingEndpoint.baseUrl, token);
    
    // Save complete profile data
    console.log('\n\n' + '='.repeat(80));
    console.log('💾 SAVING COMPLETE PROFILE DATA');
    console.log('='.repeat(80));
    console.log('\n📄 Complete JSON Response:\n');
    console.log(JSON.stringify(profileData, null, 2));
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n📊 Total Fields Retrieved: ${Object.keys(profileData).length}`);
    console.log(`🌐 Working Endpoint: ${workingEndpoint.baseUrl}${workingEndpoint.path}`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error('\n📋 Stack Trace:');
      console.error(error.stack);
    }
  }
}

main().catch(console.error);
