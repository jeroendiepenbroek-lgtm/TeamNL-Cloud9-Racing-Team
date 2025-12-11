import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const ZWIFTRACING_API_KEY = process.env.ZWIFTRACING_API_TOKEN || '650c6d2fc4ef6858d74cbef1';
const ZWIFTRACING_BASE_URL = 'https://zwift-ranking.herokuapp.com';
const ZWIFT_OFFICIAL_BASE_URL = 'https://us-or-rly101.zwift.com/api';

// Direct initialization - Railway provides env vars automatically
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('❌ SUPABASE_SERVICE_KEY missing! Check Railway environment variables.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
console.log('✅ SyncService Supabase client created');

interface SyncResult {
  riderId: number;
  success: boolean;
  error?: string;
  racingDataSynced: boolean;
  profileDataSynced: boolean;
}

/**
 * Sync single rider from ZwiftRacing API
 */
async function syncZwiftRacingData(riderId: number): Promise<boolean> {
  try {
    console.log(`📊 Fetching ZwiftRacing data for rider ${riderId}...`);
    
    const response = await axios.get(
      `${ZWIFTRACING_BASE_URL}/public/riders/${riderId}`,
      {
        headers: {
          'Authorization': ZWIFTRACING_API_KEY
        },
        timeout: 10000
      }
    );
    
    const data = response.data;
    
    // Map to api_zwiftracing_riders schema
    const riderData = {
      rider_id: riderId,
      id: riderId,
      name: data.name,
      country: data.country,
      
      // Racing metrics
      velo_live: data.race?.current?.rating || null,
      velo_30day: data.race?.max30?.rating || null,
      velo_90day: data.race?.max90?.rating || null,
      category: data.zpCategory,
      
      // Power curve - absolute (watts)
      ftp: data.zpFTP,
      power_5s: data.power?.w5 || null,
      power_15s: data.power?.w15 || null,
      power_30s: data.power?.w30 || null,
      power_60s: data.power?.w60 || null,
      power_120s: data.power?.w120 || null,
      power_300s: data.power?.w300 || null,
      power_1200s: data.power?.w1200 || null,
      
      // Power curve - relative (w/kg)
      power_5s_wkg: data.power?.wkg5 || null,
      power_15s_wkg: data.power?.wkg15 || null,
      power_30s_wkg: data.power?.wkg30 || null,
      power_60s_wkg: data.power?.wkg60 || null,
      power_120s_wkg: data.power?.wkg120 || null,
      power_300s_wkg: data.power?.wkg300 || null,
      power_1200s_wkg: data.power?.wkg1200 || null,
      
      // Physical
      weight: data.weight,
      height: data.height,
      
      // Classification
      phenotype: data.phenotype?.value || null,
      
      // Stats
      race_count: data.race?.finishes || 0,
      zwift_id: riderId,
      
      // Race Results Statistics
      race_wins: data.race?.wins || 0,
      race_podiums: data.race?.podiums || 0,
      race_finishes: data.race?.finishes || 0,
      race_dnfs: data.race?.dnfs || 0,
      
      // Raw backup
      raw_response: data,
      fetched_at: new Date().toISOString()
    };
    
    const { error } = await (supabase!
      .from('api_zwiftracing_riders') as any)
      .upsert(riderData, { onConflict: 'rider_id' });
    
    if (error) {
      console.error(`❌ Failed to upsert ZwiftRacing data for ${riderId}:`, error.message);
      return false;
    }
    
    console.log(`✅ ZwiftRacing data synced for rider ${riderId}`);
    return true;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`⚠️  Rider ${riderId} not found on ZwiftRacing`);
    } else {
      console.error(`❌ Error fetching ZwiftRacing data for ${riderId}:`, error.message);
    }
    return false;
  }
}

/**
 * Sync single rider from Zwift Official API
 */
async function syncZwiftOfficialProfile(riderId: number): Promise<boolean> {
  try {
    console.log(`🚴 Fetching Zwift Official profile for rider ${riderId}...`);
    
    const response = await axios.get(
      `${ZWIFT_OFFICIAL_BASE_URL}/profiles/${riderId}`,
      {
        timeout: 10000
      }
    );
    
    const data = response.data;
    
    // Map to api_zwift_official_profiles schema
    const profileData = {
      rider_id: riderId,
      zwift_id: riderId,
      
      // Personal
      first_name: data.firstName || null,
      last_name: data.lastName || null,
      email_address: data.emailAddress || null,
      address: data.address || null,
      date_of_birth: data.dob || null,
      age: data.age || null,
      gender: data.male === true ? 'M' : data.male === false ? 'F' : null,
      is_male: data.male,
      
      // Location
      country_code: data.countryCode || null,
      country_alpha3: data.countryAlpha3 || null,
      
      // Avatar
      avatar_url: data.imageSrc || null,
      avatar_url_large: data.imageSrcLarge || null,
      
      // Physical
      weight_kg: data.weight ? data.weight / 1000 : null, // grams to kg
      height_cm: data.height || null,
      ftp_watts: data.ftp || null,
      
      // Racing
      racing_score: data.playerTypeId || null,
      racing_category: null, // Not in official API
      
      // Social
      followers_count: data.followerStatusOfLoggedInPlayer?.followeeCount || null,
      followees_count: data.followerStatusOfLoggedInPlayer?.followerCount || null,
      rideons_given: data.totalGiveRideons || null,
      
      // Achievements
      achievement_level: data.achievementLevel || null,
      total_distance_km: data.totalDistanceInMeters ? data.totalDistanceInMeters / 1000 : null,
      total_elevation_m: data.totalExperiencePoints || null,
      
      // Status
      currently_riding: data.riding === true,
      current_world: data.worldId || null,
      
      // Metadata
      raw_response: data,
      fetched_at: new Date().toISOString()
    };
    
    const { error } = await supabase!
      .from('api_zwift_official_profiles')
      .upsert(profileData, { onConflict: 'rider_id' });
    
    if (error) {
      console.error(`❌ Failed to upsert Zwift Official profile for ${riderId}:`, error.message);
      return false;
    }
    
    console.log(`✅ Zwift Official profile synced for rider ${riderId}`);
    return true;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log(`⚠️  Rider ${riderId} not found on Zwift Official`);
    } else {
      console.error(`❌ Error fetching Zwift Official profile for ${riderId}:`, error.message);
    }
    return false;
  }
}

/**
 * Sync complete rider data from all sources
 */
export async function syncRider(riderId: number): Promise<SyncResult> {
  console.log(`\n🔄 Starting sync for rider ${riderId}...`);
  
  const result: SyncResult = {
    riderId,
    success: false,
    racingDataSynced: false,
    profileDataSynced: false
  };
  
  try {
    // Sync ZwiftRacing data (racing metrics, power curve)
    result.racingDataSynced = await syncZwiftRacingData(riderId);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Sync Zwift Official profile (personal data, avatar, etc.)
    result.profileDataSynced = await syncZwiftOfficialProfile(riderId);
    
    // Consider success if at least one source synced
    result.success = result.racingDataSynced || result.profileDataSynced;
    
    if (result.success) {
      // Update team_roster last_synced timestamp
      await supabase!
        .from('team_roster')
        .update({ last_synced: new Date().toISOString() })
        .eq('rider_id', riderId);
      
      console.log(`✅ Sync completed for rider ${riderId}`);
    } else {
      result.error = 'Failed to sync from any source';
      console.log(`❌ Sync failed for rider ${riderId}`);
    }
    
  } catch (error: any) {
    result.error = error.message;
    console.error(`❌ Sync error for rider ${riderId}:`, error.message);
  }
  
  return result;
}

/**
 * Sync all active riders in team roster
 */
export async function syncAllRiders(): Promise<{
  total: number;
  synced: number;
  failed: number;
  results: SyncResult[];
}> {
  console.log('\n🔄 Starting full team sync...\n');
  
  // Get all active riders from team roster
  const { data: roster, error } = await supabase!
    .from('team_roster')
    .select('rider_id')
    .eq('is_active', true);
  
  if (error || !roster || roster.length === 0) {
    throw new Error('No active riders in roster');
  }
  
  console.log(`📊 Found ${roster.length} active riders to sync\n`);
  
  const results: SyncResult[] = [];
  let synced = 0;
  let failed = 0;
  
  // Sync each rider sequentially (with delay to avoid rate limiting)
  for (const { rider_id } of roster) {
    const result = await syncRider(rider_id);
    results.push(result);
    
    if (result.success) {
      synced++;
    } else {
      failed++;
    }
    
    // Delay between riders to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Sync Summary:`);
  console.log(`   Total: ${roster.length}`);
  console.log(`   ✅ Success: ${synced}`);
  console.log(`   ❌ Failed: ${failed}\n`);
  
  return {
    total: roster.length,
    synced,
    failed,
    results
  };
}
