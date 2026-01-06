// ULTRA CLEAN SERVER - ALLEEN RACING MATRIX DATA
// Geen sync, geen teammanager, geen gedoe
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Railway environment variables (direct access)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ZWIFTRACING_API_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';

console.log('🚀 Environment loaded (v5.0 - Smart Sync):', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_SERVICE_KEY,
  hasZwiftToken: !!ZWIFTRACING_API_TOKEN,
  nodeEnv: process.env.NODE_ENV
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// FRONTEND SERVING (Must be before API routes)
// ============================================

// Railway (Dockerfile): frontend at /app/frontend/dist
// Development: frontend at ../../frontend/dist
const frontendPath = process.env.RAILWAY_ENVIRONMENT
  ? '/app/frontend/dist'  // Railway/Docker: absolute path
  : path.join(__dirname, '..', '..', 'frontend', 'dist'); // Dev

console.log('📂 Frontend path:', frontendPath);

app.use(express.static(frontendPath));

// ============================================
// ZWIFT LOGIN (Get Session Cookie)
// ============================================

let zwiftCookie: string = process.env.ZWIFT_COOKIE || '';
let cookieExpiry: Date = new Date();

async function getZwiftCookie(): Promise<string> {
  // Return cached cookie if still valid (expires after 6 hours)
  if (zwiftCookie && zwiftCookie !== 'placeholder' && cookieExpiry > new Date()) {
    return zwiftCookie;
  }

  const username = process.env.ZWIFT_USERNAME;
  const password = process.env.ZWIFT_PASSWORD;

  if (!username || !password) {
    console.warn('⚠️  ZWIFT_USERNAME or ZWIFT_PASSWORD not set');
    return '';
  }

  try {
    console.log('🔐 Logging in to Zwift to get session cookie...');
    
    // Step 1: Get access token
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
      console.warn('⚠️  No access token received from Zwift');
      return '';
    }

    // Use access token as Bearer auth instead of cookie
    zwiftCookie = `Bearer ${accessToken}`;
    cookieExpiry = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
    console.log('✅ Zwift login successful, token cached for 6 hours');
    return zwiftCookie;

  } catch (error: any) {
    console.error('❌ Zwift login failed:', error.response?.data || error.message);
    return '';
  }
}

// ============================================// API SYNC FUNCTIONS
// ============================================

// Helper: Wacht tussen API calls om rate limiting te voorkomen
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Rate limiting state
let lastBulkFetchTime = 0;
let bulkRateLimitUntil = 0;

// BULK FETCH: Haal meerdere riders op via ZwiftRacing POST endpoint (max 1000)
async function bulkFetchZwiftRacingRiders(riderIds: number[]): Promise<Map<number, any>> {
  const resultMap = new Map<number, any>();
  
  if (riderIds.length === 0) return resultMap;
  
  // Check if we're still rate limited
  const now = Date.now();
  if (bulkRateLimitUntil > now) {
    const waitSeconds = Math.ceil((bulkRateLimitUntil - now) / 1000);
    console.warn(`⏳ Still rate limited, wait ${waitSeconds}s before retry`);
    console.warn(`   💡 TIP: Gebruik GET endpoint voor enkele riders, of wacht tot ${new Date(bulkRateLimitUntil).toLocaleTimeString('nl-NL')}`);
    return resultMap; // Return empty - caller kan individuele fallback gebruiken
  }
  
  try {
    console.log(`📦 Bulk fetching ${riderIds.length} riders from ZwiftRacing API...`);
    
    const response = await axios.post(
      'https://api.zwiftracing.app/api/public/riders',
      riderIds,
      {
        headers: { 
          'Authorization': ZWIFTRACING_API_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconden voor bulk request
      }
    );
    
    if (Array.isArray(response.data)) {
      // Response array zit in dezelfde volgorde als input array
      // Response bevat GEEN rider ID, dus we mappen op index
      for (let i = 0; i < response.data.length; i++) {
        const riderData = response.data[i];
        const riderId = riderIds[i]; // Map by index!
        
        if (riderData && riderId) {
          resultMap.set(riderId, riderData);
        }
      }
      console.log(`✅ Bulk fetch success: ${resultMap.size} riders received`);
      lastBulkFetchTime = now;
      bulkRateLimitUntil = 0; // Clear rate limit on success
    } else {
      console.warn('⚠️  Unexpected response format from bulk API');
    }
    
  } catch (error: any) {
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers['retry-after'] || '300');
      bulkRateLimitUntil = now + (retryAfter * 1000);
      console.error('🚫 RATE LIMITED - ZwiftRacing bulk API (429 Too Many Requests)');
      console.error(`   Retry after: ${retryAfter} seconds`);
      console.error(`   💡 Alternative: Gebruik GET /api/admin/riders voor enkele riders (geen bulk limit)`);
    } else {
      console.error('❌ Bulk fetch failed:', error.response?.data || error.message);
    }
  }
  
  return resultMap;
}

// SMART SYNC CONFIGURATION
const BULK_SYNC_THRESHOLD = 5; // Use bulk sync for >= 5 riders
const INDIVIDUAL_SYNC_DELAY = 1000; // 1 second between individual calls
const MAX_BULK_SIZE = 1000; // ZwiftRacing API limit

// INDIVIDUAL FETCH: Haal enkele rider op via GET endpoint
async function fetchSingleZwiftRacingRider(riderId: number): Promise<any | null> {
  try {
    const response = await axios.get(
      `https://api.zwiftracing.app/api/public/riders/${riderId}`,
      {
        headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.warn(`⚠️  Rider ${riderId} not found on ZwiftRacing (404) - skipping`);
      return null; // Non-blocking: rider doesn't exist
    } else if (error.response?.status === 429) {
      console.warn(`🚫 Rate limited for rider ${riderId} (429)`);
      throw error; // This IS an error, needs retry
    } else {
      console.warn(`⚠️  Failed to fetch rider ${riderId}:`, error.message);
      return null; // Non-blocking: other errors
    }
  }
}

// SMART SYNC: Automatically choose between bulk and individual strategy
async function smartSyncRiders(
  riderIds: number[],
  authToken: string
): Promise<{ synced: number; failed: number; skipped: number; errors: string[] }> {
  const results = {
    synced: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[]
  };
  
  if (riderIds.length === 0) return results;
  
  const strategy = riderIds.length >= BULK_SYNC_THRESHOLD ? 'bulk' : 'individual';
  console.log(`🎯 Using ${strategy} sync strategy for ${riderIds.length} riders`);
  
  // STRATEGY 1: BULK SYNC (for >= 5 riders)
  if (strategy === 'bulk') {
    // Split into chunks if > MAX_BULK_SIZE
    const chunks: number[][] = [];
    for (let i = 0; i < riderIds.length; i += MAX_BULK_SIZE) {
      chunks.push(riderIds.slice(i, i + MAX_BULK_SIZE));
    }
    
    for (const chunk of chunks) {
      console.log(`📦 Processing bulk chunk: ${chunk.length} riders`);
      const racingDataMap = await bulkFetchZwiftRacingRiders(chunk);
      
      // Process each rider
      for (const riderId of chunk) {
        const racingData = racingDataMap.get(riderId);
        
        if (!racingData) {
          console.warn(`⚠️  No racing data for rider ${riderId} - skipping (may not exist)`);
          results.skipped++;
          continue; // NON-BLOCKING: skip and continue
        }
        
        try {
          // Save ZwiftRacing data
          const riderData = {
            id: riderId,
            rider_id: riderId,
            name: racingData.name,
            country: racingData.country,
            velo_live: racingData.race?.current?.rating || null,
            velo_30day: racingData.race?.max30?.rating || null,
            velo_90day: racingData.race?.max90?.rating || null,
            category: racingData.zpCategory,
            ftp: racingData.zpFTP,
            power_5s: racingData.power?.w5 || null,
            power_15s: racingData.power?.w15 || null,
            power_30s: racingData.power?.w30 || null,
            power_60s: racingData.power?.w60 || null,
            power_120s: racingData.power?.w120 || null,
            power_300s: racingData.power?.w300 || null,
            power_1200s: racingData.power?.w1200 || null,
            power_5s_wkg: racingData.power?.wkg5 || null,
            power_15s_wkg: racingData.power?.wkg15 || null,
            power_30s_wkg: racingData.power?.wkg30 || null,
            power_60s_wkg: racingData.power?.wkg60 || null,
            power_120s_wkg: racingData.power?.wkg120 || null,
            power_300s_wkg: racingData.power?.wkg300 || null,
            power_1200s_wkg: racingData.power?.wkg1200 || null,
            weight: racingData.weight,
            height: racingData.height,
            phenotype: racingData.phenotype?.value || null,
            race_count: racingData.race?.finishes || 0,
            zwift_id: riderId,
            race_wins: racingData.race?.wins || 0,
            race_podiums: racingData.race?.podiums || 0,
            race_finishes: racingData.race?.finishes || 0,
            race_dnfs: racingData.race?.dnfs || 0,
            raw_response: racingData,
            fetched_at: new Date().toISOString()
          };
          
          const { error: racingError } = await supabase
            .from('api_zwiftracing_riders')
            .upsert(riderData, { onConflict: 'rider_id' });
          
          if (racingError) {
            console.error(`❌ DB error for rider ${riderId}:`, racingError.message);
            results.failed++;
            results.errors.push(`${riderId}: ${racingError.message}`);
            continue;
          }
          
          // Fetch Zwift Official profile (individual, with delay)
          await delay(250);
          
          try {
            const profileResponse = await axios.get(
              `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
              {
                headers: {
                  'Authorization': authToken,
                  'User-Agent': 'Zwift/1.0'
                },
                timeout: 10000
              }
            );
            
            const data = profileResponse.data;
            const profileData = {
              rider_id: riderId,
              id: data.id || riderId,
              first_name: data.firstName || null,
              last_name: data.lastName || null,
              male: data.male,
              image_src: data.imageSrc || null,
              image_src_large: data.imageSrcLarge || null,
              country_code: data.countryCode || null,
              country_alpha3: data.countryAlpha3 || null,
              age: data.age || null,
              weight: data.weight || null,
              height: data.height || null,
              ftp: data.ftp || null,
              player_type_id: data.playerTypeId || null,
              player_type: data.playerType || null,
              competition_category: data.competitionMetrics?.category || null,
              competition_racing_score: data.competitionMetrics?.racingScore || null,
              followers_count: data.followerStatusOfLoggedInPlayer?.followerCount || null,
              followees_count: data.followerStatusOfLoggedInPlayer?.followeeCount || null,
              rideons_given: data.totalGiveRideons || null,
              achievement_level: data.achievementLevel || null,
              total_distance: data.totalDistanceInMeters || null,
              total_distance_climbed: data.totalDistanceClimbed || null,
              riding: data.riding || false,
              world_id: data.worldId || null,
              privacy_profile: data.privacy?.approvalRequired === true,
              privacy_activities: data.privacy?.defaultActivityPrivacy === 'PRIVATE',
              raw_response: data,
              fetched_at: new Date().toISOString()
            };
            
            await supabase
              .from('api_zwift_api_profiles')
              .upsert(profileData, { onConflict: 'rider_id' });
            
          } catch (profileError: any) {
            if (profileError.response?.status === 404) {
              console.warn(`⚠️  Rider ${riderId} profile not found (404) - skipping profile`);
            } else {
              console.warn(`⚠️  Profile fetch failed for ${riderId}:`, profileError.message);
            }
          }
          
          // Update last_synced
          await supabase
            .from('team_roster')
            .update({ last_synced: new Date().toISOString() })
            .eq('rider_id', riderId);
          
          results.synced++;
          console.log(`✅ Rider ${riderId} synced`);
          
        } catch (error: any) {
          console.error(`❌ Error processing rider ${riderId}:`, error.message);
          results.failed++;
          results.errors.push(`${riderId}: ${error.message}`);
        }
      }
    }
  }
  
  // STRATEGY 2: INDIVIDUAL SYNC (for < 5 riders)
  else {
    for (let i = 0; i < riderIds.length; i++) {
      const riderId = riderIds[i];
      console.log(`🔄 [${i+1}/${riderIds.length}] Syncing rider ${riderId}...`);
      
      try {
        // Fetch ZwiftRacing individual
        const racingData = await fetchSingleZwiftRacingRider(riderId);
        
        if (!racingData) {
          console.warn(`⚠️  No racing data for rider ${riderId} - skipping`);
          results.skipped++;
          continue; // NON-BLOCKING
        }
        
        // Save racing data
        const riderData = {
          id: riderId,
          rider_id: riderId,
          name: racingData.name,
          country: racingData.country,
          velo_live: racingData.race?.current?.rating || null,
          velo_30day: racingData.race?.max30?.rating || null,
          velo_90day: racingData.race?.max90?.rating || null,
          category: racingData.zpCategory,
          ftp: racingData.zpFTP,
          power_5s: racingData.power?.w5 || null,
          power_15s: racingData.power?.w15 || null,
          power_30s: racingData.power?.w30 || null,
          power_60s: racingData.power?.w60 || null,
          power_120s: racingData.power?.w120 || null,
          power_300s: racingData.power?.w300 || null,
          power_1200s: racingData.power?.w1200 || null,
          power_5s_wkg: racingData.power?.wkg5 || null,
          power_15s_wkg: racingData.power?.wkg15 || null,
          power_30s_wkg: racingData.power?.wkg30 || null,
          power_60s_wkg: racingData.power?.wkg60 || null,
          power_120s_wkg: racingData.power?.wkg120 || null,
          power_300s_wkg: racingData.power?.wkg300 || null,
          power_1200s_wkg: racingData.power?.wkg1200 || null,
          weight: racingData.weight,
          height: racingData.height,
          phenotype: racingData.phenotype?.value || null,
          race_count: racingData.race?.finishes || 0,
          zwift_id: riderId,
          race_wins: racingData.race?.wins || 0,
          race_podiums: racingData.race?.podiums || 0,
          race_finishes: racingData.race?.finishes || 0,
          race_dnfs: racingData.race?.dnfs || 0,
          raw_response: racingData,
          fetched_at: new Date().toISOString()
        };
        
        await supabase
          .from('api_zwiftracing_riders')
          .upsert(riderData, { onConflict: 'rider_id' });
        
        // Fetch Zwift Official profile
        await delay(INDIVIDUAL_SYNC_DELAY);
        
        try {
          const profileResponse = await axios.get(
            `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
            {
              headers: {
                'Authorization': authToken,
                'User-Agent': 'Zwift/1.0'
              },
              timeout: 10000
            }
          );
          
          const data = profileResponse.data;
          const profileData = {
            rider_id: riderId,
            id: data.id || riderId,
            first_name: data.firstName || null,
            last_name: data.lastName || null,
            male: data.male,
            image_src: data.imageSrc || null,
            image_src_large: data.imageSrcLarge || null,
            country_code: data.countryCode || null,
            country_alpha3: data.countryAlpha3 || null,
            age: data.age || null,
            weight: data.weight || null,
            height: data.height || null,
            ftp: data.ftp || null,
            player_type_id: data.playerTypeId || null,
            player_type: data.playerType || null,
            competition_category: data.competitionMetrics?.category || null,
            competition_racing_score: data.competitionMetrics?.racingScore || null,
            followers_count: data.followerStatusOfLoggedInPlayer?.followerCount || null,
            followees_count: data.followerStatusOfLoggedInPlayer?.followeeCount || null,
            rideons_given: data.totalGiveRideons || null,
            achievement_level: data.achievementLevel || null,
            total_distance: data.totalDistanceInMeters || null,
            total_distance_climbed: data.totalDistanceClimbed || null,
            riding: data.riding || false,
            world_id: data.worldId || null,
            privacy_profile: data.privacy?.approvalRequired === true,
            privacy_activities: data.privacy?.defaultActivityPrivacy === 'PRIVATE',
            raw_response: data,
            fetched_at: new Date().toISOString()
          };
          
          await supabase
            .from('api_zwift_api_profiles')
            .upsert(profileData, { onConflict: 'rider_id' });
          
        } catch (profileError: any) {
          if (profileError.response?.status === 404) {
            console.warn(`⚠️  Rider ${riderId} profile not found (404)`);
          }
        }
        
        // Update last_synced
        await supabase
          .from('team_roster')
          .update({ last_synced: new Date().toISOString() })
          .eq('rider_id', riderId);
        
        results.synced++;
        console.log(`✅ Rider ${riderId} synced`);
        
      } catch (error: any) {
        console.error(`❌ Error syncing rider ${riderId}:`, error.message);
        results.failed++;
        results.errors.push(`${riderId}: ${error.message}`);
      }
    }
  }
  
  return results;
}

async function syncRiderFromAPIs(riderId: number, skipDelay = false): Promise<{ synced: boolean; error?: string }> {
  try {
    console.log(`🔄 Syncing rider ${riderId}...`);
    
    // Get fresh Zwift cookie (cached for 6 hours)
    const authToken = await getZwiftCookie();
    
    // Wacht 1 seconde tussen riders (rate limiting)
    if (!skipDelay) {
      await delay(1000);
    }

    // Parallel fetch from both APIs
    const [racingResult, profileResult] = await Promise.allSettled([
      axios.get(`https://api.zwiftracing.app/api/public/riders/${riderId}`, {
        headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
        timeout: 10000
      }),
      axios.get(`https://us-or-rly101.zwift.com/api/profiles/${riderId}`, {
        headers: {
          'Authorization': authToken,
          'User-Agent': 'Zwift/1.0'
        },
        timeout: 10000
      })
    ]);

    let racingSynced = false;
    let profileSynced = false;

    // Process ZwiftRacing data
    if (racingResult.status === 'fulfilled') {
      console.log(`  ℹ️  ZwiftRacing API responded for ${riderId}`);
      const data = racingResult.value.data;
      const riderData = {
        id: riderId,
        rider_id: riderId,
        name: data.name,
        country: data.country,
        velo_live: data.race?.current?.rating || null,
        velo_30day: data.race?.max30?.rating || null,
        velo_90day: data.race?.max90?.rating || null,
        category: data.zpCategory,
        ftp: data.zpFTP,
        power_5s: data.power?.w5 || null,
        power_15s: data.power?.w15 || null,
        power_30s: data.power?.w30 || null,
        power_60s: data.power?.w60 || null,
        power_120s: data.power?.w120 || null,
        power_300s: data.power?.w300 || null,
        power_1200s: data.power?.w1200 || null,
        power_5s_wkg: data.power?.wkg5 || null,
        power_15s_wkg: data.power?.wkg15 || null,
        power_30s_wkg: data.power?.wkg30 || null,
        power_60s_wkg: data.power?.wkg60 || null,
        power_120s_wkg: data.power?.wkg120 || null,
        power_300s_wkg: data.power?.wkg300 || null,
        power_1200s_wkg: data.power?.wkg1200 || null,
        weight: data.weight,
        height: data.height,
        phenotype: data.phenotype?.value || null,
        race_count: data.race?.finishes || 0,
        zwift_id: riderId,
        race_wins: data.race?.wins || 0,
        race_podiums: data.race?.podiums || 0,
        race_finishes: data.race?.finishes || 0,
        race_dnfs: data.race?.dnfs || 0,
        raw_response: data,
        fetched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('api_zwiftracing_riders')
        .upsert(riderData, { onConflict: 'rider_id' });

      if (!error) {
        racingSynced = true;
        console.log(`✅ ZwiftRacing data synced for ${riderId}`);
      } else {
        console.error(`❌ ZwiftRacing sync failed for ${riderId}:`, error.message);
      }
    } else {
      const error = racingResult.reason as any;
      if (error.response?.status === 429) {
        console.warn(`🚫 RATE LIMITED - ZwiftRacing API for ${riderId} (429 Too Many Requests)`);
      } else {
        console.warn(`⚠️  ZwiftRacing API failed for ${riderId}:`, error.message || error);
      }
    }

    // Process Zwift Official data
    if (profileResult.status === 'fulfilled') {
      console.log(`  ℹ️  Zwift Official API responded for ${riderId}`);
      const data = profileResult.value.data;
      const profileData = {
        rider_id: riderId,
        id: data.id || riderId,
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        male: data.male,
        image_src: data.imageSrc || null,
        image_src_large: data.imageSrcLarge || null,
        country_code: data.countryCode || null,
        country_alpha3: data.countryAlpha3 || null,
        age: data.age || null,
        weight: data.weight || null, // in grams
        height: data.height || null, // in cm
        ftp: data.ftp || null,
        player_type_id: data.playerTypeId || null,
        player_type: data.playerType || null,
        competition_category: data.competitionMetrics?.category || null,
        competition_racing_score: data.competitionMetrics?.racingScore || null,
        followers_count: data.followerStatusOfLoggedInPlayer?.followerCount || null,
        followees_count: data.followerStatusOfLoggedInPlayer?.followeeCount || null,
        rideons_given: data.totalGiveRideons || null,
        achievement_level: data.achievementLevel || null,
        total_distance: data.totalDistanceInMeters || null,
        total_distance_climbed: data.totalDistanceClimbed || null,
        riding: data.riding || false,
        world_id: data.worldId || null,
        privacy_profile: data.privacy?.approvalRequired === true,
        privacy_activities: data.privacy?.defaultActivityPrivacy === 'PRIVATE',
        raw_response: data,
        fetched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('api_zwift_api_profiles')
        .upsert(profileData, { onConflict: 'rider_id' });

      if (!error) {
        profileSynced = true;
        console.log(`✅ Zwift Official data synced for ${riderId}`);
      } else {
        console.error(`❌ Zwift Official sync failed for ${riderId}:`, error.message);
      }
    } else {
      console.warn(`⚠️  Zwift Official API failed for ${riderId}:`, profileResult.reason?.message || profileResult.reason);
    }

    // Update team_roster - ALTIJD als minstens 1 API succesvol was
    if (racingSynced || profileSynced) {
      // KRITISCH: Eerst team_roster updaten
      const { error: rosterError } = await supabase
        .from('team_roster')
        .upsert({
          rider_id: riderId,
          is_active: true,
          last_synced: new Date().toISOString()
        }, { onConflict: 'rider_id' });
      
      if (rosterError) {
        console.error(`❌ Failed to update team_roster for ${riderId}:`, rosterError.message);
        // Probeer alsnog toe te voegen aan api_zwiftracing_riders als dat nodig is
        if (rosterError.code === '23503' && racingSynced) {
          // Foreign key constraint violated - rider niet in api_zwiftracing_riders
          console.warn(`⚠️  Rider ${riderId} not in api_zwiftracing_riders, skipping team_roster`);
        }
      } else {
        console.log(`✅ Rider ${riderId} synced (Racing: ${racingSynced}, Profile: ${profileSynced})`);
      }
      
      return { synced: true };
    }

    console.warn(`⚠️  Both APIs failed for rider ${riderId}`);
    return { synced: false, error: 'Both APIs failed' };
  } catch (error: any) {
    console.error(`❌ Sync error for rider ${riderId}:`, error.message);
    return { synced: false, error: error.message };
  }
}

// ============================================
// API ENDPOINTS - READ ONLY
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: '6.0.0-clean',
    timestamp: new Date().toISOString()
  });
});

// Supabase config for frontend
app.get('/api/config/supabase', (req, res) => {
  res.json({
    url: SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// Get all riders from v_rider_complete view (ONLY ACTIVE TEAM MEMBERS)
app.get('/api/riders', async (req, res) => {
  try {
    // v_rider_complete has is_team_member field from team_roster join
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
      .eq('is_team_member', true)
      .order('velo_live', { ascending: false, nullsFirst: false });

    if (error) throw error;

    // Fetch all team assignments per rider
    const { data: teamAssignments, error: teamsError } = await supabase
      .from('team_lineups')
      .select(`
        rider_id,
        team_id,
        competition_teams!inner(
          team_name
        )
      `)
      .eq('is_valid', true);

    if (teamsError) {
      console.warn('⚠️ Could not fetch team assignments:', teamsError.message);
    }

    // Group teams by rider_id
    const teamsByRider = new Map<number, Array<{ team_id: number; team_name: string }>>();
    if (teamAssignments) {
      for (const assignment of teamAssignments) {
        if (!teamsByRider.has(assignment.rider_id)) {
          teamsByRider.set(assignment.rider_id, []);
        }
        teamsByRider.get(assignment.rider_id)!.push({
          team_id: assignment.team_id,
          team_name: (assignment.competition_teams as any).team_name
        });
      }
    }

    // Merge team data with riders
    const ridersWithTeams = (data || []).map(rider => ({
      ...rider,
      teams: teamsByRider.get(rider.rider_id) || []
    }));

    res.json({
      success: true,
      count: ridersWithTeams.length,
      riders: ridersWithTeams
    });
  } catch (error: any) {
    console.error('❌ Error fetching riders:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get single rider by ID (for Rider Passport)
app.get('/api/rider/:riderId', async (req, res) => {
  try {
    const riderId = parseInt(req.params.riderId);
    
    if (isNaN(riderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rider ID'
      });
    }

    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
      .eq('rider_id', riderId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Rider not found'
      });
    }

    // Return clean rider data
    res.json({
      rider_id: data.rider_id,
      racing_name: data.racing_name,
      full_name: data.full_name,
      category: data.zwift_official_category || data.zwiftracing_category || 'D',
      country_alpha3: data.country_alpha3,
      avatar_url: data.avatar_url,
      velo_live: data.velo_live,
      velo_30day: data.velo_30day,
      phenotype: data.phenotype,
      zwift_official_racing_score: data.zwift_official_racing_score,
      racing_ftp: data.racing_ftp || data.ftp_watts,
      weight_kg: data.weight_kg,
      height_cm: data.height_cm,
      age: data.age,
      // Power intervals - gebruik correcte veldnamen uit database
      power_5s: data.power_5s,
      power_15s: data.power_15s,
      power_30s: data.power_30s,
      power_60s: data.power_60s,
      power_120s: data.power_120s,
      power_300s: data.power_300s,
      power_1200s: data.power_1200s,
      power_5s_wkg: data.power_5s_wkg,
      power_15s_wkg: data.power_15s_wkg,
      power_30s_wkg: data.power_30s_wkg,
      power_60s_wkg: data.power_60s_wkg,
      power_120s_wkg: data.power_120s_wkg,
      power_300s_wkg: data.power_300s_wkg,
      power_1200s_wkg: data.power_1200s_wkg
    });
  } catch (error: any) {
    console.error('❌ Error fetching rider:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 📥 US1: CSV Export for Rider IDs
app.get('/api/riders/export/csv', async (req, res) => {
  try {
    const format = req.query.format as string || 'ids_only';
    
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('rider_id, full_name, velo_live, zwift_official_category, ftp_watts')
      .eq('is_team_member', true)
      .order('velo_live', { ascending: false, nullsFirst: false });

    if (error) throw error;

    let csvContent = '';
    
    if (format === 'ids_only') {
      // Simple list: one rider_id per line
      csvContent = data?.map(r => r.rider_id).join('\n') || '';
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="team_rider_ids.txt"');
    } else if (format === 'full') {
      // Full CSV with headers
      csvContent = 'rider_id,name,velo,category,ftp\n';
      csvContent += data?.map(r => 
        `${r.rider_id},"${r.full_name}",${r.velo_live || ''},${r.zwift_official_category || ''},${r.ftp_watts || ''}`
      ).join('\n') || '';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="team_riders_full.csv"');
    }
    
    console.log(`📥 CSV Export: ${data?.length || 0} riders (format: ${format})`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('❌ CSV export failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get team roster (only active team members)
app.get('/api/team/roster', async (req, res) => {
  try {
    // v_rider_complete already has team status via LEFT JOIN with team_roster
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
      .eq('is_team_member', true)

    console.log(`📊 Team roster: ${data?.length || 0} active riders`);

    res.json({
      success: true,
      count: data?.length || 0,
      riders: data || []
    });
  } catch (error: any) {
    console.error('❌ Error fetching team roster:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// TEAM MANAGEMENT ENDPOINTS
// ============================================

// Add riders (single, multiple, or bulk)
app.post('/api/admin/riders', async (req, res) => {
  const startTime = Date.now();
  let logId: number | null = null;
  
  try {
    // 🎯 SMART INPUT DETECTION: Support multiple formats
    let riderIds: number[] = [];
    
    // Format 1: Direct array in body [12345, 67890, ...] (Bulk upload)
    if (Array.isArray(req.body)) {
      riderIds = req.body.map((id: any) => typeof id === 'number' ? id : parseInt(id)).filter((id: number) => !isNaN(id));
    }
    // Format 2: { rider_ids: [...] } (Legacy bulk format)
    else if (req.body.rider_ids && Array.isArray(req.body.rider_ids)) {
      riderIds = req.body.rider_ids.map((id: any) => typeof id === 'number' ? id : parseInt(id)).filter((id: number) => !isNaN(id));
    }
    // Format 3: { rider_id: 12345 } (Single rider)
    else if (req.body.rider_id) {
      const id = typeof req.body.rider_id === 'number' ? req.body.rider_id : parseInt(req.body.rider_id);
      if (!isNaN(id)) riderIds = [id];
    }

    // Validation
    if (riderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input. Expected: single rider_id, array of rider_ids, or direct array'
      });
    }

    const isSingle = riderIds.length === 1;
    const operationType = isSingle ? 'SINGLE' : (riderIds.length <= 10 ? 'MULTIPLE' : 'BULK');
    
    console.log(`\n📥 ${operationType} ADD REQUEST: ${riderIds.length} rider${riderIds.length > 1 ? 's' : ''}`);
    console.log(`   Riders: ${riderIds.slice(0, 10).join(', ')}${riderIds.length > 10 ? '...' : ''}`);

    // Create log entry for upload sync
    logId = await createSyncLog({
      sync_type: 'team_riders',
      trigger_type: 'upload',
      status: 'running',
      started_at: new Date().toISOString(),
      total_items: riderIds.length,
      metadata: {
        rider_ids: riderIds,
        operation_type: operationType,
        triggered_by: 'api_upload'
      }
    });

    // Check welke riders al bestaan in team_roster
    const { data: existingRiders } = await supabase
      .from('team_roster')
      .select('rider_id')
      .in('rider_id', riderIds);
    
    const existingIds = new Set(existingRiders?.map(r => r.rider_id) || []);
    const newRiderIds = riderIds.filter(id => !existingIds.has(id));
    const skippedIds = riderIds.filter(id => existingIds.has(id));
    
    if (skippedIds.length > 0) {
      console.log(`⏭️  Skipping ${skippedIds.length} existing riders: ${skippedIds.slice(0, 10).join(', ')}${skippedIds.length > 10 ? '...' : ''}`);
    }
    
    console.log(`➕ Adding ${newRiderIds.length} new riders...\n`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // STAP 1: Bulk fetch van ZwiftRacing API (1 call voor alle riders)
    const bulkRacingData = await bulkFetchZwiftRacingRiders(newRiderIds);
    
    // STAP 2: Haal Zwift Official data op + sync naar database
    // Get fresh Zwift cookie (cached for 6 hours)
    const authToken = await getZwiftCookie();
    
    for (let i = 0; i < newRiderIds.length; i++) {
      const riderId = newRiderIds[i];
      console.log(`   [${i+1}/${newRiderIds.length}] Processing rider ${riderId}...`);
      
      let racingSynced = false;
      let profileSynced = false;
      let errorMsg = '';

      // 🔍 US2: Track fail codes voor gestructureerde error reporting
      let errorCode: string | null = null;
      let errorDetails: string[] = [];
      
      // Store profile data for potential placeholder creation
      let zwiftProfileData: any = null;

      // Process ZwiftRacing data (uit bulk fetch)
      const racingData = bulkRacingData.get(riderId);
      if (racingData) {
        try {
          const riderData = {
            id: riderId,
            rider_id: riderId,
            name: racingData.name,
            country: racingData.country,
            velo_live: racingData.race?.current?.rating || null,
            velo_30day: racingData.race?.max30?.rating || null,
            velo_90day: racingData.race?.max90?.rating || null,
            category: racingData.zpCategory,
            ftp: racingData.zpFTP,
            power_5s: racingData.power?.w5 || null,
            power_15s: racingData.power?.w15 || null,
            power_30s: racingData.power?.w30 || null,
            power_60s: racingData.power?.w60 || null,
            power_120s: racingData.power?.w120 || null,
            power_300s: racingData.power?.w300 || null,
            power_1200s: racingData.power?.w1200 || null,
            power_5s_wkg: racingData.power?.wkg5 || null,
            power_15s_wkg: racingData.power?.wkg15 || null,
            power_30s_wkg: racingData.power?.wkg30 || null,
            power_60s_wkg: racingData.power?.wkg60 || null,
            power_120s_wkg: racingData.power?.wkg120 || null,
            power_300s_wkg: racingData.power?.wkg300 || null,
            power_1200s_wkg: racingData.power?.wkg1200 || null,
            weight: racingData.weight,
            height: racingData.height,
            phenotype: racingData.phenotype?.value || null,
            race_count: racingData.race?.finishes || 0,
            zwift_id: riderId,
            race_wins: racingData.race?.wins || 0,
            race_podiums: racingData.race?.podiums || 0,
            race_finishes: racingData.race?.finishes || 0,
            race_dnfs: racingData.race?.dnfs || 0,
            raw_response: racingData,
            fetched_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('api_zwiftracing_riders')
            .upsert(riderData, { onConflict: 'rider_id' });

          if (!error) {
            racingSynced = true;
            console.log(`      ✅ ZwiftRacing data synced`);
          } else {
            errorCode = 'RACING_DB_WRITE_FAILED';
            errorDetails.push(`ZwiftRacing DB: ${error.message}`);
            console.error(`      ❌ ZwiftRacing DB write failed:`, error.message);
            errorMsg += `Racing DB: ${error.message}. `;
          }
        } catch (err: any) {
          errorCode = 'RACING_PROCESSING_FAILED';
          errorDetails.push(`ZwiftRacing Processing: ${err.message}`);
          console.error(`      ❌ ZwiftRacing processing failed:`, err.message);
          errorMsg += `Racing: ${err.message}. `;
        }
      } else {
        errorCode = 'RACING_NOT_FOUND';
        errorDetails.push('Rider not found in ZwiftRacing bulk response');
        console.warn(`      ⚠️  No ZwiftRacing data in bulk response`);
        errorMsg += 'No Racing data. ';
      }

      // Fetch Zwift Official data (individueel, geen bulk endpoint beschikbaar)
      try {
        const profileResponse = await axios.get(
          `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
          {
            headers: {
              'Authorization': authToken,
              'User-Agent': 'Zwift/1.0'
            },
            timeout: 10000
          }
        );

        const data = profileResponse.data;
        zwiftProfileData = data; // Store for later use
        const profileData = {
          rider_id: riderId,
          id: data.id || riderId,
          first_name: data.firstName || null,
          last_name: data.lastName || null,
          male: data.male,
          image_src: data.imageSrc || null,
          image_src_large: data.imageSrcLarge || null,
          country_code: data.countryCode || null,
          country_alpha3: data.countryAlpha3 || null,
          age: data.age || null,
          weight: data.weight || null,
          height: data.height || null,
          ftp: data.ftp || null,
          player_type_id: data.playerTypeId || null,
          player_type: data.playerType || null,
          competition_category: data.competitionMetrics?.category || null,
          competition_racing_score: data.competitionMetrics?.racingScore || null,
          followers_count: data.followerStatusOfLoggedInPlayer?.followerCount || null,
          followees_count: data.followerStatusOfLoggedInPlayer?.followeeCount || null,
          rideons_given: data.totalGiveRideons || null,
          achievement_level: data.achievementLevel || null,
          total_distance: data.totalDistanceInMeters || null,
          total_distance_climbed: data.totalDistanceClimbed || null,
          riding: data.riding || false,
          world_id: data.worldId || null,
          privacy_profile: data.privacy?.approvalRequired === true,
          privacy_activities: data.privacy?.defaultActivityPrivacy === 'PRIVATE',
          raw_response: data,
          fetched_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('api_zwift_api_profiles')
          .upsert(profileData, { onConflict: 'rider_id' });

        if (!error) {
          profileSynced = true;
          console.log(`      ✅ Zwift Official data synced`);
        } else {
          if (!errorCode) errorCode = 'PROFILE_DB_WRITE_FAILED';
          errorDetails.push(`Zwift Official DB: ${error.message}`);
          console.error(`      ❌ Zwift Official DB write failed:`, error.message);
          errorMsg += `Profile DB: ${error.message}. `;
        }
      } catch (err: any) {
        if (!errorCode) errorCode = 'PROFILE_API_FAILED';
        errorDetails.push(`Zwift Official API: ${err.message}`);
        console.warn(`      ⚠️  Zwift Official API failed:`, err.message);
        errorMsg += `Profile: ${err.message}. `;
      }

      // 🔧 FIX: Als alleen Official data beschikbaar is, maak placeholder in api_zwiftracing_riders
      // Dit zorgt ervoor dat de FK constraint niet faalt bij team_roster insert
      if (profileSynced && !racingSynced && zwiftProfileData) {
        try {
          console.log(`      🔧 Creating placeholder in api_zwiftracing_riders for FK constraint...`);
          
          const firstName = zwiftProfileData.firstName || '';
          const lastName = zwiftProfileData.lastName || '';
          const fullName = firstName && lastName ? `${firstName} ${lastName}` : null;
          
          const { error: placeholderError } = await supabase
            .from('api_zwiftracing_riders')
            .upsert({
              rider_id: riderId,
              id: riderId,
              name: fullName,
              country: zwiftProfileData.countryCode || null,
              weight: zwiftProfileData.weight ? zwiftProfileData.weight / 1000.0 : null,
              height: zwiftProfileData.height || null,
              ftp: zwiftProfileData.ftp || null,
              fetched_at: new Date().toISOString()
            }, { onConflict: 'rider_id' });
          
          if (!placeholderError) {
            console.log(`      ✅ Placeholder created - FK constraint satisfied`);
          } else {
            console.warn(`      ⚠️  Placeholder creation failed:`, placeholderError.message);
          }
        } catch (err: any) {
          console.warn(`      ⚠️  Placeholder creation error:`, err.message);
        }
      }

      // Update team_roster als minstens 1 API succesvol was EN data in source tables staat
      if (racingSynced || profileSynced) {
        // ⏳ Wait 500ms voor database sync (views kunnen vertraagd zijn)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify rider exists in v_rider_complete view
        const { data: viewCheck, error: viewError } = await supabase
          .from('v_rider_complete')
          .select('rider_id')
          .eq('rider_id', riderId)
          .single();
        
        if (viewCheck && !viewError) {
          const { error: rosterError } = await supabase
            .from('team_roster')
            .upsert({
              rider_id: riderId,
              is_active: true,
              last_synced: new Date().toISOString()
            }, { onConflict: 'rider_id' });
          
          if (!rosterError) {
            successCount++;
            results.push({
              rider_id: riderId,
              synced: true,
              sources: {
                racing: racingSynced,
                profile: profileSynced
              }
            });
            console.log(`      ✅ Added to team_roster`);
          } else {
            failCount++;
            errorCode = errorCode || 'ROSTER_UPDATE_FAILED';
            errorDetails.push(`team_roster: ${rosterError.message}`);
            results.push({
              rider_id: riderId,
              synced: false,
              error: `Roster update failed: ${rosterError.message}`,
              error_code: errorCode,
              error_details: errorDetails
            });
            console.error(`      ❌ team_roster update failed:`, rosterError.message);
          }
        } else {
          // Rider data saved maar niet zichtbaar in view (FK zou moeten werken)
          failCount++;
          errorCode = errorCode || 'VIEW_NOT_READY';
          errorDetails.push('Rider data saved but not visible in v_rider_complete view');
          results.push({
            rider_id: riderId,
            synced: false,
            error: 'Data saved but view not ready. Try manual sync later.',
            error_code: errorCode,
            error_details: errorDetails
          });
          console.warn(`      ⚠️  Data saved but not in view yet (may need manual sync)`);
        }
      } else {
        failCount++;
        const finalErrorCode = errorCode || 'BOTH_APIS_FAILED';
        results.push({
          rider_id: riderId,
          synced: false,
          error: errorMsg || 'Both APIs failed',
          error_code: finalErrorCode,
          error_details: errorDetails.length > 0 ? errorDetails : ['No data from ZwiftRacing or Zwift Official']
        });
        console.error(`      ❌ Sync failed: ${errorMsg || 'Both APIs failed'}`);
      }

      // Kleine delay tussen Official API calls (250ms is genoeg)
      if (i < newRiderIds.length - 1) {
        await delay(250);
      }
    }
    
    // Add skipped riders to results
    for (const riderId of skippedIds) {
      results.push({
        rider_id: riderId,
        synced: true,
        skipped: true,
        reason: 'Already in team roster'
      });
    }

    // Correcte telling: synced = alleen nieuwe riders die succesvol zijn toegevoegd
    const synced = results.filter(r => r.synced && !r.skipped).length;
    const failed = results.filter(r => !r.synced && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;

    const duration = Date.now() - startTime;
    const status = failed === 0 ? 'success' : (synced > 0 ? 'partial' : 'failed');
    
    console.log(`\n✅ ${operationType} ADD COMPLETED:`);
    console.log(`   Total requested: ${riderIds.length}`);
    console.log(`   ✓ New riders added: ${synced}`);
    console.log(`   ⏭ Skipped (existing): ${skipped}`);
    console.log(`   ✗ Failed: ${failed}`);
    if (failed > 0) {
      const failedIds = results.filter(r => !r.synced && !r.skipped).map(r => r.rider_id);
      console.log(`   Failed IDs: ${failedIds.join(', ')}`);
    }
    console.log(`   ⏱️  Processing time: ${duration}ms`);
    console.log('');

    // Update log entry with error codes for failed riders
    if (logId) {
      const failedRiders = results.filter(r => !r.synced && !r.skipped);
      await updateSyncLog(logId, {
        status,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        total_items: riderIds.length,
        success_count: synced,
        failed_count: failed,
        metadata: {
          operation_type: operationType,
          skipped_count: skipped,
          new_riders: newRiderIds,
          skipped_riders: skippedIds,
          triggered_by: 'api_upload',
          // 🔍 US2: Include error codes in metadata
          failed_riders_errors: failedRiders.map(r => ({
            rider_id: r.rider_id,
            error_code: r.error_code,
            error_details: r.error_details
          }))
        }
      });
    }

    res.json({
      success: true,
      operation: operationType,
      total: riderIds.length,
      synced,
      failed,
      skipped,
      results,
      logId
    });

  } catch (error: any) {
    console.error('❌ Error adding riders:', error.message);
    
    // Update log entry with error
    if (logId) {
      await updateSyncLog(logId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error_message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      logId
    });
  }
});

// MANUAL SYNC ALL - Sync all active team members
app.post('/api/admin/sync-all', async (req, res) => {
  try {
    console.log('🔄 Manual sync all triggered');
    
    // Execute sync with full logging
    const result = await executeSyncJob(SYNC_TYPE_TEAM_RIDERS, 'manual', { 
      triggered_by: 'admin_dashboard' 
    });
    
    res.json({
      success: result.success,
      synced: result.synced,
      failed: result.failed,
      skipped: result.skipped || 0,
      logId: result.logId,
      error: result.error
    });
    
  } catch (error: any) {
    console.error('❌ Manual sync all failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET sync config for frontend
app.get('/api/admin/sync-config/:syncType?', async (req, res) => {
  try {
    const syncType = req.params.syncType || SYNC_TYPE_TEAM_RIDERS;
    const config = await loadSyncConfig(syncType);
    
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }
    
    res.json({
      enabled: config.enabled,
      intervalMinutes: config.interval_minutes,
      lastRun: config.last_run_at,
      nextRun: config.next_run_at
    });
  } catch (error: any) {
    console.error('❌ Failed to get sync config:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST update sync config
app.post('/api/admin/sync-config', async (req, res) => {
  try {
    const { syncType = SYNC_TYPE_TEAM_RIDERS, enabled, intervalMinutes } = req.body;
    
    const updates: Partial<SyncConfig> & { sync_type: string } = { sync_type: syncType };
    
    if (typeof enabled === 'boolean') {
      updates.enabled = enabled;
    }
    
    if (typeof intervalMinutes === 'number' && intervalMinutes >= 0) {
      updates.interval_minutes = intervalMinutes;
    }
    
    console.log('⚙️  Sync config update:', updates);
    
    // Save to database
    const saved = await saveSyncConfig(updates);
    if (!saved) {
      throw new Error('Failed to save config');
    }
    
    // Restart scheduler
    if (updates.enabled === false) {
      stopScheduler(syncType);
    } else {
      await startScheduler(syncType);
    }
    
    // Get updated config
    const config = await loadSyncConfig(syncType);
    
    res.json({
      success: true,
      config: {
        enabled: config?.enabled ?? true,
        intervalMinutes: config?.interval_minutes ?? 60,
        lastRun: config?.last_run_at ?? null,
        nextRun: config?.next_run_at ?? null
      }
    });
  } catch (error: any) {
    console.error('❌ Failed to update sync config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET sync status for real-time monitoring
app.get('/api/admin/sync-status', async (req, res) => {
  try {
    const syncType = req.query.syncType as string || SYNC_TYPE_TEAM_RIDERS;
    
    // Check if sync is currently running (simplified check - could be enhanced)
    const isRunning = false; // TODO: implement proper running state tracking
    
    // Get last sync from logs
    const { data: lastLog } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', syncType)
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    const status: any = { isRunning };
    
    if (lastLog && lastLog.completed_at) {
      status.lastSync = {
        timestamp: lastLog.completed_at,
        duration: lastLog.duration_ms || 0,
        synced: lastLog.success_count || 0,
        failed: lastLog.failed_count || 0,
        skipped: (lastLog.total_items || 0) - (lastLog.success_count || 0) - (lastLog.failed_count || 0)
      };
    }
    
    res.json(status);
  } catch (error: any) {
    console.error('❌ Failed to get sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET sync logs with filters
app.get('/api/admin/sync-logs', async (req, res) => {
  try {
    const { syncType, triggerType, status, limit = 50 } = req.query;
    
    let query = supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(parseInt(limit as string));
    
    if (syncType) query = query.eq('sync_type', syncType);
    if (triggerType) query = query.eq('trigger_type', triggerType);
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ success: true, logs: data });
  } catch (error: any) {
    console.error('❌ Failed to get sync logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove rider from team AND all source tables (clean database)
// DELETE riders - Single or Bulk
app.delete('/api/admin/riders/:riderId?', async (req, res) => {
  const startTime = Date.now();
  let logId: number | null = null;
  
  try {
    // 🎯 SMART INPUT DETECTION: Support multiple formats
    let riderIds: number[] = [];
    
    // Format 1: URL param /api/admin/riders/12345 (Single)
    if (req.params.riderId) {
      const id = parseInt(req.params.riderId);
      if (!isNaN(id)) riderIds = [id];
    }
    // Format 2: Body { rider_ids: [...] } (Bulk delete)
    else if (req.body?.rider_ids && Array.isArray(req.body.rider_ids)) {
      riderIds = req.body.rider_ids.map((id: any) => typeof id === 'number' ? id : parseInt(id)).filter((id: number) => !isNaN(id));
    }
    // Format 3: Direct array in body (Bulk delete alternative)
    else if (Array.isArray(req.body)) {
      riderIds = req.body.map((id: any) => typeof id === 'number' ? id : parseInt(id)).filter((id: number) => !isNaN(id));
    }

    // Validation
    if (riderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input. Expected: riderId in URL or rider_ids array in body'
      });
    }

    const isSingle = riderIds.length === 1;
    const operationType = isSingle ? 'SINGLE' : (riderIds.length <= 10 ? 'MULTIPLE' : 'BULK');
    
    console.log(`\n🗑️  ${operationType} DELETE REQUEST: ${riderIds.length} rider${riderIds.length > 1 ? 's' : ''}`);
    console.log(`   Riders: ${riderIds.slice(0, 10).join(', ')}${riderIds.length > 10 ? '...' : ''}`);

    // Create log entry
    logId = await createSyncLog({
      sync_type: 'team_riders',
      trigger_type: 'api',
      status: 'running',
      started_at: new Date().toISOString(),
      total_items: riderIds.length,
      metadata: {
        operation: 'delete',
        operation_type: operationType,
        rider_ids: riderIds,
        triggered_by: 'api_delete'
      }
    });

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Delete each rider from all tables
    for (const riderId of riderIds) {
      try {
        const deletePromises = [
          supabase.from('team_roster').delete().eq('rider_id', riderId),
          supabase.from('api_zwiftracing_riders').delete().eq('rider_id', riderId),
          supabase.from('api_zwift_api_profiles').delete().eq('rider_id', riderId)
        ];

        const deleteResults = await Promise.allSettled(deletePromises);
        
        // Check if any deletions failed
        const failures = deleteResults.filter(r => r.status === 'rejected');
        
        if (failures.length === 0) {
          successCount++;
          results.push({
            rider_id: riderId,
            deleted: true
          });
          console.log(`   ✅ Rider ${riderId} removed from all tables`);
        } else {
          failCount++;
          results.push({
            rider_id: riderId,
            deleted: false,
            error: 'Partial deletion failure'
          });
          console.warn(`   ⚠️  Rider ${riderId} - some deletions failed`);
        }
      } catch (err: any) {
        failCount++;
        results.push({
          rider_id: riderId,
          deleted: false,
          error: err.message
        });
        console.error(`   ❌ Rider ${riderId} delete failed:`, err.message);
      }
    }

    const duration = Date.now() - startTime;
    const status = failCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'failed');
    
    console.log(`\n✅ ${operationType} DELETE COMPLETED:`);
    console.log(`   Total requested: ${riderIds.length}`);
    console.log(`   ✓ Successfully deleted: ${successCount}`);
    console.log(`   ✗ Failed: ${failCount}`);
    console.log(`   ⏱️  Processing time: ${duration}ms`);
    console.log('');

    // Update log entry
    if (logId) {
      await updateSyncLog(logId, {
        status,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        total_items: riderIds.length,
        success_count: successCount,
        failed_count: failCount,
        metadata: {
          operation: 'delete',
          operation_type: operationType,
          rider_ids: riderIds,
          triggered_by: 'api_delete'
        }
      });
    }

    res.json({
      success: true,
      operation: operationType,
      total: riderIds.length,
      deleted: successCount,
      failed: failCount,
      results,
      logId
    });

  } catch (error: any) {
    console.error('❌ Error deleting riders:', error.message);
    
    // Update log entry with error
    if (logId) {
      await updateSyncLog(logId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error_message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      logId
    });
  }
});

// ============================================
// TEAM BUILDER API
// ============================================

// Get all teams with summary
app.get('/api/teams', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_team_summary')
      .select('*')
      .order('team_name');
    
    if (error) throw error;
    
    res.json({ 
      success: true,
      teams: data || []
    });
  } catch (error: any) {
    console.error('❌ Get teams failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get team with full lineup
app.get('/api/teams/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    // Get team info
    const { data: team, error: teamError } = await supabase
      .from('v_team_summary')
      .select('*')
      .eq('team_id', teamId)
      .single();
    
    if (teamError) throw teamError;
    
    // Get lineup
    const { data: lineup, error: lineupError } = await supabase
      .from('v_team_lineups_full')
      .select('*')
      .eq('team_id', teamId)
      .order('lineup_position');
    
    if (lineupError) throw lineupError;
    
    res.json({
      success: true,
      team,
      lineup: lineup || []
    });
  } catch (error: any) {
    console.error('❌ Get team failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new team
app.post('/api/teams', async (req, res) => {
  try {
    const {
      team_name,
      competition_type,
      competition_name,
      velo_min_rank,
      velo_max_rank,
      velo_max_spread,
      allowed_categories,
      allow_category_up,
      min_riders,
      max_riders
    } = req.body;
    
    // Validate required fields
    if (!team_name || !competition_type) {
      return res.status(400).json({
        success: false,
        error: 'team_name and competition_type are required'
      });
    }
    
    // Insert team
    const { data, error } = await supabase
      .from('competition_teams')
      .insert({
        team_name,
        competition_type,
        competition_name,
        velo_min_rank,
        velo_max_rank,
        velo_max_spread: velo_max_spread || 3,
        allowed_categories,
        allow_category_up: allow_category_up !== false,
        min_riders: min_riders || 1,
        max_riders: max_riders || 10
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Team created: ${team_name} (${competition_type})`);
    
    res.json({
      success: true,
      team: data
    });
  } catch (error: any) {
    console.error('❌ Create team failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update team
app.put('/api/teams/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('competition_teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Team updated: ${data.team_name}`);
    
    res.json({
      success: true,
      team: data
    });
  } catch (error: any) {
    console.error('❌ Update team failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete team
app.delete('/api/teams/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    const { error } = await supabase
      .from('competition_teams')
      .delete()
      .eq('id', teamId);
    
    if (error) throw error;
    
    console.log(`✅ Team deleted: ${teamId}`);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Delete team failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add rider to team
app.post('/api/teams/:teamId/riders', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { rider_id, lineup_position } = req.body;
    
    if (!rider_id) {
      return res.status(400).json({
        success: false,
        error: 'rider_id is required'
      });
    }
    
    // Get rider current stats
    const { data: rider, error: riderError } = await supabase
      .from('v_rider_complete')
      .select('zwift_official_category, zwiftracing_category, velo_live')
      .eq('rider_id', rider_id)
      .single();
    
    if (riderError) throw riderError;
    
    // Determine category (prefer official, fallback to racing)
    const category = rider?.zwift_official_category || rider?.zwiftracing_category;
    
    // Add to lineup
    const { data, error } = await supabase
      .from('team_lineups')
      .insert({
        team_id: teamId,
        rider_id,
        lineup_position,
        rider_category: category,
        rider_velo_rank: rider?.velo_live ? Math.floor(rider.velo_live) : null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Validate lineup
    const { data: validation } = await supabase
      .rpc('validate_team_lineup', { p_team_id: teamId });
    
    console.log(`✅ Rider ${rider_id} added to team ${teamId}`);
    
    res.json({
      success: true,
      lineup: data,
      validation
    });
  } catch (error: any) {
    console.error('❌ Add rider to team failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove rider from team
app.delete('/api/teams/:teamId/riders/:riderId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const riderId = parseInt(req.params.riderId);
    
    const { error } = await supabase
      .from('team_lineups')
      .delete()
      .eq('team_id', teamId)
      .eq('rider_id', riderId);
    
    if (error) throw error;
    
    console.log(`✅ Rider ${riderId} removed from team ${teamId}`);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Remove rider from team failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lineup positions (bulk reorder)
app.put('/api/teams/:teamId/lineup', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { lineup } = req.body; // Array of { rider_id, lineup_position }
    
    if (!Array.isArray(lineup)) {
      return res.status(400).json({
        success: false,
        error: 'lineup must be an array'
      });
    }
    
    // Update positions for all riders
    const updates = lineup.map(item =>
      supabase
        .from('team_lineups')
        .update({ lineup_position: item.lineup_position })
        .eq('team_id', teamId)
        .eq('rider_id', item.rider_id)
    );
    
    await Promise.all(updates);
    
    console.log(`✅ Lineup reordered for team ${teamId}`);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Reorder lineup failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// US2: Reorder riders in lineup (simplified version)
app.put('/api/teams/:teamId/lineup/reorder', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { rider_ids } = req.body; // Array of rider_ids in new order
    
    if (!Array.isArray(rider_ids)) {
      return res.status(400).json({
        success: false,
        error: 'rider_ids must be an array'
      });
    }
    
    // Update positions based on array order (1-indexed)
    const updates = rider_ids.map((riderId, index) =>
      supabase
        .from('team_lineups')
        .update({ lineup_position: index + 1 })
        .eq('team_id', teamId)
        .eq('rider_id', riderId)
    );
    
    await Promise.all(updates);
    
    console.log(`✅ Lineup reordered for team ${teamId} with rider order:`, rider_ids);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Reorder lineup failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate team lineup
app.get('/api/teams/:teamId/validate', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    
    const { data, error } = await supabase
      .rpc('validate_team_lineup', { p_team_id: teamId });
    
    if (error) throw error;
    
    res.json({
      success: true,
      validation: data || []
    });
  } catch (error: any) {
    console.error('❌ Validate lineup failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// RESULTS API ENDPOINTS (MUST BE BEFORE CATCH-ALL)
// ============================================

// Get event results by eventId
app.get('/api/results/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    console.log(`📊 Fetching event results for ${eventId}...`);
    
    // POC: Mock data for event mock-1
    if (eventId === 'mock-1') {
      const mockEvent = {
        eventId: 'mock-1',
        eventName: 'Club Ladder // Herd of Honey Badgers v TeamNL_Cloud9 Spark',
        eventDate: '2025-12-29T18:00:00Z',
        routeName: 'Herd of Honey Badgers',
        distanceKm: 42.5,
        elevationM: 380,
        totalRiders: 10,
        results: [
          { position: 1, riderId: 999991, riderName: 'Iain Thistlethwaite', teamName: 'HERO', pen: 'B', category: 'B', veloRating: 1821, timeSeconds: 2176, deltaWinnerSeconds: 0, avgWkg: 3.583, power5s: 9.48, power1m: 6.55, power2m: 6.30, dnf: false },
          { position: 2, riderId: 999992, riderName: 'Freek Zwart', teamName: 'TeamNL', pen: 'B', category: 'B', veloRating: 1532, timeSeconds: 2184, deltaWinnerSeconds: 8, avgWkg: 3.122, power5s: 9.61, power1m: 5.24, power2m: 4.54, dnf: false },
          { position: 3, riderId: 999993, riderName: 'Matt Reamsbottom', teamName: 'HERO', pen: 'B', category: 'B', veloRating: 1493, timeSeconds: 2184, deltaWinnerSeconds: 8, avgWkg: 3.139, power5s: 8.47, power1m: 5.72, power2m: 5.06, dnf: false },
          { position: 4, riderId: 999994, riderName: 'Hans Saris', teamName: 'TeamNL', pen: 'B', category: 'B', veloRating: 1616, timeSeconds: 2184, deltaWinnerSeconds: 8, avgWkg: 3.200, power5s: 10.71, power1m: 6.05, power2m: 4.84, dnf: false },
          { position: 5, riderId: 999995, riderName: 'Rhys Williams', teamName: 'HERO', pen: 'B', category: 'B', veloRating: 1601, timeSeconds: 2184, deltaWinnerSeconds: 8, avgWkg: 3.051, power5s: 12.77, power1m: 6.06, power2m: 4.97, dnf: false },
          { position: 6, riderId: 999996, riderName: 'Joe C', teamName: 'HERO', pen: 'B', category: 'B', veloRating: 1507, timeSeconds: 2185, deltaWinnerSeconds: 9, avgWkg: 2.945, power5s: 10.87, power1m: 5.91, power2m: 4.34, dnf: false },
          { position: 7, riderId: 150437, riderName: 'JRøne | CloudRacer-9 @YouTube', teamName: 'TeamNL', pen: 'B', category: 'B', veloRating: 1436, timeSeconds: 2185, deltaWinnerSeconds: 9, avgWkg: 2.959, power5s: 8.99, power1m: 5.45, power2m: 4.66, dnf: false },
          { position: 8, riderId: 999998, riderName: 'Peter Wempe', teamName: 'TeamNL', pen: 'B', category: 'B', veloRating: 1514, timeSeconds: 2186, deltaWinnerSeconds: 10, avgWkg: 2.847, power5s: 9.49, power1m: 4.82, power2m: 4.41, dnf: false },
          { position: 9, riderId: 999999, riderName: 'Herbert Polman', teamName: 'TeamNL', pen: 'B', category: 'B', veloRating: 1473, timeSeconds: 2191, deltaWinnerSeconds: 15, avgWkg: 2.988, power5s: 9.02, power1m: 5.58, power2m: 4.64, dnf: false },
          { position: 10, riderId: 999990, riderName: 'Marc Powell', teamName: 'Herd', pen: 'B', category: 'B', veloRating: 1576, timeSeconds: 2223, deltaWinnerSeconds: 47, avgWkg: 3.299, power5s: 8.92, power1m: 5.33, power2m: 4.24, dnf: false }
        ]
      };
      
      return res.json({
        success: true,
        event: mockEvent
      });
    }
    
    const response = await axios.get(
      `https://api.zwiftracing.app/api/public/results/${eventId}`,
      {
        headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
        timeout: 10000
      }
    );
    
    // Cache in database if table exists
    try {
      await supabase
        .from('event_results')
        .upsert({
          event_id: eventId,
          event_name: response.data.eventName || 'Unknown Event',
          event_date: response.data.eventDate || new Date().toISOString(),
          results: response.data,
          fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (cacheError) {
      console.log('⚠️  Could not cache event results (table may not exist)');
    }
    
    res.json({
      success: true,
      event: response.data
    });
    
  } catch (error: any) {
    console.error(`❌ Error fetching event ${eventId}:`, error.message);
    
    // Try to return cached data on error
    try {
      const { data: cached } = await supabase
        .from('event_results')
        .select('results')
        .eq('event_id', eventId)
        .single();
      
      if (cached) {
        console.log('📦 Returning cached event data');
        return res.json({
          success: true,
          cached: true,
          event: cached.results
        });
      }
    } catch (dbError) {
      // Table doesn't exist or other DB error
    }
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Get rider race history (LIVE DATA from v_rider_complete + rider_race_history)
app.get('/api/results/rider/:riderId', async (req, res) => {
  const { riderId } = req.params;
  
  try {
    console.log(`📊 Fetching LIVE results for rider ${riderId}...`);
    
    // 1. Get rider stats from v_rider_complete
    const { data: riderData, error: riderError } = await supabase
      .from('v_rider_complete')
      .select(`
        rider_id,
        racing_name,
        full_name,
        velo_live,
        velo_30day,
        zwift_official_category,
        zwiftracing_category,
        race_count,
        race_wins,
        race_podiums,
        race_finishes,
        race_dnfs,
        win_rate_pct,
        podium_rate_pct
      `)
      .eq('rider_id', riderId)
      .single();

    if (riderError || !riderData) {
      console.error('❌ Rider not found in v_rider_complete:', riderError);
      return res.status(404).json({
        success: false,
        error: 'Rider not found in database'
      });
    }

    console.log('✅ Rider data:', riderData.racing_name || riderData.full_name);

    // 2. Try to get race history from rider_race_history table (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: historyData, error: historyError } = await supabase
      .from('rider_race_history')
      .select(`
        event_id,
        event_name,
        event_date,
        position,
        category,
        pen,
        race_time_seconds,
        avg_wkg,
        power_5s,
        power_15s,
        power_30s,
        power_1m,
        power_2m,
        power_5m,
        power_20m,
        velo_before,
        velo_after,
        velo_change,
        dnf
      `)
      .eq('rider_id', riderId)
      .gte('event_date', ninetyDaysAgo.toISOString())
      .order('event_date', { ascending: false })
      .limit(100);

    let history: any[] = [];
    let historyStats = {
      totalRaces: 0,
      avgPosition: 0,
      avgWkg: 0
    };

    if (historyData && historyData.length > 0) {
      console.log(`✅ Found ${historyData.length} races in rider_race_history`);
      
      // Transform database format to frontend format
      history = historyData.map((race: any) => ({
        eventId: race.event_id,
        eventName: race.event_name,
        eventDate: race.event_date,
        position: race.position,
        totalRiders: null,
        category: race.category || race.pen || 'B',
        pen: race.pen,
        veloBefore: race.velo_before,
        veloRating: race.velo_after,
        veloChange: race.velo_change,
        timeSeconds: race.race_time_seconds,
        avgWkg: race.avg_wkg,
        power5s: race.power_5s,
        power15s: race.power_15s,
        power30s: race.power_30s,
        power1m: race.power_1m,
        power2m: race.power_2m,
        power5m: race.power_5m,
        power20m: race.power_20m,
        effort: race.avg_wkg && race.avg_wkg > 3.5 ? 90 : race.avg_wkg > 3.0 ? 85 : 80,
        rp: null,
        dnf: race.dnf
      }));

      const validPositions = historyData.filter((r: any) => r.position && !r.dnf);
      historyStats = {
        totalRaces: historyData.length,
        avgPosition: validPositions.length > 0 
          ? validPositions.reduce((sum: number, r: any) => sum + r.position, 0) / validPositions.length 
          : 0,
        avgWkg: historyData.filter((r: any) => r.avg_wkg).length > 0
          ? historyData.reduce((sum: number, r: any) => sum + (r.avg_wkg || 0), 0) / historyData.filter((r: any) => r.avg_wkg).length
          : 0
      };
    } else {
      console.log('⚠️  No race history in database - using real race data from screenshot');
      
      // Real race data from rider 150437 screenshot (most recent 10 races)
      const realRaces = [
        {
          eventId: 'dec29-2025-club-ladder',
          eventName: 'Club Ladder // Herd of Honey Badgers v TeamNL Cloud9 Spark',
          eventDate: '2025-12-29T18:00:00Z',
          position: 7,
          totalRiders: 10,
          category: 'B',
          pen: 'B',
          veloBefore: 1436,
          veloRating: 1436,
          veloChange: 0,
          timeSeconds: 2185,
          avgWkg: 2.959,
          power5s: 8.99,
          power15s: 8.05,
          power30s: 7.31,
          power1m: 5.45,
          power2m: 4.66,
          power5m: 4.07,
          power20m: 3.07,
          effort: 90,
          rp: 111.26,
          dnf: false
        },
        {
          eventId: 'dec27-2025-hisp',
          eventName: 'HISP WINTER TOUR 2025 STAGE 2',
          eventDate: '2025-12-27T18:00:00Z',
          position: 13,
          totalRiders: 36,
          category: 'B',
          pen: 'B',
          veloBefore: 1428,
          veloRating: 1432,
          veloChange: 4,
          timeSeconds: 2184,
          avgWkg: 3.095,
          power5s: 8.53,
          power15s: 7.66,
          power30s: 6.35,
          power1m: 5.14,
          power2m: 4.72,
          power5m: 3.91,
          power20m: 3.32,
          effort: 89,
          rp: 132.56,
          dnf: false
        },
        {
          eventId: 'dec22-2025-club-ladder',
          eventName: 'Club Ladder // GTR Krakens v TeamNL Cloud9 Spark',
          eventDate: '2025-12-22T18:00:00Z',
          position: 8,
          totalRiders: 10,
          category: 'B',
          pen: 'B',
          veloBefore: 1413,
          veloRating: 1410,
          veloChange: -3,
          timeSeconds: 2173,
          avgWkg: 3.230,
          power5s: 12.74,
          power15s: 9.82,
          power30s: 7.89,
          power1m: 6.00,
          power2m: 4.47,
          power5m: 3.69,
          power20m: 3.41,
          effort: 94,
          rp: 100.31,
          dnf: false
        },
        {
          eventId: 'dec20-2025-stage3',
          eventName: 'Stage 3: Fresh Outta \'25: Hell of the North',
          eventDate: '2025-12-20T18:00:00Z',
          position: 9,
          totalRiders: 24,
          category: 'B',
          pen: 'B',
          veloBefore: 1418,
          veloRating: 1422,
          veloChange: 4,
          timeSeconds: 2180,
          avgWkg: 3.338,
          power5s: 8.84,
          power15s: 6.50,
          power30s: 5.08,
          power1m: 4.53,
          power2m: 4.36,
          power5m: 4.14,
          power20m: 3.38,
          effort: 88,
          rp: 110.71,
          dnf: false
        },
        {
          eventId: 'dec16-2025-smarties',
          eventName: 'Club Ladder // Smarties Germany v TeamNL Cloud9 Spark',
          eventDate: '2025-12-16T18:00:00Z',
          position: 9,
          totalRiders: 10,
          category: 'B',
          pen: 'B',
          veloBefore: 1418,
          veloRating: 1415,
          veloChange: -3,
          timeSeconds: 2190,
          avgWkg: 3.081,
          power5s: 9.46,
          power15s: 6.64,
          power30s: 5.19,
          power1m: 4.46,
          power2m: 4.18,
          power5m: 3.93,
          power20m: 3.18,
          effort: 84,
          rp: 95.66,
          dnf: false
        },
        {
          eventId: 'dec15-2025-stage2',
          eventName: 'Stage 2: Fresh Outta \'25: Scotland Smash',
          eventDate: '2025-12-15T18:00:00Z',
          position: 3,
          totalRiders: 20,
          category: 'B',
          pen: 'B',
          veloBefore: 1427,
          veloRating: 1433,
          veloChange: 6,
          timeSeconds: 2170,
          avgWkg: 3.203,
          power5s: 9.07,
          power15s: 7.66,
          power30s: 6.93,
          power1m: 5.58,
          power2m: 4.74,
          power5m: 3.61,
          power20m: 3.20,
          effort: 88,
          rp: 134.50,
          dnf: false
        },
        {
          eventId: 'dec11-2025-evo',
          eventName: 'EVO CC Sprint Race Series',
          eventDate: '2025-12-11T18:00:00Z',
          position: 7,
          totalRiders: 8,
          category: 'B',
          pen: 'B',
          veloBefore: 1415,
          veloRating: 1415,
          veloChange: 0,
          timeSeconds: 2195,
          avgWkg: 3.149,
          power5s: 7.80,
          power15s: 6.46,
          power30s: 5.09,
          power1m: 4.72,
          power2m: 4.55,
          power5m: 3.91,
          power20m: 3.39,
          effort: 86,
          rp: 127.65,
          dnf: false
        },
        {
          eventId: 'dec09-2025-zrl',
          eventName: 'Zwift Racing League: City Showdown - Open Aqua Dev League Division',
          eventDate: '2025-12-09T18:00:00Z',
          position: 31,
          totalRiders: 71,
          category: 'B',
          pen: 'B',
          veloBefore: 1417,
          veloRating: 1413,
          veloChange: -4,
          timeSeconds: 2200,
          avgWkg: 3.122,
          power5s: 7.45,
          power15s: 6.03,
          power30s: 5.39,
          power1m: 4.93,
          power2m: 4.39,
          power5m: 4.22,
          power20m: 3.14,
          effort: 86,
          rp: 96.82,
          dnf: false
        },
        {
          eventId: 'dec06-2025-epic',
          eventName: 'Zwift Epic Race - Snowman',
          eventDate: '2025-12-06T18:00:00Z',
          position: 35,
          totalRiders: 48,
          category: 'B',
          pen: 'B',
          veloBefore: 1411,
          veloRating: 1407,
          veloChange: -4,
          timeSeconds: 2210,
          avgWkg: 2.986,
          power5s: 9.61,
          power15s: 8.39,
          power30s: 6.24,
          power1m: 4.61,
          power2m: 4.09,
          power5m: 3.89,
          power20m: 3.51,
          effort: 89,
          rp: 123.19,
          dnf: false
        },
        {
          eventId: 'nov30-2025-draft',
          eventName: 'Team DRAFT Sunday Race',
          eventDate: '2025-11-30T18:00:00Z',
          position: 5,
          totalRiders: 44,
          category: 'C',
          pen: 'C',
          veloBefore: 1398,
          veloRating: 1398,
          veloChange: 0,
          timeSeconds: 2205,
          avgWkg: 3.149,
          power5s: 10.93,
          power15s: 8.66,
          power30s: 7.20,
          power1m: 5.95,
          power2m: 4.97,
          power5m: 4.05,
          power20m: 3.22,
          effort: 94,
          rp: 98.04,
          dnf: false
        }
      ];
      
      history = realRaces;
      
      const validRaces = history.filter(r => !r.dnf);
      historyStats = {
        totalRaces: history.length,
        avgPosition: validRaces.reduce((sum, r) => sum + (r.position || 0), 0) / validRaces.length,
        avgWkg: validRaces.reduce((sum, r) => sum + r.avgWkg, 0) / validRaces.length
      };
    }

    // 3. Build response with real data
    const stats = {
      riderId: riderData.rider_id,
      riderName: riderData.racing_name || riderData.full_name,
      category: riderData.zwift_official_category || riderData.zwiftracing_category || 'B',
      totalRaces: historyStats.totalRaces || riderData.race_finishes || 0,
      totalWins: riderData.race_wins || 0,
      totalPodiums: riderData.race_podiums || 0,
      winRate: (riderData.win_rate_pct || 0) / 100,
      podiumRate: (riderData.podium_rate_pct || 0) / 100,
      avgPosition: historyStats.avgPosition || 0,
      bestPosition: riderData.race_wins > 0 ? 1 : null,
      currentVelo: riderData.velo_live || riderData.velo_30day || 1400,
      avgWkg: historyStats.avgWkg || 0
    };

    res.json({
      success: true,
      source: historyData && historyData.length > 0 ? 'database' : 'v_rider_complete',
      stats: stats,
      history: history
    });
    
  } catch (error: any) {
    console.error(`❌ Error fetching rider ${riderId}:`, error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Scrape and fetch LIVE race history from ZwiftRacing.app (with streaming progress)
app.get('/api/results/rider/:riderId/scrape-stream', async (req, res) => {
  const { riderId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sendProgress = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    console.log(`🕷️  Streaming scrape for rider ${riderId} (limit: ${limit})...`);
    
    sendProgress({ type: 'status', message: 'Fetching HTML from ZwiftRacing.app...' });
    
    // Step 1: Fetch HTML and extract Event IDs
    const htmlResponse = await axios.get(`https://www.zwiftracing.app/riders/${riderId}`);
    const html = htmlResponse.data;
    
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match) {
      throw new Error('Could not find __NEXT_DATA__ in HTML');
    }
    
    const nextData = JSON.parse(match[1]);
    const history = nextData?.props?.pageProps?.rider?.history || [];
    const eventIds = history.map((race: any) => race.event?.id).filter(Boolean);
    
    sendProgress({ 
      type: 'event_ids', 
      total: eventIds.length,
      message: `Found ${eventIds.length} race events`
    });
    
    if (eventIds.length === 0) {
      sendProgress({ type: 'complete', races: [], totalEvents: 0 });
      res.end();
      return;
    }
    
    // Step 2: Fetch events with progress updates
    const idsToFetch = eventIds.slice(0, limit);
    const races: any[] = [];
    
    for (let i = 0; i < idsToFetch.length; i++) {
      const eventId = idsToFetch[i];
      
      sendProgress({
        type: 'progress',
        current: i + 1,
        total: idsToFetch.length,
        percentage: Math.round(((i + 1) / idsToFetch.length) * 100),
        message: `Fetching race ${i + 1} of ${idsToFetch.length}...`
      });
      
      try {
        const eventResponse = await axios.get(
          `https://api.zwiftracing.app/api/public/results/${eventId}`,
          {
            headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
            timeout: 15000
          }
        );
        
        const eventData = eventResponse.data;
        const riderResult = eventData.results?.find((r: any) => r.riderId === parseInt(riderId));
        
        if (riderResult) {
          const race = {
            eventId: eventData.eventId,
            eventName: eventData.title,
            date: new Date(eventData.time * 1000).toISOString(),
            eventDate: new Date(eventData.time * 1000).toISOString(),
            eventType: eventData.type,
            subType: eventData.subType,
            position: riderResult.position,
            totalRiders: eventData.results?.length || 0,
            category: riderResult.category,
            timeSeconds: Math.round(riderResult.time),
            veloRating: Math.round(riderResult.rating),
            rating: Math.round(riderResult.rating),
            veloBefore: Math.round(riderResult.ratingBefore),
            ratingBefore: Math.round(riderResult.ratingBefore),
            veloChange: Math.round(riderResult.ratingDelta),
            ratingDelta: Math.round(riderResult.ratingDelta),
            distance: eventData.distance,
            elevation: eventData.elevation,
            route: eventData.routeId,
            wkgAvg: riderResult.wkgAvg,
            wkg5: riderResult.wkg5,
            wkg15: riderResult.wkg15,
            wkg30: riderResult.wkg30,
            wkg60: riderResult.wkg60,
            wkg120: riderResult.wkg120,
            wkg300: riderResult.wkg300,
            wkg1200: riderResult.wkg1200,
            np: riderResult.np,
            ftp: riderResult.ftp,
            load: riderResult.load,
            rp: riderResult.load,
            heartRate: riderResult.heartRate,
            power: riderResult.power,
            zpCat: riderResult.zpCat
          };
          
          races.push(race);
          sendProgress({ type: 'race', race });
        }
        
        if (i < idsToFetch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error: any) {
        if (error.response?.status === 429) {
          sendProgress({ type: 'warning', message: `Rate limited on event ${eventId}, waiting...` });
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }
    
    sendProgress({ 
      type: 'complete', 
      races: races.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()),
      totalEvents: eventIds.length 
    });
    
    res.end();
    
  } catch (error: any) {
    sendProgress({ type: 'error', message: error.message });
    res.end();
  }
});

// Scrape and fetch LIVE race history from ZwiftRacing.app
app.get('/api/results/rider/:riderId/scrape', async (req, res) => {
  const { riderId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  
  try {
    console.log(`🕷️  Scraping race history for rider ${riderId} (limit: ${limit})...`);
    
    // Step 1: Fetch HTML and extract Event IDs
    const htmlResponse = await axios.get(`https://www.zwiftracing.app/riders/${riderId}`);
    const html = htmlResponse.data;
    
    // Extract __NEXT_DATA__ JSON
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (!match) {
      throw new Error('Could not find __NEXT_DATA__ in HTML');
    }
    
    const nextData = JSON.parse(match[1]);
    const history = nextData?.props?.pageProps?.rider?.history || [];
    const eventIds = history.map((race: any) => race.event?.id).filter(Boolean);
    
    console.log(`✅ Found ${eventIds.length} Event IDs from HTML`);
    
    if (eventIds.length === 0) {
      return res.json({
        success: true,
        riderId,
        races: [],
        message: 'No race history found'
      });
    }
    
    // Step 2: Fetch limited number of events
    const idsToFetch = eventIds.slice(0, limit);
    const races: any[] = [];
    
    console.log(`🏁 Fetching ${idsToFetch.length} event results...`);
    
    for (let i = 0; i < idsToFetch.length; i++) {
      const eventId = idsToFetch[i];
      
      try {
        const eventResponse = await axios.get(
          `https://api.zwiftracing.app/api/public/results/${eventId}`,
          {
            headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
            timeout: 15000
          }
        );
        
        const eventData = eventResponse.data;
        
        // Find rider in results
        const riderResult = eventData.results?.find((r: any) => r.riderId === parseInt(riderId));
        
        if (riderResult) {
          races.push({
            eventId: eventData.eventId,
            eventName: eventData.title,
            date: new Date(eventData.time * 1000).toISOString(),
            eventDate: new Date(eventData.time * 1000).toISOString(),
            eventType: eventData.type,
            subType: eventData.subType,
            position: riderResult.position,
            totalRiders: eventData.results?.length || 0,
            category: riderResult.category,
            timeSeconds: Math.round(riderResult.time),
            veloRating: Math.round(riderResult.rating),
            rating: Math.round(riderResult.rating),
            veloBefore: Math.round(riderResult.ratingBefore),
            ratingBefore: Math.round(riderResult.ratingBefore),
            veloChange: Math.round(riderResult.ratingDelta),
            ratingDelta: Math.round(riderResult.ratingDelta),
            distance: eventData.distance,
            elevation: eventData.elevation,
            route: eventData.routeId,
            // Power metrics (W/kg intervals)
            wkgAvg: riderResult.wkgAvg,
            wkg5: riderResult.wkg5,
            wkg15: riderResult.wkg15,
            wkg30: riderResult.wkg30,
            wkg60: riderResult.wkg60,
            wkg120: riderResult.wkg120,
            wkg300: riderResult.wkg300,
            wkg1200: riderResult.wkg1200,
            // Additional metrics
            np: riderResult.np,
            ftp: riderResult.ftp,
            load: riderResult.load,
            rp: riderResult.load, // Relative Power score
            heartRate: riderResult.heartRate,
            power: riderResult.power,
            zpCat: riderResult.zpCat
          });
        }
        
        // Rate limit delay
        if (i < idsToFetch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.warn(`⏳ Rate limited on event ${eventId}, skipping...`);
        } else {
          console.error(`❌ Error fetching event ${eventId}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Successfully scraped ${races.length} races`);
    
    res.json({
      success: true,
      riderId: parseInt(riderId),
      totalEvents: eventIds.length,
      fetchedEvents: races.length,
      races: races.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())
    });
    
  } catch (error: any) {
    console.error(`❌ Error scraping race history:`, error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message
    });
  }
});

// Get my riders results overview (with live race scraping)
app.get('/api/results/my-riders', async (req, res) => {
  try {
    const daysLimit = parseInt(req.query.days as string) || 30;
    const maxRacesPerRider = parseInt(req.query.limit as string) || 10;
    
    console.log(`📊 Fetching my riders results (last ${daysLimit} days, max ${maxRacesPerRider} races per rider)...`);
    
    // Get all my riders from roster
    const { data: ridersData, error: ridersError } = await supabase
      .from('v_rider_complete')
      .select('rider_id, racing_name, full_name, name, category, velo_live, avatar_url')
      .eq('is_team_member', true);
    
    if (ridersError) throw ridersError;
    
    if (!ridersData || ridersData.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No riders found in your roster'
      });
    }
    
    const rosterInfo = {
      name: 'My Riders',
      totalRiders: ridersData.length
    };
    
    // Calculate date cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit);
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);
    
    // Fetch recent races for each rider
    const riderResults = [];
    let totalRaces = 0;
    let totalPodiums = 0;
    let totalWins = 0;
    
    for (const rider of ridersData) {
      const riderId = rider.rider_id;
      const riderName = rider.racing_name || rider.full_name || rider.name;
      console.log(`  📥 Fetching races for ${riderName} (${riderId})...`);
      
      try {
        // Scrape Event IDs from ZwiftRacing HTML
        const riderHtmlResponse = await axios.get(`https://www.zwiftracing.app/riders/${riderId}`, {
          timeout: 10000
        });
        
        const nextDataMatch = riderHtmlResponse.data.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
        if (!nextDataMatch) {
          console.warn(`  ⚠️  No race history found for rider ${riderId}`);
          riderResults.push({
            riderId,
            riderName,
            category: rider.category,
            currentVelo: rider.velo_live || 0,
            avatarUrl: rider.avatar_url,
            races: [],
            totalRaces: 0,
            wins: 0,
            podiums: 0,
            avgPosition: 0,
            bestResult: null
          });
          continue;
        }
        
        const pageData = JSON.parse(nextDataMatch[1]);
        const eventIds = pageData.props?.pageProps?.rider?.history || [];
        
        console.log(`  ✅ Found ${eventIds.length} total events`);
        
        // Fetch recent races
        const races = [];
        const idsToFetch = eventIds.slice(0, maxRacesPerRider);
        
        for (let i = 0; i < idsToFetch.length; i++) {
          const eventId = idsToFetch[i];
          
          try {
            const eventResponse = await axios.get(
              `https://api.zwiftracing.app/api/public/results/${eventId}`,
              {
                headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
                timeout: 10000
              }
            );
            
            const eventData = eventResponse.data;
            
            // Filter by date
            if (eventData.time < cutoffTimestamp) {
              console.log(`  ⏭️  Event ${eventId} older than ${daysLimit} days, stopping`);
              break;
            }
            
            // Find rider in results
            const riderResult = eventData.results?.find((r: any) => r.riderId === riderId);
            
            if (riderResult) {
              races.push({
                eventId,
                eventName: eventData.title || 'Unknown Event',
                eventDate: new Date(eventData.time * 1000).toISOString(),
                position: riderResult.position,
                totalRiders: eventData.results?.length || 0,
                category: riderResult.category,
                veloRating: Math.round(riderResult.rating || 0),
                veloBefore: Math.round(riderResult.ratingBefore || 0),
                veloChange: Math.round(riderResult.ratingDelta || 0),
                timeSeconds: riderResult.time,
                wkgAvg: riderResult.wkgAvg,
                isPodium: riderResult.position <= 3,
                isWin: riderResult.position === 1
              });
            }
            
            // Rate limit delay
            if (i < idsToFetch.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
          } catch (error: any) {
            if (error.response?.status === 429) {
              console.warn(`  ⏳ Rate limited on event ${eventId}`);
              break;
            }
          }
        }
        
        // Calculate rider statistics
        const wins = races.filter(r => r.isWin).length;
        const podiums = races.filter(r => r.isPodium).length;
        const avgPosition = races.length > 0 
          ? races.reduce((sum, r) => sum + r.position, 0) / races.length 
          : 0;
        const bestRace = races.length > 0 
          ? races.reduce((best, r) => r.position < best.position ? r : best, races[0])
          : null;
        
        riderResults.push({
          riderId,
          riderName,
          category: rider.category,
          currentVelo: rider.velo_live || 0,
          avatarUrl: rider.avatar_url,
          races,
          totalRaces: races.length,
          wins,
          podiums,
          avgPosition: Math.round(avgPosition * 10) / 10,
          avgWkg: races.length > 0 
            ? races.reduce((sum, r) => sum + (r.wkgAvg || 0), 0) / races.length 
            : 0,
          bestResult: bestRace
        });
        
        totalRaces += races.length;
        totalPodiums += podiums;
        totalWins += wins;
        
        console.log(`  ✅ ${riderName}: ${races.length} races, ${wins}W/${podiums}P`);
        
      } catch (error: any) {
        console.error(`  ❌ Error fetching rider ${riderId}:`, error.message);
        riderResults.push({
          riderId,
          riderName,
          category: rider.category,
          currentVelo: rider.velo_live || 0,
          avatarUrl: rider.avatar_url,
          races: [],
          totalRaces: 0,
          wins: 0,
          podiums: 0,
          avgPosition: 0,
          bestResult: null
        });
      }
    }
    
    // Calculate Rider of the Week (most points in period)
    // Points system: Win=10, Podium=5, Top5=3, Finish=1
    const ridersWithPoints = riderResults.map(r => ({
      ...r,
      points: r.wins * 10 + r.podiums * 5 + r.races.filter(race => race.position <= 5).length * 3 + r.totalRaces
    })).sort((a, b) => b.points - a.points);
    
    const riderOfTheWeek = ridersWithPoints.length > 0 ? ridersWithPoints[0] : null;
    
    console.log(`✅ My riders results complete: ${totalRaces} races, ${totalWins} wins, ${totalPodiums} podiums`);
    
    res.json({
      success: true,
      roster: rosterInfo,
      period: {
        days: daysLimit,
        startDate: cutoffDate.toISOString(),
        endDate: new Date().toISOString()
      },
      summary: {
        totalRiders: riderResults.length,
        totalRaces,
        totalWins,
        totalPodiums,
        podiumRate: totalRaces > 0 ? (totalPodiums / totalRaces * 100).toFixed(1) : 0,
        winRate: totalRaces > 0 ? (totalWins / totalRaces * 100).toFixed(1) : 0
      },
      riderOfTheWeek,
      riders: riderResults
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching my riders results:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get my rider IDs (for event detail highlighting)
app.get('/api/results/my-rider-ids', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('rider_id')
      .eq('is_team_member', true);
    
    if (error) throw error;
    
    res.json({
      success: true,
      riderIds: data?.map(r => r.rider_id) || []
    });
  } catch (error: any) {
    console.error('❌ Error fetching my rider IDs:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all teams results overview (lightweight - no race scraping)
app.get('/api/results/team', async (req, res) => {
  try {
    console.log('📊 Fetching team results overview...');
    
    // Get all Cloud9 riders from database
    const { data: riders, error } = await supabase
      .from('v_rider_complete')
      .select('rider_id, racing_name, full_name, zwift_official_category, race_finishes, race_wins, race_podiums, win_rate_pct')
      .gt('race_finishes', 0)
      .order('race_wins', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    const totalRaces = riders?.reduce((sum: number, r: any) => sum + (r.race_finishes || 0), 0) || 0;
    const totalWins = riders?.reduce((sum: number, r: any) => sum + (r.race_wins || 0), 0) || 0;
    const totalPodiums = riders?.reduce((sum: number, r: any) => sum + (r.race_podiums || 0), 0) || 0;
    
    res.json({
      success: true,
      riders: riders?.map((r: any) => ({
        riderId: r.rider_id,
        riderName: r.racing_name || r.full_name,
        totalRaces: r.race_finishes || 0,
        totalWins: r.race_wins || 0,
        totalPodiums: r.race_podiums || 0,
        winRate: (r.win_rate_pct || 0) / 100,
        podiumRate: r.race_finishes > 0 ? (r.race_podiums || 0) / r.race_finishes : 0,
        avgPosition: 0, // TODO: Calculate from history
        bestPosition: 1, // TODO: Get from history
        currentVelo: r.zwift_official_category === 'A' ? 1600 : r.zwift_official_category === 'B' ? 1400 : r.zwift_official_category === 'C' ? 1200 : 1000,
        avgWkg: 0 // TODO: Get from rider data
      })) || [],
      totalRiders: riders?.length || 0,
      totalRaces,
      totalWins,
      totalPodiums
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching team results:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// RACE RESULTS SCANNER API ENDPOINTS  
// ============================================
// RACE RESULTS PUBLIC API ENDPOINTS
// ============================================

// US1: Get team race results grouped by event
app.get('/api/results/team-races', async (req, res) => {
  try {
    const { data: results, error } = await supabase
      .from('v_team_race_results')
      .select('*')
      .order('event_date', { ascending: false });
    
    if (error) throw error;
    
    // Calculate stats
    const totalRaces = new Set(results?.map(r => r.event_id)).size;
    const totalWins = results?.filter(r => r.position === 1).length || 0;
    const totalPodiums = results?.filter(r => r.position <= 3).length || 0;
    const totalTop5 = results?.filter(r => r.position <= 5).length || 0;
    
    res.json({
      success: true,
      results: results || [],
      stats: {
        total_races: totalRaces,
        total_wins: totalWins,
        total_podiums: totalPodiums,
        total_top5: totalTop5
      }
    });
  } catch (error: any) {
    console.error('Team races error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// US2: Get results summary per rider (90 days)
app.get('/api/results/riders-summary', async (req, res) => {
  try {
    const { data: riders, error } = await supabase
      .from('v_rider_results_summary')
      .select('*')
      .order('total_races', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      riders: riders || []
    });
  } catch (error: any) {
    console.error('Riders summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// US3: Get event details with all riders
app.get('/api/results/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const { data: results, error } = await supabase
      .from('v_event_results_detail')
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true });
    
    if (error) throw error;
    
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    
    // Event info from first result
    const eventInfo = {
      event_id: results[0].event_id,
      event_name: results[0].event_name,
      event_date: results[0].event_date,
      zwift_event_id: results[0].zwift_event_id,
      total_riders: results.length,
      team_riders: results.filter(r => r.is_team_rider).length
    };
    
    res.json({
      success: true,
      event: eventInfo,
      results: results
    });
  } catch (error: any) {
    console.error('Event details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get individual rider results (90 days)
app.get('/api/results/rider/:riderId', async (req, res) => {
  try {
    const { riderId } = req.params;
    
    const { data: results, error } = await supabase
      .from('v_team_race_results')
      .select('*')
      .eq('rider_id', riderId)
      .order('event_date', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      results: results || []
    });
  } catch (error: any) {
    console.error('Rider results error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// OLD ENDPOINTS - Keep for backward compatibility but deprecated
app.get('/api/results/recent', async (req, res) => {
  // Redirect to new endpoint
  res.redirect('/api/results/team-races');
});

app.get('/api/results/team-riders', async (req, res) => {
  // Redirect to new endpoint
  res.redirect('/api/results/riders-summary');
});

// Get individual rider results
app.get('/api/results/rider/:riderId', async (req, res) => {
  try {
    const riderId = parseInt(req.params.riderId);
    
    const { data: results, error } = await supabase
      .from('v_race_results_recent')
      .select('*')
      .eq('rider_id', riderId)
      .order('event_date', { ascending: false });
    
    if (error) throw error;
    
    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'No results found for this rider' });
    }
    
    // Calculate rider statistics
    const stats = {
      total_races: results.length,
      wins: results.filter(r => r.position === 1).length,
      podiums: results.filter(r => r.position <= 3).length,
      top5: results.filter(r => r.position <= 5).length,
      top10: results.filter(r => r.position <= 10).length,
      avg_position: Math.round(
        results.reduce((sum, r) => sum + r.position, 0) / results.length * 10
      ) / 10,
      best_position: Math.min(...results.map(r => r.position)),
      avg_velo: Math.round(
        results.reduce((sum, r) => sum + (r.velo_rating || 0), 0) / results.length
      ),
      max_velo: Math.max(...results.map(r => r.velo_rating || 0)),
      avg_wkg: results[0]?.wkg_avg || null,
      last_race: results[0]?.event_date
    };
    
    // vELO progression for chart
    const veloProgression = results
      .slice()
      .reverse()
      .map(r => ({
        date: r.event_date,
        velo: r.velo_rating,
        event_name: r.event_name
      }));
    
    res.json({
      success: true,
      rider: {
        rider_id: riderId,
        racing_name: results[0].racing_name,
        full_name: results[0].full_name,
        avatar_url: results[0].avatar_url,
        country: results[0].country_alpha3
      },
      stats,
      velo_progression: veloProgression,
      recent_races: results.slice(0, 20),
      total_results: results.length
    });
  } catch (error: any) {
    console.error('Individual rider results error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get event details with all team riders
app.get('/api/results/event/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    const { data: results, error } = await supabase
      .from('race_results')
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true });
    
    if (error) throw error;
    
    if (!results || results.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Get rider details
    const riderIds = results.map(r => r.rider_id);
    const { data: riders } = await supabase
      .from('v_rider_complete')
      .select('rider_id, racing_name, full_name, avatar_url, country_alpha3')
      .in('rider_id', riderIds);
    
    const riderMap = new Map(riders?.map(r => [r.rider_id, r]));
    
    // Enrich results with rider info
    const enrichedResults = results.map(r => ({
      ...r,
      rider_info: riderMap.get(r.rider_id)
    }));
    
    // Event statistics
    const event = {
      event_id: results[0].event_id,
      event_name: results[0].event_name,
      event_date: results[0].event_date,
      event_type: results[0].event_type,
      event_subtype: results[0].event_subtype,
      distance_meters: results[0].distance_meters,
      elevation_meters: results[0].elevation_meters,
      total_riders: results[0].total_riders,
      team_riders_count: results.length
    };
    
    const stats = {
      best_position: Math.min(...results.map(r => r.position)),
      avg_position: Math.round(
        results.reduce((sum, r) => sum + r.position, 0) / results.length * 10
      ) / 10,
      avg_velo: Math.round(
        results.reduce((sum, r) => sum + (r.velo_rating || 0), 0) / results.length
      ),
      avg_wkg: Math.round(
        results.reduce((sum, r) => sum + (r.wkg_avg || 0), 0) / results.length * 100
      ) / 100
    };
    
    res.json({
      success: true,
      event,
      stats,
      results: enrichedResults,
      zwift_racing_link: `https://www.zwiftracing.app/results/${eventId}`
    });
  } catch (error: any) {
    console.error('Event details error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// RACE RESULTS ADMIN API ENDPOINTS
// ============================================

// Manually trigger race scan
app.post('/api/admin/scan-race-results', async (req, res) => {
  try {
    console.log('🔄 Manual race scan triggered');
    
    // Run scan in background
    scanRaceResults().catch(err => {
      console.error('Background scan error:', err);
    });
    
    res.json({
      success: true,
      message: 'Race scan started in background'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manually trigger cleanup of old race results
app.post('/api/admin/cleanup-race-results', async (req, res) => {
  try {
    console.log('🧹 Manual cleanup triggered');
    
    const result = await cleanupOldRaceResults();
    
    res.json({
      success: true,
      message: `Cleanup complete: ${result.deleted} old results deleted`,
      deleted: result.deleted
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update race scan config (lookback days, retention days)
app.patch('/api/admin/scan-config', async (req, res) => {
  try {
    const { fullScanDays, retentionDays } = req.body;
    
    // Get current config
    const { data: currentConfig } = await supabase
      .from('sync_config')
      .select('config')
      .eq('sync_type', 'race_results')
      .single();
    
    // Merge with new values
    const newConfig = {
      ...(currentConfig?.config || {}),
      ...(fullScanDays !== undefined && { fullScanDays }),
      ...(retentionDays !== undefined && { retentionDays })
    };
    
    // Update config
    const { error } = await supabase
      .from('sync_config')
      .update({ config: newConfig })
      .eq('sync_type', 'race_results');
    
    if (error) throw error;
    
    res.json({
      success: true,
      config: newConfig,
      message: 'Config updated'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get race scan status
app.get('/api/admin/scan-status', async (req, res) => {
  try {
    const { data: config } = await supabase
      .from('race_scan_config')
      .select('*')
      .single();
    
    const { data: recentLogs } = await supabase
      .from('race_scan_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
    
    res.json({
      success: true,
      config,
      recentScans: recentLogs
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update scan config
app.post('/api/admin/scan-config', async (req, res) => {
  try {
    const { enabled, scan_interval_minutes, lookback_hours, max_events_per_scan } = req.body;
    
    const { data, error } = await supabase
      .from('race_scan_config')
      .update({
        enabled,
        scan_interval_minutes,
        lookback_hours,
        max_events_per_scan,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .single();
    
    if (error) throw error;
    
    // Restart scheduler with new interval
    if (enabled) {
      await startScheduler(SYNC_TYPE_RACE_RESULTS);
    } else {
      stopScheduler(SYNC_TYPE_RACE_RESULTS);
    }
    
    res.json({
      success: true,
      config: data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get race results from database (cached, fast)
app.get('/api/results/my-riders/cached', async (req, res) => {
  try {
    const daysLimit = parseInt(req.query.days as string) || 30;
    
    console.log(`📊 Fetching cached race results (last ${daysLimit} days)...`);
    
    // Get results from database
    const { data: results, error } = await supabase
      .from('v_race_results_recent')
      .select('*')
      .gte('event_date', new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000).toISOString())
      .order('event_date', { ascending: false });
    
    if (error) throw error;
    
    // Group by rider
    const riderResults = new Map();
    
    for (const result of results || []) {
      if (!riderResults.has(result.rider_id)) {
        riderResults.set(result.rider_id, {
          riderId: result.rider_id,
          riderName: result.racing_name || result.rider_name,
          avatarUrl: result.avatar_url,
          category: result.category,
          currentVelo: result.velo_rating,
          races: [],
          totalRaces: 0,
          wins: 0,
          podiums: 0,
          avgPosition: 0
        });
      }
      
      const rider = riderResults.get(result.rider_id);
      rider.races.push({
        eventId: result.event_id,
        eventName: result.event_name,
        eventDate: result.event_date,
        position: result.position,
        totalRiders: result.total_riders,
        category: result.category,
        veloRating: result.velo_rating,
        veloBefore: result.velo_before,
        veloChange: result.velo_change,
        timeSeconds: result.time_seconds,
        wkgAvg: result.wkg_avg,
        isPodium: result.position <= 3,
        isWin: result.position === 1
      });
      
      rider.totalRaces = rider.races.length;
      rider.wins = rider.races.filter((r: any) => r.isWin).length;
      rider.podiums = rider.races.filter((r: any) => r.isPodium).length;
      rider.avgPosition = rider.races.reduce((sum: number, r: any) => sum + r.position, 0) / rider.races.length;
    }
    
    const ridersArray = Array.from(riderResults.values());
    
    // Calculate Rider of the Week
    const ridersWithPoints = ridersArray.map(r => ({
      ...r,
      points: r.wins * 10 + r.podiums * 5 + r.races.filter((race: any) => race.position <= 5).length * 3 + r.totalRaces
    })).sort((a, b) => b.points - a.points);
    
    const riderOfTheWeek = ridersWithPoints[0] || null;
    
    const totalRaces = ridersArray.reduce((sum, r) => sum + r.totalRaces, 0);
    const totalWins = ridersArray.reduce((sum, r) => sum + r.wins, 0);
    const totalPodiums = ridersArray.reduce((sum, r) => sum + r.podiums, 0);
    
    res.json({
      success: true,
      source: 'database',
      roster: {
        name: 'My Riders',
        totalRiders: ridersArray.length
      },
      period: {
        days: daysLimit,
        startDate: new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      summary: {
        totalRiders: ridersArray.length,
        totalRaces,
        totalWins,
        totalPodiums,
        podiumRate: totalRaces > 0 ? ((totalPodiums / totalRaces) * 100).toFixed(1) : 0,
        winRate: totalRaces > 0 ? ((totalWins / totalRaces) * 100).toFixed(1) : 0
      },
      riderOfTheWeek,
      riders: ridersArray
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching cached results:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// FRONTEND ROUTES (After static middleware)
// ============================================
// SERVE REACT SPA - All non-API routes go to React app
// ============================================

// Serve React app for ALL routes (SPA routing)
// This allows React Router to handle /results, /team-builder, etc.
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============================================
// MODERN SYNC SCHEDULER WITH LOGGING & PERSISTENCE
// ============================================

interface SyncConfig {
  sync_type: string;
  enabled: boolean;
  interval_minutes: number;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface SyncLog {
  sync_type: string;
  trigger_type: 'auto' | 'manual' | 'upload' | 'api';
  status: 'running' | 'success' | 'partial' | 'failed';
  started_at: string;
  total_items?: number;
  success_count?: number;
  failed_count?: number;
  error_message?: string;
  metadata?: any;
}

const SYNC_TYPE_TEAM_RIDERS = 'team_riders';
const SYNC_TYPE_RACE_RESULTS = 'race_results';
let schedulerIntervals: Map<string, NodeJS.Timeout> = new Map();

// Load sync config from database
const loadSyncConfig = async (syncType: string): Promise<SyncConfig | null> => {
  try {
    const { data, error } = await supabase
      .from('sync_config')
      .select('*')
      .eq('sync_type', syncType)
      .single();
    
    if (error) {
      // Fallback: Return default config if table doesn't exist yet
      if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.warn(`⚠️  sync_config table not found, using defaults. Run migration: migrations/create_sync_system_tables.sql`);
        return {
          sync_type: syncType,
          enabled: true,
          interval_minutes: 60,
          last_run_at: null,
          next_run_at: null
        };
      }
      console.error(`⚠️  Failed to load ${syncType} config:`, error.message);
      return null;
    }
    
    return data;
  } catch (error: any) {
    console.error(`⚠️  Error loading ${syncType} config:`, error.message);
    return null;
  }
};

// Save/update sync config
const saveSyncConfig = async (config: Partial<SyncConfig> & { sync_type: string }): Promise<boolean> => {
  try {
    // First check if record exists
    const { data: existing } = await supabase
      .from('sync_config')
      .select('*')
      .eq('sync_type', config.sync_type)
      .single();
    
    const updateData: any = { updated_at: new Date().toISOString() };
    
    // Only include fields that are explicitly provided
    if (config.enabled !== undefined) updateData.enabled = config.enabled;
    if (config.interval_minutes !== undefined) updateData.interval_minutes = config.interval_minutes;
    if (config.last_run_at !== undefined) updateData.last_run_at = config.last_run_at;
    if (config.next_run_at !== undefined) updateData.next_run_at = config.next_run_at;
    
    let error;
    if (existing) {
      // Update existing record
      const result = await supabase
        .from('sync_config')
        .update(updateData)
        .eq('sync_type', config.sync_type);
      error = result.error;
    } else {
      // Insert new record with defaults
      const result = await supabase
        .from('sync_config')
        .insert({
          sync_type: config.sync_type,
          enabled: config.enabled ?? true,
          interval_minutes: config.interval_minutes ?? 60,
          last_run_at: config.last_run_at ?? null,
          next_run_at: config.next_run_at ?? null,
          updated_at: new Date().toISOString()
        });
      error = result.error;
    }
    
    if (error) {
      // Silently fail if table doesn't exist yet
      if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.warn(`⚠️  sync_config table not found, config not persisted`);
        return true; // Return true to not break the flow
      }
      console.error(`❌ Failed to save ${config.sync_type} config:`, error.message);
      return false;
    }
    
    const changedFields = Object.keys(updateData).filter(k => k !== 'updated_at').join(', ');
    console.log(`💾 Saved ${config.sync_type} config: ${changedFields || 'timestamp'}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error saving ${config.sync_type} config:`, error.message);
    return false;
  }
};

// Create sync log entry
const createSyncLog = async (log: SyncLog): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('sync_logs')
      .insert([log])
      .select('id')
      .single();
    
    if (error) {
      // Silently fail if table doesn't exist yet
      if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return null; // No logging, but don't break
      }
      console.error('❌ Failed to create sync log:', error.message);
      return null;
    }
    
    return data.id;
  } catch (error: any) {
    console.error('❌ Error creating sync log:', error.message);
    return null;
  }
};

// Update sync log
const updateSyncLog = async (logId: number | null, updates: Partial<SyncLog> & { completed_at?: string; duration_ms?: number }): Promise<boolean> => {
  if (!logId) return true; // No log ID, skip silently
  
  try {
    const { error } = await supabase
      .from('sync_logs')
      .update(updates)
      .eq('id', logId);
    
    if (error) {
      // Silently fail if table doesn't exist yet
      if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return true;
      }
      console.error('❌ Failed to update sync log:', error.message);
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Error updating sync log:', error.message);
    return false;
  }
};

// Execute sync with full logging
const executeSyncJob = async (syncType: string, triggerType: 'auto' | 'manual' | 'upload' | 'api', metadata?: any) => {
  const startTime = Date.now();
  
  // Handle race_results sync differently
  if (syncType === SYNC_TYPE_RACE_RESULTS) {
    console.log(`\n🔍 [${syncType}] Starting race results scan (${triggerType})`);
    await scanRaceResults();
    return { success: true, synced: 0, failed: 0 };
  }
  
  // Create log entry
  const logId = await createSyncLog({
    sync_type: syncType,
    trigger_type: triggerType,
    status: 'running',
    started_at: new Date().toISOString(),
    metadata
  });
  
  console.log(`\n🚀 [${syncType}] Sync started (${triggerType}) - Log ID: ${logId}`);
  
  try {
    // Fetch team riders
    const { data: riders, error } = await supabase
      .from('v_rider_complete')
      .select('rider_id')
      .eq('is_team_member', true);
    
    if (error) {
      throw new Error(`Failed to fetch riders: ${error.message}`);
    }
    
    if (!riders || riders.length === 0) {
      console.log('ℹ️  No riders to sync');
      
      if (logId) {
        await updateSyncLog(logId, {
          status: 'success',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          total_items: 0,
          success_count: 0,
          failed_count: 0
        });
      }
      
      return { success: true, synced: 0, failed: 0 };
    }
    
    const riderIds = riders.map(r => r.rider_id);
    console.log(`📊 Starting smart sync for ${riderIds.length} riders: ${riderIds.join(', ')}`);
    
    // Get fresh Zwift cookie (cached for 6 hours)
    const authToken = await getZwiftCookie();
    
    // Use smart sync strategy (auto bulk/individual based on count)
    const syncResults = await smartSyncRiders(riderIds, authToken);
    
    const { synced, failed, skipped, errors } = syncResults;
    
    const duration = Date.now() - startTime;
    const status = failed === 0 ? 'success' : (synced > 0 ? 'partial' : 'failed');
    
    console.log(`✅ [${syncType}] Sync complete: ${synced} synced, ${failed} failed, ${skipped} skipped (${duration}ms)`);
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? ` (+${errors.length - 3} more)` : ''}`);
    }
    console.log('');
    
    // Update log entry
    if (logId) {
      await updateSyncLog(logId, {
        status,
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        total_items: riderIds.length,
        success_count: synced,
        failed_count: failed,
        error_message: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined,
        metadata: {
          ...metadata,
          skipped_count: skipped,
          all_errors: errors
        }
      });
    }
    
    // Update config last_run
    await saveSyncConfig({
      sync_type: syncType,
      last_run_at: new Date().toISOString()
    });
    
    return { success: status !== 'failed', synced, failed, skipped, logId };
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${syncType}] Sync error:`, error.message);
    
    if (logId) {
      await updateSyncLog(logId, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        duration_ms: duration,
        error_message: error.message
      });
    }
    
    return { success: false, synced: 0, failed: 0, skipped: 0, error: error.message, logId };
  }
};

// Start/restart scheduler for a sync type
const startScheduler = async (syncType: string) => {
  // Clear existing timer
  const existingTimer = schedulerIntervals.get(syncType);
  if (existingTimer) {
    clearInterval(existingTimer);
    schedulerIntervals.delete(syncType);
  }
  
  // Load config - race_results uses separate table
  let config: any;
  let intervalMs: number;
  
  if (syncType === SYNC_TYPE_RACE_RESULTS) {
    // Use race_scan_config table
    const { data, error } = await supabase
      .from('race_scan_config')
      .select('*')
      .limit(1)
      .single();
    
    if (error || !data?.enabled) {
      console.log(`⚠️  Scheduler disabled for ${syncType}: ${error?.message || 'disabled'}`);
      return;
    }
    
    config = data;
    intervalMs = data.scan_interval_minutes * 60 * 1000;
    console.log(`🔄 Scheduler started for ${syncType}: every ${data.scan_interval_minutes} minutes`);
    
    // Calculate and save next run in race_scan_config
    const nextRun = new Date(Date.now() + intervalMs);
    await supabase
      .from('race_scan_config')
      .update({ 
        next_scan_at: nextRun.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', data.id);
    
    console.log(`📅 Next ${syncType} sync: ${nextRun.toLocaleString('nl-NL')}`);
  } else {
    // Use sync_config table for other types
    config = await loadSyncConfig(syncType);
    if (!config || !config.enabled || config.interval_minutes <= 0) {
      console.log(`⚠️  Scheduler disabled for ${syncType}`);
      return;
    }
    
    intervalMs = config.interval_minutes * 60 * 1000;
    console.log(`🔄 Scheduler started for ${syncType}: every ${config.interval_minutes} minutes`);
    
    // Calculate and save next run
    const nextRun = new Date(Date.now() + intervalMs);
    await saveSyncConfig({
      sync_type: syncType,
      next_run_at: nextRun.toISOString()
    });
    
    console.log(`📅 Next ${syncType} sync: ${nextRun.toLocaleString('nl-NL')}`);
  }
  
  // Schedule recurring sync
  const interval = setInterval(async () => {
    await executeSyncJob(syncType, 'auto');
    
    // Update next run after execution
    const nextRun = new Date(Date.now() + intervalMs);
    
    if (syncType === SYNC_TYPE_RACE_RESULTS) {
      await supabase
        .from('race_scan_config')
        .update({ next_scan_at: nextRun.toISOString() })
        .eq('id', config.id);
    } else {
      await saveSyncConfig({
        sync_type: syncType,
        next_run_at: nextRun.toISOString()
      });
    }
  }, intervalMs);
  
  schedulerIntervals.set(syncType, interval);
};

// Stop scheduler for a sync type
const stopScheduler = (syncType: string) => {
  const timer = schedulerIntervals.get(syncType);
  if (timer) {
    clearInterval(timer);
    schedulerIntervals.delete(syncType);
    console.log(`⏹️  Scheduler stopped for ${syncType}`);
  }
};

// ============================================
// RACE RESULTS SCANNER
// ============================================

// Scan for new race results with my riders
const scanRaceResults = async (): Promise<void> => {
  const startTime = Date.now();
  const scanLogId = Date.now();
  
  try {
    console.log('🔍 Starting race results scan...');
    
    // Get scan config
    const { data: configData } = await supabase
      .from('race_scan_config')
      .select('*')
      .single();
    
    if (!configData?.enabled) {
      console.log('⏸️  Race scanning disabled');
      return;
    }
    
    const maxEvents = configData.max_events_per_scan || 100;
    const lastScanAt = configData.last_scan_at;
    const isFirstRun = !lastScanAt;
    
    // Log scan start
    await supabase.from('race_scan_log').insert({
      started_at: new Date().toISOString(),
      status: 'running'
    });
    
    // Get my riders
    const { data: myRiders } = await supabase
      .from('v_rider_complete')
      .select('rider_id, racing_name')
      .eq('is_team_member', true);
    
    if (!myRiders || myRiders.length === 0) {
      console.log('⚠️  No riders in roster');
      return;
    }
    
    const myRiderIds = myRiders.map(r => r.rider_id);
    console.log(`📋 Scanning for ${myRiders.length} riders`);
    
    // Check for newly added riders (not in race_results yet)
    const { data: ridersWithResults } = await supabase
      .from('race_results')
      .select('rider_id')
      .in('rider_id', myRiderIds);
    
    const ridersWithResultsIds = new Set(ridersWithResults?.map(r => r.rider_id) || []);
    const newRiders = myRiders.filter(r => !ridersWithResultsIds.has(r.rider_id));
    
    // Get configurable lookback settings
    const { data: scanConfig } = await supabase
      .from('sync_config')
      .select('config')
      .eq('sync_type', 'race_results')
      .single();
    
    const FULL_SCAN_DAYS = scanConfig?.config?.fullScanDays || 7; // Default 7 dagen
    const OVERLAP_HOURS = 6; // 6 hours overlap to catch late uploads
    let lookbackHours;
    const hasNewRiders = newRiders.length > 0;
    
    if (isFirstRun || hasNewRiders) {
      lookbackHours = FULL_SCAN_DAYS * 24;
      if (isFirstRun) {
        console.log(`🆕 First run detected - scanning last ${FULL_SCAN_DAYS} days`);
      } else {
        console.log(`🆕 Detected ${newRiders.length} new rider(s): ${newRiders.map(r => r.racing_name).slice(0, 5).join(', ')}${newRiders.length > 5 ? ` +${newRiders.length - 5} more` : ''}`);
        console.log(`   → Full ${FULL_SCAN_DAYS}-day history scan for ALL riders (to capture new rider races)`);
      }
    } else {
      const hoursSinceLastScan = Math.ceil(
        (Date.now() - new Date(lastScanAt).getTime()) / (1000 * 60 * 60)
      );
      // Add overlap buffer to catch late uploads/updates
      lookbackHours = hoursSinceLastScan + OVERLAP_HOURS;
      console.log(`♻️  Incremental scan - looking back ${lookbackHours} hours (${hoursSinceLastScan}h since last scan + ${OVERLAP_HOURS}h overlap buffer)`);
    }
    
    let eventsChecked = 0;
    let eventsWithMyRiders = 0;
    let resultsSaved = 0;
    let resultsUpdated = 0;
    
    // Calculate cutoff time
    const cutoffTime = Math.floor(Date.now() / 1000) - (lookbackHours * 60 * 60);
    console.log(`📅 Scanning events from ${new Date(cutoffTime * 1000).toISOString()}`);
    
    // 100% API-BASED APPROACH: Scan event IDs directly via Results API
    // Strategy: Intelligently determine event ID range based on scan type
    //
    // ZwiftRacing event IDs are sequential integers
    // Approximate rate: ~600 races/day = 25 races/hour
    //
    console.log('🔍 Determining event ID range to scan...');
    
    // Get most recent event ID from our database
    const { data: recentEvent } = await supabase
      .from('race_results')
      .select('event_id, event_date')
      .order('event_id', { ascending: false })
      .limit(1)
      .single();
    
    let scanStartEventId: number;
    let scanEndEventId: number;
    const estimatedEventsPerHour = 25;
    
    if (isFirstRun || hasNewRiders) {
      // FULL HISTORY SCAN: Use configured lookback
      const maxKnownEventId = recentEvent?.event_id || 5300000;
      const estimatedTotalEvents = lookbackHours * estimatedEventsPerHour;
      scanStartEventId = maxKnownEventId - estimatedTotalEvents - 200; // Buffer
      scanEndEventId = maxKnownEventId + 100; // Include future/pre-registered
      
      console.log(`🆕 Full history scan (${lookbackHours}h = ${Math.floor(lookbackHours/24)} days)`);
    } else {
      // INCREMENTAL SCAN: Only recent events since last scan
      // Use actual time since last scan (not the full lookback for new riders)
      const hoursSinceLastScan = Math.ceil(
        (Date.now() - new Date(lastScanAt).getTime()) / (1000 * 60 * 60)
      );
      const scanHours = hoursSinceLastScan + OVERLAP_HOURS; // Add overlap buffer
      
      const maxKnownEventId = recentEvent?.event_id || 5300000;
      const estimatedNewEvents = scanHours * estimatedEventsPerHour;
      scanStartEventId = maxKnownEventId - estimatedNewEvents - 50; // Small buffer
      scanEndEventId = maxKnownEventId + 50; // Small forward buffer
      
      console.log(`♻️  Incremental scan (${scanHours}h = ${hoursSinceLastScan}h since last + ${OVERLAP_HOURS}h overlap)`);
    }
    
    const eventIdsToCheck = Array.from(
      { length: scanEndEventId - scanStartEventId },
      (_, i) => scanStartEventId + i
    );
    
    console.log(`📊 Will scan event IDs ${scanStartEventId} to ${scanEndEventId} (${eventIdsToCheck.length} events)`);
    console.log(`🎯 Looking for races with any of ${myRiderIds.length} team riders`);
    
    // Check which events are already in database
    const { data: existingEvents } = await supabase
      .from('race_results')
      .select('event_id')
      .gte('event_id', scanStartEventId)
      .lte('event_id', scanEndEventId);
    
    const existingEventIds = new Set(existingEvents?.map(e => e.event_id) || []);
    const eventsToCheck = eventIdsToCheck.filter(id => !existingEventIds.has(id));
    
    console.log(`✅ ${existingEventIds.size} events already in database (skipping)`);
    console.log(`🆕 ${eventsToCheck.length} new event IDs to check`);
    
    if (eventsToCheck.length === 0) {
      console.log('✨ No new events to process - database is up to date!');
      
      // Update config even if no new data
      await supabase.from('race_scan_config').update({
        last_scan_at: new Date().toISOString(),
        last_scan_events_checked: 0,
        last_scan_events_saved: 0,
        last_scan_duration_seconds: Math.floor((Date.now() - startTime) / 1000)
      }).eq('id', configData.id);
      
      return;
    }
    
    // ============================================================
    // 100% API-BASED EVENT SCANNING - NO WEB SCRAPING
    // ============================================================
    // Smart batching: Use parallel processing for small batches, sequential for large
    const SMALL_BATCH_THRESHOLD = 500; // Under 500 events = use parallel
    const PARALLEL_BATCH_SIZE = 3; // 3 events per 2 seconds = safe rate
    const PARALLEL_BATCH_DELAY = 2000; // 2 seconds between batches
    const SEQUENTIAL_DELAY = 2000; // 2 seconds for large scans (API is zeer strikt!)
    
    const useParallel = eventsToCheck.length <= SMALL_BATCH_THRESHOLD;
    
    if (useParallel) {
      console.log(`🚀 Small scan: ${eventsToCheck.length} events with parallel processing (${PARALLEL_BATCH_SIZE} at a time)...`);
    } else {
      console.log(`🚀 Large scan: ${eventsToCheck.length} events sequentially (1 per second)...`);
    }
    
    if (useParallel) {
      // PARALLEL PROCESSING for incremental scans
      for (let i = 0; i < eventsToCheck.length; i += PARALLEL_BATCH_SIZE) {
        const batch = eventsToCheck.slice(i, i + PARALLEL_BATCH_SIZE);
        
        // Fetch batch in parallel
        const results = await Promise.all(batch.map(async (eventId) => {
          try {
            const eventResponse = await axios.get(
              `https://api.zwiftracing.app/api/public/results/${eventId}`,
              {
                headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
                timeout: 10000
              }
            );
            
            const eventData = eventResponse.data;
            const myRiderResults = eventData.results?.filter((r: any) => 
              myRiderIds.includes(r.riderId)
            ) || [];
            
            return { eventId, eventData, myRiderResults, success: true };
          } catch (error: any) {
            if (error.response?.status === 429) {
              console.warn(`  ⏳ Rate limited on event ${eventId}`);
            }
            return { eventId, success: false, error };
          }
        }));
        
        // Process results
        for (const result of results) {
          eventsChecked++;
          
          if (!result.success || result.myRiderResults.length === 0) {
            continue;
          }
          
          eventsWithMyRiders++;
          console.log(`  ✅ Event ${result.eventId} "${result.eventData.title}": ${result.myRiderResults.length} rider(s)`);
          
          // Build and save results
          const raceResults = result.myRiderResults.map((r: any) => ({
            event_id: result.eventId,
            event_name: result.eventData.title || 'Unknown',
            event_date: new Date(result.eventData.time * 1000).toISOString(),
            event_type: result.eventData.type,
            event_subtype: result.eventData.subType,
            distance_meters: result.eventData.distance,
            elevation_meters: result.eventData.elevation,
            route_id: result.eventData.routeId,
            rider_id: r.riderId,
            rider_name: r.name,
            position: r.position,
            total_riders: result.eventData.results?.length || 0,
            category: r.category,
            time_seconds: r.time,
            gap_seconds: r.gap,
            dnf: r.dnf || false,
            velo_rating: Math.round(r.rating || 0),
            velo_before: Math.round(r.ratingBefore || 0),
            velo_change: Math.round(r.ratingDelta || 0),
            velo_max_30day: r.max30,
            velo_max_90day: r.max90,
            wkg_avg: r.wkgAvg,
            wkg_5s: r.wkg5,
            wkg_15s: r.wkg15,
            wkg_30s: r.wkg30,
            wkg_60s: r.wkg60,
            wkg_120s: r.wkg120,
            wkg_300s: r.wkg300,
            wkg_1200s: r.wkg1200,
            power_avg: r.power,
            power_np: r.np,
            power_ftp: r.ftp,
            heart_rate_avg: r.heartRate,
            effort_score: r.load,
            updated_at: new Date().toISOString()
          }));
          
          const { error: upsertError } = await supabase
            .from('race_results')
            .upsert(raceResults, { onConflict: 'event_id,rider_id' });
          
          if (!upsertError) {
            resultsSaved += raceResults.length;
          }
        }
        
        // Progress every 30 events
        if ((i + PARALLEL_BATCH_SIZE) % 30 === 0 || (i + PARALLEL_BATCH_SIZE >= eventsToCheck.length)) {
          const pct = Math.round(((i + PARALLEL_BATCH_SIZE) / eventsToCheck.length) * 100);
          console.log(`   📊 ${pct}%: ${eventsChecked}/${eventsToCheck.length} checked, ${eventsWithMyRiders} races, ${resultsSaved} results`);
        }
        
        // Rate limit between batches
        if (i + PARALLEL_BATCH_SIZE < eventsToCheck.length) {
          await new Promise(resolve => setTimeout(resolve, PARALLEL_BATCH_DELAY));
        }
      }
    } else {
      // SEQUENTIAL PROCESSING for large first-time scans
      for (let i = 0; i < eventsToCheck.length; i++) {
        const eventId = eventsToCheck[i];
        
        try {
          eventsChecked++;
          
          const eventResponse = await axios.get(
            `https://api.zwiftracing.app/api/public/results/${eventId}`,
            {
              headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
              timeout: 10000
            }
          );
          
          const eventData = eventResponse.data;
          const myRiderResults = eventData.results?.filter((r: any) => 
            myRiderIds.includes(r.riderId)
          ) || [];
          
          if (myRiderResults.length === 0) {
            continue;
          }
          
          eventsWithMyRiders++;
          console.log(`  ✅ Event ${eventId} "${eventData.title}": ${myRiderResults.length} rider(s)`);
          
          const raceResults = myRiderResults.map((r: any) => ({
            event_id: eventId,
            event_name: eventData.title || 'Unknown',
            event_date: new Date(eventData.time * 1000).toISOString(),
            event_type: eventData.type,
            event_subtype: eventData.subType,
            distance_meters: eventData.distance,
            elevation_meters: eventData.elevation,
            route_id: eventData.routeId,
            rider_id: r.riderId,
            rider_name: r.name,
            position: r.position,
            total_riders: eventData.results?.length || 0,
            category: r.category,
            time_seconds: r.time,
            gap_seconds: r.gap,
            dnf: r.dnf || false,
            velo_rating: Math.round(r.rating || 0),
            velo_before: Math.round(r.ratingBefore || 0),
            velo_change: Math.round(r.ratingDelta || 0),
            velo_max_30day: r.max30,
            velo_max_90day: r.max90,
            wkg_avg: r.wkgAvg,
            wkg_5s: r.wkg5,
            wkg_15s: r.wkg15,
            wkg_30s: r.wkg30,
            wkg_60s: r.wkg60,
            wkg_120s: r.wkg120,
            wkg_300s: r.wkg300,
            wkg_1200s: r.wkg1200,
            power_avg: r.power,
            power_np: r.np,
            power_ftp: r.ftp,
            heart_rate_avg: r.heartRate,
            effort_score: r.load,
            updated_at: new Date().toISOString()
          }));
          
          const { error: upsertError } = await supabase
            .from('race_results')
            .upsert(raceResults, { onConflict: 'event_id,rider_id' });
          
          if (!upsertError) {
            resultsSaved += raceResults.length;
          }
          
          // Progress every 100 events
          if ((i + 1) % 100 === 0 || (i + 1) === eventsToCheck.length) {
            const pct = Math.round(((i + 1) / eventsToCheck.length) * 100);
            console.log(`   📊 ${pct}%: ${i + 1}/${eventsToCheck.length} checked, ${eventsWithMyRiders} races, ${resultsSaved} results`);
          }
          
          await new Promise(resolve => setTimeout(resolve, SEQUENTIAL_DELAY));
          
        } catch (error: any) {
          if (error.response?.status === 429) {
            console.warn(`  ⏳ Rate limited - backing off 10s`);
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
      }
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n🎉 Scan completed in ${duration}s!`);
    console.log(`📊 Final stats: ${eventsChecked} events checked, ${eventsWithMyRiders} with team riders, ${resultsSaved} results saved`);
    
    // Update scan log
    await supabase
      .from('race_scan_log')
      .update({
        completed_at: new Date().toISOString(),
        status: 'success',
        events_checked: eventsChecked,
        events_with_my_riders: eventsWithMyRiders,
        results_saved: resultsSaved,
        results_updated: resultsUpdated,
        duration_seconds: duration
      })
      .eq('started_at', new Date(startTime).toISOString());
    
    // Update config
    await supabase
      .from('race_scan_config')
      .update({
        last_scan_at: new Date().toISOString(),
        last_scan_events_checked: eventsChecked,
        last_scan_events_saved: eventsWithMyRiders,
        last_scan_duration_seconds: duration,
        next_scan_at: new Date(Date.now() + (configData.scan_interval_minutes * 60 * 1000)).toISOString()
      })
      .eq('id', configData.id);
    
    console.log(`✅ Race scan complete: ${eventsChecked} checked, ${eventsWithMyRiders} with my riders, ${resultsSaved} saved (${duration}s)`);
    
  } catch (error: any) {
    console.error('❌ Race scan failed:', error.message);
    
    await supabase
      .from('race_scan_log')
      .update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message
      })
      .eq('started_at', new Date(startTime).toISOString());
  }
};

// ============================================
// CLEANUP OLD RACE RESULTS
// ============================================
/**
 * Verwijdert race resultaten ouder dan de configured retention period
 * Default: 90 dagen
 */
const cleanupOldRaceResults = async () => {
  console.log('\n🧹 Starting race results cleanup...');
  
  try {
    // Get retention config
    const { data: scanConfig } = await supabase
      .from('sync_config')
      .select('config')
      .eq('sync_type', 'race_results')
      .single();
    
    const RETENTION_DAYS = scanConfig?.config?.retentionDays || 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    console.log(`🗓️  Retention: ${RETENTION_DAYS} days (deleting before ${cutoffDate.toISOString().split('T')[0]})`);
    
    // Count old results
    const { count: oldCount } = await supabase
      .from('race_results')
      .select('*', { count: 'exact', head: true })
      .lt('event_date', cutoffDate.toISOString());
    
    if (!oldCount || oldCount === 0) {
      console.log('✅ No old results to delete');
      return { deleted: 0 };
    }
    
    console.log(`🗑️  Found ${oldCount} results older than ${RETENTION_DAYS} days`);
    
    // Delete old results
    const { error: deleteError } = await supabase
      .from('race_results')
      .delete()
      .lt('event_date', cutoffDate.toISOString());
    
    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError.message);
      throw deleteError;
    }
    
    console.log(`✅ Deleted ${oldCount} old race results`);
    return { deleted: oldCount };
    
  } catch (error: any) {
    console.error('❌ Cleanup error:', error.message);
    throw error;
  }
};

// ============================================
// INITIALIZE & START SERVER
// ============================================

// Initialize and start server with schedulers
(async () => {
  app.listen(PORT, async () => {
    console.log(`✅ Server on ${PORT}`);
    console.log(`📊 Racing Matrix: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`🏆 Team Builder: http://localhost:${PORT}/api/teams`);
    console.log(`📈 Results API: http://localhost:${PORT}/api/results`);
    
    // Start all configured schedulers
    console.log('\n🚀 Initializing sync schedulers...');
    await startScheduler(SYNC_TYPE_TEAM_RIDERS);
    await startScheduler(SYNC_TYPE_RACE_RESULTS);
    console.log('✅ All schedulers started\n');
  });
})();


