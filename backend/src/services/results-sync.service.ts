/**
 * Results Sync Service
 * Synchroniseert race results via events (past events van TeamNL riders)
 * Strategy: Sync recent events + hun results in één flow
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import { SupabaseService } from './supabase.service.js';

export class ResultsSyncService {
  private zwiftApi: ZwiftApiClient;
  private supabase: SupabaseService;

  constructor() {
    this.zwiftApi = new ZwiftApiClient();
    this.supabase = new SupabaseService();
  }

  /**
   * Sync results voor alle TeamNL riders via recent events
   * US1: Sync all riders to Results Dashboard
   * OPTIMIZED: Alleen events waar team riders geraced hebben
   */
  async syncTeamResultsFromHistory(daysBack: number = 30): Promise<{
    riders_scanned: number;
    results_found: number;
    results_saved: number;
    events_discovered: number;
    totalResultsSynced?: number; // For backward compatibility
  }> {
    console.info(`🏁 [Results Sync] Starting (${daysBack} days back)`);

    try {
      // 1. Haal alle actieve TeamNL riders op
      const riderIds = await this.supabase.getAllTeamRiderIds();
      console.info(`📋 [Results Sync] Found ${riderIds.length} riders (from my_team_members)`);
      
      if (riderIds.length === 0) {
        console.warn('⚠️  [Results Sync] No riders in my_team_members. Use POST /api/riders/my-team');
        return {
          riders_scanned: 0,
          results_found: 0,
          results_saved: 0,
          events_discovered: 0,
          totalResultsSynced: 0
        };
      }

      // 2. OPTIMIZATION: Filter events waar team riders signup hebben
      const eventsWithTeamSignups = await this.supabase.getEventsWithTeamSignups(daysBack);
      console.info(`📅 [Results Sync] Found ${eventsWithTeamSignups.length} events met team signups (laatste ${daysBack} dagen)`);
      
      if (eventsWithTeamSignups.length === 0) {
        console.info('ℹ️  [Results Sync] Geen events met team signups gevonden');
        return {
          riders_scanned: riderIds.length,
          results_found: 0,
          results_saved: 0,
          events_discovered: 0,
          totalResultsSynced: 0
        };
      }

      // 3. Sort events: recent first (prioriteit voor nieuwe races)
      const sortedEvents = eventsWithTeamSignups.sort((a, b) => {
        const timeA = a.event_start ? new Date(a.event_start).getTime() : 0;
        const timeB = b.event_start ? new Date(b.event_start).getTime() : 0;
        return timeB - timeA; // Nieuwste eerst
      });

      console.info(`🔄 [Results Sync] Processing ${sortedEvents.length} events (batch mode)...`);

      // 4. OPTIMIZATION: Batch processing met parallelle calls
      const BATCH_SIZE = 3; // 3 parallel calls = safe (rate limit: 1/min)
      const DELAY_MS = 20000; // 20s tussen calls = 3 calls/min
      
      const riderIdSet = new Set(riderIds);
      let totalResults = 0;
      let totalSaved = 0;
      const processedEvents = new Set<string>();

      // Process events in batches
      for (let i = 0; i < sortedEvents.length; i += BATCH_SIZE) {
        const batch = sortedEvents.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(sortedEvents.length / BATCH_SIZE);
        
        console.info(`   📦 Batch ${batchNum}/${totalBatches}: ${batch.length} events`);
        
        // Parallel fetch met staggered delay
        const batchPromises = batch.map((event, idx) => 
          new Promise(resolve => setTimeout(resolve, idx * DELAY_MS))
            .then(async () => {
              try {
                const results: any[] = await this.zwiftApi.getEventResults(event.event_id);
                const teamResults = results.filter((r: any) => riderIdSet.has(r.riderId));
                
                if (teamResults.length > 0) {
                  console.info(`      ✅ Event ${event.event_id} (${event.event_name}): ${teamResults.length} team results`);
                }
                
                return { 
                  eventId: event.event_id, 
                  eventName: event.event_name,
                  eventDate: event.event_start,
                  results: teamResults 
                };
              } catch (error) {
                console.error(`      ⚠️  Event ${event.event_id} failed:`, error);
                return { eventId: event.event_id, eventName: '', eventDate: null, results: [] };
              }
            })
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        // Save all results from this batch
        for (const { eventId, eventName, eventDate, results } of batchResults) {
          if (results.length === 0) continue;
          
          processedEvents.add(eventId.toString());
          totalResults += results.length;
          
          for (const result of results) {
            try {
              await this.supabase.saveRaceResult({
                event_id: eventId,
                rider_id: result.riderId,
                rank: result.position || result.rank,
                time_seconds: result.time,
                avg_wkg: result.power?.wkg?.avg,
                power_avg: result.power?.avg,
                power_max: result.power?.max,
                heartrate_avg: result.heartRate?.avg,
                heartrate_max: result.heartRate?.max,
                weight: result.weight,
                height: result.height,
                category: result.category,
                effort_score: result.effortScore,
                race_points: result.racePoints,
                velo_rating: result.rating || result.ratingAfter,
                velo_change: result.ratingDelta,
                event_date: eventDate || new Date().toISOString(),
                event_name: eventName || `Event ${eventId}`,
                finish_status: result.dnf ? 'DNF' : 'FINISHED'
              });
              
              totalSaved++;
            } catch (error) {
              console.error(`      ⚠️  Failed to save result for rider ${result.riderId}:`, error);
            }
          }
        }
      }

      // 5. Return summary
      console.info(`✅ [Results Sync] Complete: ${totalSaved}/${totalResults} results from ${processedEvents.size} events`);

      return {
        riders_scanned: riderIds.length,
        results_found: totalResults,
        results_saved: totalSaved,
        events_discovered: processedEvents.size,
        totalResultsSynced: totalSaved // For backward compatibility
      };

    } catch (error) {
      console.error('❌ [Results Sync] Failed:', error);
      throw error;
    }
  }

  /**
   * OPTIMIZED: Batch results sync met parallel processing
   * Rate limit: 1/min → 5 parallel calls met 12s delay = safe
   */
  async syncResultsBatch(eventIds: number[]): Promise<{
    events_processed: number;
    results_found: number;
    results_saved: number;
  }> {
    console.info(`🏁 [Results Sync Batch] Processing ${eventIds.length} events...`);
    
    const BATCH_SIZE = 5; // Max 5 parallel (rate limit: 1/min = safe met 12s delay)
    let totalResults = 0;
    let totalSaved = 0;
    
    // Get team rider IDs once
    const riderIds = await this.supabase.getAllTeamRiderIds();
    const riderIdSet = new Set(riderIds);
    
    // Process in batches
    for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
      const batch = eventIds.slice(i, i + BATCH_SIZE);
      console.info(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(eventIds.length / BATCH_SIZE)}: ${batch.length} events`);
      
      // Parallel fetch met staggered delay (12s tussen calls)
      const batchPromises = batch.map((eventId, idx) => 
        new Promise(resolve => setTimeout(resolve, idx * 12000)) // 12s = 5 calls/min
          .then(async () => {
            try {
              const results: any[] = await this.zwiftApi.getEventResults(eventId);
              const teamResults = results.filter((r: any) => riderIdSet.has(r.riderId));
              return { eventId, results: teamResults };
            } catch (error) {
              console.error(`   ⚠️  Event ${eventId} failed:`, error);
              return { eventId, results: [] };
            }
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Save all results from this batch
      for (const { eventId, results } of batchResults) {
        totalResults += results.length;
        
        for (const result of results) {
          try {
            await this.supabase.saveRaceResult({
              event_id: eventId,
              rider_id: result.riderId,
              rank: result.position || result.rank,
              time_seconds: result.time,
              avg_wkg: result.power?.wkg?.avg,
              power_avg: result.power?.avg,
              power_max: result.power?.max,
              heartrate_avg: result.heartRate?.avg,
              heartrate_max: result.heartRate?.max,
              weight: result.weight,
              height: result.height,
              category: result.category,
              effort_score: result.effortScore,
              race_points: result.racePoints,
              velo_rating: result.rating || result.ratingAfter,
              velo_change: result.ratingDelta,
              event_date: new Date().toISOString(),
              event_name: `Event ${eventId}`,
              finish_status: result.dnf ? 'DNF' : 'FINISHED'
            });
            totalSaved++;
          } catch (error) {
            console.error(`   ⚠️  Failed to save result:`, error);
          }
        }
      }
    }
    
    console.info(`✅ [Results Sync Batch] Complete: ${totalSaved} results from ${eventIds.length} events`);
    
    return {
      events_processed: eventIds.length,
      results_found: totalResults,
      results_saved: totalSaved
    };
  }

  /**
   * US1: Sync single rider results
   */
  async syncSingleRiderResults(riderId: number, daysBack: number = 30): Promise<number> {
    console.info(`🏁 [Results Sync] Syncing rider ${riderId} (${daysBack} days back)`);
    
    try {
      // Haal recent events op
      const recentEvents = await this.supabase.getRecentEvents(daysBack);
      console.info(`   Found ${recentEvents.length} events`);
      
      let resultCount = 0;
      
      for (const event of recentEvents) {
        try {
          const results: any[] = await this.zwiftApi.getEventResults(event.event_id);
          const riderResult = results.find((r: any) => r.riderId === riderId);
          
          if (riderResult) {
            await this.supabase.saveRaceResult({
              event_id: event.event_id,
              rider_id: riderId,
              rank: riderResult.position || riderResult.rank,
              time_seconds: riderResult.time,
              avg_wkg: riderResult.power?.wkg?.avg,
              power_avg: riderResult.power?.avg,
              power_max: riderResult.power?.max,
              heartrate_avg: riderResult.heartRate?.avg,
              heartrate_max: riderResult.heartRate?.max,
              weight: riderResult.weight,
              height: riderResult.height,
              category: riderResult.category,
              effort_score: riderResult.effortScore,
              race_points: riderResult.racePoints,
              velo_rating: riderResult.rating || riderResult.ratingAfter,
              velo_change: riderResult.ratingDelta,
              event_date: event.time_unix ? new Date(event.time_unix * 1000).toISOString() : new Date().toISOString(),
              event_name: event.title,
              finish_status: riderResult.dnf ? 'DNF' : 'FINISHED'
            });
            resultCount++;
          }
        } catch (error) {
          console.error(`   ⚠️  Event ${event.event_id} failed:`, error);
        }
      }
      
      console.info(`✅ [Results Sync] Rider ${riderId}: ${resultCount} results saved`);
      return resultCount;
      
    } catch (error) {
      console.error(`❌ [Results Sync] Rider ${riderId} failed:`, error);
      throw error;
    }
  }
}

// Export singleton instance for sync-control
export const resultsSyncService = new ResultsSyncService();
