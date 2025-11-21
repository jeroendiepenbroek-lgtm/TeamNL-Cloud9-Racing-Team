/**
 * Sync Service V2 - Modern, Type-Safe, Observable
 * 
 * Features:
 * - Separate Rider & Event sync flows
 * - Detailed metrics per sync type
 * - Real-time progress tracking
 * - Error handling without crashes
 * - Configurable intervals
 */

import { zwiftClient } from '../api/zwift-client.js';
import { supabase } from './supabase.service.js';
import { DbRider, DbEvent } from '../types/index.js';
import { syncCoordinator } from './sync-coordinator.service.js';

const TEAM_CLUB_ID = 11818;

// Sync Metrics Types
export interface RiderSyncMetrics {
  type: 'RIDER_SYNC';
  timestamp: string;
  interval_minutes: number;
  riders_processed: number;
  riders_updated: number;
  riders_new: number;
  duration_ms: number;
  status: 'success' | 'partial' | 'error';
  error_count: number;
}

export interface EventSyncMetrics {
  type: 'NEAR_EVENT_SYNC' | 'FAR_EVENT_SYNC' | 'COMBINED_EVENT_SYNC';
  timestamp: string;
  interval_minutes: number;
  threshold_minutes: number; // Near event threshold
  mode: 'near_only' | 'full_scan'; // Nieuw: sync mode indicator
  events_scanned: number;
  events_near: number;
  events_far: number;
  signups_synced: number;
  duration_ms: number;
  status: 'success' | 'partial' | 'error';
  error_count: number;
}

export class SyncServiceV2 {
  
  /**
   * RIDER SYNC (Coordinated)
   * Uses sync coordinator to prevent conflicts
   */
  async syncRidersCoordinated(config: { 
    intervalMinutes: number;
    clubId?: number;
  }): Promise<RiderSyncMetrics> {
    return await syncCoordinator.queueSync('RIDER_SYNC', async () => {
      return await this.syncRiders(config);
    });
  }
  
  /**
   * RIDER SYNC (Direct - internal use)
   * Syncs all club members with full rider data
   * Tracks: interval, rider count, new vs updated
   */
  async syncRiders(config: { 
    intervalMinutes: number;
    clubId?: number;
  }): Promise<RiderSyncMetrics> {
    const startTime = Date.now();
    const clubId = config.clubId || TEAM_CLUB_ID;
    
    console.log(`🔄 [RIDER SYNC] Starting (interval: ${config.intervalMinutes}min)...`);
    
    const metrics: RiderSyncMetrics = {
      type: 'RIDER_SYNC',
      timestamp: new Date().toISOString(),
      interval_minutes: config.intervalMinutes,
      riders_processed: 0,
      riders_updated: 0,
      riders_new: 0,
      duration_ms: 0,
      status: 'success',
      error_count: 0,
    };

    try {
      // Step 1: Get MY TEAM MEMBERS only (not full club roster)
      console.log(`[RIDER SYNC] Fetching MY_TEAM_MEMBERS...`);
      const riderIds = await supabase.getAllTeamRiderIds();
      
      console.log(`[RIDER SYNC] Found ${riderIds.length} riders in my_team_members`);
      metrics.riders_processed = riderIds.length;
      
      if (riderIds.length === 0) {
        console.warn(`[RIDER SYNC] No riders found in my_team_members table`);
        console.warn(`[RIDER SYNC] Use: POST /api/riders/my-team with rider_ids to add riders`);
        metrics.status = 'partial';
        metrics.duration_ms = Date.now() - startTime;
        return metrics;
      }
      
      // Step 2: Bulk fetch full rider data
      console.log(`[RIDER SYNC] Fetching full rider data for ${riderIds.length} riders...`);
      const ridersData = await zwiftClient.getBulkRiders(riderIds);
      
      // Get existing riders to track new vs updated
      const existingRiders = await supabase.getRiders();
      // Map rider_id from DB for comparison
      const existingIds = new Set(existingRiders.map(r => r.rider_id));
      
      // Map to database format
      const riders = ridersData.map(rider => ({
        rider_id: rider.riderId,
        name: rider.name || `Rider ${rider.riderId}`,
        zp_category: rider.zpCategory || undefined,
        race_current_rating: rider.race?.current?.rating || undefined,
        race_finishes: rider.race?.finishes || 0,
        club_id: clubId,
        club_name: rider.club?.name || undefined,
        // Physical attributes
        weight_kg: rider.weight || undefined,
        height_cm: rider.height || undefined,
        ftp: rider.zpFTP || undefined,
        // vELO rating (from race.current.rating or race.last.rating)
        velo_rating: rider.race?.current?.rating || rider.race?.last?.rating || undefined,
        // Power intervals - W/kg (5s, 15s, 30s, 1m, 2m, 5m, 20m)
        power_wkg5: rider.power?.wkg5 || undefined,
        power_wkg15: rider.power?.wkg15 || undefined,
        power_wkg30: rider.power?.wkg30 || undefined,
        power_wkg60: rider.power?.wkg60 || undefined,
        power_wkg120: rider.power?.wkg120 || undefined,
        power_wkg300: rider.power?.wkg300 || undefined,
        power_wkg1200: rider.power?.wkg1200 || undefined,
        // Power intervals - Absolute Watts
        power_w5: rider.power?.w5 || undefined,
        power_w15: rider.power?.w15 || undefined,
        power_w30: rider.power?.w30 || undefined,
        power_w60: rider.power?.w60 || undefined,
        power_w120: rider.power?.w120 || undefined,
        power_w300: rider.power?.w300 || undefined,
        power_w1200: rider.power?.w1200 || undefined,
        // Critical Power metrics
        power_cp: rider.power?.CP || undefined,
        power_awc: rider.power?.AWC || undefined,
        last_synced: new Date().toISOString(),
      }));

      // Upsert to database
      const syncedRiders = await supabase.upsertRiders(riders);
      
      // Calculate new vs updated
      metrics.riders_new = riders.filter(r => !existingIds.has(r.rider_id)).length;
      metrics.riders_updated = riders.length - metrics.riders_new;

      // Log to sync_logs with clear RIDER_SYNC identifier
      await supabase.createSyncLog({
        endpoint: `RIDER_SYNC`,
        status: 'success',
        records_processed: syncedRiders.length,
        error_message: `Interval: ${config.intervalMinutes}min | Processed: ${metrics.riders_processed} | New: ${metrics.riders_new} | Updated: ${metrics.riders_updated}`,
      });

      metrics.duration_ms = Date.now() - startTime;
      
      console.log(`✅ [RIDER SYNC] Completed in ${metrics.duration_ms}ms`);
      console.log(`   📊 Total: ${metrics.riders_processed} | New: ${metrics.riders_new} | Updated: ${metrics.riders_updated}`);
      
      return metrics;
      
    } catch (error: any) {
      metrics.status = 'error';
      metrics.error_count = 1;
      metrics.duration_ms = Date.now() - startTime;
      
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
      
      console.error(`❌ [RIDER SYNC] Failed:`, errorMessage);
      
      // Log error without throwing
      await supabase.createSyncLog({
        endpoint: 'RIDER_SYNC',
        status: 'error',
        records_processed: 0,
        error_message: `${errorMessage} | Interval: ${config.intervalMinutes}min`,
      }).catch(err => console.error('Failed to log error:', err));
      
      return metrics;
    }
  }

  /**
   * NEAR EVENT SYNC (Coordinated)
   * Uses sync coordinator to prevent conflicts
   */
  async syncNearEventsCoordinated(config: {
    intervalMinutes: number;
    thresholdMinutes: number;
    lookforwardHours: number;
  }): Promise<EventSyncMetrics> {
    return await syncCoordinator.queueSync('NEAR_EVENT_SYNC', async () => {
      return await this.syncNearEvents(config);
    });
  }
  
  /**
   * EVENT SYNC - NEAR EVENTS (Direct - internal use)
   * Syncs events that are close to starting (more frequent updates)
   */
  async syncNearEvents(config: {
    intervalMinutes: number;
    thresholdMinutes: number; // Events starting within this window
    lookforwardHours: number;
  }): Promise<EventSyncMetrics> {
    const startTime = Date.now();
    
    console.log(`🔄 [NEAR EVENT SYNC] Starting (interval: ${config.intervalMinutes}min, threshold: ${config.thresholdMinutes}min)...`);
    
    const metrics: EventSyncMetrics = {
      type: 'NEAR_EVENT_SYNC',
      timestamp: new Date().toISOString(),
      interval_minutes: config.intervalMinutes,
      threshold_minutes: config.thresholdMinutes,
      mode: 'near_only', // Legacy: near only
      events_scanned: 0,
      events_near: 0,
      events_far: 0,
      signups_synced: 0,
      duration_ms: 0,
      status: 'success',
      error_count: 0,
    };

    try {
      // Get all events in next 48 hours FROM API (more efficient than per-rider scan)
      console.log(`[NEAR EVENT SYNC] Fetching all events from API...`);
      const allEvents = await zwiftClient.getEvents48Hours();
      console.log(`[NEAR EVENT SYNC] Found ${allEvents.length} events in next 48 hours`);
      
      if (allEvents.length === 0) {
        console.log(`[NEAR EVENT SYNC] No upcoming events`);
        metrics.status = 'success';
        metrics.duration_ms = Date.now() - startTime;
        
        await supabase.createSyncLog({
          endpoint: `NEAR_EVENT_SYNC (0 events)`,
          status: 'success',
          records_processed: 0,
        });
        
        return metrics;
      }

      // CRITICAL FIX: Save events to database FIRST before syncing signups
      console.log(`[NEAR EVENT SYNC] Saving ${allEvents.length} events to database...`);
      const eventsToSave = allEvents.map(e => ({
        event_id: e.eventId,
        time_unix: e.time,
        title: e.title,
        event_type: e.type,
        sub_type: e.subType,
        // Distance is AL in meters van API - niet * 1000!
        distance_meters: e.distance ? Math.round(Number(e.distance)) : undefined,
        route_id: (e as any).route?.id,
        raw_response: JSON.stringify(e),
        last_synced: new Date().toISOString(),
      }));
      
      await supabase.upsertZwiftApiEvents(eventsToSave);
      console.log(`[NEAR EVENT SYNC] ✅ Saved ${eventsToSave.length} events to database`);
      
      const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
      const nearThreshold = now + (config.thresholdMinutes * 60);
      
      let signupsCount = 0;
      
      // Process each event
      for (const event of allEvents) {
        metrics.events_scanned++;
        
        // Event time is already in Unix timestamp (seconds)
        const eventTime = event.time;
        
        // Check if event is "near" (starting within threshold)
        // FIXED: Event is near if it's in the future AND within threshold window
        if (eventTime >= now && eventTime <= nearThreshold) {
          metrics.events_near++;
          
          // Sync signups for near events
          try {
            const result = await this.syncEventSignups(event.eventId);
            signupsCount += result.total;
          } catch (err) {
            metrics.error_count++;
            console.warn(`Failed to sync signups for event ${event.eventId}:`, err);
          }
          
          // Rate limit protection (1 request per 200ms)
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          metrics.events_far++;
        }
      }
      
      metrics.signups_synced = signupsCount;
      metrics.duration_ms = Date.now() - startTime;
      metrics.status = metrics.error_count > 0 ? 'partial' : 'success';
      
      await supabase.createSyncLog({
        endpoint: `NEAR_EVENT_SYNC`,
        status: metrics.status,
        records_processed: allEvents.length,
        error_message: `Events: ${allEvents.length} | Near: ${metrics.events_near} | Far: ${metrics.events_far} | Signups: ${metrics.signups_synced} | Threshold: ${config.thresholdMinutes}min`,
      });
      
      console.log(`✅ [NEAR EVENT SYNC] Completed in ${metrics.duration_ms}ms`);
      console.log(`   📊 Events: ${allEvents.length} | Near: ${metrics.events_near} | Far: ${metrics.events_far} | Signups: ${metrics.signups_synced}`);
      
      return metrics;
      
    } catch (error: any) {
      metrics.status = 'error';
      metrics.error_count++;
      metrics.duration_ms = Date.now() - startTime;
      
      console.error(`❌ [NEAR EVENT SYNC] Failed:`, error);
      
      await supabase.createSyncLog({
        endpoint: 'NEAR_EVENT_SYNC',
        status: 'error',
        records_processed: 0,
        error_message: `${error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error))} | Threshold: ${config.thresholdMinutes}min | Interval: ${config.intervalMinutes}min`,
      }).catch(err => console.error('Failed to log error:', err));
      
      return metrics;
    }
  }

  /**
   * FAR EVENT SYNC (Coordinated)
   * Uses sync coordinator to prevent conflicts
   */
  async syncFarEventsCoordinated(config: {
    intervalMinutes: number;
    thresholdMinutes: number;
    lookforwardHours: number;
    force?: boolean;
  }): Promise<EventSyncMetrics> {
    return await syncCoordinator.queueSync('FAR_EVENT_SYNC', async () => {
      return await this.syncFarEvents(config);
    });
  }
  
  /**
   * EVENT SYNC - FAR EVENTS (Direct - internal use)
   * Syncs events that are far in the future (less frequent updates)
   * @param config.force - If true, sync ALL events (not just new ones)
   */
  async syncFarEvents(config: {
    intervalMinutes: number;
    thresholdMinutes: number; // Events starting after this window
    lookforwardHours: number;
    force?: boolean; // Sync all events, not just new ones
  }): Promise<EventSyncMetrics> {
    const startTime = Date.now();
    
    console.log(`🔄 [FAR EVENT SYNC] Starting (interval: ${config.intervalMinutes}min, threshold: ${config.thresholdMinutes}min)...`);
    
    const metrics: EventSyncMetrics = {
      type: 'FAR_EVENT_SYNC',
      timestamp: new Date().toISOString(),
      interval_minutes: config.intervalMinutes,
      threshold_minutes: config.thresholdMinutes,
      mode: 'full_scan', // Legacy: full scan
      events_scanned: 0,
      events_near: 0,
      events_far: 0,
      signups_synced: 0,
      duration_ms: 0,
      status: 'success',
      error_count: 0,
    };

    try {
      // Get all events in next 48 hours FROM API
      console.log(`[FAR EVENT SYNC] Fetching all events from API...`);
      const allEvents = await zwiftClient.getEvents48Hours();
      console.log(`[FAR EVENT SYNC] Found ${allEvents.length} events in next 48 hours`);
      
      if (allEvents.length === 0) {
        console.log(`[FAR EVENT SYNC] No upcoming events`);
        metrics.status = 'success';
        metrics.duration_ms = Date.now() - startTime;
        
        await supabase.createSyncLog({
          endpoint: `FAR_EVENT_SYNC (0 events)`,
          status: 'success',
          records_processed: 0,
        });
        
        return metrics;
      }

      // CRITICAL FIX: Save events to database FIRST before syncing signups
      console.log(`[FAR EVENT SYNC] Saving ${allEvents.length} events to database...`);
      const eventsToSave = allEvents.map(e => ({
        event_id: e.eventId,
        time_unix: e.time,
        title: e.title,
        event_type: e.type,
        sub_type: e.subType,
        // Distance is AL in meters van API - niet * 1000!
        distance_meters: e.distance ? Math.round(Number(e.distance)) : undefined,
        route_id: (e as any).route?.id,
        raw_response: JSON.stringify(e),
        last_synced: new Date().toISOString(),
      }));
      
      await supabase.upsertZwiftApiEvents(eventsToSave);
      console.log(`[FAR EVENT SYNC] ✅ Saved ${eventsToSave.length} events to database`);
      
      const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
      const farThreshold = now + (config.thresholdMinutes * 60);
      
      // Get existing events from database to check what's new (unless force=true)
      let existingEventIds = new Set<string>();
      if (!config.force) {
        const existingEvents = await supabase.getEvents();
        existingEventIds = new Set(existingEvents.map(e => e.zwift_event_id?.toString()).filter(Boolean) as string[]);
        console.log(`[FAR EVENT SYNC] Found ${existingEventIds.size} existing events in database`);
      } else {
        console.log(`[FAR EVENT SYNC] FORCE mode - will sync ALL events`);
      }
      
      let signupsCount = 0;
      let newEventsCount = 0;
      let skippedEventsCount = 0;
      
      // Process each event
      for (const event of allEvents) {
        metrics.events_scanned++;
        
        // Event time is already in Unix timestamp (seconds)
        const eventTime = event.time;
        
        // Check if event is "far" (starting after threshold)
        if (eventTime >= farThreshold) {
          metrics.events_far++;
          
          // Sync if NEW or if force=true
          const isNewEvent = !existingEventIds.has(event.eventId);
          const shouldSync = config.force || isNewEvent;
          
          if (shouldSync) {
            newEventsCount++;
            const reason = config.force ? 'FORCE' : 'NEW';
            console.log(`[FAR EVENT SYNC] [${reason}] Syncing: ${event.title || event.eventId} (${event.eventId})`);
            
            // Sync event metadata + signups
            try {
              const result = await this.syncEventSignups(event.eventId);
              signupsCount += result.total;
            } catch (err) {
              metrics.error_count++;
              console.warn(`Failed to sync signups for event ${event.eventId}:`, err);
            }
            
            // Rate limit protection (1 request per 200ms)
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            // Event already in DB, skip for efficiency
            skippedEventsCount++;
          }
        } else {
          metrics.events_near++;
        }
      }
      
      console.log(`[FAR EVENT SYNC] Efficiency: ${newEventsCount} new events synced, ${skippedEventsCount} existing events skipped`);
      
      metrics.signups_synced = signupsCount;
      metrics.duration_ms = Date.now() - startTime;
      metrics.status = metrics.error_count > 0 ? 'partial' : 'success';
      
      await supabase.createSyncLog({
        endpoint: `FAR_EVENT_SYNC`,
        status: metrics.status,
        records_processed: allEvents.length,
        error_message: `Events: ${allEvents.length} | Far: ${metrics.events_far} | Near: ${metrics.events_near} | New: ${newEventsCount} | Skipped: ${skippedEventsCount} | Signups: ${metrics.signups_synced}`,
      });
      
      console.log(`✅ [FAR EVENT SYNC] Completed in ${metrics.duration_ms}ms`);
      console.log(`   📊 Events: ${allEvents.length} | Far: ${metrics.events_far} | Near: ${metrics.events_near} | New: ${newEventsCount} | Signups: ${metrics.signups_synced}`);
      
      return metrics;
      
    } catch (error: any) {
      metrics.status = 'error';
      metrics.error_count++;
      metrics.duration_ms = Date.now() - startTime;
      
      console.error(`❌ [FAR EVENT SYNC] Failed:`, error);
      
      await supabase.createSyncLog({
        endpoint: 'FAR_EVENT_SYNC',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error)),
      }).catch(err => console.error('Failed to log error:', err));
      
      return metrics;
    }
  }

  /**
   * COMBINED EVENT SYNC (Coordinated)
   * Intelligente sync die near/far combineert:
   * - Frequent runs (15min): Alleen NEAR events + signups
   * - Periodic runs (2u): ALLE events + signups  
   * 
   * Voorkomt:
   * - FAR_EVENT_SYNC die nooit triggert (near sync doet alles al)
   * - Overlap tussen near/far logic
   * - Onnodig scannen van far events bij elke run
   */
  async syncEventsCoordinated(config: {
    intervalMinutes: number;
    thresholdMinutes: number;
    lookforwardHours: number;
    mode: 'near_only' | 'full_scan'; // near_only = 15min runs, full_scan = 2u runs
  }): Promise<EventSyncMetrics> {
    return await syncCoordinator.queueSync('COMBINED_EVENT_SYNC' as any, async () => {
      return await this.syncEventsCombined(config);
    });
  }
  
  /**
   * COMBINED EVENT SYNC (Direct - internal)
   * Implementatie van slimme event sync
   */
  async syncEventsCombined(config: {
    intervalMinutes: number;
    thresholdMinutes: number;
    lookforwardHours: number;
    mode: 'near_only' | 'full_scan';
  }): Promise<EventSyncMetrics> {
    const startTime = Date.now();
    const isFullScan = config.mode === 'full_scan';
    const syncLabel = isFullScan ? 'FAR_EVENT_SYNC' : 'NEAR_EVENT_SYNC'; // FAR voor full_scan (dashboard compatibility)
    
    console.log(`🔄 [${syncLabel}] Starting (interval: ${config.intervalMinutes}min, threshold: ${config.thresholdMinutes}min)...`);
    
    const metrics: EventSyncMetrics = {
      type: 'COMBINED_EVENT_SYNC',
      timestamp: new Date().toISOString(),
      interval_minutes: config.intervalMinutes,
      threshold_minutes: config.thresholdMinutes,
      mode: config.mode,
      events_scanned: 0,
      events_near: 0,
      events_far: 0,
      signups_synced: 0,
      duration_ms: 0,
      status: 'success',
      error_count: 0,
    };

    try {
      // Step 0: Zorg dat routes cache geladen is (1x bij startup, dan 24u gecached)
      console.log(`[${syncLabel}] Ensuring routes cache is loaded...`);
      await zwiftClient.getAllRoutes();
      
      // Step 1: Haal alle events op van API
      console.log(`[${syncLabel}] Fetching all events from API (${config.lookforwardHours}h window)...`);
      const rawEvents = await zwiftClient.getUpcomingEvents();
      
      // Filter op lookforward window
      const now = Math.floor(Date.now() / 1000);
      const lookforwardSeconds = config.lookforwardHours * 60 * 60;
      const allEvents = rawEvents.filter(event => 
        event.time >= now && event.time <= (now + lookforwardSeconds)
      );
      console.log(`[${syncLabel}] Found ${allEvents.length}/${rawEvents.length} events in next ${config.lookforwardHours}h`);
      
      if (allEvents.length === 0) {
        console.log(`[${syncLabel}] No upcoming events`);
        metrics.status = 'success';
        metrics.duration_ms = Date.now() - startTime;
        
        await supabase.createSyncLog({
          endpoint: `${syncLabel} (0 events)`,
          status: 'success',
          records_processed: 0,
        });
        
        return metrics;
      }

      // Step 2: Save ALLE events naar database met enriched route data
      console.log(`[${syncLabel}] Enriching ${allEvents.length} events with route data...`);
      const eventsToSave = allEvents.map(e => {
        // Lookup route details van cache (SYNC - geen async!)
        let routeData = null;
        if (e.routeId) {
          routeData = zwiftClient.getCachedRouteById(e.routeId);
        }
        
        const elevationValue = routeData?.elevation || e.elevation || null;
        
        return {
          event_id: e.eventId,
          time_unix: e.time,
          title: e.title,
          event_type: e.type,
          sub_type: e.subType,
          // Distance is AL in meters van API - niet * 1000!
          distance_meters: e.distance ? Math.round(Number(e.distance)) : null,
          // Route data uit cache (US2, US4, US5, US6) - elevation_m is INTEGER kolom!
          elevation_m: elevationValue ? Math.round(Number(elevationValue)) : null,
          route_id: e.routeId ? parseInt(String(e.routeId)) : null,
          route_name: routeData?.name || null,
          route_world: routeData?.world || null,
          route_profile: routeData?.profile || null,
          raw_response: JSON.stringify(e),
          last_synced: new Date().toISOString(),
        };
      });
      
      console.log(`[${syncLabel}] Saving ${eventsToSave.length} events to database...`);
      
      await supabase.upsertZwiftApiEvents(eventsToSave);
      console.log(`[${syncLabel}] ✅ Saved ${eventsToSave.length} events to database`);
      
      // Step 3: Bepaal welke events signups nodig hebben (hergebruik 'now' van regel 550)
      const nearThreshold = now + (config.thresholdMinutes * 60);
      
      let signupsCount = 0;
      
      for (const event of allEvents) {
        metrics.events_scanned++;
        const eventTime = event.time;
        // FIXED: Event is near if it's in the future AND within threshold window
        const isNear = eventTime >= now && eventTime <= nearThreshold;
        
        if (isNear) {
          metrics.events_near++;
          // ALTIJD signups syncen voor near events
          try {
            const result = await this.syncEventSignups(event.eventId);
            signupsCount += result.total;
          } catch (err) {
            metrics.error_count++;
            console.warn(`Failed to sync signups for event ${event.eventId}:`, err);
          }
          await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
        } else {
          metrics.events_far++;
          
          // Far events: alleen signups bij full_scan
          if (isFullScan) {
            console.log(`[${syncLabel}] [FAR] Syncing: ${event.title || event.eventId}`);
            try {
              const result = await this.syncEventSignups(event.eventId);
              signupsCount += result.total;
            } catch (err) {
              metrics.error_count++;
              console.warn(`Failed to sync signups for far event ${event.eventId}:`, err);
            }
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
          }
        }
      }
      
      metrics.signups_synced = signupsCount;
      metrics.duration_ms = Date.now() - startTime;
      metrics.status = metrics.error_count > 0 ? 'partial' : 'success';
      
      await supabase.createSyncLog({
        endpoint: syncLabel,
        status: metrics.status,
        records_processed: allEvents.length,
        error_message: `Mode: ${config.mode} | Events: ${allEvents.length} | Near: ${metrics.events_near} | Far: ${metrics.events_far} | Signups: ${metrics.signups_synced}`,
      });
      
      console.log(`✅ [${syncLabel}] Completed in ${metrics.duration_ms}ms`);
      console.log(`   📊 Mode: ${config.mode} | Events: ${allEvents.length} | Near: ${metrics.events_near} (synced) | Far: ${metrics.events_far} (${isFullScan ? 'synced' : 'skipped'}) | Signups: ${metrics.signups_synced}`);
      
      return metrics;
      
    } catch (error: any) {
      metrics.status = 'error';
      metrics.error_count++;
      metrics.duration_ms = Date.now() - startTime;
      
      const errorMessage = error instanceof Error ? error.message : (
        typeof error === 'object' ? JSON.stringify(error) : String(error)
      );
      const errorStack = error?.stack?.substring(0, 300) || '';
      
      console.error(`❌ [${syncLabel}] CRITICAL ERROR:`, error);
      console.error(`   Type:`, typeof error, error?.constructor?.name);
      console.error(`   Stack:`, error?.stack);
      console.error(`   Message:`, errorMessage);
      console.error(`   Full error:`, JSON.stringify(error, null, 2));
      
      await supabase.createSyncLog({
        endpoint: syncLabel,
        status: 'error',
        records_processed: 0,
        error_message: `${errorMessage} | Stack: ${errorStack} | Mode: ${config.mode} | Threshold: ${config.thresholdMinutes}min`,
      }).catch(err => console.error('Failed to log error:', err));
      
      // Add error message to metrics for debugging
      (metrics as any).error_message = errorMessage;
      (metrics as any).error_stack = errorStack;
      (metrics as any).error_type = error?.constructor?.name || typeof error;
      
      return metrics;
    }
  }

  /**
   * Helper: Sync signups for specific event
   */
  private async syncEventSignups(eventId: string): Promise<{ total: number, byPen: Record<string, number> }> {
    const pens = await zwiftClient.getEventSignups(eventId);
    const signups: any[] = [];
    const byPen: Record<string, number> = {};

    for (const pen of pens) {
      const penName = pen.name;
      const riders = pen.riders || [];
      byPen[penName] = riders.length;

      for (const rider of riders) {
        signups.push({
          event_id: eventId,
          pen_name: penName,
          rider_id: rider.riderId,
          rider_name: rider.name,
          weight: rider.weight || null,
          height: rider.height || null,
          club_id: rider.club?.clubId || null,
          club_name: rider.club?.name || null,
          power_wkg5: rider.power?.wkg5 || null,
          power_wkg30: rider.power?.wkg30 || null,
          power_cp: rider.power?.CP || null,
          race_rating: rider.race?.rating || null,
          race_finishes: rider.race?.finishes || null,
          race_wins: rider.race?.wins || null,
          race_podiums: rider.race?.podiums || null,
          phenotype: rider.phenotype || null,
          raw_data: rider,
        });
      }
    }

    const inserted = await supabase.upsertEventSignups(signups);
    return { total: inserted, byPen };
  }

  /**
   * Get latest sync metrics for dashboard
   */
  async getLatestMetrics(): Promise<{
    rider_sync: RiderSyncMetrics | null;
    near_event_sync: EventSyncMetrics | null;
    far_event_sync: EventSyncMetrics | null;
  }> {
    const logs = await supabase.getSyncLogs(100);
    const now = new Date();
    
    // Helper: Check if log is stale "running" status (older than 10 minutes)
    const isStaleRunning = (log: any) => {
      if (log.status !== 'running') return false;
      const logTime = new Date(log.created_at || log.synced_at);
      const ageMinutes = (now.getTime() - logTime.getTime()) / 60000;
      return ageMinutes > 5; // Lowered to 5 minutes for faster stale detection
    };
    
    // Find latest of each type - check both old and new endpoint formats, skip stale "running"
    const riderLog = logs.find(l => 
      (l.endpoint?.includes('bulk') || l.endpoint?.includes('RIDER_SYNC')) && !isStaleRunning(l)
    );
    const nearLog = logs.find(l => 
      (l.endpoint?.includes('NEAR_EVENT_SYNC') || 
       l.endpoint === 'NEAR_EVENT_SYNC' || 
       l.endpoint?.includes('NEAR EVENT SYNC')) && !isStaleRunning(l)
    );
    const farLog = logs.find(l => 
      (l.endpoint?.includes('FAR_EVENT_SYNC') || 
       l.endpoint === 'FAR_EVENT_SYNC' || 
       l.endpoint?.includes('FULL EVENT SYNC') || 
       l.endpoint === 'FULL_EVENT_SYNC') && !isStaleRunning(l)
    );
    
    return {
      rider_sync: riderLog ? this.parseMetricsFromLog(riderLog, 'RIDER_SYNC') : null,
      near_event_sync: nearLog ? this.parseMetricsFromLog(nearLog, 'NEAR_EVENT_SYNC') : null,
      far_event_sync: farLog ? this.parseMetricsFromLog(farLog, 'FAR_EVENT_SYNC') : null,
    };
  }

  private parseMetricsFromLog(log: any, type: string): any {
    // Use message field (contains details like "Interval: 360min | New: 5 | Updated: 70")
    const details = log.message || log.details || '';
    
    return {
      type,
      timestamp: log.synced_at || log.created_at,
      status: log.status,
      records_processed: log.records_processed || 0,
      details,
      error_message: log.error_message || null,
    };
  }
}

export const syncServiceV2 = new SyncServiceV2();
