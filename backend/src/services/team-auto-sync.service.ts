/**
 * US5: Auto-Sync Scheduler - Hourly Team Sync
 * Runs every hour to keep team member data up-to-date
 */

import cron from 'node-cron';
import { supabase } from '../services/supabase.service.js';
import { zwiftClient } from '../api/zwift-client.js';

class TeamAutoSyncScheduler {
  private job: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private enabled: boolean = true;

  /**
   * Start hourly auto-sync (US5)
   */
  start() {
    if (this.job) {
      console.log('⚠️  Auto-sync scheduler already running');
      return;
    }

    // Run every hour at minute 5
    this.job = cron.schedule('5 * * * *', async () => {
      if (!this.enabled) {
        console.log('⏸️  Auto-sync disabled, skipping');
        return;
      }

      if (this.isRunning) {
        console.log('⚠️  Previous auto-sync still running, skipping');
        return;
      }

      await this.runAutoSync();
    });

    console.log('✅ US5: Auto-sync scheduler started (hourly at :05)');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 Auto-sync scheduler stopped');
    }
  }

  /**
   * Enable/disable auto-sync
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    console.log(`${enabled ? '▶️' : '⏸️'} Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.job !== null,
      enabled: this.enabled,
      currently_syncing: this.isRunning
    };
  }

  /**
   * Run the auto-sync process
   */
  private async runAutoSync() {
    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('\n🔄 Starting auto-sync...');

      // Get all team members
      const { data: members, error } = await supabase.client
        .from('my_team_members')
        .select('rider_id');

      if (error) {
        throw new Error(`Failed to fetch team members: ${error.message}`);
      }

      if (!members || members.length === 0) {
        console.log('ℹ️  No team members to sync');
        return;
      }

      const riderIds = members.map(m => m.rider_id);
      console.log(`📊 Syncing ${riderIds.length} team members...`);

      // Log sync start
      const { data: logEntry } = await supabase.client
        .from('sync_logs')
        .insert({
          sync_type: 'auto',
          status: 'started',
          rider_count: riderIds.length,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      const logId = logEntry?.id;

      // Sync all riders
      const results = await this.syncBulkRiders(riderIds);

      // Update log
      if (logId) {
        await supabase.client
          .from('sync_logs')
          .update({
            status: results.failed === 0 ? 'completed' : 'failed',
            completed_at: new Date().toISOString(),
            error_message: results.failed > 0 
              ? `${results.failed} riders failed: ${results.errors.slice(0, 3).map(e => e.rider_id).join(', ')}`
              : null
          })
          .eq('id', logId);
      }

      const duration = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n✅ Auto-sync completed in ${duration}s`);
      console.log(`   Success: ${results.success}/${results.total}`);
      if (results.failed > 0) {
        console.log(`   Failed: ${results.failed}`);
      }

    } catch (error: any) {
      console.error('❌ Auto-sync failed:', error.message);
      
      // Log failure
      try {
        await supabase.client
          .from('sync_logs')
          .insert({
            sync_type: 'auto',
            status: 'failed',
            rider_count: 0,
            error_message: error.message,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync multiple riders with rate limiting
   */
  private async syncBulkRiders(riderIds: number[]) {
    const results = {
      total: riderIds.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ rider_id: number; error: string }>
    };

    for (const riderId of riderIds) {
      try {
        await this.syncSingleRider(riderId);
        results.success++;
        
        if (results.success % 10 === 0) {
          console.log(`   Progress: ${results.success}/${results.total} riders synced`);
        }

      } catch (error: any) {
        results.failed++;
        results.errors.push({ rider_id: riderId, error: error.message });
        console.error(`   ❌ Rider ${riderId} failed: ${error.message}`);
      }

      // Rate limiting: 12 seconds between riders (5/min safe)
      if (riderId !== riderIds[riderIds.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }

    return results;
  }

  /**
   * Sync single rider
   */
  private async syncSingleRider(riderId: number) {
    // Get current rider data
    const currentData = await zwiftClient.getRider(riderId);

    // Map to database format
    const unified = {
      rider_id: currentData.riderId,
      name: currentData.name,
      
      // Physical
      weight_kg: currentData.weight,
      height_cm: currentData.height,
      ftp: currentData.zpFTP,
      gender: currentData.gender,
      country_code: currentData.country,
      
      // Categories
      zp_category: currentData.zpCategory,
      age_category: currentData.age,
      
      // Power curve
      power_5s_w: Math.round(currentData.power.w5),
      power_5s_wkg: Number(currentData.power.wkg5?.toFixed(2)),
      power_15s_w: Math.round(currentData.power.w15),
      power_15s_wkg: Number(currentData.power.wkg15?.toFixed(2)),
      power_30s_w: Math.round(currentData.power.w30),
      power_30s_wkg: Number(currentData.power.wkg30?.toFixed(2)),
      power_1m_w: Math.round(currentData.power.w60),
      power_1m_wkg: Number(currentData.power.wkg60?.toFixed(2)),
      power_2m_w: Math.round(currentData.power.w120),
      power_2m_wkg: Number(currentData.power.wkg120?.toFixed(2)),
      power_5m_w: Math.round(currentData.power.w300),
      power_5m_wkg: Number(currentData.power.wkg300?.toFixed(2)),
      power_20m_w: Math.round(currentData.power.w1200),
      power_20m_wkg: Number(currentData.power.wkg1200?.toFixed(2)),
      
      critical_power: Number(currentData.power.CP?.toFixed(2)),
      anaerobic_work_capacity: Number(currentData.power.AWC?.toFixed(2)),
      compound_score: Number(currentData.power.compoundScore?.toFixed(2)),
      
      // vELO & race stats
      velo_rating: Number(currentData.race.current.rating?.toFixed(2)),
      velo_max_30d: Number(currentData.race.max30?.rating?.toFixed(2)),
      velo_max_90d: Number(currentData.race.max90?.rating?.toFixed(2)),
      velo_rank: currentData.race.current.mixed?.number?.toString(),
      race_wins: currentData.race.wins,
      race_podiums: currentData.race.podiums,
      race_dnfs: currentData.race.dnfs,
      
      // Phenotype
      phenotype_sprinter: currentData.phenotype.scores?.sprinter,
      phenotype_pursuiter: currentData.phenotype.scores?.pursuiter,
      phenotype_puncheur: currentData.phenotype.scores?.puncheur,
      
      // Club
      club_id: currentData.club?.id,
      club_name: currentData.club?.name,
      
      // Handicaps
      handicap_flat: currentData.handicaps?.profile?.flat,
      handicap_rolling: currentData.handicaps?.profile?.rolling,
      handicap_hilly: currentData.handicaps?.profile?.hilly,
      handicap_mountainous: currentData.handicaps?.profile?.mountainous,
      
      // Sync tracking
      is_team_member: true,
      last_synced_zwift_racing: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Upsert to database
    const { error } = await supabase.client
      .from('riders_unified')
      .upsert(unified, { onConflict: 'rider_id' });

    if (error) {
      throw new Error(`Database upsert failed: ${error.message}`);
    }
  }
}

// Export singleton
export const teamAutoSync = new TeamAutoSyncScheduler();
