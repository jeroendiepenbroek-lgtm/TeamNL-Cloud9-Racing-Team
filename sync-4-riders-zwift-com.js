require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const RIDER_IDS = [1076179, 3067920, 3137561, 4562003];

// Zwift Authentication
let zwiftCookie = null;
let zwiftCookieExpiry = null;

async function getZwiftCookie() {
  if (zwiftCookie && zwiftCookieExpiry && Date.now() < zwiftCookieExpiry) {
    return zwiftCookie;
  }

  console.log('🔐 Logging in to Zwift.com...');

  try {
    const response = await axios.post(
      'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
      new URLSearchParams({
        grant_type: 'password',
        username: process.env.ZWIFT_USERNAME,
        password: process.env.ZWIFT_PASSWORD,
        client_id: 'Zwift_Mobile_Link'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const accessToken = response.data.access_token;
    zwiftCookie = `Bearer ${accessToken}`;
    zwiftCookieExpiry = Date.now() + (6 * 60 * 60 * 1000); // 6 hours

    console.log('✅ Zwift login successful\n');
    return zwiftCookie;
  } catch (error) {
    console.error('❌ Zwift login failed:', error.message);
    throw new Error('Cannot authenticate with Zwift.com');
  }
}

async function fetchZwiftComProfile(riderId, authToken) {
  const url = `https://us-or-rly101.zwift.com/api/profiles/${riderId}`;
  
  console.log(`🌐 Fetching Zwift.com API: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Authorization': authToken,
        'User-Agent': 'Zwift/1.0'
      }
    });
    
    const profile = response.data;
    
    // Extract competition metrics from nested structure
    const category = profile.competitionMetrics?.category || profile.competitionCategory || null;
    const racingScore = profile.competitionMetrics?.racingScore || profile.competitionRacingScore || null;
    
    console.log(`✅ Success - Received data for rider ${riderId}`);
    console.log(`   Name: ${profile.firstName} ${profile.lastName}`);
    console.log(`   Competition Category: ${category || 'NULL'}`);
    console.log(`   Competition Racing Score: ${racingScore || 'NULL'}`);
    console.log(`   FTP: ${profile.ftp || 'NULL'}`);
    console.log(`   Weight: ${profile.weight ? (profile.weight / 1000).toFixed(1) + ' kg' : 'NULL'}`);
    
    // Update in database
    const { error: upsertError } = await supabase
      .from('api_zwift_api_profiles')
      .upsert({
        rider_id: riderId,
        first_name: profile.firstName,
        last_name: profile.lastName,
        male: profile.male,
        country_code: profile.countryCode,
        country_alpha3: profile.countryAlpha3,
        image_src: profile.imageSrc,
        image_src_large: profile.imageSrcLarge,
        age: profile.age,category,
        competition_racing_score: racingScore
        weight: profile.weight,
        ftp: profile.ftp,
        competition_category: profile.competitionCategory || null,
        competition_racing_score: profile.competitionRacingScore || null,
        achievement_level: profile.achievementLevel,
        total_distance: profile.totalDistance,
        total_distance_climbed: profile.totalDistanceClimbed,
        followers_count: profile.followersCount,
        followees_count: profile.followeesCount,
        rideons_given: profile.rideOnsGiven,
        privacy_profile: profile.privacy?.approvalRequired,
        privacy_activities: profile.privacy?.displayActivity,
        riding: profile.riding,
        world_id: profile.worldId,
        fetched_at: new Date().toISOString()
      }, {
        onConflict: 'rider_id'
      });
    
    if (upsertError) {
      console.log(`   ⚠️  Database update error:`, upsertError.message);
    } else {
      console.log(`   💾 Database updated`);
    }
    
    return {
      riderId,
      success: true,
      hasCategory: !!category,
      hasScore: !!racingScore,
      category: category,
      score: racingScore
    };
    
  } catch (error) {
    console.log(`❌ Error for rider ${riderId}:`, error.message);
    if (error.response) {
      console.log(`   HTTP Status: ${error.response.status}`);
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }
    
    return {
      riderId,
      success: false,
      error: error.message
    };
  }
}

async function syncMissingRiders() {
  console.log('🚀 Syncing 4 riders with missing Zwift.com competition data...\n');
  console.log('Target riders:', RIDER_IDS.join(', '));
  
  // Get auth token
  const authToken = await getZwiftCookie();
  
  const results = [];
  
  for (const riderId of RIDER_IDS) {
    const result = await fetchZwiftComProfile(riderId, authToken);
    results.push(result);
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n\n=== SYNC RESULTS ===\n');
  
  let successCount = 0;
  let hasCategoryCount = 0;
  let hasScoreCount = 0;
  
  results.forEach(r => {
    if (r.success) {
      successCount++;
      if (r.hasCategory) hasCategoryCount++;
      if (r.hasScore) hasScoreCount++;
      
      const categoryStatus = r.hasCategory ? `✅ ${r.category}` : '❌ NULL';
      const scoreStatus = r.hasScore ? `✅ ${r.score}` : '❌ NULL';
      
      console.log(`[${r.riderId}]`);
      console.log(`  Category: ${categoryStatus}`);
      console.log(`  Score: ${scoreStatus}`);
      console.log('');
    } else {
      console.log(`[${r.riderId}] ❌ FAILED: ${r.error}\n`);
    }
  });
  
  console.log('=== SUMMARY ===');
  console.log(`API calls succeeded: ${successCount}/${RIDER_IDS.length}`);
  console.log(`Now has Category: ${hasCategoryCount}/${RIDER_IDS.length}`);
  console.log(`Now has Score: ${hasScoreCount}/${RIDER_IDS.length}`);
  
  if (hasCategoryCount === 0 && hasScoreCount === 0) {
    console.log('\n💡 CONCLUSIE:');
    console.log('   Zwift.com API geeft GEEN competition data voor deze riders.');
    console.log('   Dit bevestigt dat:');
    console.log('   - Deze riders geen officieel Zwift Racing profiel hebben');
    console.log('   - Of hun racing data op "private" staat');
    console.log('   - Category fallback naar ZwiftRacing is de correcte oplossing ✅');
  } else {
    console.log('\n✨ Data gevonden! Database is bijgewerkt.');
    console.log('   Run verify-category-fallback.js om te checken.');
  }
}

syncMissingRiders().catch(console.error);
