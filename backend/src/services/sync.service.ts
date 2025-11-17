/**
 * Sync Service - Synchroniseert data van ZwiftRacing API naar Supabase
 */

import { zwiftClient } from '../api/zwift-client.js';
import { supabase } from './supabase.service.js';
import { DbClub, DbRider, DbEvent, DbResult } from '../types/index.js';

const TEAM_CLUB_ID = 11818;

export class SyncService {
  /**
   * Sync signups voor een specifiek event
   * Haalt alle signups (per pen) op en slaat ze op in zwift_api_event_signups
   */
  async syncEventSignups(eventId: string): Promise<{ total: number, byPen: Record<string, number> }> {
    console.log(`🔄 Syncing signups for event ${eventId}...`);
    
    try {
      const pens = await zwiftClient.getEventSignups(eventId);
      const signups: any[] = [];
      const byPen: Record<string, number> = {};

      // Parse signups per pen (A/B/C/D/E)
      for (const pen of pens) {
        const penName = pen.name; // "A", "B", "C", "D", "E"
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

      // Bulk insert to database
      const inserted = await supabase.upsertEventSignups(signups);

      console.log(`✅ Synced ${inserted} signups across ${pens.length} pens for event ${eventId}`);
      console.log(`   By pen: ${JSON.stringify(byPen)}`);

      return { total: inserted, byPen };
    } catch (error) {
      console.error(`❌ Failed to sync signups for event ${eventId}:`, error);
      throw error;
    }
  }

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
        endpoint: 'GET /public/clubs/{id}',
        status: 'success',
        records_processed: 1,
      });

      console.log(`✅ Club synced: ${club.name}`);
      return club;
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: 'GET /public/clubs/{id}',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * 2. Sync club riders (SMART STRATEGY)
   * - Full team sync: GET /public/clubs/{id} (1/60min) - scheduled 6h
   * - Bulk update: POST /public/riders (1/15min) - voor >10 riders
   * - Individual: GET /public/riders/{id} (5/1min) - voor ≤10 riders
   */
  async syncRiders(clubId: number = TEAM_CLUB_ID): Promise<DbRider[]> {
    console.log(`🔄 Syncing riders for club ${clubId}...`);
    
    try {
      // GET club members - returns FULL rider objects with all data
      console.log(`[SyncRiders] Fetching club members from GET /public/clubs/${clubId}...`);
      const clubMembers = await zwiftClient.getClubMembers(clubId);
      
      // Validate response is array
      if (!Array.isArray(clubMembers)) {
        throw new Error(`Invalid response from getClubMembers: expected array, got ${typeof clubMembers}`);
      }
      
      console.log(`[SyncRiders] Found ${clubMembers.length} club members with full data`);
      
      if (clubMembers.length === 0) {
        console.warn(`[SyncRiders] No riders found for club ${clubId}`);
        return [];
      }
      
      // Map to database format with ALL available fields (matching DbRider interface)
      const riders = clubMembers.map(rider => ({
        // Core identifiers
        rider_id: rider.riderId,
        name: rider.name || `Rider ${rider.riderId}`,
        
        // Demographics
        gender: rider.gender,
        country: rider.country,
        age: rider.age,
        height: rider.height,
        weight: rider.weight,
        
        // Zwift Performance
        zp_category: rider.zpCategory,
        zp_ftp: rider.zpFTP,
        
        // Power Data (14 fields from power object)
        power_wkg5: rider.power?.wkg5,
        power_wkg15: rider.power?.wkg15,
        power_wkg30: rider.power?.wkg30,
        power_wkg60: rider.power?.wkg60,
        power_wkg120: rider.power?.wkg120,
        power_wkg300: rider.power?.wkg300,
        power_wkg1200: rider.power?.wkg1200,
        power_w5: rider.power?.w5,
        power_w15: rider.power?.w15,
        power_w30: rider.power?.w30,
        power_w60: rider.power?.w60,
        power_w120: rider.power?.w120,
        power_w300: rider.power?.w300,
        power_w1200: rider.power?.w1200,
        power_cp: rider.power?.CP,
        power_awc: rider.power?.AWC,
        power_compound_score: rider.power?.compoundScore,
        power_rating: rider.power?.powerRating,
        
        // Race Stats (12 fields from race object)
        race_last_rating: rider.race?.last?.rating,
        race_last_date: rider.race?.last?.date,
        race_last_category: rider.race?.last?.mixed?.category,
        race_last_number: rider.race?.last?.mixed?.number,
        race_current_rating: rider.race?.current?.rating,
        race_current_date: rider.race?.current?.date,
        race_max30_rating: rider.race?.max30?.rating,
        race_max30_expires: rider.race?.max30?.expires,
        race_max90_rating: rider.race?.max90?.rating,
        race_max90_expires: rider.race?.max90?.expires,
        race_finishes: rider.race?.finishes,
        race_dnfs: rider.race?.dnfs,
        race_wins: rider.race?.wins,
        race_podiums: rider.race?.podiums,
      }));

      const syncedRiders = await supabase.upsertRiders(riders);

      await supabase.createSyncLog({
        endpoint: `GET /public/clubs/${clubId}`,
        status: 'success',
        records_processed: syncedRiders.length,
      });

      console.log(`✅ Synced ${syncedRiders.length} riders (single GET call)`);
      return syncedRiders;
    } catch (error: any) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'string' ? error : JSON.stringify(error));
      
      const status = error.response?.status;
      const detailedMessage = status === 429 
        ? `Rate limit exceeded: Team members sync (club API). Wait before retrying.`
        : errorMessage;
      
      await supabase.createSyncLog({
        endpoint: `GET /public/clubs/${clubId}`,
        status: 'error',
        records_processed: 0,
        error_message: detailedMessage,
      });
      
      console.error(`❌ [SyncRiders] Error syncing riders:`, detailedMessage);
      throw error;
    }
  }

  /**
   * 2b. SMART sync specific riders (gebruikt efficiëntste methode)
   * - 1 rider: GET /public/riders/{id} (5/min)
   * - 2-10 riders: GET /public/riders/{id} sequentially (5/min, 12s delay)
   * - >10 riders: POST /public/riders bulk (1/15min)
   */
  async syncSpecificRiders(riderIds: number[]): Promise<DbRider[]> {
    const count = riderIds.length;
    console.log(`🔄 [SmartSync] Syncing ${count} specific rider(s)...`);
    
    try {
      let ridersData: any[] = [];
      
      if (count === 0) {
        return [];
      } else if (count === 1) {
        // Single rider: GET (most efficient for 1)
        console.log(`[SmartSync] Using GET /public/riders/${riderIds[0]} (5/min rate)`);
        const rider = await zwiftClient.getRider(riderIds[0]);
        ridersData = [rider];
        
        await supabase.createSyncLog({
          endpoint: `GET /public/riders/${riderIds[0]}`,
          status: 'success',
          records_processed: 1,
        });
      } else if (count <= 10) {
        // Small batch: Sequential GET (5/min = 12s between calls)
        console.log(`[SmartSync] Using sequential GET for ${count} riders (5/min rate, 12s delay)`);
        
        for (const riderId of riderIds) {
          try {
            const rider = await zwiftClient.getRider(riderId);
            ridersData.push(rider);
            
            // Rate limit: 5/min = wait 12s between calls
            if (riderIds.indexOf(riderId) < riderIds.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 12000));
            }
          } catch (err) {
            console.warn(`[SmartSync] Failed to fetch rider ${riderId}:`, err);
          }
        }
        
        await supabase.createSyncLog({
          endpoint: `GET /public/riders/{id} (sequential x${count})`,
          status: 'success',
          records_processed: ridersData.length,
        });
      } else {
        // Large batch: Bulk POST (most efficient for >10)
        console.log(`[SmartSync] Using POST /public/riders bulk for ${count} riders (1/15min rate)`);
        ridersData = await zwiftClient.getBulkRiders(riderIds);
        
        await supabase.createSyncLog({
          endpoint: `POST /public/riders (bulk x${count})`,
          status: 'success',
          records_processed: ridersData.length,
        });
      }
      
      // Map to database format with ALL available fields (matching DbRider interface)
      const riders = ridersData.map(rider => ({
        // Core identifiers
        rider_id: rider.riderId,
        name: rider.name || `Rider ${rider.riderId}`,
        
        // Demographics
        gender: rider.gender,
        country: rider.country,
        age: rider.age,
        height: rider.height,
        weight: rider.weight,
        
        // Zwift Performance
        zp_category: rider.zpCategory,
        zp_ftp: rider.zpFTP,
        
        // Power Data (14 fields from power object)
        power_wkg5: rider.power?.wkg5,
        power_wkg15: rider.power?.wkg15,
        power_wkg30: rider.power?.wkg30,
        power_wkg60: rider.power?.wkg60,
        power_wkg120: rider.power?.wkg120,
        power_wkg300: rider.power?.wkg300,
        power_wkg1200: rider.power?.wkg1200,
        power_w5: rider.power?.w5,
        power_w15: rider.power?.w15,
        power_w30: rider.power?.w30,
        power_w60: rider.power?.w60,
        power_w120: rider.power?.w120,
        power_w300: rider.power?.w300,
        power_w1200: rider.power?.w1200,
        power_cp: rider.power?.CP,
        power_awc: rider.power?.AWC,
        power_compound_score: rider.power?.compoundScore,
        power_rating: rider.power?.powerRating,
        
        // Race Stats (12 fields from race object)
        race_last_rating: rider.race?.last?.rating,
        race_last_date: rider.race?.last?.date,
        race_last_category: rider.race?.last?.mixed?.category,
        race_last_number: rider.race?.last?.mixed?.number,
        race_current_rating: rider.race?.current?.rating,
        race_current_date: rider.race?.current?.date,
        race_max30_rating: rider.race?.max30?.rating,
        race_max30_expires: rider.race?.max30?.expires,
        race_max90_rating: rider.race?.max90?.rating,
        race_max90_expires: rider.race?.max90?.expires,
        race_finishes: rider.race?.finishes,
        race_dnfs: rider.race?.dnfs,
        race_wins: rider.race?.wins,
        race_podiums: rider.race?.podiums,
      }));

      const syncedRiders = await supabase.upsertRiders(riders);
      
      console.log(`✅ [SmartSync] Synced ${syncedRiders.length}/${count} riders`);
      return syncedRiders;
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      const status = error.response?.status;
      const detailedMessage = status === 429 
        ? `Rate limit exceeded - ${errorMessage}`
        : errorMessage;
      
      await supabase.createSyncLog({
        endpoint: `Smart rider sync (${count} riders)`,
        status: 'error',
        records_processed: 0,
        error_message: detailedMessage,
      });
      
      console.error(`❌ [SmartSync] Error:`, detailedMessage);
      throw error;
    }
  }

  /**
   * 3. Sync club events
   * @deprecated Club events endpoint doesn't exist. Use bulkImportUpcomingEvents() instead.
   */
  async syncEvents(clubId: number = TEAM_CLUB_ID): Promise<DbEvent[]> {
    console.warn('⚠️  syncEvents() is deprecated - use bulkImportUpcomingEvents() instead');
    throw new Error('Club events endpoint not available. Use bulkImportUpcomingEvents() for Feature 1.');
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
        endpoint: `GET /public/events/${eventId}/results`,
        status: 'success',
        records_processed: syncedResults.length,
      });

      console.log(`✅ Synced ${syncedResults.length} results`);
      return syncedResults;
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: `GET /public/events/${eventId}/results`,
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
        endpoint: `GET /public/riders/${riderId}/history`,
        status: 'success',
        records_processed: history.length,
      });

      console.log(`✅ Synced ${history.length} history snapshots`);
    } catch (error) {
      await supabase.createSyncLog({
        endpoint: `GET /public/riders/${riderId}/history`,
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
        endpoint: 'GET /public/riders/{id}/upcoming-events (bulk scan)',
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
        endpoint: 'GET /public/riders/{id}/upcoming-events (bulk scan)',
        status: 'error',
        records_processed: 0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * FEATURE 1: Bulk import upcoming events (48h window)
   * US1: Upcoming events in de komende 48 uur ophalen
   * US2: Event highlighten waar één van onze rijders aan deelneemt
   * US3: Aantal van onze deelnemende riders toevoegen
   * 
   * 1:1 API Mapping: Stores RAW API response in zwift_api_events table
   * Source: /api/events/upcoming (filtered for 48h window)
   */
  async bulkImportUpcomingEvents(): Promise<{
    events_imported: number;
    signups_matched: number;
    team_events: number;
    errors: number;
  }> {
    console.log('🔄 [BulkImport] Starting 48h events import from /api/events/upcoming...');
    
    try {
      // 1. Haal alle events op voor komende 48 uur
      const events = await zwiftClient.getEvents48Hours();
      console.log(`✅ [BulkImport] Found ${events.length} events in next 48h`);
      
      // 2. Haal onze riders op uit database
      const ourRiders = await supabase.getRiders();
      const riderMap = new Map(ourRiders.map((r: DbRider) => [r.rider_id, r]));
      console.log(`ℹ️  [BulkImport] Loaded ${ourRiders.length} team riders`);
      
      let eventsImported = 0;
      let signupsMatched = 0;
      let teamEvents = 0;
      let errors = 0;

      // 3. Store RAW API data in sourcing table (1:1 mapping)
      const apiEventsBatch: any[] = [];
      
      for (const event of events) {
        try {
          // 1:1 API mapping - store exactly what API returns
          const apiEventData = {
            mongo_id: event._id || null,
            event_id: event.eventId,  // Keep as STRING
            time_unix: event.time,
            title: event.title,
            event_type: event.type,
            sub_type: event.subType || null,
            distance_meters: event.distance ? Math.floor(parseFloat(String(event.distance))) : null, // FORCE floor to integer
            // Elevation: probeer eerst van event, daarna van cached route
            elevation_meters: (() => {
              if (event.elevation) return Math.floor(parseFloat(String(event.elevation))); // FORCE floor to integer
              const routeId = (event as any).routeId || (event as any).route_id;
              if (routeId) {
                const cachedRoute = zwiftClient.getCachedRouteById(routeId);
                return cachedRoute?.elevation ? Math.floor(cachedRoute.elevation) : null;
              }
              return null;
            })(),
            route_id: (event as any).routeId || (event as any).route_id || null,  // Store routeId from API
            // Route info: gebruik cached route data als event.route NULL is
            route_name: (() => {
              if (event.route?.name) return event.route.name;
              const routeId = (event as any).routeId || (event as any).route_id;
              return routeId ? (zwiftClient.getCachedRouteById(routeId)?.name || null) : null;
            })(),
            route_world: (() => {
              if (event.route?.world) return event.route.world;
              const routeId = (event as any).routeId || (event as any).route_id;
              return routeId ? (zwiftClient.getCachedRouteById(routeId)?.world || null) : null;
            })(),
            organizer: event.organizer || null,
            category_enforcement: event.categoryEnforcement || null,
            pens: event.pens ? JSON.stringify(event.pens) : null,  // Store as JSONB
            // Route full: gebruik cached route als fallback
            route_full: (() => {
              if (event.route) return JSON.stringify(event.route);
              const routeId = (event as any).routeId || (event as any).route_id;
              if (routeId) {
                const cachedRoute = zwiftClient.getCachedRouteById(routeId);
                return cachedRoute ? JSON.stringify(cachedRoute) : null;
              }
              return null;
            })(),
            raw_response: JSON.stringify(event),  // Full API response backup
            last_synced: new Date().toISOString(),
          };

          apiEventsBatch.push(apiEventData);

          // 4. Check for participants (pens) en match met onze riders
          let hasTeamRiders = false;
          if (event.pens && Array.isArray(event.pens)) {
            for (const pen of event.pens) {
              // Check results array binnen pen voor signups
              if (pen.results?.signups && Array.isArray(pen.results.signups)) {
                for (const signup of pen.results.signups) {
                  const riderId = signup.riderId || signup.rider_id;
                  if (riderId && riderMap.has(riderId)) {
                    // Match found!
                    try {
                      await supabase.upsertEventSignup({
                        event_id: event.eventId,  // TEXT format!
                        rider_id: riderId,
                        pen_name: pen.name || undefined,
                        pen_range_label: pen.rangeLabel || undefined,
                        category: signup.category || undefined,
                        status: 'confirmed',
                        team_name: signup.team || undefined,
                      });
                      signupsMatched++;
                      hasTeamRiders = true;
                    } catch (signupError) {
                      // Skip if event_signups table doesn't exist yet
                      const isTableMissing = signupError instanceof Error && 
                        signupError.message.includes('relation "event_signups" does not exist');
                      
                      if (isTableMissing) {
                        console.warn(`  ⚠️  event_signups table not found - run migration 010 first`);
                        break; // Stop trying to insert signups
                      } else {
                        console.warn(`  ⚠️  Failed to create signup for rider ${riderId}:`, signupError);
                      }
                    }
                  }
                }
              }
            }
          }

          if (hasTeamRiders) {
            teamEvents++;
          }

        } catch (eventError) {
          console.error(`❌ [BulkImport] Error processing event ${event.eventId}:`, eventError);
          errors++;
        }
      }

      // 5. Bulk insert RAW API events into sourcing table
      if (apiEventsBatch.length > 0) {
        try {
          await supabase.upsertZwiftApiEvents(apiEventsBatch);
          eventsImported = apiEventsBatch.length;
        } catch (bulkError) {
          console.error(`❌ [BulkImport] Bulk upsert failed:`, bulkError);
          throw bulkError;
        }
      }

      // 6. SMART: Update rider data for participants (only if signups found)
      if (signupsMatched > 0) {
        const participantIds = Array.from(new Set(
          events.flatMap(e => 
            e.pens?.flatMap((p: any) => 
              p.results?.signups?.map((s: any) => s.riderId || s.rider_id)
                .filter((id: number) => riderMap.has(id))
            ) || []
          ).filter(Boolean)
        ));
        
        if (participantIds.length > 0) {
          console.log(`🔄 [SmartSync] Updating ${participantIds.length} participant riders...`);
          try {
            await this.syncSpecificRiders(participantIds);
            console.log(`✅ [SmartSync] Participant riders updated`);
          } catch (syncError) {
            console.warn(`⚠️  [SmartSync] Failed to update participants:`, syncError);
          }
        }
      }

      // Log success
      await supabase.createSyncLog({
        endpoint: 'GET /api/events/upcoming (bulk import)',
        status: 'success',
        records_processed: eventsImported,
      });

      console.log(`✅ [BulkImport] Complete: ${eventsImported} events, ${signupsMatched} signups, ${teamEvents} team events`);

      return {
        events_imported: eventsImported,
        signups_matched: signupsMatched,
        team_events: teamEvents,
        errors,
      };

    } catch (error: any) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'string' ? error : JSON.stringify(error));
      
      const errorStack = error instanceof Error ? error.stack : undefined;
      const status = error.response?.status;
      
      const detailedMessage = status === 429 
        ? `Rate limit exceeded (429) - ${errorMessage}`
        : errorMessage;
      
      console.error('❌ [BulkImport] FATAL ERROR:', detailedMessage);
      if (errorStack) {
        console.error('Stack trace:', errorStack);
      }
      
      await supabase.createSyncLog({
        endpoint: 'GET /api/events/upcoming (bulk import)',
        status: 'error',
        records_processed: 0,
        error_message: detailedMessage,
      });
      
      throw error;
    }
  }
}

export const syncService = new SyncService();

