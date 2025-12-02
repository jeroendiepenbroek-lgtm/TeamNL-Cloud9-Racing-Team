import { SupabaseService } from './supabase.service.js';
import { ZwiftApiClient } from '../api/zwift-client.js';
import { ZwiftOfficialClient } from '../api/zwift-official-client.js';
import { ZwiftPowerClient } from '../api/zwiftpower-client.js';
import { logger } from '../utils/logger.js';

/**
 * POC Unified Sync Service
 * 
 * Multi-source data sync voor rider 150437 (POC)
 * 
 * PHASE 1: Rider Data (3 sources parallel)
 *   - ZwiftRacing.app: vELO rating + history
 *   - Zwift.com: Profile (avatar, country, followers)
 *   - ZwiftPower: FTP + weight (KRITIEK!)
 * 
 * PHASE 2: Events + Signups
 *   - Upcoming events waar rider 150437 signed up
 * 
 * PHASE 3: Results + Enrichment
 *   - Recent race results (30 dagen)
 *   - ZwiftPower enrichment (CE/DQ flags)
 */
export class POCUnifiedSyncService {
  private readonly POC_RIDER_ID = 150437;
  private readonly POC_CLUB_ID = 11818; // TeamNL Cloud9
  
  private supabase: SupabaseService;
  private zwiftRacing: ZwiftApiClient;
  private zwiftOfficial: ZwiftOfficialClient;
  private zwiftPower: ZwiftPowerClient;
  
  constructor() {
    this.supabase = new SupabaseService();
    this.zwiftRacing = new ZwiftApiClient();
    this.zwiftOfficial = new ZwiftOfficialClient();
    this.zwiftPower = new ZwiftPowerClient();
  }
  
  /**
   * Execute complete POC sync
   */
  async executeFullPOC(): Promise<void> {
    const startTime = Date.now();
    logger.info('🚀 Starting POC Unified Sync', { riderId: this.POC_RIDER_ID });
    
    try {
      // Phase 1: Rider data (parallel)
      logger.info('📊 Phase 1: Syncing rider data from 3 sources...');
      await this.syncRiderData();
      
      // Phase 2: Events + signups
      logger.info('📅 Phase 2: Syncing events and signups...');
      await this.syncEventsAndSignups();
      
      // Phase 3: Results + enrichment
      logger.info('🏆 Phase 3: Syncing race results with enrichment...');
      await this.syncResultsWithEnrichment();
      
      const duration = Date.now() - startTime;
      logger.info('✅ POC Sync complete!', { 
        durationMs: duration,
        durationSec: (duration / 1000).toFixed(2),
        riderId: this.POC_RIDER_ID
      });
      
      // Log sync status
      await this.logSyncStatus('success', duration, null);
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('❌ POC Sync failed', error);
      await this.logSyncStatus('failed', duration, error.message);
      throw error;
    }
  }
  
  /**
   * PHASE 1: Sync rider data from 3 sources (parallel)
   */
  private async syncRiderData(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Execute 3 API calls in parallel
      const [zwiftRacingData, zwiftOfficialData, zwiftPowerData] = await Promise.allSettled([
        this.syncFromZwiftRacing(),
        this.syncFromZwiftOfficial(),
        this.syncFromZwiftPower()
      ]);
      
      // Check results
      const results = {
        zwiftRacing: zwiftRacingData.status === 'fulfilled' ? zwiftRacingData.value : null,
        zwiftOfficial: zwiftOfficialData.status === 'fulfilled' ? zwiftOfficialData.value : null,
        zwiftPower: zwiftPowerData.status === 'fulfilled' ? zwiftPowerData.value : null
      };
      
      // Log failures
      if (zwiftRacingData.status === 'rejected') {
        logger.warn('ZwiftRacing sync failed', { error: zwiftRacingData.reason.message });
      }
      if (zwiftOfficialData.status === 'rejected') {
        logger.warn('Zwift.com sync failed', { error: zwiftOfficialData.reason.message });
      }
      if (zwiftPowerData.status === 'rejected') {
        logger.warn('ZwiftPower sync failed', { error: zwiftPowerData.reason.message });
      }
      
      // Merge data into riders_unified (EERST rider aanmaken!)
      await this.mergeRiderData(results);
      
      // Save activities NADAT rider bestaat in database
      if (results.zwiftOfficial?.activities && results.zwiftOfficial.activities.length > 0) {
        await this.saveActivities(results.zwiftOfficial.activities);
        logger.info(`✅ Saved ${results.zwiftOfficial.activities.length} activities`);
      }
      
      const duration = Date.now() - startTime;
      logger.info('✅ Phase 1 complete', { durationMs: duration });
      
    } catch (error: any) {
      logger.error('Phase 1 failed', error);
      throw error;
    }
  }
  
  /**
   * Sync from ZwiftRacing.app
   * - vELO rating + tier
   * - Power profile (5s, 15s, 30s, 1m, 2m, 5m, 20m)
   * - Phenotype scores (sprinter, puncheur, pursuiter)
   * - Route handicaps (flat, rolling, hilly, mountainous)
   * - Race stats
   * - Demographics
   */
  private async syncFromZwiftRacing(): Promise<any> {
    logger.info('Fetching ZwiftRacing data...');
    
    // Get rider with history
    const rider = await this.zwiftRacing.getRider(this.POC_RIDER_ID);
    
    if (!rider) {
      throw new Error('Rider not found in ZwiftRacing API');
    }
    
    logger.info('ZwiftRacing data received', {
      name: rider.name,
      rating: rider.race?.current?.mixed?.rating,
      power_5s: rider.power?.w5,
      power_20m: rider.power?.w1200,
      historyPoints: rider.history?.length || 0
    });
    
    // Save rating history
    if (rider.history && rider.history.length > 0) {
      await this.saveRatingHistory(rider.history);
    }
    
    return {
      rider_id: rider.riderId,
      name: rider.name,
      
      // vELO ratings
      velo_rating: rider.race?.current?.mixed?.rating || null,
      velo_max_30d: rider.race?.max30?.rating || null,
      velo_max_90d: rider.race?.max90?.rating || null,
      velo_rank: rider.race?.current?.mixed?.category || null, // "Amethyst", "Diamond", etc.
      
      // Power intervals (absolute watts)
      power_5s_w: rider.power?.w5 || null,
      power_15s_w: rider.power?.w15 || null,
      power_30s_w: rider.power?.w30 || null,
      power_1m_w: rider.power?.w60 || null,
      power_2m_w: rider.power?.w120 || null,
      power_5m_w: rider.power?.w300 || null,
      power_20m_w: rider.power?.w1200 || null,
      
      // Power intervals (W/kg)
      power_5s_wkg: rider.power?.wkg5 || null,
      power_15s_wkg: rider.power?.wkg15 || null,
      power_30s_wkg: rider.power?.wkg30 || null,
      power_1m_wkg: rider.power?.wkg60 || null,
      power_2m_wkg: rider.power?.wkg120 || null,
      power_5m_wkg: rider.power?.wkg300 || null,
      power_20m_wkg: rider.power?.wkg1200 || null,
      
      // Critical Power model
      critical_power: rider.power?.CP || null,
      anaerobic_work_capacity: rider.power?.AWC || null,
      compound_score: rider.power?.compoundScore || null,
      
      // Phenotype scores (0-100)
      phenotype_sprinter: rider.phenotype?.scores?.sprinter || null,
      phenotype_puncheur: rider.phenotype?.scores?.puncheur || null,
      phenotype_pursuiter: rider.phenotype?.scores?.pursuiter || null,
      
      // Route handicaps (seconds)
      handicap_flat: rider.handicaps?.profile?.flat || null,
      handicap_rolling: rider.handicaps?.profile?.rolling || null,
      handicap_hilly: rider.handicaps?.profile?.hilly || null,
      handicap_mountainous: rider.handicaps?.profile?.mountainous || null,
      
      // Race stats
      race_count_90d: rider.race?.finishes || 0,
      race_wins: rider.race?.wins || 0,
      race_podiums: rider.race?.podiums || 0,
      race_dnfs: rider.race?.dnfs || 0,
      
      // Demographics
      age_category: rider.age || null,
      gender: rider.gender || null,
      height_cm: rider.height || null,
      
      // Category note: vELO rank is NOT the same as racing category!
      category: null // Use ZwiftPower for racing category (A/B/C/D)
    };
  }
  
  /**
   * Sync from Zwift.com Official API
   * - Avatar
   * - Country
   * - Followers/following
   * - Recent activities
   */
  private async syncFromZwiftOfficial(): Promise<any> {
    logger.info('Fetching Zwift.com profile...');
    
    const profile = await this.zwiftOfficial.getProfile(this.POC_RIDER_ID);
    
    if (!profile) {
      throw new Error('Profile not found in Zwift.com API');
    }
    
    logger.info('Zwift.com profile received', {
      firstName: profile.firstName,
      country: profile.countryCode,
      followers: profile.followerStatusOfLoggedInPlayer?.followeeCount || 0
    });
    
    // Get recent activities (save later, after rider exists in DB)
    const activities = await this.zwiftOfficial.getActivities(this.POC_RIDER_ID, 0, 10);
    logger.info(`Retrieved ${activities?.length || 0} activities`);
    
    return {
      zwift_profile_id: profile.id?.toString(),
      avatar_url: profile.imageSrc,
      avatar_url_large: profile.imageSrcLarge,
      country_code: profile.countryCode,
      country_alpha3: profile.countryAlpha3,
      level: profile.achievementLevel,
      followers_count: profile.followerStatusOfLoggedInPlayer?.followerCount || 0,
      activities: activities || [], // Return activities for later saving
      followees_count: profile.followerStatusOfLoggedInPlayer?.followeeCount || 0,
      currently_riding: profile.riding || false
    };
  }
  
  /**
   * Sync from ZwiftPower
   * - FTP (KRITIEK!)
   * - Weight (KRITIEK!)
   * - Height
   * 
   * Uses specific event (5229579 = most recent race 30-11-2025) for accurate data
   */
  private async syncFromZwiftPower(): Promise<any> {
    logger.info('Fetching ZwiftPower data...');
    
    // Try from most recent event first (30-11-2025 Team DRAFT Sunday Race)
    const RECENT_EVENT_ID = 5229579;
    let zpData = await this.zwiftPower.getRiderFromEvent(RECENT_EVENT_ID, this.POC_RIDER_ID);
    
    // Fallback to profile cache if event fetch fails
    if (!zpData) {
      logger.warn('Event fetch failed, trying profile cache...');
      zpData = await this.zwiftPower.getRider(this.POC_RIDER_ID);
    }
    
    if (!zpData) {
      throw new Error('Rider not found in ZwiftPower');
    }
    
    logger.info('ZwiftPower data received', {
      ftp: zpData.ftp,
      weight: zpData.weight,
      category: zpData.category
    });
    
    return {
      ftp: zpData.ftp,
      weight_kg: zpData.weight,
      height_cm: zpData.height,
      zp_category: zpData.category,
      zp_ranking_position: zpData.position_in_category
    };
  }
  
  /**
   * Merge rider data from 3 sources into riders_unified
   */
  private async mergeRiderData(data: {
    zwiftRacing: any;
    zwiftOfficial: any;
    zwiftPower: any;
  }): Promise<void> {
    logger.info('Merging rider data into riders_unified...');
    
    // Expliciet velden selecteren (GEEN spread operators)
    const mergedData = {
      rider_id: this.POC_RIDER_ID,
      name: data.zwiftRacing?.name || 'Unknown',
      
      // vELO ratings
      velo_rating: data.zwiftRacing?.velo_rating || null,
      velo_max_30d: data.zwiftRacing?.velo_max_30d || null,
      velo_max_90d: data.zwiftRacing?.velo_max_90d || null,
      velo_rank: data.zwiftRacing?.velo_rank || null,
      
      // Power intervals (absolute watts)
      power_5s_w: data.zwiftRacing?.power_5s_w || null,
      power_15s_w: data.zwiftRacing?.power_15s_w || null,
      power_30s_w: data.zwiftRacing?.power_30s_w || null,
      power_1m_w: data.zwiftRacing?.power_1m_w || null,
      power_2m_w: data.zwiftRacing?.power_2m_w || null,
      power_5m_w: data.zwiftRacing?.power_5m_w || null,
      power_20m_w: data.zwiftRacing?.power_20m_w || null,
      
      // Power intervals (W/kg)
      power_5s_wkg: data.zwiftRacing?.power_5s_wkg || null,
      power_15s_wkg: data.zwiftRacing?.power_15s_wkg || null,
      power_30s_wkg: data.zwiftRacing?.power_30s_wkg || null,
      power_1m_wkg: data.zwiftRacing?.power_1m_wkg || null,
      power_2m_wkg: data.zwiftRacing?.power_2m_wkg || null,
      power_5m_wkg: data.zwiftRacing?.power_5m_wkg || null,
      power_20m_wkg: data.zwiftRacing?.power_20m_wkg || null,
      
      // Critical Power model
      critical_power: data.zwiftRacing?.critical_power || null,
      anaerobic_work_capacity: data.zwiftRacing?.anaerobic_work_capacity || null,
      compound_score: data.zwiftRacing?.compound_score || null,
      
      // Phenotype scores
      phenotype_sprinter: data.zwiftRacing?.phenotype_sprinter || null,
      phenotype_puncheur: data.zwiftRacing?.phenotype_puncheur || null,
      phenotype_pursuiter: data.zwiftRacing?.phenotype_pursuiter || null,
      
      // Route handicaps
      handicap_flat: data.zwiftRacing?.handicap_flat || null,
      handicap_rolling: data.zwiftRacing?.handicap_rolling || null,
      handicap_hilly: data.zwiftRacing?.handicap_hilly || null,
      handicap_mountainous: data.zwiftRacing?.handicap_mountainous || null,
      
      // Race stats
      race_count_90d: data.zwiftRacing?.race_count_90d || 0,
      race_wins: data.zwiftRacing?.race_wins || 0,
      race_podiums: data.zwiftRacing?.race_podiums || 0,
      race_dnfs: data.zwiftRacing?.race_dnfs || 0,
      
      // Demographics
      age_category: data.zwiftRacing?.age_category || null,
      gender: data.zwiftRacing?.gender || null,
      
      // Racing category from ZwiftRacing (NOT velo_rank!)
      category: data.zwiftRacing?.category || null,
      
      // Timestamp
      last_synced_zwift_racing: new Date().toISOString(),
      
      // Zwift.com data (expliciet)
      avatar_url: data.zwiftOfficial?.avatar_url || null,
      country_code: data.zwiftOfficial?.country_code || null,
      followers_count: data.zwiftOfficial?.followers_count || 0,
      followees_count: data.zwiftOfficial?.followees_count || 0,
      last_synced_zwift_official: new Date().toISOString(),
      
      // ZwiftPower data (expliciet - preferred for FTP/weight/category)
      ftp: data.zwiftPower?.ftp || null,
      weight_kg: data.zwiftPower?.weight_kg || null,
      height_cm: data.zwiftPower?.height_cm || data.zwiftRacing?.height_cm || null, // Fallback to ZwiftRacing
      zp_category: data.zwiftPower?.zp_category || null,
      last_synced_zwiftpower: new Date().toISOString(),
      
      // Metadata
      is_team_member: true,
      club_id: this.POC_CLUB_ID,
      club_name: 'TeamNL Cloud9',
      
      updated_at: new Date().toISOString()
    };
    
    // Upsert to riders_unified
    const { error } = await this.supabase.client
      .from('riders_unified')
      .upsert(mergedData, { onConflict: 'rider_id' });
    
    if (error) {
      logger.error('Failed to merge rider data', error);
      throw error;
    }
    
    logger.info('✅ Rider data merged successfully');
  }
  
  /**
   * Save rating history to rider_rating_history
   */
  private async saveRatingHistory(history: any[]): Promise<void> {
    const historyRecords = history.map((point: any) => ({
      rider_id: this.POC_RIDER_ID,
      rating: point.rating,
      recorded_at: new Date(point.time).toISOString(),
      source: 'api_sync'
    }));
    
    const { error } = await this.supabase.client
      .from('rider_rating_history')
      .upsert(historyRecords, { 
        onConflict: 'rider_id,recorded_at',
        ignoreDuplicates: true 
      });
    
    if (error) {
      logger.error('Failed to save rating history', error);
      throw error;
    }
    
    logger.info(`Saved ${historyRecords.length} rating history points`);
  }
  
  /**
   * Save activities to rider_activities
   */
  private async saveActivities(activities: any[]): Promise<void> {
    const activityRecords = activities.map((activity: any) => ({
      activity_id: activity.id_str || activity.id,
      rider_id: this.POC_RIDER_ID,
      name: activity.name,
      sport: activity.sport,
      start_date: activity.startDate,
      end_date: activity.endDate,
      distance_meters: activity.distanceInMeters ? Math.round(activity.distanceInMeters) : null,
      duration_seconds: activity.movingTimeInMs ? Math.round(activity.movingTimeInMs / 1000) : null,
      elevation_meters: activity.totalElevation ? Math.round(activity.totalElevation) : null,
      avg_watts: activity.avgWatts ? Math.round(activity.avgWatts) : null,
      calories: activity.calories ? Math.round(activity.calories) : null,
      avg_heart_rate: activity.avgHeartRate ? Math.round(activity.avgHeartRate) : null,
      max_heart_rate: activity.maxHeartRate ? Math.round(activity.maxHeartRate) : null,
      world_id: activity.worldId
    }));
    
    const { error } = await this.supabase.client
      .from('rider_activities')
      .upsert(activityRecords, { 
        onConflict: 'activity_id',
        ignoreDuplicates: true 
      });
    
    if (error) {
      logger.error('Failed to save activities', error);
      throw error;
    }
  }
  
  /**
   * PHASE 2: Sync events and signups
   */
  private async syncEventsAndSignups(): Promise<void> {
    // TODO: Implement events sync
    logger.info('⚠️  Phase 2 not yet implemented - events sync');
  }
  
  /**
   * PHASE 3: Sync results with ZwiftPower enrichment
   */
  private async syncResultsWithEnrichment(): Promise<void> {
    // TODO: Implement results sync with enrichment
    logger.info('⚠️  Phase 3 not yet implemented - results sync');
  }
  
  /**
   * Log sync status to sync_status_unified
   */
  private async logSyncStatus(
    status: 'success' | 'partial' | 'failed',
    durationMs: number,
    errorMessage: string | null
  ): Promise<void> {
    await this.supabase.client.from('sync_status_unified').insert({
      sync_type: 'riders',
      source: 'multi_source',
      entity_id: this.POC_RIDER_ID.toString(),
      status,
      records_processed: 1,
      records_updated: status === 'success' ? 1 : 0,
      records_created: 0,
      duration_ms: durationMs,
      error_message: errorMessage,
      started_at: new Date(Date.now() - durationMs).toISOString(),
      completed_at: new Date().toISOString()
    });
  }
}
