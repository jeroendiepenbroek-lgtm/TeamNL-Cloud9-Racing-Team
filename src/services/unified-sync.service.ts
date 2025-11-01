/**
 * Unified Sync Service
 * Clean, unified service voor alle Zwift API → Firestore synchronisatie
 * 
 * Endpoints covered:
 * - /public/riders/:riderId
 * - /public/riders/:riderId/:time (history)
 * - /public/clubs/:id
 * - /public/clubs/:id (members as part of club data)
 * - /public/results/:eventId
 * - /public/zp/:eventId/results
 */

import { logger } from '../utils/logger.js';
import { ZwiftApiClient } from '../api/zwift-client.js';
import { supabaseSyncService } from './supabase-sync.service.js';
import { config } from '../utils/config.js';

// Initialize Zwift API client
const zwiftApiClient = new ZwiftApiClient({
  apiKey: config.zwiftApiKey,
  baseUrl: config.zwiftApiBaseUrl,
});

// ============================================================================
// RIDER SYNC
// ============================================================================

export interface RiderSyncResult {
  success: boolean;
  riderId: number;
  clubId?: number;
  error?: string;
}

/**
 * Sync single rider: /public/riders/:riderId → Firestore
 */
export async function syncRider(riderId: number): Promise<RiderSyncResult> {
  try {
    logger.info(`🔄 Syncing rider ${riderId}...`);
    
    // Fetch from Zwift API
    const riderData = await zwiftApiClient.getRider(riderId);
    
    if (!riderData) {
      return { success: false, riderId, error: 'Rider not found' };
    }

    // Sync to Supabase
    const synced = await supabaseSyncService.syncRider(riderData);
    
    if (!synced) {
      return { success: false, riderId, error: 'Supabase sync failed' };
    }

    logger.info(`✅ Rider ${riderId} synced (club: ${riderData.club?.id || 'none'})`);
    
    return {
      success: true,
      riderId,
      clubId: riderData.club?.id,
    };
  } catch (error: any) {
    logger.error(`❌ Rider sync failed for ${riderId}:`, error.message);
    return {
      success: false,
      riderId,
      error: error.message,
    };
  }
}

/**
 * Sync rider history: /public/riders/:riderId/:time → Firestore
 */
export async function syncRiderHistory(
  riderId: number,
  timestamp: number
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info(`🔄 Syncing rider ${riderId} history at ${new Date(timestamp).toISOString()}...`);
    
    const historyData = await zwiftApiClient.getRiderAtTime(riderId, timestamp);
    
    if (!historyData) {
      return { success: false, error: 'History not found' };
    }

    const synced = await supabaseSyncService.syncRiderHistory(
      riderId,
      new Date(timestamp),
      historyData
    );
    
    if (!synced) {
      return { success: false, error: 'Supabase sync failed' };
    }

    logger.info(`✅ Rider ${riderId} history synced`);
    return { success: true };
  } catch (error: any) {
    logger.error(`❌ Rider history sync failed for ${riderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk sync riders
 */
export async function syncRidersBulk(
  riderIds: number[]
): Promise<{ total: number; synced: number; failed: number; results: RiderSyncResult[] }> {
  logger.info(`🔄 Bulk syncing ${riderIds.length} riders...`);
  
  const results: RiderSyncResult[] = [];
  
  // Sync in batches of 5 (respect API rate limits: 5 req/min for riders)
  for (let i = 0; i < riderIds.length; i += 5) {
    const batch = riderIds.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(id => syncRider(id))
    );
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ success: false, riderId: 0, error: result.reason });
      }
    }
    
    // Wait 60s between batches (rate limit: 5/min)
    if (i + 5 < riderIds.length) {
      logger.info(`⏳ Waiting 60s before next batch... (${i + 5}/${riderIds.length})`);
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
  
  const synced = results.filter(r => r.success).length;
  const failed = results.length - synced;
  
  logger.info(`✅ Bulk sync complete: ${synced}/${results.length} synced, ${failed} failed`);
  
  return {
    total: results.length,
    synced,
    failed,
    results,
  };
}

// ============================================================================
// CLUB SYNC
// ============================================================================

export interface ClubSyncResult {
  success: boolean;
  clubId: number;
  memberCount?: number;
  error?: string;
}

/**
 * Sync club + members: /public/clubs/:id → Firestore
 */
export async function syncClub(clubId: number): Promise<ClubSyncResult> {
  try {
    logger.info(`🔄 Syncing club ${clubId}...`);
    
    // Fetch club data + members in one call
    const clubResponse = await zwiftApiClient.getClubMembers(clubId);
    
    if (!clubResponse) {
      return { success: false, clubId, error: 'Club not found' };
    }

    // Sync club metadata
    const clubData = {
      id: clubResponse.clubId,
      name: clubResponse.name,
      memberCount: clubResponse.riders?.length || 0,
    };
    
    const clubSynced = await supabaseSyncService.syncClub(clubData);
    
    if (!clubSynced) {
      return { success: false, clubId, error: 'Club metadata sync failed' };
    }

    // Sync members
    const members = clubResponse.riders;
    
    if (members && members.length > 0) {
      await supabaseSyncService.syncClubRoster(clubId, members);
      logger.info(`✅ Club ${clubId} synced with ${members.length} members`);
      
      return {
        success: true,
        clubId,
        memberCount: members.length,
      };
    }

    logger.info(`✅ Club ${clubId} synced (no members)`);
    return { success: true, clubId, memberCount: 0 };
  } catch (error: any) {
    logger.error(`❌ Club sync failed for ${clubId}:`, error.message);
    return {
      success: false,
      clubId,
      error: error.message,
    };
  }
}

// ============================================================================
// EVENT SYNC
// ============================================================================

export interface EventSyncResult {
  success: boolean;
  eventId: number;
  resultCount?: number;
  error?: string;
}

/**
 * Sync event + results: /public/results/:eventId → Firestore
 */
export async function syncEvent(eventId: number): Promise<EventSyncResult> {
  try {
    logger.info(`🔄 Syncing event ${eventId}...`);
    
    // Fetch event results (includes event metadata)
    const results = await zwiftApiClient.getResults(eventId);
    
    if (!results || results.length === 0) {
      return { success: false, eventId, error: 'No results found' };
    }

    // Extract event metadata from first result
    const eventData = {
      id: eventId,
      name: results[0]?.eventName || `Event ${eventId}`,
      eventDate: results[0]?.eventDate || new Date().toISOString(),
    };

    // Sync event metadata
    const eventSynced = await supabaseSyncService.syncEvent(eventData);
    
    if (!eventSynced) {
      return { success: false, eventId, error: 'Event metadata sync failed' };
    }

    // Sync race results
    const resultsSynced = await supabaseSyncService.syncRaceResults(eventId, results);
    
    if (!resultsSynced) {
      return { success: false, eventId, error: 'Results sync failed' };
    }

    logger.info(`✅ Event ${eventId} synced with ${results.length} results`);
    
    return {
      success: true,
      eventId,
      resultCount: results.length,
    };
  } catch (error: any) {
    logger.error(`❌ Event sync failed for ${eventId}:`, error.message);
    return {
      success: false,
      eventId,
      error: error.message,
    };
  }
}

/**
 * Sync ZwiftPower results: /public/zp/:eventId/results → Firestore
 */
export async function syncZwiftPowerResults(
  eventId: number
): Promise<{ success: boolean; resultCount?: number; error?: string }> {
  try {
    logger.info(`🔄 Syncing ZwiftPower results for event ${eventId}...`);
    
    const zpResults = await zwiftApiClient.getZwiftPowerResults(eventId);
    
    if (!zpResults || zpResults.length === 0) {
      return { success: false, error: 'No ZP results found' };
    }

    // Store in race_results table (same as regular results)
    const synced = await supabaseSyncService.syncRaceResults(eventId, zpResults);
    
    if (!synced) {
      return { success: false, error: 'ZP results sync failed' };
    }

    logger.info(`✅ ZwiftPower results synced for event ${eventId}: ${zpResults.length} results`);
    
    return {
      success: true,
      resultCount: zpResults.length,
    };
  } catch (error: any) {
    logger.error(`❌ ZP results sync failed for event ${eventId}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const unifiedSyncService = {
  // Riders
  syncRider,
  syncRiderHistory,
  syncRidersBulk,
  
  // Clubs
  syncClub,
  
  // Events
  syncEvent,
  syncZwiftPowerResults,
};
