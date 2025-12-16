// ULTRA CLEAN SERVER - ALLEEN RACING MATRIX DATA
// Geen sync, geen teammanager, geen gedoe
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
// ============================================// ZWIFT LOGIN (Get Session Cookie)
// ============================================
let zwiftCookie = process.env.ZWIFT_COOKIE || '';
let cookieExpiry = new Date();
async function getZwiftCookie() {
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
        const authResponse = await axios.post('https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token', new URLSearchParams({
            username,
            password,
            client_id: 'Zwift_Mobile_Link',
            grant_type: 'password'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
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
    }
    catch (error) {
        console.error('❌ Zwift login failed:', error.response?.data || error.message);
        return '';
    }
}
// ============================================// API SYNC FUNCTIONS
// ============================================
// Helper: Wacht tussen API calls om rate limiting te voorkomen
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Rate limiting state
let lastBulkFetchTime = 0;
let bulkRateLimitUntil = 0;
// BULK FETCH: Haal meerdere riders op via ZwiftRacing POST endpoint (max 1000)
async function bulkFetchZwiftRacingRiders(riderIds) {
    const resultMap = new Map();
    if (riderIds.length === 0)
        return resultMap;
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
        const response = await axios.post('https://zwift-ranking.herokuapp.com/public/riders', riderIds, {
            headers: {
                'Authorization': ZWIFTRACING_API_TOKEN,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 seconden voor bulk request
        });
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
        }
        else {
            console.warn('⚠️  Unexpected response format from bulk API');
        }
    }
    catch (error) {
        if (error.response?.status === 429) {
            const retryAfter = parseInt(error.response.headers['retry-after'] || '300');
            bulkRateLimitUntil = now + (retryAfter * 1000);
            console.error('🚫 RATE LIMITED - ZwiftRacing bulk API (429 Too Many Requests)');
            console.error(`   Retry after: ${retryAfter} seconds`);
            console.error(`   💡 Alternative: Gebruik GET /api/admin/riders voor enkele riders (geen bulk limit)`);
        }
        else {
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
async function fetchSingleZwiftRacingRider(riderId) {
    try {
        const response = await axios.get(`https://zwift-ranking.herokuapp.com/public/riders/${riderId}`, {
            headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
            timeout: 10000
        });
        return response.data;
    }
    catch (error) {
        if (error.response?.status === 404) {
            console.warn(`⚠️  Rider ${riderId} not found on ZwiftRacing (404) - skipping`);
            return null; // Non-blocking: rider doesn't exist
        }
        else if (error.response?.status === 429) {
            console.warn(`🚫 Rate limited for rider ${riderId} (429)`);
            throw error; // This IS an error, needs retry
        }
        else {
            console.warn(`⚠️  Failed to fetch rider ${riderId}:`, error.message);
            return null; // Non-blocking: other errors
        }
    }
}
// SMART SYNC: Automatically choose between bulk and individual strategy
async function smartSyncRiders(riderIds, authToken) {
    const results = {
        synced: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };
    if (riderIds.length === 0)
        return results;
    const strategy = riderIds.length >= BULK_SYNC_THRESHOLD ? 'bulk' : 'individual';
    console.log(`🎯 Using ${strategy} sync strategy for ${riderIds.length} riders`);
    // STRATEGY 1: BULK SYNC (for >= 5 riders)
    if (strategy === 'bulk') {
        // Split into chunks if > MAX_BULK_SIZE
        const chunks = [];
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
                        const profileResponse = await axios.get(`https://us-or-rly101.zwift.com/api/profiles/${riderId}`, {
                            headers: {
                                'Authorization': authToken,
                                'User-Agent': 'Zwift/1.0'
                            },
                            timeout: 10000
                        });
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
                    }
                    catch (profileError) {
                        if (profileError.response?.status === 404) {
                            console.warn(`⚠️  Rider ${riderId} profile not found (404) - skipping profile`);
                        }
                        else {
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
                }
                catch (error) {
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
            console.log(`🔄 [${i + 1}/${riderIds.length}] Syncing rider ${riderId}...`);
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
                    const profileResponse = await axios.get(`https://us-or-rly101.zwift.com/api/profiles/${riderId}`, {
                        headers: {
                            'Authorization': authToken,
                            'User-Agent': 'Zwift/1.0'
                        },
                        timeout: 10000
                    });
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
                }
                catch (profileError) {
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
            }
            catch (error) {
                console.error(`❌ Error syncing rider ${riderId}:`, error.message);
                results.failed++;
                results.errors.push(`${riderId}: ${error.message}`);
            }
        }
    }
    return results;
}
async function syncRiderFromAPIs(riderId, skipDelay = false) {
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
            axios.get(`https://zwift-ranking.herokuapp.com/public/riders/${riderId}`, {
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
            }
            else {
                console.error(`❌ ZwiftRacing sync failed for ${riderId}:`, error.message);
            }
        }
        else {
            const error = racingResult.reason;
            if (error.response?.status === 429) {
                console.warn(`🚫 RATE LIMITED - ZwiftRacing API for ${riderId} (429 Too Many Requests)`);
            }
            else {
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
            }
            else {
                console.error(`❌ Zwift Official sync failed for ${riderId}:`, error.message);
            }
        }
        else {
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
            }
            else {
                console.log(`✅ Rider ${riderId} synced (Racing: ${racingSynced}, Profile: ${profileSynced})`);
            }
            return { synced: true };
        }
        console.warn(`⚠️  Both APIs failed for rider ${riderId}`);
        return { synced: false, error: 'Both APIs failed' };
    }
    catch (error) {
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
        if (error)
            throw error;
        res.json({
            success: true,
            count: data?.length || 0,
            riders: data || []
        });
    }
    catch (error) {
        console.error('❌ Error fetching riders:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// 📥 US1: CSV Export for Rider IDs
app.get('/api/riders/export/csv', async (req, res) => {
    try {
        const format = req.query.format || 'ids_only';
        const { data, error } = await supabase
            .from('v_rider_complete')
            .select('rider_id, full_name, velo_live, zwift_official_category, ftp_watts')
            .eq('is_team_member', true)
            .order('velo_live', { ascending: false, nullsFirst: false });
        if (error)
            throw error;
        let csvContent = '';
        if (format === 'ids_only') {
            // Simple list: one rider_id per line
            csvContent = data?.map(r => r.rider_id).join('\n') || '';
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Content-Disposition', 'attachment; filename="team_rider_ids.txt"');
        }
        else if (format === 'full') {
            // Full CSV with headers
            csvContent = 'rider_id,name,velo,category,ftp\n';
            csvContent += data?.map(r => `${r.rider_id},"${r.full_name}",${r.velo_live || ''},${r.zwift_official_category || ''},${r.ftp_watts || ''}`).join('\n') || '';
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="team_riders_full.csv"');
        }
        console.log(`📥 CSV Export: ${data?.length || 0} riders (format: ${format})`);
        res.send(csvContent);
    }
    catch (error) {
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
            .eq('is_team_member', true);
        console.log(`📊 Team roster: ${data?.length || 0} active riders`);
        res.json({
            success: true,
            count: data?.length || 0,
            riders: data || []
        });
    }
    catch (error) {
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
    let logId = null;
    try {
        // 🎯 SMART INPUT DETECTION: Support multiple formats
        let riderIds = [];
        // Format 1: Direct array in body [12345, 67890, ...] (Bulk upload)
        if (Array.isArray(req.body)) {
            riderIds = req.body.map((id) => typeof id === 'number' ? id : parseInt(id)).filter((id) => !isNaN(id));
        }
        // Format 2: { rider_ids: [...] } (Legacy bulk format)
        else if (req.body.rider_ids && Array.isArray(req.body.rider_ids)) {
            riderIds = req.body.rider_ids.map((id) => typeof id === 'number' ? id : parseInt(id)).filter((id) => !isNaN(id));
        }
        // Format 3: { rider_id: 12345 } (Single rider)
        else if (req.body.rider_id) {
            const id = typeof req.body.rider_id === 'number' ? req.body.rider_id : parseInt(req.body.rider_id);
            if (!isNaN(id))
                riderIds = [id];
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
            console.log(`   [${i + 1}/${newRiderIds.length}] Processing rider ${riderId}...`);
            let racingSynced = false;
            let profileSynced = false;
            let errorMsg = '';
            // 🔍 US2: Track fail codes voor gestructureerde error reporting
            let errorCode = null;
            let errorDetails = [];
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
                    }
                    else {
                        errorCode = 'RACING_DB_WRITE_FAILED';
                        errorDetails.push(`ZwiftRacing DB: ${error.message}`);
                        console.error(`      ❌ ZwiftRacing DB write failed:`, error.message);
                        errorMsg += `Racing DB: ${error.message}. `;
                    }
                }
                catch (err) {
                    errorCode = 'RACING_PROCESSING_FAILED';
                    errorDetails.push(`ZwiftRacing Processing: ${err.message}`);
                    console.error(`      ❌ ZwiftRacing processing failed:`, err.message);
                    errorMsg += `Racing: ${err.message}. `;
                }
            }
            else {
                errorCode = 'RACING_NOT_FOUND';
                errorDetails.push('Rider not found in ZwiftRacing bulk response');
                console.warn(`      ⚠️  No ZwiftRacing data in bulk response`);
                errorMsg += 'No Racing data. ';
            }
            // Fetch Zwift Official data (individueel, geen bulk endpoint beschikbaar)
            try {
                const profileResponse = await axios.get(`https://us-or-rly101.zwift.com/api/profiles/${riderId}`, {
                    headers: {
                        'Authorization': authToken,
                        'User-Agent': 'Zwift/1.0'
                    },
                    timeout: 10000
                });
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
                const { error } = await supabase
                    .from('api_zwift_api_profiles')
                    .upsert(profileData, { onConflict: 'rider_id' });
                if (!error) {
                    profileSynced = true;
                    console.log(`      ✅ Zwift Official data synced`);
                }
                else {
                    if (!errorCode)
                        errorCode = 'PROFILE_DB_WRITE_FAILED';
                    errorDetails.push(`Zwift Official DB: ${error.message}`);
                    console.error(`      ❌ Zwift Official DB write failed:`, error.message);
                    errorMsg += `Profile DB: ${error.message}. `;
                }
            }
            catch (err) {
                if (!errorCode)
                    errorCode = 'PROFILE_API_FAILED';
                errorDetails.push(`Zwift Official API: ${err.message}`);
                console.warn(`      ⚠️  Zwift Official API failed:`, err.message);
                errorMsg += `Profile: ${err.message}. `;
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
                    }
                    else {
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
                }
                else {
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
            }
            else {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('❌ Failed to get sync config:', error);
        res.status(500).json({ error: error.message });
    }
});
// POST update sync config
app.post('/api/admin/sync-config', async (req, res) => {
    try {
        const { syncType = SYNC_TYPE_TEAM_RIDERS, enabled, intervalMinutes } = req.body;
        const updates = { sync_type: syncType };
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
        }
        else {
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
    }
    catch (error) {
        console.error('❌ Failed to update sync config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// GET sync status for real-time monitoring
app.get('/api/admin/sync-status', async (req, res) => {
    try {
        const syncType = req.query.syncType || SYNC_TYPE_TEAM_RIDERS;
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
        const status = { isRunning };
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
    }
    catch (error) {
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
            .limit(parseInt(limit));
        if (syncType)
            query = query.eq('sync_type', syncType);
        if (triggerType)
            query = query.eq('trigger_type', triggerType);
        if (status)
            query = query.eq('status', status);
        const { data, error } = await query;
        if (error)
            throw error;
        res.json({ success: true, logs: data });
    }
    catch (error) {
        console.error('❌ Failed to get sync logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Remove rider from team AND all source tables (clean database)
// DELETE riders - Single or Bulk
app.delete('/api/admin/riders/:riderId?', async (req, res) => {
    const startTime = Date.now();
    let logId = null;
    try {
        // 🎯 SMART INPUT DETECTION: Support multiple formats
        let riderIds = [];
        // Format 1: URL param /api/admin/riders/12345 (Single)
        if (req.params.riderId) {
            const id = parseInt(req.params.riderId);
            if (!isNaN(id))
                riderIds = [id];
        }
        // Format 2: Body { rider_ids: [...] } (Bulk delete)
        else if (req.body?.rider_ids && Array.isArray(req.body.rider_ids)) {
            riderIds = req.body.rider_ids.map((id) => typeof id === 'number' ? id : parseInt(id)).filter((id) => !isNaN(id));
        }
        // Format 3: Direct array in body (Bulk delete alternative)
        else if (Array.isArray(req.body)) {
            riderIds = req.body.map((id) => typeof id === 'number' ? id : parseInt(id)).filter((id) => !isNaN(id));
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
                }
                else {
                    failCount++;
                    results.push({
                        rider_id: riderId,
                        deleted: false,
                        error: 'Partial deletion failure'
                    });
                    console.warn(`   ⚠️  Rider ${riderId} - some deletions failed`);
                }
            }
            catch (err) {
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
    }
    catch (error) {
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
        if (error)
            throw error;
        res.json({
            success: true,
            teams: data || []
        });
    }
    catch (error) {
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
        if (teamError)
            throw teamError;
        // Get lineup
        const { data: lineup, error: lineupError } = await supabase
            .from('v_team_lineups_full')
            .select('*')
            .eq('team_id', teamId)
            .order('lineup_position');
        if (lineupError)
            throw lineupError;
        res.json({
            success: true,
            team,
            lineup: lineup || []
        });
    }
    catch (error) {
        console.error('❌ Get team failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Create new team
app.post('/api/teams', async (req, res) => {
    try {
        const { team_name, competition_type, competition_name, velo_min_rank, velo_max_rank, velo_max_spread, allowed_categories, allow_category_up, min_riders, max_riders } = req.body;
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
        if (error)
            throw error;
        console.log(`✅ Team created: ${team_name} (${competition_type})`);
        res.json({
            success: true,
            team: data
        });
    }
    catch (error) {
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
        if (error)
            throw error;
        console.log(`✅ Team updated: ${data.team_name}`);
        res.json({
            success: true,
            team: data
        });
    }
    catch (error) {
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
        if (error)
            throw error;
        console.log(`✅ Team deleted: ${teamId}`);
        res.json({ success: true });
    }
    catch (error) {
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
        if (riderError)
            throw riderError;
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
        if (error)
            throw error;
        // Validate lineup
        const { data: validation } = await supabase
            .rpc('validate_team_lineup', { p_team_id: teamId });
        console.log(`✅ Rider ${rider_id} added to team ${teamId}`);
        res.json({
            success: true,
            lineup: data,
            validation
        });
    }
    catch (error) {
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
        if (error)
            throw error;
        console.log(`✅ Rider ${riderId} removed from team ${teamId}`);
        res.json({ success: true });
    }
    catch (error) {
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
        const updates = lineup.map(item => supabase
            .from('team_lineups')
            .update({ lineup_position: item.lineup_position })
            .eq('team_id', teamId)
            .eq('rider_id', item.rider_id));
        await Promise.all(updates);
        console.log(`✅ Lineup reordered for team ${teamId}`);
        res.json({ success: true });
    }
    catch (error) {
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
        if (error)
            throw error;
        res.json({
            success: true,
            validation: data || []
        });
    }
    catch (error) {
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
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        const indexPath = path.join(frontendPath, 'index.html');
        res.sendFile(indexPath);
    }
    else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});
const SYNC_TYPE_TEAM_RIDERS = 'team_riders';
let schedulerIntervals = new Map();
// Load sync config from database
const loadSyncConfig = async (syncType) => {
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
    }
    catch (error) {
        console.error(`⚠️  Error loading ${syncType} config:`, error.message);
        return null;
    }
};
// Save/update sync config
const saveSyncConfig = async (config) => {
    try {
        // First check if record exists
        const { data: existing } = await supabase
            .from('sync_config')
            .select('*')
            .eq('sync_type', config.sync_type)
            .single();
        const updateData = { updated_at: new Date().toISOString() };
        // Only include fields that are explicitly provided
        if (config.enabled !== undefined)
            updateData.enabled = config.enabled;
        if (config.interval_minutes !== undefined)
            updateData.interval_minutes = config.interval_minutes;
        if (config.last_run_at !== undefined)
            updateData.last_run_at = config.last_run_at;
        if (config.next_run_at !== undefined)
            updateData.next_run_at = config.next_run_at;
        let error;
        if (existing) {
            // Update existing record
            const result = await supabase
                .from('sync_config')
                .update(updateData)
                .eq('sync_type', config.sync_type);
            error = result.error;
        }
        else {
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
    }
    catch (error) {
        console.error(`❌ Error saving ${config.sync_type} config:`, error.message);
        return false;
    }
};
// Create sync log entry
const createSyncLog = async (log) => {
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
    }
    catch (error) {
        console.error('❌ Error creating sync log:', error.message);
        return null;
    }
};
// Update sync log
const updateSyncLog = async (logId, updates) => {
    if (!logId)
        return true; // No log ID, skip silently
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
    }
    catch (error) {
        console.error('❌ Error updating sync log:', error.message);
        return false;
    }
};
// Execute sync with full logging
const executeSyncJob = async (syncType, triggerType, metadata) => {
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
    }
    catch (error) {
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
const startScheduler = async (syncType) => {
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
const stopScheduler = (syncType) => {
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
