/**
 * Simple Sync Service - Basic sync functionality
 * Replaces complex sync-v2 with minimal working implementation
 */

import { supabase } from './supabase.service.js';
import { zwiftClient } from '../api/zwift-client.js';

interface SyncResult {
  success: boolean;
  count: number;
  message: string;
  error?: string;
}

class SimpleSyncService {
  
  /**
   * Sync club members (riders)
   */
  async syncRiders(clubId: number = 11818): Promise<SyncResult> {
    try {
      console.log(`[Sync] Starting rider sync for club ${clubId}...`);
      
      // Fetch from ZwiftRacing API
      const clubData = await zwiftClient.getClub(clubId);
      
      if (!clubData || !clubData.data || !clubData.data.riders) {
        throw new Error('Invalid club data received');
      }
      
      const riders = clubData.data.riders;
      
      // Upsert to Supabase
      const upsertedRiders = await supabase.upsertRiders(riders);
      
      console.log(`[Sync] ✅ Synced ${upsertedRiders.length} riders`);
      
      return {
        success: true,
        count: upsertedRiders.length,
        message: `Successfully synced ${upsertedRiders.length} riders`
      };
      
    } catch (error: any) {
      console.error('[Sync] ❌ Rider sync failed:', error);
      return {
        success: false,
        count: 0,
        message: 'Rider sync failed',
        error: error.message
      };
    }
  }
  
  /**
   * Sync events
   */
  async syncEvents(clubId: number = 11818, lookForwardHours: number = 168): Promise<SyncResult> {
    try {
      console.log(`[Sync] Starting event sync for club ${clubId}...`);
      
      // Fetch from ZwiftRacing API
      const eventsData = await zwiftClient.getClubEvents(clubId, lookForwardHours);
      
      if (!eventsData || !eventsData.data) {
        throw new Error('Invalid events data received');
      }
      
      const events = eventsData.data;
      
      // Upsert to Supabase
      const upsertedEvents = await supabase.upsertEvents(events);
      
      console.log(`[Sync] ✅ Synced ${upsertedEvents.length} events`);
      
      return {
        success: true,
        count: upsertedEvents.length,
        message: `Successfully synced ${upsertedEvents.length} events`
      };
      
    } catch (error: any) {
      console.error('[Sync] ❌ Event sync failed:', error);
      return {
        success: false,
        count: 0,
        message: 'Event sync failed',
        error: error.message
      };
    }
  }
  
  /**
   * Sync event results
   */
  async syncEventResults(eventId: number): Promise<SyncResult> {
    try {
      console.log(`[Sync] Starting results sync for event ${eventId}...`);
      
      // Fetch from ZwiftRacing API
      const resultsData = await zwiftClient.getEventResults(eventId);
      
      if (!resultsData || !resultsData.data) {
        throw new Error('Invalid results data received');
      }
      
      const results = resultsData.data;
      
      // Upsert to Supabase
      const upsertedResults = await supabase.upsertResults(results, eventId);
      
      console.log(`[Sync] ✅ Synced ${upsertedResults.length} results`);
      
      return {
        success: true,
        count: upsertedResults.length,
        message: `Successfully synced ${upsertedResults.length} results`
      };
      
    } catch (error: any) {
      console.error('[Sync] ❌ Results sync failed:', error);
      return {
        success: false,
        count: 0,
        message: 'Results sync failed',
        error: error.message
      };
    }
  }
  
  /**
   * Sync rider history
   */
  async syncRiderHistory(riderId: number): Promise<SyncResult> {
    try {
      console.log(`[Sync] Starting history sync for rider ${riderId}...`);
      
      // Fetch from ZwiftRacing API
      const historyData = await zwiftClient.getRiderHistory(riderId);
      
      if (!historyData || !historyData.data) {
        throw new Error('Invalid history data received');
      }
      
      const history = historyData.data;
      
      // Upsert to Supabase
      const upsertedHistory = await supabase.upsertRiderHistory(history, riderId);
      
      console.log(`[Sync] ✅ Synced ${upsertedHistory.length} history records`);
      
      return {
        success: true,
        count: upsertedHistory.length,
        message: `Successfully synced ${upsertedHistory.length} history records`
      };
      
    } catch (error: any) {
      console.error('[Sync] ❌ History sync failed:', error);
      return {
        success: false,
        count: 0,
        message: 'History sync failed',
        error: error.message
      };
    }
  }
}

export const simpleSyncService = new SimpleSyncService();
export { SimpleSyncService };
