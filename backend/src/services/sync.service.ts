/**
 * Sync Service - Synchroniseert data van ZwiftRacing API naar Supabase
 */

import { zwiftClient } from '../api/zwift-client.js';
import { supabase } from './supabase.service.js';
import { DbClub, DbRider, DbEvent, DbResult } from '../types/index.js';

const TEAM_CLUB_ID = 11818;

export class SyncService {
  /**
   * 1. Sync club informatie
   */
  async syncClub(clubId: number = TEAM_CLUB_ID): Promise<DbClub> {
    console.log(`🔄 Syncing club ${clubId}...`);
    
    try {
      const clubData = await zwiftClient.getClub(clubId);
      
      const club = await supabase.upsertClub({
        id: clubData.id,
        name: clubData.name,
        description: clubData.description,
        tag: clubData.tag,
        member_count: clubData.memberCount,
        last_synced: new Date().toISOString(),
      });

      await supabase.createSyncLog({
        endpoint: 'clubs',
        status: 'success',
        records_processed: 1,
      });

      console.log(`✅ Club synced: ${club.name}`);
      return club;
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: 'clubs',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 2. Sync club riders
   */
  async syncRiders(clubId: number = TEAM_CLUB_ID): Promise<DbRider[]> {
    console.log(`🔄 Syncing riders for club ${clubId}...`);
    
    try {
      const ridersData = await zwiftClient.getClubRiders(clubId);
      
      const riders = ridersData.map(rider => ({
        zwift_id: rider.riderId,
        name: rider.name,
        category: rider.category,
        ranking: rider.ranking,
        points: rider.points,
        club_id: clubId,
        is_active: true,
        last_synced: new Date().toISOString(),
      }));

      const syncedRiders = await supabase.upsertRiders(riders);

      await supabase.createSyncLog({
        endpoint: 'riders',
        status: 'success',
        records_processed: syncedRiders.length,
      });

      console.log(`✅ Synced ${syncedRiders.length} riders`);
      return syncedRiders;
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: 'riders',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 3. Sync club events
   */
  async syncEvents(clubId: number = TEAM_CLUB_ID): Promise<DbEvent[]> {
    console.log(`🔄 Syncing events for club ${clubId}...`);
    
    try {
      const eventsData = await zwiftClient.getClubEvents(clubId);
      
      const events = eventsData.map(event => ({
        zwift_event_id: event.id,
        name: event.name,
        event_date: event.eventDate,
        event_type: event.type,
        club_id: clubId,
        last_synced: new Date().toISOString(),
      }));

      const syncedEvents = await supabase.upsertEvents(events);

      await supabase.createSyncLog({
        endpoint: 'events',
        status: 'success',
        records_processed: syncedEvents.length,
      });

      console.log(`✅ Synced ${syncedEvents.length} events`);
      return syncedEvents;
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: 'events',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 4. Sync event results
   */
  async syncEventResults(eventId: number): Promise<DbResult[]> {
    console.log(`🔄 Syncing results for event ${eventId}...`);
    
    try {
      const resultsData = await zwiftClient.getEventResults(eventId);
      
      const results = resultsData.map(result => ({
        event_id: result.eventId,
        rider_id: result.riderId,
        position: result.position,
        time_seconds: result.time,
        points: result.points,
      }));

      const syncedResults = await supabase.upsertResults(results);

      await supabase.createSyncLog({
        endpoint: 'results',
        status: 'success',
        records_processed: syncedResults.length,
      });

      console.log(`✅ Synced ${syncedResults.length} results`);
      return syncedResults;
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: 'results',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 5. Sync rider history
   */
  async syncRiderHistory(riderId: number): Promise<void> {
    console.log(`🔄 Syncing history for rider ${riderId}...`);
    
    try {
      const historyData = await zwiftClient.getRiderHistory(riderId);
      
      const history = historyData.map(snapshot => ({
        rider_id: riderId,
        snapshot_date: snapshot.date,
        ranking: snapshot.ranking,
        points: snapshot.points,
        category: snapshot.category,
      }));

      await supabase.insertRiderHistory(history);

      await supabase.createSyncLog({
        endpoint: 'rider_history',
        status: 'success',
        records_processed: history.length,
      });

      console.log(`✅ Synced ${history.length} history snapshots`);
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: 'rider_history',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Full sync: club + riders + events
   */
  async syncAll(clubId: number = TEAM_CLUB_ID): Promise<void> {
    console.log('🚀 Starting full sync...');
    
    await this.syncClub(clubId);
    await this.syncRiders(clubId);
    await this.syncEvents(clubId);
    
    console.log('✅ Full sync completed!');
  }
}

export const syncService = new SyncService();
