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
      const riderIds = clubMembers.map(m => m.riderId).filter(id => id);
      
      // Step 2: Bulk fetch full rider data
      console.log(`[RIDER SYNC] Fetching full rider data for ${riderIds.length} riders...`);
      const ridersData = await zwiftClient.getBulkRiders(riderIds);
      
      // Get existing riders to track new vs updated
      const existingRiders = await supabase.getRiders();
      // Map rider_id from DB to zwift_id for comparison
      const existingIds = new Set(existingRiders.map(r => r.rider_id));
      
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

      // Log to sync_logs with clear RIDER_SYNC identifier
      await supabase.createSyncLog({
        endpoint: `RIDER_SYNC`,
        status: 'success',
        records_processed: syncedRiders.length,
        message: `Interval: ${config.intervalMinutes}min | Processed: ${metrics.riders_processed} | New: ${metrics.riders_new} | Updated: ${metrics.riders_updated}`,
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
        error_message: errorMessage,
        message: `Interval: ${config.intervalMinutes}min`,
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
      // Get all events in next 48 hours (more efficient than per-rider scan)
      console.log(`[NEAR EVENT SYNC] Fetching all events...`);
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
      
      const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
      const nearThreshold = now + (config.thresholdMinutes * 60);
      
      let signupsCount = 0;
      
      // Process each event
      for (const event of allEvents) {
        metrics.events_scanned++;
        
        // Event time is already in Unix timestamp (seconds)
        const eventTime = event.time;
        
        // Check if event is "near" (starting within threshold)
        if (eventTime < nearThreshold) {
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
        records_processed: metrics.signups_synced,
        message: `Near: ${metrics.events_near} | Far: ${metrics.events_far} | Events: ${metrics.events_scanned} | Threshold: ${config.thresholdMinutes}min`,
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
        error_message: error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error)),
        message: `Threshold: ${config.thresholdMinutes}min | Interval: ${config.intervalMinutes}min`,
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
      // Get all events in next 48 hours
      console.log(`[FAR EVENT SYNC] Fetching all events...`);
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
      
      const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
      const farThreshold = now + (config.thresholdMinutes * 60);
      
      let signupsCount = 0;
      
      // Process each event
      for (const event of allEvents) {
        metrics.events_scanned++;
        
        // Event time is already in Unix timestamp (seconds)
        const eventTime = event.time;
        
        // Check if event is "far" (starting after threshold)
        if (eventTime >= farThreshold) {
          metrics.events_far++;
          
          // Optionally sync signups for far events (less detailed updates)
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
          metrics.events_near++;
        }
      }
      
      metrics.signups_synced = signupsCount;
      metrics.duration_ms = Date.now() - startTime;
      metrics.status = metrics.error_count > 0 ? 'partial' : 'success';
      
      await supabase.createSyncLog({
        endpoint: `FAR_EVENT_SYNC`,
        status: metrics.status,
        records_processed: metrics.signups_synced,
        message: `Far: ${metrics.events_far} | Near: ${metrics.events_near} | Events: ${metrics.events_scanned} | Lookforward: ${config.lookforwardHours}h`,
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
        message: `Lookforward: ${config.lookforwardHours}h | Interval: ${config.intervalMinutes}min`,
        records_processed: 0,
        error_message: error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error)),
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
      (l.endpoint?.includes('NEAR_EVENT_SYNC') || l.endpoint === 'NEAR_EVENT_SYNC') && !isStaleRunning(l)
    );
    const farLog = logs.find(l => 
      (l.endpoint?.includes('FAR_EVENT_SYNC') || l.endpoint === 'FAR_EVENT_SYNC') && !isStaleRunning(l)
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
