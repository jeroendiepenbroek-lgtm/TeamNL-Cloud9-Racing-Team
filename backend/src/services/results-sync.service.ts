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

          if (!riderProfile.recentResults || riderProfile.recentResults.length === 0) {
            console.info(`   ℹ️  No history found`);
            continue;
          }

          // Use recent results from API (already filtered)
          const recentResults = riderProfile.recentResults;

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

              // Sla result op in zwift_api_race_results tabel (minimal fields)
              await this.supabase.saveRaceResult({
                event_id: parseInt(result.event.id),
                rider_id: result.riderId,
                position: result.position,
                time_seconds: result.time,
                power_avg: result.power?.avg,
                power_max: result.power?.max,
                heartrate_avg: result.heartRate?.avg,
                heartrate_max: result.heartRate?.max,
                weight: result.weight,
                height: result.height,
                category: result.category,
                rating_before: result.ratingBefore,
                rating_after: result.rating,
                rating_change: result.ratingDelta,
                event_date: new Date(result.event.time * 1000).toISOString(),
                finish_status: result.dnf ? 'DNF' : 'FINISHED'
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
}
