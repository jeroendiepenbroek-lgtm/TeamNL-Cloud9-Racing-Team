require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cookie management (copied from server.ts)
let cachedCookie = null;
let cookieExpiry = null;

async function getZwiftCookie() {
  if (cachedCookie && cookieExpiry && Date.now() < cookieExpiry) {
    console.log('Using cached Zwift token');
    return cachedCookie;
  }

  console.log('🔐 Logging in to Zwift to get access token...');
  
  const username = process.env.ZWIFT_USERNAME;
  const password = process.env.ZWIFT_PASSWORD;
  
  if (!username || !password) {
    throw new Error('ZWIFT_USERNAME and ZWIFT_PASSWORD must be set');
  }

  try {
    // Step 1: Get access token via OAuth
    const authResponse = await axios.post(
      'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
      new URLSearchParams({
        username,
        password,
        client_id: 'Zwift_Mobile_Link',
        grant_type: 'password'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const accessToken = authResponse.data.access_token;
    
    if (!accessToken) {
      throw new Error('No access token received from Zwift');
    }

    cachedCookie = `Bearer ${accessToken}`;
    cookieExpiry = Date.now() + (6 * 60 * 60 * 1000); // 6 hours

    console.log('✅ Zwift login successful, token cached for 6 hours');
    return cachedCookie;
  } catch (error) {
    throw new Error(`Failed to get Zwift token: ${error.response?.data?.error_description || error.message}`);
  }
}

async function fetchZwiftProfile(riderId) {
  console.log(`\n🔍 Fetching profile for rider ${riderId}...`);
  
  const authToken = await getZwiftCookie();
  
  try {
    const response = await axios.get(
      `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
      {
        headers: {
          'Authorization': authToken,
          'User-Agent': 'Zwift/1.0.0'
        }
      }
    );
    
    const profile = response.data;
    
    console.log(`✅ Profile received for ${profile.firstName} ${profile.lastName}`);
    console.log(`   Category: ${profile.competitionCategory || 'NULL'}`);
    console.log(`   Racing Score: ${profile.competitionRacingScore || 'NULL'}`);
    
    return profile;
  } catch (error) {
    console.log(`❌ Error fetching rider ${riderId}:`, error.response?.status, error.message);
    return null;
  }
}

async function updateSupabaseProfile(riderId, profile) {
  if (!profile) {
    console.log(`⏭️  Skipping database update for rider ${riderId} (no profile data)`);
    return;
  }
  
  console.log(`💾 Updating Supabase for rider ${riderId}...`);
  
  const updateData = {
    rider_id: riderId,
    id: profile.id,
    public_id: profile.publicId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    competition_category: profile.competitionCategory || null,
    competition_racing_score: profile.competitionRacingScore || null,
    ftp: profile.ftp,
    weight: profile.weight,
    height: profile.height,
    age: profile.age,
    male: profile.male,
    image_src: profile.imageSrc,
    image_src_large: profile.imageSrcLarge,
    country_code: profile.countryCode,
    country_alpha3: profile.countryAlpha3,
    riding: profile.riding,
    privacy_profile: Boolean(profile.privacy?.approvalRequired),
    privacy_activities: profile.privacy?.defaultActivityPrivacy === 'PRIVATE' ? true : false,
    followers_count: profile.followersCount || 0,
    followees_count: profile.followeesCount || 0,
    rideons_given: profile.rideOnsGiven || 0,
    achievement_level: profile.achievementLevel || 0,
    total_distance: profile.totalDistance || 0,
    total_distance_climbed: profile.totalDistanceClimbed || 0,
    world_id: profile.worldId,
    raw_response: profile,
    fetched_at: new Date().toISOString()
  };
  
  const { error } = await supabase
    .from('api_zwift_api_profiles')
    .upsert(updateData, { onConflict: 'rider_id' });
  
  if (error) {
    console.log(`❌ Database error:`, error.message);
  } else {
    console.log(`✅ Database updated`);
  }
}

async function resyncMissingRiders() {
  const riderIds = [1076179, 3067920, 3137561, 4562003];
  
  console.log('🚀 Starting resync for 4 riders with missing competition data\n');
  console.log('Target riders:', riderIds.join(', '));
  console.log('='.repeat(60));
  
  for (const riderId of riderIds) {
    const profile = await fetchZwiftProfile(riderId);
    await updateSupabaseProfile(riderId, profile);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Resync complete!\n');
  
  // Verify results
  console.log('🧪 Verifying updated data...\n');
  
  const { data, error } = await supabase
    .from('api_zwift_api_profiles')
    .select('rider_id, first_name, last_name, competition_category, competition_racing_score, fetched_at')
    .in('rider_id', riderIds)
    .order('rider_id');
  
  if (error) {
    console.log('❌ Verification error:', error);
  } else {
    console.log('=== VERIFICATION RESULTS ===\n');
    data.forEach(r => {
      const hasCategory = r.competition_category !== null;
      const hasScore = r.competition_racing_score !== null;
      const status = (hasCategory && hasScore) ? '✅' : (hasCategory || hasScore) ? '⚠️' : '❌';
      
      console.log(`${status} [${r.rider_id}] ${r.first_name} ${r.last_name}`);
      console.log(`   Category: ${r.competition_category || 'NULL'}`);
      console.log(`   Score: ${r.competition_racing_score || 'NULL'}`);
      console.log(`   Updated: ${r.fetched_at}`);
      console.log('');
    });
  }
  
  console.log('\n💡 Next step: Run verify-category-fallback.js to check view results');
}

resyncMissingRiders().catch(console.error);
