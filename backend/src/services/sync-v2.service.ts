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
  type: 'NEAR_EVENT_SYNC' | 'FAR_EVENT_SYNC';
  timestamp: string;
  interval_minutes: number;
  threshold_minutes: number; // Near event threshold
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
   * RIDER SYNC
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
      // Step 1: Get club members (returns array of riders directly)
      console.log(`[RIDER SYNC] Fetching club members...`);
      const clubMembers = await zwiftClient.getClubMembers(clubId);
      
      // Validate response is array
      if (!Array.isArray(clubMembers)) {
        throw new Error(`Invalid response from getClubMembers: expected array, got ${typeof clubMembers}`);
      }
      
      console.log(`[RIDER SYNC] Found ${clubMembers.length} club members`);
      metrics.riders_processed = clubMembers.length;
      
      if (clubMembers.length === 0) {
        console.warn(`[RIDER SYNC] No riders found for club ${clubId}`);
        metrics.status = 'partial';
        metrics.duration_ms = Date.now() - startTime;
        return metrics;
      }
      
      // Extract rider IDs from club members response
      const riderIds = clubMembers.map(m => m.riderId || m.rider_id).filter(id => id);
      
      // Step 2: Bulk fetch full rider data
      console.log(`[RIDER SYNC] Fetching full rider data for ${riderIds.length} riders...`);
      const ridersData = await zwiftClient.getBulkRiders(riderIds);
      
      // Get existing riders to track new vs updated
      const existingRiders = await supabase.getRiders();
      const existingIds = new Set(existingRiders.map(r => r.zwift_id));
      
      // Map to database format
      const riders = ridersData.map(rider => ({
        zwift_id: rider.riderId,
        name: rider.name || `Rider ${rider.riderId}`,
        category: rider.zpCategory || null,
        ranking: rider.race?.current?.rating || null,
        points: rider.race?.finishes || 0,
        club_id: clubId,
        is_active: true,
        last_synced: new Date().toISOString(),
      }));

      // Upsert to database
      const syncedRiders = await supabase.upsertRiders(riders);
      
      // Calculate new vs updated
      metrics.riders_new = riders.filter(r => !existingIds.has(r.zwift_id)).length;
      metrics.riders_updated = riders.length - metrics.riders_new;

      // Log to sync_logs
      await supabase.createSyncLog({
        endpoint: `POST /public/riders (bulk: ${syncedRiders.length} riders)`,
        status: 'success',
        records_processed: syncedRiders.length,
        details: `Interval: ${config.intervalMinutes}min | New: ${metrics.riders_new} | Updated: ${metrics.riders_updated}`,
      });

      metrics.duration_ms = Date.now() - startTime;
      
      console.log(`✅ [RIDER SYNC] Completed in ${metrics.duration_ms}ms`);
      console.log(`   📊 Total: ${metrics.riders_processed} | New: ${metrics.riders_new} | Updated: ${metrics.riders_updated}`);
      
      return metrics;
      
    } catch (error: any) {
      metrics.status = 'error';
      metrics.error_count = 1;
      metrics.duration_ms = Date.now() - startTime;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ [RIDER SYNC] Failed:`, errorMessage);
      
      // Log error without throwing
      await supabase.createSyncLog({
        endpoint: 'POST /public/riders (bulk)',
        status: 'error',
        records_processed: 0,
        error_message: errorMessage,
      }).catch(err => console.error('Failed to log error:', err));
      
      return metrics;
    }
  }

  /**
   * EVENT SYNC - NEAR EVENTS
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
      events_scanned: 0,
      events_near: 0,
      events_far: 0,
      signups_synced: 0,
      duration_ms: 0,
      status: 'success',
      error_count: 0,
    };

    try {
      // Get all riders to scan for events
      const riders = await supabase.getRiders();
      console.log(`[NEAR EVENT SYNC] Scanning ${riders.length} riders for upcoming events...`);
      
      const now = Date.now();
      const nearThreshold = now + (config.thresholdMinutes * 60 * 1000);
      const lookforwardMs = config.lookforwardHours * 60 * 60 * 1000;
      
      let nearEvents: any[] = [];
      let signupsCount = 0;
      
      // Scan riders in batches
      const BATCH_SIZE = 5;
      for (let i = 0; i < riders.length; i += BATCH_SIZE) {
        const batch = riders.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (rider) => {
          try {
            const events = await zwiftClient.getRiderUpcomingEvents(rider.zwift_id);
            
            for (const event of events) {
              const eventTime = new Date(event.eventStart).getTime();
              
              // Only process events within lookforward window
              if (eventTime > now && eventTime < now + lookforwardMs) {
                metrics.events_scanned++;
                
                // Check if event is "near"
                if (eventTime < nearThreshold) {
                  metrics.events_near++;
                  nearEvents.push(event);
                  
                  // Sync signups for near events
                  try {
                    const result = await this.syncEventSignups(event.id);
                    signupsCount += result.total;
                  } catch (err) {
                    metrics.error_count++;
                    console.warn(`Failed to sync signups for event ${event.id}:`, err);
                  }
                } else {
                  metrics.events_far++;
                }
              }
            }
          } catch (err) {
            metrics.error_count++;
            console.warn(`Failed to scan rider ${rider.zwift_id}:`, err);
          }
        }));
        
        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      metrics.signups_synced = signupsCount;
      metrics.duration_ms = Date.now() - startTime;
      metrics.status = metrics.error_count > 0 ? 'partial' : 'success';
      
      await supabase.createSyncLog({
        endpoint: 'NEAR_EVENT_SYNC',
        status: metrics.status,
        records_processed: metrics.signups_synced,
        details: `Near: ${metrics.events_near} | Far: ${metrics.events_far} | Errors: ${metrics.error_count}`,
      });
      
      console.log(`✅ [NEAR EVENT SYNC] Completed in ${metrics.duration_ms}ms`);
      console.log(`   📊 Near: ${metrics.events_near} | Far: ${metrics.events_far} | Signups: ${metrics.signups_synced}`);
      
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
        error_message: error instanceof Error ? error.message : String(error),
      }).catch(err => console.error('Failed to log error:', err));
      
      return metrics;
    }
  }

  /**
   * EVENT SYNC - FAR EVENTS
   * Syncs events that are far in the future (less frequent updates)
   */
  async syncFarEvents(config: {
    intervalMinutes: number;
    thresholdMinutes: number; // Events starting after this window
    lookforwardHours: number;
  }): Promise<EventSyncMetrics> {
    const startTime = Date.now();
    
    console.log(`🔄 [FAR EVENT SYNC] Starting (interval: ${config.intervalMinutes}min, threshold: ${config.thresholdMinutes}min)...`);
    
    const metrics: EventSyncMetrics = {
      type: 'FAR_EVENT_SYNC',
      timestamp: new Date().toISOString(),
      interval_minutes: config.intervalMinutes,
      threshold_minutes: config.thresholdMinutes,
      events_scanned: 0,
      events_near: 0,
      events_far: 0,
      signups_synced: 0,
      duration_ms: 0,
      status: 'success',
      error_count: 0,
    };

    try {
      const riders = await supabase.getRiders();
      console.log(`[FAR EVENT SYNC] Scanning ${riders.length} riders for far events...`);
      
      const now = Date.now();
      const farThreshold = now + (config.thresholdMinutes * 60 * 1000);
      const lookforwardMs = config.lookforwardHours * 60 * 60 * 1000;
      
      let farEvents: any[] = [];
      let signupsCount = 0;
      
      // Scan riders in batches
      const BATCH_SIZE = 5;
      for (let i = 0; i < riders.length; i += BATCH_SIZE) {
        const batch = riders.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (rider) => {
          try {
            const events = await zwiftClient.getRiderUpcomingEvents(rider.zwift_id);
            
            for (const event of events) {
              const eventTime = new Date(event.eventStart).getTime();
              
              // Only process events within lookforward window
              if (eventTime > now && eventTime < now + lookforwardMs) {
                metrics.events_scanned++;
                
                // Check if event is "far"
                if (eventTime >= farThreshold) {
                  metrics.events_far++;
                  farEvents.push(event);
                  
                  // Optionally sync signups for far events (less detailed)
                  try {
                    const result = await this.syncEventSignups(event.id);
                    signupsCount += result.total;
                  } catch (err) {
                    metrics.error_count++;
                    console.warn(`Failed to sync signups for event ${event.id}:`, err);
                  }
                } else {
                  metrics.events_near++;
                }
              }
            }
          } catch (err) {
            metrics.error_count++;
            console.warn(`Failed to scan rider ${rider.zwift_id}:`, err);
          }
        }));
        
        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      metrics.signups_synced = signupsCount;
      metrics.duration_ms = Date.now() - startTime;
      metrics.status = metrics.error_count > 0 ? 'partial' : 'success';
      
      await supabase.createSyncLog({
        endpoint: 'FAR_EVENT_SYNC',
        status: metrics.status,
        records_processed: metrics.signups_synced,
        details: `Far: ${metrics.events_far} | Near: ${metrics.events_near} | Errors: ${metrics.error_count}`,
      });
      
      console.log(`✅ [FAR EVENT SYNC] Completed in ${metrics.duration_ms}ms`);
      console.log(`   📊 Far: ${metrics.events_far} | Near: ${metrics.events_near} | Signups: ${metrics.signups_synced}`);
      
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
        error_message: error instanceof Error ? error.message : String(error),
      }).catch(err => console.error('Failed to log error:', err));
      
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
    
    // Find latest of each type
    const riderLog = logs.find(l => l.endpoint?.includes('bulk'));
    const nearLog = logs.find(l => l.endpoint === 'NEAR_EVENT_SYNC');
    const farLog = logs.find(l => l.endpoint === 'FAR_EVENT_SYNC');
    
    return {
      rider_sync: riderLog ? this.parseMetricsFromLog(riderLog, 'RIDER_SYNC') : null,
      near_event_sync: nearLog ? this.parseMetricsFromLog(nearLog, 'NEAR_EVENT_SYNC') : null,
      far_event_sync: farLog ? this.parseMetricsFromLog(farLog, 'FAR_EVENT_SYNC') : null,
    };
  }

  private parseMetricsFromLog(log: any, type: string): any {
    // Parse details field for metrics
    const details = log.details || '';
    const matches = details.match(/Interval: (\d+)min|Near: (\d+)|Far: (\d+)|New: (\d+)|Updated: (\d+)|Errors: (\d+)/g);
    
    return {
      type,
      timestamp: log.synced_at,
      status: log.status,
      records_processed: log.records_processed,
      details,
    };
  }
}

export const syncServiceV2 = new SyncServiceV2();
