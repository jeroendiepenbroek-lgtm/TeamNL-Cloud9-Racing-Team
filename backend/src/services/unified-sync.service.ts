/**
 * UNIFIED SYNC SERVICE
 * Consolideert alle sync operaties in 1 service
 * 
 * Features:
 * - Smart scheduling (near/far events)
 * - Bulk operations (efficient batching)
 * - Rate limit optimization
 * - Built-in queue management
 * - Comprehensive error handling
 */

import { zwiftClient } from '../api/zwift-client.js';
import { supabase } from './supabase.service.js';
import { DbRider, DbEvent } from '../types/index.js';

const TEAM_CLUB_ID = 11818;

// ============================================================================
// TYPES
// ============================================================================

export interface SyncOptions {
  clubId?: number;
  force?: boolean;
}

export interface EventSyncOptions extends SyncOptions {
  mode?: 'near' | 'far' | 'all';
  thresholdMinutes?: number;
}

export interface ResultSyncOptions {
  daysBack?: number;
  riderIds?: number[];
}

export interface SyncResult {
  success: boolean;
  type: string;
  timestamp: string;
  duration_ms: number;
  stats: Record<string, any>;
  errors?: string[];
}

// ============================================================================
// UNIFIED SYNC SERVICE
// ============================================================================

export class UnifiedSyncService {
  private syncQueue: Map<string, Promise<any>> = new Map();
  private lastSync: Map<string, number> = new Map();

  // ============================================================================
  // CORE SYNC: RIDERS
  // ============================================================================

  async syncRiders(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const clubId = options.clubId || TEAM_CLUB_ID;
    const syncKey = `riders-${clubId}`;

    // Check if already syncing
    if (!options.force && this.syncQueue.has(syncKey)) {
      console.log(`⏳ Rider sync already in progress`);
      return this.syncQueue.get(syncKey)!;
    }

    // Check last sync time (15min cooldown)
    const lastSyncTime = this.lastSync.get(syncKey) || 0;
    const timeSinceLastSync = Date.now() - lastSyncTime;
    if (!options.force && timeSinceLastSync < 15 * 60 * 1000) {
      const waitTime = Math.ceil((15 * 60 * 1000 - timeSinceLastSync) / 1000);
      throw new Error(`Rider sync cooldown: wait ${waitTime}s`);
    }

    const syncPromise = this._syncRiders(clubId, startTime);
    this.syncQueue.set(syncKey, syncPromise);

    try {
      const result = await syncPromise;
      this.lastSync.set(syncKey, Date.now());
      return result;
    } finally {
      this.syncQueue.delete(syncKey);
    }
  }

  private async _syncRiders(clubId: number, startTime: number): Promise<SyncResult> {
    console.log(`🔄 [RIDER SYNC] Starting...`);
    const errors: string[] = [];
    let ridersProcessed = 0;
    let ridersUpdated = 0;
    let ridersNew = 0;

    try {
      // Get MY_TEAM_MEMBERS
      const riderIds = await supabase.getAllTeamRiderIds();
      console.log(`[RIDER SYNC] Found ${riderIds.length} team members`);

      if (riderIds.length === 0) {
        return {
          success: false,
          type: 'RIDER_SYNC',
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          stats: { ridersProcessed: 0, ridersUpdated: 0, ridersNew: 0 },
          errors: ['No riders in my_team_members table']
        };
      }

      // Bulk fetch rider data
      const ridersData = await zwiftClient.getBulkRiders(riderIds);
      ridersProcessed = ridersData.length;

      // Get existing riders
      const existingRiders = await supabase.getRiders();
      const existingIds = new Set(existingRiders.map(r => r.rider_id));

      // Helper: extract power value from array [value, percentile, rank]
      const extractPower = (val: any): number | undefined => {
        if (!val) return undefined;
        return Array.isArray(val) ? val[0] : val;
      };

      // Process riders
      for (const rider of ridersData) {
        try {
          const dbRider: Partial<DbRider> = {
            rider_id: rider.riderId,
            name: rider.name || `Rider ${rider.riderId}`,
            zp_category: rider.zpCategory,
            race_current_rating: rider.race?.current?.rating || rider.race?.last?.rating,
            race_finishes: rider.race?.finishes || 0,
            club_id: clubId,
            club_name: rider.club?.name,
            weight: rider.weight,
            height: rider.height,
            zp_ftp: rider.zpFTP,
            // Power W/kg
            power_wkg5: extractPower(rider.power?.wkg5),
            power_wkg15: extractPower(rider.power?.wkg15),
            power_wkg30: extractPower(rider.power?.wkg30),
            power_wkg60: extractPower(rider.power?.wkg60),
            power_wkg120: extractPower(rider.power?.wkg120),
            power_wkg300: extractPower(rider.power?.wkg300),
            power_wkg1200: extractPower(rider.power?.wkg1200),
            // Power Watts
            power_w5: extractPower(rider.power?.w5),
            power_w15: extractPower(rider.power?.w15),
            power_w30: extractPower(rider.power?.w30),
            power_w60: extractPower(rider.power?.w60),
            power_w120: extractPower(rider.power?.w120),
            power_w300: extractPower(rider.power?.w300),
            power_w1200: extractPower(rider.power?.w1200),
            is_active: true,
            updated_at: new Date().toISOString()
          };

          if (existingIds.has(rider.riderId)) {
            await supabase.updateRider(rider.riderId, dbRider);
            ridersUpdated++;
          } else {
            await supabase.createRider(dbRider as DbRider);
            ridersNew++;
          }
        } catch (err: any) {
          errors.push(`Rider ${rider.riderId}: ${err.message}`);
        }
      }

      // Log sync
      await supabase.logSync({
        type: 'RIDER_SYNC',
        status: errors.length > 0 ? 'partial' : 'success',
        riders_processed: ridersProcessed,
        riders_updated: ridersUpdated,
        riders_new: ridersNew,
        duration_ms: Date.now() - startTime,
        error_message: errors.length > 0 ? errors.join('; ') : null
      });

      console.log(`✅ [RIDER SYNC] Done: ${ridersUpdated} updated, ${ridersNew} new`);

      return {
        success: true,
        type: 'RIDER_SYNC',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        stats: { ridersProcessed, ridersUpdated, ridersNew },
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      console.error('❌ [RIDER SYNC] Failed:', error);
      
      await supabase.logSync({
        type: 'RIDER_SYNC',
        status: 'error',
        riders_processed: ridersProcessed,
        duration_ms: Date.now() - startTime,
        error_message: error.message
      });

      return {
        success: false,
        type: 'RIDER_SYNC',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        stats: { ridersProcessed, ridersUpdated, ridersNew },
        errors: [error.message]
      };
    }
  }

  // ============================================================================
  // CORE SYNC: EVENTS
  // ============================================================================

  async syncEvents(options: EventSyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const mode = options.mode || 'all';
    const thresholdMinutes = options.thresholdMinutes || 120;
    const syncKey = `events-${mode}`;

    // Check if already syncing
    if (!options.force && this.syncQueue.has(syncKey)) {
      console.log(`⏳ Event sync (${mode}) already in progress`);
      return this.syncQueue.get(syncKey)!;
    }

    const syncPromise = this._syncEvents(mode, thresholdMinutes, startTime);
    this.syncQueue.set(syncKey, syncPromise);

    try {
      const result = await syncPromise;
      this.lastSync.set(syncKey, Date.now());
      return result;
    } finally {
      this.syncQueue.delete(syncKey);
    }
  }

  private async _syncEvents(mode: string, thresholdMinutes: number, startTime: number): Promise<SyncResult> {
    console.log(`🔄 [EVENT SYNC] Starting (mode: ${mode})...`);
    const errors: string[] = [];
    let eventsProcessed = 0;
    let eventsNear = 0;
    let eventsFar = 0;

    try {
      // Get upcoming events from ZwiftRacing API
      const apiEvents = await zwiftClient.getUpcomingEvents(TEAM_CLUB_ID);
      eventsProcessed = apiEvents.length;
      console.log(`[EVENT SYNC] Found ${apiEvents.length} upcoming events`);

      const now = Date.now();
      const threshold = thresholdMinutes * 60 * 1000;

      for (const event of apiEvents) {
        try {
          const eventTime = new Date(event.time * 1000).getTime();
          const timeUntilEvent = eventTime - now;
          const isNear = timeUntilEvent <= threshold;

          // Skip based on mode
          if (mode === 'near' && !isNear) continue;
          if (mode === 'far' && isNear) continue;

          if (isNear) eventsNear++;
          else eventsFar++;

          // Upsert event
          await supabase.upsertEvent({
            event_id: event.eventId,
            name: event.name,
            event_date: new Date(event.time * 1000).toISOString(),
            club_id: TEAM_CLUB_ID,
            type: event.type,
            sub_type: event.subType,
            route_world: event.route?.world,
            route_name: event.route?.name,
            distance_km: event.route?.distance,
            elevation_m: event.route?.elevation,
            laps: event.laps,
            updated_at: new Date().toISOString()
          });

        } catch (err: any) {
          errors.push(`Event ${event.eventId}: ${err.message}`);
        }
      }

      // Log sync
      await supabase.logSync({
        type: mode === 'near' ? 'NEAR_EVENT_SYNC' : mode === 'far' ? 'FAR_EVENT_SYNC' : 'FULL_EVENT_SYNC',
        status: errors.length > 0 ? 'partial' : 'success',
        events_processed: eventsProcessed,
        events_near: eventsNear,
        events_far: eventsFar,
        duration_ms: Date.now() - startTime,
        error_message: errors.length > 0 ? errors.join('; ') : null
      });

      console.log(`✅ [EVENT SYNC] Done: ${eventsNear} near, ${eventsFar} far`);

      return {
        success: true,
        type: `EVENT_SYNC_${mode.toUpperCase()}`,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        stats: { eventsProcessed, eventsNear, eventsFar },
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      console.error(`❌ [EVENT SYNC] Failed:`, error);
      
      await supabase.logSync({
        type: 'EVENT_SYNC',
        status: 'error',
        events_processed: eventsProcessed,
        duration_ms: Date.now() - startTime,
        error_message: error.message
      });

      return {
        success: false,
        type: `EVENT_SYNC_${mode.toUpperCase()}`,
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        stats: { eventsProcessed, eventsNear, eventsFar },
        errors: [error.message]
      };
    }
  }

  // ============================================================================
  // CORE SYNC: SIGNUPS
  // ============================================================================

  async syncSignups(eventIds: number[], options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`🔄 [SIGNUP SYNC] Starting for ${eventIds.length} events...`);
    
    const errors: string[] = [];
    let signupsTotal = 0;
    let eventsProcessed = 0;

    try {
      for (const eventId of eventIds) {
        try {
          const signups = await zwiftClient.getEventSignups(eventId);
          
          // Filter only team members
          const riderIds = await supabase.getAllTeamRiderIds();
          const teamSignups = signups.filter(s => riderIds.includes(s.riderId));

          // Upsert signups
          for (const signup of teamSignups) {
            await supabase.upsertSignup({
              event_id: eventId,
              rider_id: signup.riderId,
              rider_name: signup.name,
              pen: signup.pen,
              zp_category: signup.zpCategory,
              signed_up_at: new Date().toISOString()
            });
            signupsTotal++;
          }

          eventsProcessed++;
          
          // Rate limit: 1 call/min for signups
          if (eventsProcessed < eventIds.length) {
            await new Promise(resolve => setTimeout(resolve, 60000));
          }

        } catch (err: any) {
          errors.push(`Event ${eventId}: ${err.message}`);
        }
      }

      // Log sync
      await supabase.logSync({
        type: 'SIGNUP_SYNC',
        status: errors.length > 0 ? 'partial' : 'success',
        events_processed: eventsProcessed,
        signups_synced: signupsTotal,
        duration_ms: Date.now() - startTime,
        error_message: errors.length > 0 ? errors.join('; ') : null
      });

      console.log(`✅ [SIGNUP SYNC] Done: ${signupsTotal} signups from ${eventsProcessed} events`);

      return {
        success: true,
        type: 'SIGNUP_SYNC',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        stats: { eventsProcessed, signupsTotal },
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      console.error('❌ [SIGNUP SYNC] Failed:', error);
      return {
        success: false,
        type: 'SIGNUP_SYNC',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        stats: { eventsProcessed, signupsTotal },
        errors: [error.message]
      };
    }
  }

  // ============================================================================
  // CORE SYNC: RESULTS
  // ============================================================================

  async syncResults(options: ResultSyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const daysBack = options.daysBack || 30;
    console.log(`🔄 [RESULT SYNC] Starting (${daysBack} days back)...`);

    const errors: string[] = [];
    let ridersScanned = 0;
    let resultsFound = 0;
    let resultsSaved = 0;

    try {
      // Get riders to scan
      const riderIds = options.riderIds || await supabase.getAllTeamRiderIds();
      ridersScanned = riderIds.length;
      console.log(`[RESULT SYNC] Scanning ${ridersScanned} riders...`);

      for (const riderId of riderIds) {
        try {
          const riderProfile = await zwiftClient.getRider(riderId);
          
          if (!riderProfile.recentResults || riderProfile.recentResults.length === 0) {
            continue;
          }

          const recentResults = riderProfile.recentResults;
          resultsFound += recentResults.length;

          for (const result of recentResults) {
            try {
              await supabase.saveRaceResult({
                event_id: parseInt(result.event.id),
                rider_id: result.riderId,
                position: result.position,
                time_seconds: result.time,
                power_avg: result.power?.avg || null,
                power_max: result.power?.max || null,
                heartrate_avg: result.heartRate?.avg || null,
                heartrate_max: result.heartRate?.max || null,
                weight: result.weight,
                height: result.height,
                category: result.category,
                rating_before: result.ratingBefore,
                rating_after: result.rating,
                rating_change: result.ratingDelta,
                event_date: new Date(result.event.time * 1000).toISOString(),
                finish_status: result.dnf ? 'DNF' : 'FINISHED'
              });
              resultsSaved++;
            } catch (err: any) {
              errors.push(`Result for rider ${riderId}: ${err.message}`);
            }
          }

          // Rate limit: 5 riders/min
          if (riderIds.indexOf(riderId) % 5 === 4 && riderIds.indexOf(riderId) < riderIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 60000));
          }

        } catch (err: any) {
          errors.push(`Rider ${riderId}: ${err.message}`);
        }
      }

      // Log sync
      await supabase.logSync({
        type: 'RESULT_SYNC',
        status: errors.length > 0 ? 'partial' : 'success',
        riders_processed: ridersScanned,
        results_found: resultsFound,
        results_saved: resultsSaved,
        duration_ms: Date.now() - startTime,
        error_message: errors.length > 0 ? errors.join('; ') : null
      });

      console.log(`✅ [RESULT SYNC] Done: ${resultsSaved}/${resultsFound} results saved`);

      return {
        success: true,
        type: 'RESULT_SYNC',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        stats: { ridersScanned, resultsFound, resultsSaved },
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error: any) {
      console.error('❌ [RESULT SYNC] Failed:', error);
      return {
        success: false,
        type: 'RESULT_SYNC',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        stats: { ridersScanned, resultsFound, resultsSaved },
        errors: [error.message]
      };
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  async bulkSyncRiders(riderIds: number[]): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`🔄 [BULK RIDER SYNC] Processing ${riderIds.length} riders...`);

    // Process in batches of 50 (POST bulk limit)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < riderIds.length; i += batchSize) {
      batches.push(riderIds.slice(i, i + batchSize));
    }

    let totalProcessed = 0;
    const errors: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      try {
        const batch = batches[i];
        const ridersData = await zwiftClient.getBulkRiders(batch);
        
        // Save to database
        for (const rider of ridersData) {
          await supabase.upsertRider({
            rider_id: rider.riderId,
            name: rider.name,
            // ... rest of rider data
          } as any);
        }

        totalProcessed += ridersData.length;
        console.log(`[BULK RIDER SYNC] Batch ${i + 1}/${batches.length}: ${ridersData.length} riders`);

        // Wait 15min between batches (rate limit)
        if (i < batches.length - 1) {
          console.log(`⏳ Waiting 15min for rate limit...`);
          await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000));
        }

      } catch (err: any) {
        errors.push(`Batch ${i + 1}: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      type: 'BULK_RIDER_SYNC',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      stats: { totalProcessed, batchesProcessed: batches.length },
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async bulkSyncEvents(eventIds: number[]): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`🔄 [BULK EVENT SYNC] Processing ${eventIds.length} events...`);

    let eventsProcessed = 0;
    const errors: string[] = [];

    for (const eventId of eventIds) {
      try {
        // Fetch event data
        const eventData = await zwiftClient.getEvent(eventId);
        
        // Upsert to database
        await supabase.upsertEvent({
          event_id: eventData.eventId,
          name: eventData.name,
          event_date: new Date(eventData.time * 1000).toISOString(),
          // ... rest of event data
        } as any);

        eventsProcessed++;

        // Rate limit: 1 call/min
        if (eventsProcessed < eventIds.length) {
          await new Promise(resolve => setTimeout(resolve, 60000));
        }

      } catch (err: any) {
        errors.push(`Event ${eventId}: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      type: 'BULK_EVENT_SYNC',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      stats: { eventsProcessed },
      errors: errors.length > 0 ? errors : undefined
    };
  }

  // ============================================================================
  // SMART SCHEDULING
  // ============================================================================

  startSmartScheduler(): void {
    console.log('🚀 Starting smart scheduler...');

    // Rider sync: Every 15 minutes
    setInterval(() => {
      this.syncRiders().catch(err => 
        console.error('Scheduled rider sync failed:', err)
      );
    }, 15 * 60 * 1000);

    // Near event sync: Every 10 minutes
    setInterval(() => {
      this.syncEvents({ mode: 'near', thresholdMinutes: 120 }).catch(err =>
        console.error('Scheduled near event sync failed:', err)
      );
    }, 10 * 60 * 1000);

    // Far event sync: Every 60 minutes
    setInterval(() => {
      this.syncEvents({ mode: 'far', thresholdMinutes: 120 }).catch(err =>
        console.error('Scheduled far event sync failed:', err)
      );
    }, 60 * 60 * 1000);

    // Signup sync: Every 30 minutes for near events
    setInterval(async () => {
      try {
        const events = await supabase.getEvents();
        const now = Date.now();
        const nearEvents = events.filter(e => {
          const eventTime = new Date(e.event_date).getTime();
          return eventTime - now <= 2 * 60 * 60 * 1000; // 2 hours
        });
        
        if (nearEvents.length > 0) {
          await this.syncSignups(nearEvents.map(e => e.event_id));
        }
      } catch (err) {
        console.error('Scheduled signup sync failed:', err);
      }
    }, 30 * 60 * 1000);

    console.log('✅ Smart scheduler started');
  }
}

// Singleton instance
export const unifiedSync = new UnifiedSyncService();
