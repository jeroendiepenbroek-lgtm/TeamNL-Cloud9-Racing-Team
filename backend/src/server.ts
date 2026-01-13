import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
// ...existing code...
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ZWIFTRACING_API_TOKEN = process.env.ZWIFTRACING_API_TOKEN || '';

// ...existing code...


const app = express();
app.use(cors());
app.use(express.json());

// Health endpoint voor monitoring
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API endpoint: Race Results sync voor rider
app.post('/api/zwiftracing/sync/rider/:riderId', async (req, res) => {
  const riderId = req.params.riderId;
  const ts = new Date().toISOString();
  console.log(`[${ts}] [SYNC] Sync request ontvangen voor riderId=${riderId}`);
  if (riderId !== '150437') {
    console.warn(`[${ts}] [SYNC] RiderId niet ondersteund: ${riderId}`);
    return res.status(400).json({ success: false, error: 'Alleen rider 150437 wordt ondersteund.' });
  }
  exec('node sync-race-results-150437.js', { cwd: __dirname }, (error, stdout, stderr) => {
    const logTs = new Date().toISOString();
    if (error) {
      console.error(`[${logTs}] [SYNC] Sync error:`, stderr);
      return res.status(500).json({ success: false, error: 'Sync mislukt.', details: stderr });
    }
    console.log(`[${logTs}] [SYNC] Sync output:`, stdout);
    res.json({ success: true, timestamp: logTs, output: stdout });
  });
});

console.log('🚀 Environment loaded (v5.0 - Smart Sync):', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_SERVICE_KEY,
  hasZwiftToken: !!ZWIFTRACING_API_TOKEN,
  nodeEnv: process.env.NODE_ENV
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================// ZWIFT LOGIN (Get Session Cookie)
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
    const response = await axios.post(
      'https://api.zwiftracing.app/api/public/riders',
      [riderId],
      {
        headers: { 
          'Authorization': ZWIFTRACING_API_TOKEN,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    // Response is array, return first item
    return Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;
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
      axios.post('https://api.zwiftracing.app/api/public/riders', [riderId], {
        headers: { 
          'Authorization': ZWIFTRACING_API_TOKEN,
          'Content-Type': 'application/json'
        },
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
      // POST returns array, get first item
      const responseData = racingResult.value.data;
      const data = Array.isArray(responseData) ? responseData[0] : responseData;
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

    res.json({
      success: true,
      count: data?.length || 0,
      riders: data || []
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
// FRONTEND SERVING
// ============================================

// In production (Railway/Docker): frontend is at ../frontend/dist
// In development: frontend is at ../../frontend/dist
const frontendPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '..', '..', 'frontend', 'dist')
  : path.join(__dirname, '..', '..', 'frontend', 'dist');

console.log('📂 Frontend path:', frontendPath);

// ============================================
// RACE RESULTS API (server-side RLS bypass)
// ============================================

// US1: GET Race results voor specifieke rider (90 dagen) from v_dashboard_rider_results
app.get('/api/results/rider/:riderId', async (req, res) => {
  try {
    const riderId = parseInt(req.params.riderId);
    
    if (isNaN(riderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rider ID'
      });
    }
    
    // Gebruik dashboard view met 90-dagen filter
    const { data, error } = await supabase
      .from('v_dashboard_rider_results')
      .select('*')
      .eq('rider_id', riderId)
      .order('event_date', { ascending: false });
    
    if (error) throw error;
    
    console.log(`📊 Race results for rider ${riderId}: ${data?.length || 0} races`);
    
    // Calculate stats voor RiderResultsPage component
    const total_races = data?.length || 0;
    const total_wins = data?.filter(r => r.position === 1).length || 0;
    const total_podiums = data?.filter(r => r.position <= 3).length || 0;
    const avg_position = total_races > 0 
      ? (data?.reduce((sum, r) => sum + (r.position || 0), 0) || 0) / total_races 
      : 0;
    const best_position = total_races > 0
      ? Math.min(...data!.map(r => r.position || 999))
      : 0;
    
    // vELO calculations
    const sortedByDate = [...(data || [])].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    const current_velo = sortedByDate[sortedByDate.length - 1]?.velo_after || 0;
    const velo_30d_ago = sortedByDate.length > 3 
      ? sortedByDate[sortedByDate.length - 4]?.velo_after 
      : sortedByDate[0]?.velo_before;
    const velo_change_30d = (current_velo && velo_30d_ago) ? current_velo - velo_30d_ago : 0;
    
    // Average w/kg
    const avg_wkg = total_races > 0
      ? (data?.reduce((sum, r) => sum + (r.avg_wkg || 0), 0) || 0) / total_races
      : 0;
    
    // Get rider name from first result
    const riderName = `Rider ${riderId}`; // We don't have rider name in results yet
    
    // Format history for frontend
    const history = data?.map(r => ({
      eventId: r.event_id.toString(),
      eventName: r.event_name,
      eventDate: r.event_date,
      position: r.position,
      totalRiders: r.total_participants || 0,
      category: r.category || '',
      timeSeconds: r.time_seconds || 0,
      avgWkg: r.avg_wkg || 0,
      veloRating: r.velo_after || 0,
      veloChange: r.velo_change || 0,
      dnf: false
    })) || [];
    
    res.json({ 
      success: true, 
      stats: {
        riderId,
        riderName,
        totalRaces: total_races,
        totalWins: total_wins,
        totalPodiums: total_podiums,
        winRate: total_races > 0 ? (total_wins / total_races * 100) : 0,
        podiumRate: total_races > 0 ? (total_podiums / total_races * 100) : 0,
        avgPosition: parseFloat(avg_position.toFixed(1)),
        bestPosition: best_position,
        currentVelo: current_velo,
        veloChange30d: velo_change_30d,
        avgWkg: parseFloat(avg_wkg.toFixed(2))
      },
      history,
      results: data || [] // Keep for backward compatibility
    });
  } catch (error: any) {
    console.error('❌ Error fetching race results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// US2: GET Race event details met alle deelnemers
app.get('/api/results/event/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    
    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }
    
    // Haal event details + alle results op
    const { data: eventResults, error: resultsError } = await supabase
      .from('race_results')
      .select('*')
      .eq('event_id', eventId)
      .order('position');
    
    if (resultsError) throw resultsError;
    
    // Haal event metadata op
    const { data: eventData, error: eventError } = await supabase
      .from('race_events')
      .select('*')
      .eq('event_id', eventId)
      .single();
    
    console.log(`📊 Event ${eventId}: ${eventResults?.length || 0} results`);
    
    // Format voor EventResultsPage component
    const formattedResults = eventResults?.map((r, index) => {
      // Calculate delta from winner
      const winnerTime = eventResults[0]?.time_seconds || 0;
      const deltaWinnerSeconds = r.time_seconds && winnerTime 
        ? r.time_seconds - winnerTime 
        : undefined;
      
      return {
        position: r.position || (index + 1),
        riderId: r.rider_id,
        riderName: `Rider ${r.rider_id}`, // TODO: Get actual rider name
        teamName: r.team_name,
        category: r.category || '',
        pen: r.category || 'B', // Use category as pen
        timeSeconds: r.time_seconds || 0,
        deltaWinnerSeconds,
        avgWkg: r.avg_wkg || 0,
        avgPowerWatts: r.avg_power,
        veloRating: r.velo_after,
        veloChange: r.velo_change,
        dnf: false,
        positionInCategory: r.category_position
      };
    }) || [];
    
    res.json({
      success: true,
      event: {
        eventId: eventId.toString(),
        eventName: eventData?.event_name || 'Unknown Event',
        eventDate: eventData?.event_date || new Date().toISOString(),
        routeName: eventData?.route,
        routeWorld: eventData?.world,
        distanceKm: eventData?.distance_km,
        totalRiders: eventResults?.length || 0,
        results: formattedResults
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching event results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Stats voor specifieke rider (summary)
app.get('/api/results/rider/:riderId/stats', async (req, res) => {
  try {
    const riderId = parseInt(req.params.riderId);
    
    if (isNaN(riderId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rider ID'
      });
    }
    
    const { data, error } = await supabase
      .from('v_dashboard_rider_results')
      .select('*')
      .eq('rider_id', riderId);
    
    if (error) throw error;
    
    // Calculate stats
    const total_races = data?.length || 0;
    const total_wins = data?.filter(r => r.position === 1).length || 0;
    const total_podiums = data?.filter(r => r.position <= 3).length || 0;
    const avg_position = total_races > 0 
      ? (data?.reduce((sum, r) => sum + (r.position || 0), 0) || 0) / total_races 
      : 0;
    
    // vELO trend
    const sortedByDate = [...(data || [])].sort((a, b) => 
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    const velo_start = sortedByDate[0]?.velo_before || null;
    const velo_end = sortedByDate[sortedByDate.length - 1]?.velo_after || null;
    const velo_change_total = (velo_end && velo_start) ? velo_end - velo_start : 0;
    
    res.json({
      success: true,
      rider_id: riderId,
      stats: {
        total_races,
        total_wins,
        total_podiums,
        podium_percentage: total_races > 0 ? (total_podiums / total_races * 100).toFixed(1) : 0,
        avg_position: avg_position.toFixed(1),
        velo_start,
        velo_end,
        velo_change_total
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching rider stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Bulk import race results (ZwiftPower E2E pipeline)
app.post('/api/results/bulk', async (req, res) => {
  try {
    const { results } = req.body;

    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'results array is required'
      });
    }

    console.log(`\n📦 BULK RACE RESULTS IMPORT: ${results.length} results`);

    // Map frontend format to database schema
    const payload = results.map((r: any) => ({
      event_id: parseInt(r.eventId),
      rider_id: parseInt(r.riderId),
      position: r.position,
      category: r.category,
      avg_power: r.avgPower,
      avg_wkg: r.avgWkg,
      time_seconds: r.timeSeconds,
      power_5s_wkg: r.power5s,
      power_15s_wkg: r.power15s,
      power_30s_wkg: r.power30s,
      power_1m_wkg: r.power1m,
      power_2m_wkg: r.power2m,
      power_5m_wkg: r.power5m,
      power_20m_wkg: r.power20m,
      rider_name: r.riderName,
      weight: r.weight,
      ftp: r.ftp,
      velo_before: r.veloBefore,
      velo_after: r.veloAfter,
      source: r.source || 'zwiftpower'
    }));

    // Server-side UPSERT bypasses RLS (service key gebruikt)
    const { data, error } = await supabase
      .from('race_results')
      .upsert(payload, { onConflict: 'event_id,rider_id' })
      .select();

    if (error) throw error;

    console.log(`✅ Bulk import complete: ${data?.length || 0} results saved`);

    res.json({
      success: true,
      saved: data?.length || 0,
      total: results.length
    });
  } catch (error: any) {
    console.error('❌ Bulk import failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper: fetch ZwiftPower events for rider (public endpoint)
async function fetchZwiftPowerEvents(riderId: string): Promise<any[]> {
  // ZwiftPower public profile events page
  const url = `https://zwiftpower.com/profile.php?z=${riderId}`;
  const axios = (await import('axios')).default;
  const cheerio = (await import('cheerio')).default;
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const events: any[] = [];
    // Parse event rows (table with class 'table')
    $('table.table tbody tr').each((i, el) => {
      const tds = $(el).find('td');
      if (tds.length < 6) return;
      // EventID is in the event link
      const eventLink = $(tds[2]).find('a').attr('href') || '';
      const match = eventLink.match(/eventid=(\d+)/);
      const eventId = match ? match[1] : null;
      // Date is in tds[0]
      const dateStr = $(tds[0]).text().trim();
      // Only add if eventId exists
      if (eventId) {
        events.push({ eventId, date: dateStr });
      }
    });
    return events;
  } catch (err) {
    console.error('ZwiftPower fetch error:', err);
    return [];
  }
}

// Helper: fetch ZwiftRacing.app results for eventId
async function fetchZwiftRacingResults(eventId: string): Promise<any> {
  const axios = (await import('axios')).default;
  const apiKey = ZWIFTRACING_API_TOKEN;
  // Probeer eerst de hoofdendpoint, dan fallback
  const urls = [
    `https://api.zwiftracing.app/api/public/results/${eventId}`,
    `https://api.zwiftracing.app/api/public/zp/${eventId}/results`
  ];
  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        headers: { 'Authorization': apiKey },
        timeout: 15000
      });
      if (res.data && res.data.results && Array.isArray(res.data.results) && res.data.results.length > 0) {
        return res.data;
      }
    } catch (err: any) {
      // 429 = rate limit, even wachten
      if (err.response && err.response.status === 429) {
        const retry = parseInt(err.response.headers['retry-after'] || '2', 10);
        console.warn(`ZwiftRacing rate limited, wachten ${retry}s...`);
        await new Promise(r => setTimeout(r, retry * 1000));
      } else if (err.response && err.response.status === 404) {
        // Probeer fallback
        continue;
      } else {
        console.error('ZwiftRacing.app fetch error:', err.message || err);
      }
    }
    // Kleine delay tussen requests om rate limiting te voorkomen
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}

// API endpoint: ZwiftRacing replica results for rider

import fs from 'fs';
import * as glob from 'glob';


app.get('/api/zwiftracing/results/rider/:riderId', async (req, res) => {
  const riderId = req.params.riderId;
  // Zoek het nieuwste rider-150437-events-*.json bestand
  const files = glob.sync(path.join(__dirname, '../../rider-150437-events-*.json'));
  if (!files.length) {
    return res.json({ success: false, error: 'Geen rider-150437-events-*.json bestand gevonden' });
  }
  files.sort();
  const latestFile = files[files.length - 1];
  let eventData;
  try {
    const raw = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
    eventData = raw.races || raw.events || raw.data || [];
  } catch (e) {
    return res.json({ success: false, error: 'Kan eventIDs niet laden uit rider-150437-events-*.json' });
  }
  // Filter op laatste 90 dagen
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const filtered = eventData.filter((e: any) => {
    // Probeer verschillende datavelden
    const dateStr = e.date || e.event_date;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= cutoff;
  });
  // Haal ZwiftRacing resultaten op voor elk eventID
  const results = [];
  for (const e of filtered) {
    const eventId = e.event_id || e.tid || e.id;
    if (!eventId) continue;
    // Respecteer rate limiting: kleine delay tussen requests
    await new Promise(r => setTimeout(r, 400));
    const zr = await fetchZwiftRacingResults(eventId);
    if (!zr || !zr.results) continue;
    const myResult = zr.results.find((r: any) => String(r.zwid || r.rider_id) === String(riderId));
    if (!myResult) continue;
    results.push({
      eventId,
      eventName: zr.event?.name || zr.name || e.name || 'Unknown',
      eventDate: zr.event?.date || zr.event?.event_date || e.date,
      position: myResult.position,
      totalRiders: zr.results.length,
      category: myResult.category,
      timeSeconds: myResult.time_seconds || myResult.time?.[0],
      avgWkg: myResult.avg_wkg,
      veloRating: myResult.velo_after,
      veloChange: myResult.velo_change,
      effortScore: myResult.effort || myResult.effort_score,
      power_5s: myResult.power_5s,
      power_15s: myResult.power_15s,
      power_30s: myResult.power_30s,
      power_1m: myResult.power_1m,
      power_2m: myResult.power_2m,
      power_5m: myResult.power_5m,
      power_20m: myResult.power_20m,
      racingScore: myResult.racing_score || myResult.rp
    });
  }
  res.json({ success: true, riderId, results });
});

app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
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
  
  // Load config
  const config = await loadSyncConfig(syncType);
  if (!config || !config.enabled || config.interval_minutes <= 0) {
    console.log(`⚠️  Scheduler disabled for ${syncType}`);
    return;
  }
  
  const intervalMs = config.interval_minutes * 60 * 1000;
  console.log(`🔄 Scheduler started for ${syncType}: every ${config.interval_minutes} minutes`);
  
  // Calculate and save next run
  const nextRun = new Date(Date.now() + intervalMs);
  await saveSyncConfig({
    sync_type: syncType,
    next_run_at: nextRun.toISOString()
  });
  
  console.log(`📅 Next ${syncType} sync: ${nextRun.toLocaleString('nl-NL')}`);
  
  // Schedule recurring sync
  const interval = setInterval(async () => {
    await executeSyncJob(syncType, 'auto');
    
    // Update next run after execution
    const nextRun = new Date(Date.now() + intervalMs);
    await saveSyncConfig({
      sync_type: syncType,
      next_run_at: nextRun.toISOString()
    });
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
// INITIALIZE & START SERVER
// ============================================

// Initialize and start server with schedulers
(async () => {
  app.listen(PORT, async () => {
    console.log(`✅ Server on ${PORT}`);
    console.log(`📊 Racing Matrix: http://localhost:${PORT}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`🏆 Team Builder: http://localhost:${PORT}/api/teams`);
    
    // Start all configured schedulers
    console.log('\n🚀 Initializing sync schedulers...');
    await startScheduler(SYNC_TYPE_TEAM_RIDERS);
    console.log('✅ All schedulers started\n');
  });
})();
