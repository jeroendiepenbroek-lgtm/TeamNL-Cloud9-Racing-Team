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

  /**
   * Feature 1: Sync upcoming events for all riders in database
   * Scans each rider for their upcoming events and stores signups
   */
  async syncRiderUpcomingEvents(hours: number = 48): Promise<{
    riders_scanned: number;
    events_found: number;
    signups_created: number;
    errors: number;
  }> {
    console.log(`🔄 Syncing upcoming events for all riders (${hours}h lookforward)...`);
    
    try {
      // Get all active riders
      const riders = await supabase.getRiders();
      console.log(`📋 Found ${riders.length} riders to scan`);
      
      let eventsFound = 0;
      let signupsCreated = 0;
      let errors = 0;
      
      // Process in batches to avoid rate limits
      const BATCH_SIZE = 5;
      for (let i = 0; i < riders.length; i += BATCH_SIZE) {
        const batch = riders.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (rider) => {
          try {
            console.log(`  Scanning rider ${rider.rider_id} (${rider.name})...`);
            
            // Get rider's upcoming events from ZwiftRacing API
            const riderEvents = await zwiftClient.getRiderUpcomingEvents(rider.rider_id);
            
            if (riderEvents && riderEvents.length > 0) {
              eventsFound += riderEvents.length;
              
              // Store events
              const events = riderEvents.map(event => ({
                event_id: event.id,
                name: event.name,
                event_date: event.eventDate,
                event_type: event.type || 'race',
                description: event.description,
                event_url: event.url,
                route: event.route,
                distance_meters: event.distanceInMeters,
                organizer: event.organizer,
                zwift_event_id: event.id,
                last_synced: new Date().toISOString(),
              }));
              
              await supabase.upsertEvents(events);
              
              // Store signups
              for (const event of riderEvents) {
                await supabase.upsertEventSignup({
                  event_id: event.id,
                  rider_id: rider.rider_id,
                  category: rider.zp_category || undefined,
                  status: 'confirmed',
                });
                signupsCreated++;
              }
              
              console.log(`    ✓ Found ${riderEvents.length} events for ${rider.name}`);
            }
          } catch (error) {
            errors++;
            console.warn(`    ✗ Error scanning rider ${rider.rider_id}:`, error);
          }
        }));
        
        // Rate limiting: wait between batches
        if (i + BATCH_SIZE < riders.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
        }
      }
      
      await supabase.createSyncLog({
        endpoint: 'rider_upcoming_events',
        status: errors > 0 ? 'partial' : 'success',
        records_processed: signupsCreated,
        error_message: errors > 0 ? `${errors} riders failed to sync` : undefined,
      });
      
      console.log(`✅ Sync complete: ${eventsFound} events found, ${signupsCreated} signups created, ${errors} errors`);
      
      return {
        riders_scanned: riders.length,
        events_found: eventsFound,
        signups_created: signupsCreated,
        errors,
      };
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: 'rider_upcoming_events',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const syncService = new SyncService();
