/**
 * 🔄 UNIFIED SYNC SERVICE - TeamNL Cloud9 Racing Team
 * 
 * Complete sync orchestration voor alle 3 APIs → riders_unified
 * 
 * @version 1.0
 * @date 5 december 2025
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ZwiftRacingRider {
  riderId: number;
  name: string;
  club?: { id: number; name: string };
  country: string;
  age?: string;
  weight: number;
  height: number;
  gender?: string;
  zpCategory: string;
  zpFTP: number;
  power?: {
    w5?: number; w15?: number; w30?: number;
    w60?: number; w120?: number; w300?: number; w1200?: number;
    wkg5?: number; wkg15?: number; wkg30?: number;
    wkg60?: number; wkg120?: number; wkg300?: number; wkg1200?: number;
    CP?: number;
    AWC?: number;
    compoundScore?: number;
    powerRating?: number;
  };
  race?: {
    current?: {
      rating?: number;
      mixed?: { category?: string; number?: string };
    };
    max30?: { rating?: number };
    max90?: { rating?: number };
    wins?: number;
    podiums?: number;
    finishes?: number;
    last?: { date?: string; rating?: number };
  };
  phenotype?: {
    value?: string;
    scores?: {
      sprinter?: number;
      climber?: number;
      pursuiter?: number;
      puncheur?: number;
    };
  };
  handicaps?: {
    flat?: number;
    hilly?: number;
    rolling?: number;
    mountainous?: number;
  };
}

interface ZwiftOfficialProfile {
  id: number;
  publicId: string;
  firstName: string;
  lastName: string;
  male: boolean;
  imageSrc?: string;
  imageSrcLarge?: string;
  countryAlpha3?: string;
  countryCode?: number;
  riding?: boolean;
  achievementLevel?: number;
  socialFacts?: {
    followersCount?: number;
    followeesCount?: number;
    profileId?: number;
  };
}

interface SyncResult {
  success: boolean;
  rider_id: number;
  name?: string;
  synced_fields: {
    zwift_racing: number;
    zwift_official: number;
    total: number;
  };
  errors: string[];
}

interface SyncOptions {
  includeEnrichment?: boolean;  // Fetch Zwift Official data
  includeHistorical?: boolean;  // Fetch historical snapshot
  historicalDaysAgo?: number;   // Days ago for historical snapshot
  rateLimit?: {
    zwiftRacing: number;        // ms delay between calls
    zwiftOfficial: number;      // ms delay between calls
  };
}

// ============================================================================
// UNIFIED SYNC SERVICE CLASS
// ============================================================================

export class UnifiedSyncService {
  private supabase: SupabaseClient;
  private zwiftRacingClient: AxiosInstance;
  private zwiftOfficialToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    // ✅ ENVIRONMENT VARIABLE VALIDATION
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'ZWIFT_API_KEY',
      'ZWIFT_USERNAME',
      'ZWIFT_PASSWORD'
    ];
    
    const missing = requiredEnvVars.filter(key => !process.env[key]);
    if (missing.length > 0) {
      console.error('❌ FATAL: Missing required environment variables in Railway:');
      missing.forEach(key => console.error(`   - ${key}`));
      console.error('\n📋 Action required:');
      console.error('   1. Go to Railway dashboard');
      console.error('   2. Select backend service');
      console.error('   3. Navigate to Variables tab');
      console.error('   4. Add all 5 environment variables');
      console.error('   5. Railway will auto-redeploy\n');
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }

    // Initialize Supabase with ANON key (service key is expired)
    const supabaseUrl = process.env.SUPABASE_URL!;
    // FORCE anon key usage - service key is invalid
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    console.log(`🔧 Supabase: Using ANON key (${supabaseKey.length} chars)`);
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize ZwiftRacing API client
    this.zwiftRacingClient = axios.create({
      baseURL: 'https://zwift-ranking.herokuapp.com',
      headers: {
        'Authorization': process.env.ZWIFT_API_KEY!,
      },
    });
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Sync single rider from all available sources
   */
  async syncRider(
    riderId: number,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      rider_id: riderId,
      synced_fields: { zwift_racing: 0, zwift_official: 0, total: 0 },
      errors: [],
    };

    try {
      console.log(`🔄 Starting sync for rider ${riderId}...`);

      // STEP 1: Fetch ZwiftRacing.app data (PRIMARY)
      const racingData = await this.fetchZwiftRacingData(riderId);
      if (!racingData) {
        throw new Error('Failed to fetch ZwiftRacing data');
      }
      result.name = racingData.name;

      // STEP 2: Fetch Zwift Official data (ENRICHMENT) - Optional
      let officialData: ZwiftOfficialProfile | null = null;
      if (options.includeEnrichment !== false) {
        try {
          officialData = await this.fetchZwiftOfficialData(riderId);
        } catch (error) {
          console.warn(`⚠️  Zwift Official data unavailable for rider ${riderId}`);
          result.errors.push('Zwift Official API failed (enrichment skipped)');
        }
      }

      // STEP 3: Map to database schema
      const dbData = this.mapToDatabase(racingData, officialData);

      // STEP 4: Upsert to riders_unified
      console.log(`🔍 Upserting rider ${riderId}...`);
      const { error: upsertError } = await this.supabase
        .from('riders_unified')
        .upsert(dbData, { onConflict: 'rider_id' });

      if (upsertError) {
        console.error('❌ Upsert error details:', {
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint,
          code: upsertError.code
        });
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }
      console.log(`✅ Upsert successful for rider ${riderId}`);

      // STEP 5: Calculate synced fields
      result.synced_fields.zwift_racing = this.countNonNullFields(dbData, 'racing');
      result.synced_fields.zwift_official = officialData 
        ? this.countNonNullFields(dbData, 'official')
        : 0;
      result.synced_fields.total = result.synced_fields.zwift_racing + result.synced_fields.zwift_official;
      result.success = true;

      console.log(`✅ Rider ${riderId} synced successfully (${result.synced_fields.total} fields)`);
      return result;

    } catch (error: any) {
      console.error(`❌ Sync failed for rider ${riderId}:`, error.message);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Sync multiple riders in sequence (with rate limiting)
   */
  async syncRidersBatch(
    riderIds: number[],
    options: SyncOptions = {}
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];
    const delay = options.rateLimit?.zwiftRacing || 12000; // Default 12s (5/min safe)

    console.log(`🔄 Starting batch sync for ${riderIds.length} riders...`);
    console.log(`   Rate limit: ${delay}ms between calls`);

    for (let i = 0; i < riderIds.length; i++) {
      const riderId = riderIds[i];
      console.log(`\n[${i + 1}/${riderIds.length}] Syncing rider ${riderId}...`);

      const result = await this.syncRider(riderId, options);
      results.push(result);

      // Rate limiting delay (skip on last iteration)
      if (i < riderIds.length - 1) {
        console.log(`   ⏳ Waiting ${delay}ms before next rider...`);
        await this.sleep(delay);
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    console.log(`\n✅ Batch sync complete: ${successful} succeeded, ${failed} failed`);

    return results;
  }

  /**
   * Sync all team members from my_team_members table
   */
  async syncAllTeamMembers(options: SyncOptions = {}): Promise<SyncResult[]> {
    console.log('🔄 Fetching team members from database...');

    const { data: members, error } = await this.supabase
      .from('my_team_members')
      .select('rider_id');

    if (error) {
      throw new Error(`Failed to fetch team members: ${error.message}`);
    }

    const riderIds = members.map(m => m.rider_id);
    console.log(`   Found ${riderIds.length} team members`);

    return await this.syncRidersBatch(riderIds, options);
  }

  /**
   * Update team member flags in riders_unified
   */
  async updateTeamMemberFlags(): Promise<void> {
    console.log('🔄 Updating team member flags...');

    // Set is_team_member = true for all in my_team_members
    const { error: updateError } = await this.supabase.rpc('update_team_flags', {});
    
    if (updateError) {
      throw new Error(`Failed to update flags: ${updateError.message}`);
    }

    console.log('✅ Team member flags updated');
  }

  // ==========================================================================
  // PRIVATE METHODS - API FETCHING
  // ==========================================================================

  /**
   * Fetch rider data from ZwiftRacing.app API
   */
  private async fetchZwiftRacingData(riderId: number): Promise<ZwiftRacingRider | null> {
    try {
      const response = await this.zwiftRacingClient.get(`/public/riders/${riderId}`);
      return response.data as ZwiftRacingRider;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`⚠️  Rider ${riderId} not found in ZwiftRacing API`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch rider profile from Zwift Official API (with OAuth)
   */
  private async fetchZwiftOfficialData(riderId: number): Promise<ZwiftOfficialProfile | null> {
    // Ensure we have valid token
    await this.ensureZwiftOAuthToken();

    try {
      const response = await axios.get(
        `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.zwiftOfficialToken}`,
          },
        }
      );
      return response.data as ZwiftOfficialProfile;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`⚠️  Rider ${riderId} not found in Zwift Official API`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Ensure Zwift OAuth token is valid (refresh if expired)
   */
  private async ensureZwiftOAuthToken(): Promise<void> {
    const now = Date.now();
    
    // Token still valid
    if (this.zwiftOfficialToken && now < this.tokenExpiry) {
      return;
    }

    console.log('🔄 Refreshing Zwift OAuth token...');

    try {
      const response = await axios.post(
        'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
        new URLSearchParams({
          client_id: 'Zwift_Mobile_Link',
          username: process.env.ZWIFT_USERNAME!,
          password: process.env.ZWIFT_PASSWORD!,
          grant_type: 'password',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.zwiftOfficialToken = response.data.access_token;
      this.tokenExpiry = now + (response.data.expires_in * 1000) - 60000; // 1 min buffer

      console.log('✅ OAuth token refreshed');
    } catch (error: any) {
      throw new Error(`OAuth token refresh failed: ${error.message}`);
    }
  }

  // ==========================================================================
  // PRIVATE METHODS - DATA MAPPING
  // ==========================================================================

  /**
   * Map API data to riders_unified database schema
   */
  private mapToDatabase(
    racing: ZwiftRacingRider,
    official: ZwiftOfficialProfile | null
  ): Record<string, any> {
    return {
      // PRIMARY KEY
      rider_id: racing.riderId,

      // BASIC INFO (ZwiftRacing)
      name: racing.name,
      club_id: racing.club?.id || null,
      club_name: racing.club?.name || null,
      weight_kg: racing.weight,
      height_cm: racing.height,
      ftp: racing.zpFTP,
      age_category: racing.age || null,
      country_code: racing.country,
      zp_category: racing.zpCategory,

      // POWER CURVE (ZwiftRacing)
      power_5s_w: racing.power?.w5 || null,
      power_15s_w: racing.power?.w15 || null,
      power_30s_w: racing.power?.w30 || null,
      power_1m_w: racing.power?.w60 || null,
      power_2m_w: racing.power?.w120 || null,
      power_5m_w: racing.power?.w300 || null,
      power_20m_w: racing.power?.w1200 || null,
      power_5s_wkg: racing.power?.wkg5 || null,
      power_15s_wkg: racing.power?.wkg15 || null,
      power_30s_wkg: racing.power?.wkg30 || null,
      power_1m_wkg: racing.power?.wkg60 || null,
      power_2m_wkg: racing.power?.wkg120 || null,
      power_5m_wkg: racing.power?.wkg300 || null,
      power_20m_wkg: racing.power?.wkg1200 || null,

      // POWER METRICS (ZwiftRacing)
      critical_power: racing.power?.CP || null,
      anaerobic_work_capacity: racing.power?.AWC || null,
      compound_score: racing.power?.compoundScore || null,
      power_rating: racing.power?.powerRating || null,

      // vELO STATS (ZwiftRacing)
      velo_rating: racing.race?.current?.rating || null,
      velo_max_30d: racing.race?.max30?.rating || null,
      velo_max_90d: racing.race?.max90?.rating || null,
      velo_rank: racing.race?.current?.mixed?.number || null,
      race_wins: racing.race?.wins || 0,
      race_podiums: racing.race?.podiums || 0,
      race_count_90d: racing.race?.finishes || 0,
      last_race_date: racing.race?.last?.date 
        ? new Date(racing.race.last.date * 1000).toISOString() 
        : null,
      last_race_velo: racing.race?.last?.rating || null,

      // PHENOTYPE (ZwiftRacing) - All 4 scores + type
      phenotype_sprinter: racing.phenotype?.scores?.sprinter || null,
      phenotype_pursuiter: racing.phenotype?.scores?.pursuiter || null,
      phenotype_puncheur: racing.phenotype?.scores?.puncheur || null,
      phenotype_climber: racing.phenotype?.scores?.climber || null,
      phenotype_type: racing.phenotype?.value || null,

      // HANDICAPS (ZwiftRacing)
      handicap_flat: racing.handicaps?.flat || null,
      handicap_rolling: racing.handicaps?.rolling || null,
      handicap_hilly: racing.handicaps?.hilly || null,
      handicap_mountainous: racing.handicaps?.mountainous || null,

      // ENRICHMENT (Zwift Official)
      avatar_url: official?.imageSrc || null,
      avatar_url_large: official?.imageSrcLarge || null,
      gender: official?.male !== undefined ? (official.male ? 'M' : 'F') : null,
      country_alpha3: official?.countryAlpha3 || null,
      currently_riding: official?.riding || false,
      followers_count: official?.socialFacts?.followersCount || null,
      followees_count: official?.socialFacts?.followeesCount || null,
      level: official?.achievementLevel || null,
      zwift_profile_id: official?.id?.toString() || null,

      // SYNC TRACKING
      last_synced_zwift_racing: new Date().toISOString(),
      last_synced_zwift_official: official ? new Date().toISOString() : null,
      velo_rating_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Count non-null fields by source
   */
  private countNonNullFields(data: Record<string, any>, source: 'racing' | 'official'): number {
    const racingFields = [
      'name', 'club_id', 'club_name', 'weight_kg', 'height_cm', 'ftp', 'age_category',
      'country_code', 'zp_category', 'power_5s_w', 'power_15s_w', 'power_30s_w',
      'power_1m_w', 'power_2m_w', 'power_5m_w', 'power_20m_w', 'power_5s_wkg',
      'power_15s_wkg', 'power_30s_wkg', 'power_1m_wkg', 'power_2m_wkg', 'power_5m_wkg',
      'power_20m_wkg', 'critical_power', 'anaerobic_work_capacity', 'compound_score',
      'velo_rating', 'velo_max_30d', 'velo_max_90d', 'velo_rank', 'race_wins',
      'race_podiums', 'race_count_90d', 'phenotype_sprinter', 'phenotype_pursuiter',
      'phenotype_puncheur', 'handicap_flat', 'handicap_rolling', 'handicap_hilly',
      'handicap_mountainous',
    ];

    const officialFields = [
      'avatar_url', 'avatar_url_large', 'gender', 'country_alpha3', 'currently_riding',
      'followers_count', 'followees_count', 'level', 'zwift_profile_id',
    ];

    const fields = source === 'racing' ? racingFields : officialFields;
    return fields.filter(field => data[field] !== null && data[field] !== undefined).length;
  }

  /**
   * Sleep helper for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Singleton instance for easy import
 */
export const syncService = new UnifiedSyncService();

/**
 * Quick sync single rider
 */
export async function syncRider(riderId: number, options?: SyncOptions): Promise<SyncResult> {
  return await syncService.syncRider(riderId, options);
}

/**
 * Quick sync all team members
 */
export async function syncAllTeam(options?: SyncOptions): Promise<SyncResult[]> {
  return await syncService.syncAllTeamMembers(options);
}

// ============================================================================
// CLI USAGE (when run directly)
// ============================================================================

if (require.main === module) {
  const riderId = process.argv[2] ? parseInt(process.argv[2]) : null;

  if (!riderId) {
    console.error('Usage: npx tsx unified-sync.service.ts <riderId>');
    console.error('   OR: npx tsx unified-sync.service.ts --all');
    process.exit(1);
  }

  (async () => {
    try {
      if (process.argv[2] === '--all') {
        console.log('🔄 Syncing all team members...\n');
        const results = await syncAllTeam({ includeEnrichment: true });
        
        const successful = results.filter(r => r.success).length;
        console.log(`\n📊 SUMMARY:`);
        console.log(`   ✅ Successful: ${successful}`);
        console.log(`   ❌ Failed: ${results.length - successful}`);
        
      } else {
        console.log(`🔄 Syncing rider ${riderId}...\n`);
        const result = await syncRider(riderId, { includeEnrichment: true });
        
        console.log(`\n📊 RESULT:`);
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Name: ${result.name || 'N/A'}`);
        console.log(`   Fields synced: ${result.synced_fields.total}`);
        console.log(`     - ZwiftRacing: ${result.synced_fields.zwift_racing}`);
        console.log(`     - Zwift Official: ${result.synced_fields.zwift_official}`);
        if (result.errors.length > 0) {
          console.log(`   Errors:`);
          result.errors.forEach(err => console.log(`     - ${err}`));
        }
      }

    } catch (error: any) {
      console.error('❌ FATAL ERROR:', error.message);
      process.exit(1);
    }
  })();
}
