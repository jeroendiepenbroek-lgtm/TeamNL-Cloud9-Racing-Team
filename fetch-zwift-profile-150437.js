#!/usr/bin/env node

/**
 * Fetch Zwift Official Profile voor rider 150437
 * OAuth 2.0 flow required
 * 
 * Zwift API endpoints:
 * - Token: https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token
 * - API: https://us-or-rly101.zwift.com/api
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Configuration
const SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RIDER_ID = 150437;

const ZWIFT_CLIENT_ID = 'Zwift_Mobile_Link';
const ZWIFT_CLIENT_SECRET = 'Zwift_Mobile_Link';
const ZWIFT_API_BASE = 'https://us-or-rly101.zwift.com';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY niet gezet');
  console.log('Usage: export SUPABASE_SERVICE_KEY="your-key" && node fetch-zwift-profile-150437.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Fetch Zwift Official Profile (OAuth Required)            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// OAUTH HELPERS
// ============================================================================

async function promptForCredentials() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('📋 Zwift OAuth vereist je login credentials\n');
    
    rl.question('Zwift Username/Email: ', (username) => {
      rl.question('Zwift Password: ', (password) => {
        rl.close();
        resolve({ username, password });
      });
    });
  });
}

async function getZwiftAccessToken(username, password) {
  console.log('\n🔐 Authenticating met Zwift...');
  
  try {
    const response = await axios.post(
      'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
      new URLSearchParams({
        client_id: ZWIFT_CLIENT_ID,
        username: username,
        password: password,
        grant_type: 'password'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data && response.data.access_token) {
      console.log('   ✅ Access token verkregen\n');
      return response.data.access_token;
    }
  } catch (error) {
    console.log(`   ❌ Auth failed: ${error.response?.data?.error || error.message}\n`);
    return null;
  }
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchZwiftProfile(accessToken) {
  console.log('📊 Fetching Zwift Profile...');
  
  try {
    const response = await axios.get(
      `${ZWIFT_API_BASE}/api/profiles/${RIDER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data) {
      console.log(`   ✅ Profile opgehaald`);
      console.log(`   Name: ${response.data.firstName} ${response.data.lastName}`);
      console.log(`   Country: ${response.data.countryAlpha3}`);
      console.log(`   Followers: ${response.data.followersCount}`);
      console.log(`   Total Distance: ${(response.data.totalDistance / 1000000).toFixed(0)} km\n`);
      return response.data;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response?.status === 401) {
      console.log('   💡 Token expired of invalid\n');
    }
    return null;
  }
}

// ============================================================================
// UPLOAD FUNCTIONS
// ============================================================================

async function uploadProfile(profileData) {
  console.log('📤 Uploading naar api_zwift_api_profiles...');

  const record = {
    rider_id: RIDER_ID,
    source_api: 'zwift.com',
    endpoint: `/api/profiles/${RIDER_ID}`,
    fetched_at: new Date().toISOString(),
    
    // Map API fields to database schema
    id: profileData.id,
    public_id: profileData.publicId,
    first_name: profileData.firstName,
    last_name: profileData.lastName,
    
    // Avatar
    image_src: profileData.imageSrc,
    image_src_large: profileData.imageSrcLarge,
    
    // Demographics
    male: profileData.male,
    birth_date: profileData.dob,
    age: profileData.age,
    country_code: profileData.countryCode,
    country_alpha3: profileData.countryAlpha3,
    
    // Physical (convert units if needed)
    weight: profileData.weight,  // grams
    height: profileData.height,  // cm
    ftp: profileData.ftp,
    
    // Social
    followers_count: profileData.followersCount,
    followees_count: profileData.followeesCount,
    rideons_given: profileData.rideOnsGiven,
    
    // Achievements
    achievement_level: profileData.achievementLevel,
    total_distance: profileData.totalDistance,
    total_distance_climbed: profileData.totalDistanceClimbed,
    total_xp: profileData.totalExperiencePoints,
    
    // Privacy
    privacy_profile: profileData.privacy?.defaultFitnessPrivacy === true,
    privacy_activities: profileData.privacy?.suppressFollowerNotification === false,
    
    // Status
    riding: profileData.riding === true,
    world_id: profileData.worldId,
    
    // Profile details
    player_type: profileData.playerType,
    player_type_id: profileData.playerTypeId,
    use_metric: profileData.useMetric,
    
    // Email
    email_address: profileData.emailAddress,
    email_address_verified: profileData.emailAddressVerified,
    
    // Competition Metrics (Zwift Official Racing Score) 🏁
    competition_racing_score: profileData.competitionMetrics?.racingScore || null,
    competition_category: profileData.competitionMetrics?.category || null,
    competition_category_women: profileData.competitionMetrics?.categoryWomen || null,
    
    // Raw JSON backup
    raw_response: profileData
  };

  try {
    const { data, error } = await supabase
      .from('api_zwift_api_profiles')
      .upsert(record, { onConflict: 'rider_id' })
      .select();

    if (error) throw error;
    
    console.log(`   ✅ Profile uploaded (rider_id: ${RIDER_ID})\n`);
    return true;
  } catch (error) {
    console.log(`   ❌ Upload error: ${error.message}\n`);
    return false;
  }
}

// ============================================================================
// VERIFICATION
// ============================================================================

async function verifyData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check profile
  try {
    const { data, error } = await supabase
      .from('api_zwift_api_profiles')
      .select('*')
      .eq('rider_id', RIDER_ID)
      .single();

    if (error) throw error;
    
    console.log('✅ Profile in database:');
    console.log(`   Name: ${data.first_name} ${data.last_name}`);
    console.log(`   Country: ${data.country_alpha3}`);
    console.log(`   Weight: ${(data.weight / 1000).toFixed(1)} kg`);
    console.log(`   FTP: ${data.ftp} watts`);
    console.log(`   🏁 Zwift Racing Score: ${data.competition_racing_score || 'N/A'}`);
    console.log(`   🏁 Category: ${data.competition_category || 'N/A'}`);
    console.log(`   Followers: ${data.followers_count}`);
    console.log(`   Total Distance: ${(data.total_distance / 1000000).toFixed(0)} km\n`);
  } catch (error) {
    console.log(`❌ Profile niet gevonden: ${error.message}\n`);
  }

  // Check v_rider_complete view
  try {
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
      .eq('rider_id', RIDER_ID)
      .single();

    if (error) throw error;
    
    console.log('✅ v_rider_complete view:');
    console.log(`   Full Name: ${data.full_name}`);
    console.log(`   Racing Name: ${data.racing_name}`);
    console.log(`   vELO: ${data.velo || 'N/A'}`);
    console.log(`   🏁 ZwiftRacing Score: ${data.zwiftracing_score || 'N/A'}`);
    console.log(`   🏁 Zwift Official Score: ${data.zwift_official_racing_score || 'N/A'}`);
    console.log(`   Avatar: ${data.avatar_url ? '✅' : '❌'}`);
    console.log(`   Data Completeness: ${data.data_completeness}\n`);
  } catch (error) {
    console.log(`❌ v_rider_complete error: ${error.message}\n`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Get credentials
  const { username, password } = await promptForCredentials();
  
  if (!username || !password) {
    console.log('❌ Credentials required\n');
    process.exit(1);
  }

  // Authenticate
  const accessToken = await getZwiftAccessToken(username, password);
  if (!accessToken) {
    console.log('❌ Authentication failed\n');
    process.exit(1);
  }

  // Fetch profile
  const profileData = await fetchZwiftProfile(accessToken);
  if (!profileData) {
    console.log('❌ Failed to fetch profile\n');
    process.exit(1);
  }

  // Upload to Supabase
  const uploaded = await uploadProfile(profileData);
  if (!uploaded) {
    console.log('❌ Upload failed\n');
    process.exit(1);
  }

  // Verify
  await verifyData();

  console.log('════════════════════════════════════════════════════════════');
  console.log('✅ ZWIFT PROFILE SYNC COMPLETE!');
  console.log('════════════════════════════════════════════════════════════\n');
  
  console.log('Test in Supabase SQL Editor:');
  console.log(`SELECT * FROM api_zwift_api_profiles WHERE rider_id = ${RIDER_ID};`);
  console.log(`SELECT * FROM v_rider_complete WHERE rider_id = ${RIDER_ID};`);
}

main().catch(console.error);
