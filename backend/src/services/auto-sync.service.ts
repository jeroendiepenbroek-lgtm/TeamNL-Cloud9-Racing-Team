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
      const zwiftIds = teamMembers.map(m => m.zwift_id);
      
      if (zwiftIds.length === 0) {
        console.log('[AutoSync] ℹ️ No team members to sync');
        return { success: 0, errors: 0, skipped: 0 };
      }
      
      console.log(`[AutoSync] 📊 Syncing ${zwiftIds.length} riders...`);
      
      let ridersData: any[] = [];
      
      // Strategy: Use GET for small teams (< 10 riders, 5/min rate)
      //           Use POST bulk for larger teams (1/15min rate, max 1000)
      if (zwiftIds.length <= 10) {
        console.log('[AutoSync] 📡 Using individual GET calls (small team, 5/min rate)');
        
        for (const zwiftId of zwiftIds) {
          try {
            const rider = await zwiftClient.getRider(zwiftId);
            ridersData.push(rider);
            
            // Rate limit: 5/min = 12 sec between calls
            if (zwiftIds.length > 1) {
              await new Promise(resolve => setTimeout(resolve, 12000));
            }
          } catch (error: any) {
            console.error(`[AutoSync] ⚠️ Failed to sync rider ${zwiftId}:`, error.message);
          }
        }
      } else {
        console.log('[AutoSync] 📡 Using bulk POST API (large team, 1/15min rate)');
        
        try {
          // Bulk fetch van ZwiftRacing API (max 1000, rate: 1/15min)
          ridersData = await zwiftClient.getBulkRiders(zwiftIds);
        } catch (error: any) {
          console.error('[AutoSync] ❌ Bulk POST failed, falling back to GET:', error.message);
          
          // Fallback: individual GET calls
          for (const zwiftId of zwiftIds) {
            try {
              const rider = await zwiftClient.getRider(zwiftId);
              ridersData.push(rider);
              await new Promise(resolve => setTimeout(resolve, 12000)); // 5/min rate
            } catch (err: any) {
              console.error(`[AutoSync] ⚠️ Failed to sync rider ${zwiftId}:`, err.message);
            }
          }
        }
      }
      
      if (ridersData.length === 0) {
        console.log('[AutoSync] ⚠️ No rider data received from API');
        return { success: 0, errors: 1, skipped: 0 };
      }
      
      console.log(`[AutoSync] ✅ Received ${ridersData.length} riders from API`);
      
      // Upsert naar database
      const upsertData = ridersData.map(r => ({
        zwift_id: r.riderId,
        name: r.name,
        club_id: r.club?.id,
        category_racing: r.category?.racing,
        category_zftp: r.category?.zFTP,
        ranking: r.ranking ?? undefined,
        ranking_score: r.rankingScore,
        ftp: r.ftp,
        weight: r.weight,
        watts_per_kg: r.wattsPerKg,
        country: r.countryAlpha3,
        gender: r.gender,
        age: r.age,
      }));
      
      await supabase.upsertRiders(upsertData);
      
      this.lastSyncTime = new Date();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`[AutoSync] ✅ Sync completed in ${duration}s - ${ridersData.length} riders updated`);
      
      return {
        success: ridersData.length,
        errors: 0,
        skipped: zwiftIds.length - ridersData.length,
      };
      
    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`[AutoSync] ❌ Sync failed after ${duration}s:`, error.message);
      
      return {
        success: 0,
        errors: 1,
        skipped: 0,
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
