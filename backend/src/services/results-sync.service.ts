/**
 * Results Sync Service
 * Synchroniseert race results door rider history op te halen
 * Veel efficiënter dan per-event results ophalen!
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
   * Sync results door alle TeamNL riders' history op te halen
   * Dit is VEEL efficiënter dan per-event results ophalen!
   */
  async syncTeamResultsFromHistory(daysBack: number = 30): Promise<{
    riders_scanned: number;
    results_found: number;
    results_saved: number;
    events_discovered: number;
  }> {
    console.info(`🏁 Starting results sync from rider history (${daysBack} days back)`);

    try {
      // 1. Haal alle actieve TeamNL riders op
      const riders = await this.supabase.getRiders();
      console.info(`📋 Found ${riders.length} riders to scan`);

      let totalResults = 0;
      let totalSaved = 0;
      const discoveredEvents = new Set<string>();

      // 2. Voor elke rider: haal history op en extract results
      for (const rider of riders) {
        try {
          console.info(`🔍 Scanning rider ${rider.rider_id} - ${rider.name}`);

          // Haal rider profile met history op
          const riderProfile = await this.zwiftApi.getRider(rider.rider_id);
          const history = (riderProfile as any).history || [];

          if (!history || history.length === 0) {
            console.info(`   ℹ️  No recent results found`);
            continue;
          }

          // Use history from API
          const recentResults = history;

          if (recentResults.length === 0) {
            console.info(`   ℹ️  No recent results (last ${daysBack} days)`);
            continue;
          }

          console.info(`   ✅ Found ${recentResults.length} recent results`);
          totalResults += recentResults.length;

          // 3. Sla results op in database
          for (const result of recentResults) {
            try {
              // Event ID toevoegen aan discovered set
              if (result.event?.id) {
                discoveredEvents.add(result.event.id);
              }

              // Map API response naar database schema
              await this.supabase.saveRaceResult({
                event_id: String(result.event?.id || result.eventId),
                rider_id: result.riderId,
                event_name: result.event?.title || null,
                event_date: result.event?.time ? new Date(result.event.time * 1000).toISOString() : null,
                rider_name: result.name || null,
                rank: result.position || null,
                time_seconds: result.time ? Math.round(result.time) : null,
                avg_wkg: result.wkgAvg || null,
                pen: result.penTotal ? String(result.penTotal) : null,
                total_riders: result.totalRiders || null,
                delta_winner_seconds: result.gap ? Math.round(result.gap) : null,
                velo_rating: result.rating ? Math.round(result.rating) : null,
                velo_previous: result.ratingBefore ? Math.round(result.ratingBefore) : null,
                velo_change: result.ratingDelta ? Math.round(result.ratingDelta) : null,
                power_5s: result.wkg5 || null,
                power_15s: result.wkg15 || null,
                power_30s: result.wkg30 || null,
                power_1m: result.wkg60 || null,
                power_2m: result.wkg120 || null,
                power_5m: result.wkg300 || null,
                power_20m: result.wkg1200 || null,
                effort_score: result.load ? Math.round(result.load) : null,
                race_points: result.rankPoints || null
              });
              
              totalSaved++;
            } catch (error) {
              console.error(`   ⚠️  Error saving result for rider ${rider.rider_id}:`, error);
              // Continue met volgende result
            }
          }

        } catch (error) {
          console.error(`   ⚠️  Error processing rider ${rider.rider_id}:`, error);
          // Continue met volgende rider
        }
      }

      // 4. Return summary
      console.info(`✅ Sync complete: ${totalSaved}/${totalResults} results saved from ${riders.length} riders`);
      console.info(`📅 Discovered ${discoveredEvents.size} unique events`);

      return {
        riders_scanned: riders.length,
        results_found: totalResults,
        results_saved: totalSaved,
        events_discovered: discoveredEvents.size
      };

    } catch (error) {
      console.error('❌ Results sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync results voor SINGLE rider (sneller dan team sync)
   */
  async syncSingleRiderResults(riderId: number, daysBack: number = 30): Promise<{
    totalSaved: number;
    errors: Array<{ event_id: string; error: string }>;
  }> {
    console.info(`🏁 Starting single rider results sync for ${riderId} (${daysBack} days back)`);

    const errors: Array<{ event_id: string; error: string }> = [];

    try {
      // Haal rider profile met history op
      const riderProfile = await this.zwiftApi.getRider(riderId);
      const history = (riderProfile as any).history || [];

      if (!history || history.length === 0) {
        console.info(`   ℹ️  No history found for rider ${riderId}`);
        return { totalSaved: 0, errors };
      }

      console.info(`   ✅ Found ${history.length} history items for rider ${riderId}`);

      let totalSaved = 0;

      // Sla results op in database
      for (const result of history) {
        try {
          const raceResult = {
            event_id: String(result.event?.id || result.eventId),
            rider_id: result.riderId,
            event_name: result.event?.title || null,
            event_date: result.event?.time ? new Date(result.event.time * 1000).toISOString() : null,
            rider_name: result.name || null,
            rank: result.position || null,
            time_seconds: result.time ? Math.round(result.time) : null,
            avg_wkg: result.wkgAvg || null,
            pen: result.penTotal ? String(result.penTotal) : null,
            total_riders: result.totalRiders || null,
            delta_winner_seconds: result.gap ? Math.round(result.gap) : null,
            velo_rating: result.rating ? Math.round(result.rating) : null,
            velo_previous: result.ratingBefore ? Math.round(result.ratingBefore) : null,
            velo_change: result.ratingDelta ? Math.round(result.ratingDelta) : null,
            power_5s: result.wkg5 || null,
            power_15s: result.wkg15 || null,
            power_30s: result.wkg30 || null,
            power_1m: result.wkg60 || null,
            power_2m: result.wkg120 || null,
            power_5m: result.wkg300 || null,
            power_20m: result.wkg1200 || null,
            effort_score: result.load ? Math.round(result.load) : null,
            race_points: result.rankPoints || null
          };
          
          await this.supabase.saveRaceResult(raceResult);
          totalSaved++;
        } catch (error: any) {
          const errorMsg = error.message || JSON.stringify(error);
          console.error(`   ⚠️  Error saving result for event ${result.event?.id}:`, errorMsg);
          errors.push({
            event_id: String(result.event?.id || 'unknown'),
            error: errorMsg
          });
          // Continue met volgende result
        }
      }

      console.info(`✅ Saved ${totalSaved}/${history.length} results for rider ${riderId}`);
      return { totalSaved, errors };

    } catch (error) {
      console.error(`❌ Single rider sync failed for ${riderId}:`, error);
      throw error;
    }
  }
}
