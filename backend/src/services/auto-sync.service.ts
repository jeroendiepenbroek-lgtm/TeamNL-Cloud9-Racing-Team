/**
 * US7: Automatische Sync Service
 * US8: Configureerbare intervals
 * 
 * Synct periodiek alle team members van ZwiftRacing API
 */

import { syncConfig } from '../config/sync.config.js';
import { zwiftClient } from '../api/zwift-client.js';
import { supabase } from './supabase.service.js';

export class AutoSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;
  
  /**
   * Sync alle team members met ZwiftRacing API (bulk POST)
   */
  async syncTeamMembers(): Promise<{
    success: number;
    errors: number;
    skipped: number;
    errorMessages?: string[];
  }> {
    if (this.isRunning) {
      console.log('[AutoSync] ⚠️ Sync already running, skipping...');
      return { success: 0, errors: 0, skipped: 0 };
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('[AutoSync] 🔄 Starting team sync...');
      
      // Haal alle team member IDs op
      const teamMembers = await supabase.getMyTeamMembers();
      const riderIds = teamMembers.map(m => m.rider_id);
      
      if (riderIds.length === 0) {
        console.log('[AutoSync] ℹ️ No team members to sync');
        return { success: 0, errors: 0, skipped: 0 };
      }
      
      console.log(`[AutoSync] 📊 Syncing ${riderIds.length} riders...`);
      
  let ridersData: any[] = [];
  const errorMessages: string[] = [];
      
      // Strategy: Use GET for small teams (< 10 riders, 5/min rate)
      //           Use POST bulk for larger teams (1/15min rate, max 1000)
      if (riderIds.length <= 10) {
        console.log('[AutoSync] 📡 Using individual GET calls (small team, 5/min rate)');
        
        for (const riderId of riderIds) {
          try {
            const rider = await zwiftClient.getRider(riderId);
            ridersData.push(rider);
            
            // Rate limit: 5/min = 12 sec between calls
            if (riderIds.length > 1) {
              await new Promise(resolve => setTimeout(resolve, 12000));
            }
          } catch (error: any) {
            console.error(`[AutoSync] ⚠️ Failed to sync rider ${riderId}:`, error.message);
            errorMessages.push(`rider ${riderId}: ${error.message}`);
          }
        }
      } else {
        console.log('[AutoSync] 📡 Using bulk POST API (large team, 1/15min rate)');
        
        try {
          // Bulk fetch van ZwiftRacing API (max 1000, rate: 1/15min)
          ridersData = await zwiftClient.getBulkRiders(riderIds);
        } catch (error: any) {
          console.error('[AutoSync] ❌ Bulk POST failed, falling back to GET:', error.message);
          
          // Fallback: individual GET calls
          for (const riderId of riderIds) {
            try {
              const rider = await zwiftClient.getRider(riderId);
              ridersData.push(rider);
              await new Promise(resolve => setTimeout(resolve, 12000)); // 5/min rate
            } catch (err: any) {
              console.error(`[AutoSync] ⚠️ Failed to sync rider ${riderId}:`, err.message);
              errorMessages.push(`rider ${riderId}: ${err.message}`);
            }
          }
        }
      }
      
      if (ridersData.length === 0) {
        console.log('[AutoSync] ⚠️ No rider data received from API');
        return { success: 0, errors: 1, skipped: 0, errorMessages };
      }
      
      console.log(`[AutoSync] ✅ Received ${ridersData.length} riders from API`);
      
      // Upsert naar database - PURE 1:1 API MAPPING (61 velden)
      const upsertData = ridersData.map(r => ({
        // Core Identity
        rider_id: r.riderId,
        name: r.name,
        gender: r.gender,
        country: r.country,
        age: r.age,
        height: r.height,
        weight: r.weight,
        
        // Zwift Performance
        zp_category: r.zpCategory,
        zp_ftp: r.zpFTP,
        
        // Power Data (14 velden)
        power_wkg5: r.power?.wkg5,
        power_wkg15: r.power?.wkg15,
        power_wkg30: r.power?.wkg30,
        power_wkg60: r.power?.wkg60,
        power_wkg120: r.power?.wkg120,
        power_wkg300: r.power?.wkg300,
        power_wkg1200: r.power?.wkg1200,
        power_w5: r.power?.w5,
        power_w15: r.power?.w15,
        power_w30: r.power?.w30,
        power_w60: r.power?.w60,
        power_w120: r.power?.w120,
        power_w300: r.power?.w300,
        power_w1200: r.power?.w1200,
        power_cp: r.power?.CP,
        power_awc: r.power?.AWC,
        power_compound_score: r.power?.compoundScore,
        power_rating: r.power?.powerRating,
        
        // Race Stats (12 velden)
        race_last_rating: r.race?.last?.rating,
        race_last_date: r.race?.last?.date,
        race_last_category: r.race?.last?.mixed?.category,
        race_last_number: r.race?.last?.mixed?.number,
        race_current_rating: r.race?.current?.rating,
        race_current_date: r.race?.current?.date,
        race_max30_rating: r.race?.max30?.rating,
        race_max30_expires: r.race?.max30?.expires,
        race_max90_rating: r.race?.max90?.rating,
        race_max90_expires: r.race?.max90?.expires,
        race_finishes: r.race?.finishes,
        race_dnfs: r.race?.dnfs,
        race_wins: r.race?.wins,
        race_podiums: r.race?.podiums,
        
        // Handicaps (4 velden)
        handicap_flat: r.handicaps?.profile?.flat,
        handicap_rolling: r.handicaps?.profile?.rolling,
        handicap_hilly: r.handicaps?.profile?.hilly,
        handicap_mountainous: r.handicaps?.profile?.mountainous,
        
        // Phenotype (7 velden)
        phenotype_sprinter: r.phenotype?.scores?.sprinter,
        phenotype_puncheur: r.phenotype?.scores?.puncheur,
        phenotype_pursuiter: r.phenotype?.scores?.pursuiter,
        phenotype_climber: r.phenotype?.scores?.climber,
        phenotype_tt: r.phenotype?.scores?.tt,
        phenotype_value: r.phenotype?.value,
        phenotype_bias: r.phenotype?.bias,
        
        // Club Info
        club_id: r.club?.id,
        club_name: r.club?.name,
      }));
      
      await supabase.upsertRiders(upsertData);
      
      this.lastSyncTime = new Date();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`[AutoSync] ✅ Sync completed in ${duration}s - ${ridersData.length} riders updated`);
      
      return {
        success: ridersData.length,
        errors: 0,
        skipped: riderIds.length - ridersData.length,
        errorMessages: errorMessages.length ? errorMessages : undefined,
      };
      
    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`[AutoSync] ❌ Sync failed after ${duration}s:`, error.message);
      
      return {
        success: 0,
        errors: 1,
        skipped: 0,
        errorMessages: [error.message],
      };
      
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Start periodieke sync volgens configuratie
   */
  start(): void {
    if (!syncConfig.enabled) {
      console.log('[AutoSync] ℹ️ Auto-sync disabled (SYNC_ENABLED=false)');
      return;
    }
    
    console.log('[AutoSync] 🚀 Auto-sync enabled');
    console.log(`[AutoSync] ⏱️  Interval: every ${syncConfig.intervalHours} hours`);
    console.log(`[AutoSync] ⏱️  Start delay: ${syncConfig.startDelayMinutes} minutes`);
    
    // Initial sync na startup delay
    const startDelay = syncConfig.startDelayMinutes * 60 * 1000;
    setTimeout(async () => {
      console.log('[AutoSync] 🏁 Running initial sync...');
      await this.syncTeamMembers();
    }, startDelay);
    
    // Periodieke sync
    const intervalMs = syncConfig.intervalHours * 60 * 60 * 1000;
    setInterval(async () => {
      await this.syncTeamMembers();
    }, intervalMs);
    
    console.log('[AutoSync] ✅ Scheduler started');
  }
  
  /**
   * Get sync status
   */
  getStatus(): {
    enabled: boolean;
    intervalHours: number;
    lastSync: Date | null;
    isRunning: boolean;
  } {
    return {
      enabled: syncConfig.enabled,
      intervalHours: syncConfig.intervalHours,
      lastSync: this.lastSyncTime,
      isRunning: this.isRunning,
    };
  }
}

export const autoSyncService = new AutoSyncService();
