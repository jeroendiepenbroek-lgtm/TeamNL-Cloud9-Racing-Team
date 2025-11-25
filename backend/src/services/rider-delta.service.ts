/**
 * Rider Delta Service
 * US2: Track rider changes (vELO rating, FTP, power curves) voor Live Velo dashboard
 * 
 * Features:
 * - Automatic delta detection tijdens rider sync
 * - History snapshots van belangrijke metrics
 * - Change notifications voor dashboard real-time updates
 */

import { SupabaseService } from './supabase.service.js';
import { DbRider } from '../types/index.js';

interface RiderDelta {
  rider_id: number;
  name: string;
  changes: {
    field: string;
    old_value: any;
    new_value: any;
    delta: number | null;
    change_pct: number | null;
  }[];
  timestamp: string;
}

export class RiderDeltaService {
  private supabase: SupabaseService;
  
  // Track welke velden we monitoren voor changes
  private readonly TRACKED_FIELDS = [
    'race_current_rating',  // vELO rating (belangrijkste!)
    'zp_ftp',               // FTP
    'weight',               // Gewicht
    'power_wkg60',          // 1min power (W/kg)
    'power_wkg300',         // 5min power (W/kg)
    'power_wkg1200',        // 20min power (W/kg)
    'race_finishes',        // Aantal races
  ] as const;

  constructor() {
    this.supabase = new SupabaseService();
  }

  /**
   * Detect changes tussen oude en nieuwe rider data
   * Wordt aangeroepen tijdens rider sync
   */
  async detectAndTrackChanges(
    oldRiders: DbRider[],
    newRiders: Partial<DbRider>[]
  ): Promise<RiderDelta[]> {
    const deltas: RiderDelta[] = [];
    const oldRidersMap = new Map(oldRiders.map(r => [r.rider_id, r]));

    for (const newRider of newRiders) {
      if (!newRider.rider_id) continue;
      
      const oldRider = oldRidersMap.get(newRider.rider_id);
      if (!oldRider) {
        // Nieuwe rider - log maar geen delta
        console.log(`   🆕 New rider: ${newRider.name} (${newRider.rider_id})`);
        continue;
      }

      // Check elk tracked field voor changes
      const changes: RiderDelta['changes'] = [];
      
      for (const field of this.TRACKED_FIELDS) {
        const oldValue = (oldRider as any)[field];
        const newValue = (newRider as any)[field];
        
        // Skip als beide values undefined/null zijn
        if ((oldValue === undefined || oldValue === null) && 
            (newValue === undefined || newValue === null)) {
          continue;
        }
        
        // Check voor change (tolerantie voor floating point)
        const hasChanged = typeof oldValue === 'number' && typeof newValue === 'number'
          ? Math.abs(newValue - oldValue) > 0.01
          : oldValue !== newValue;
        
        if (hasChanged && newValue !== undefined && newValue !== null) {
          const delta = typeof oldValue === 'number' && typeof newValue === 'number'
            ? newValue - oldValue
            : null;
          
          const changePct = delta !== null && oldValue !== 0
            ? (delta / oldValue) * 100
            : null;
          
          changes.push({
            field,
            old_value: oldValue,
            new_value: newValue,
            delta,
            change_pct: changePct
          });
        }
      }

      // Als er changes zijn, log delta
      if (changes.length > 0) {
        const delta: RiderDelta = {
          rider_id: newRider.rider_id,
          name: newRider.name || oldRider.name || `Rider ${newRider.rider_id}`,
          changes,
          timestamp: new Date().toISOString()
        };
        
        deltas.push(delta);
        
        // Log belangrijke changes
        for (const change of changes) {
          const sign = change.delta && change.delta > 0 ? '↑' : '↓';
          const pct = change.change_pct ? `(${sign}${Math.abs(change.change_pct).toFixed(1)}%)` : '';
          console.log(`   ${sign} ${delta.name}: ${change.field} ${change.old_value} → ${change.new_value} ${pct}`);
        }
        
        // Save snapshot naar rider_history
        await this.saveHistorySnapshot(newRider as DbRider);
      }
    }

    // Log summary
    if (deltas.length > 0) {
      console.log(`\n📊 [Delta Detection] ${deltas.length} riders met wijzigingen gedetecteerd`);
    }

    return deltas;
  }

  /**
   * Save history snapshot voor trending analysis
   */
  private async saveHistorySnapshot(rider: DbRider): Promise<void> {
    try {
      await this.supabase.insertRiderHistory([{
        rider_id: rider.rider_id,
        snapshot_date: new Date().toISOString(),
        ranking: rider.race_current_rating || 0,
        points: rider.race_finishes || 0,
        category: rider.zp_category || 'Unknown',
      }]);
    } catch (error) {
      console.error(`   ⚠️  Failed to save history for rider ${rider.rider_id}:`, error);
    }
  }

  /**
   * Get rider trend data (voor dashboard charts)
   */
  async getRiderTrends(riderId: number, days: number = 90): Promise<{
    rider_id: number;
    history: any[];
    trends: {
      velo_rating: { current: number | null; change: number | null; change_pct: number | null };
      ftp: { current: number | null; change: number | null; change_pct: number | null };
      power_1min: { current: number | null; change: number | null; change_pct: number | null };
      power_5min: { current: number | null; change: number | null; change_pct: number | null };
    };
  }> {
    // Haal history op
    const history = await this.supabase.getRiderHistory(riderId);
    
    // Filter laatste X dagen
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const recentHistory = history.filter(h => 
      new Date(h.snapshot_date) >= cutoffDate
    );
    
    if (recentHistory.length === 0) {
      return {
        rider_id: riderId,
        history: [],
        trends: {
          velo_rating: { current: null, change: null, change_pct: null },
          ftp: { current: null, change: null, change_pct: null },
          power_1min: { current: null, change: null, change_pct: null },
          power_5min: { current: null, change: null, change_pct: null },
        }
      };
    }
    
    // Sort chronologisch
    recentHistory.sort((a, b) => 
      new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
    );
    
    const oldest = recentHistory[0];
    const newest = recentHistory[recentHistory.length - 1];
    
    const calculateTrend = (oldVal: number | null | undefined, newVal: number | null | undefined) => {
      if (!oldVal || !newVal) return { current: newVal || null, change: null, change_pct: null };
      const change = newVal - oldVal;
      const changePct = oldVal !== 0 ? (change / oldVal) * 100 : null;
      return { current: newVal, change, change_pct: changePct };
    };
    
    return {
      rider_id: riderId,
      history: recentHistory,
      trends: {
        velo_rating: calculateTrend(oldest.ranking, newest.ranking),
        ftp: { current: null, change: null, change_pct: null }, // Not in history table
        power_1min: { current: null, change: null, change_pct: null }, // Not in history table
        power_5min: { current: null, change: null, change_pct: null }, // Not in history table
      }
    };
  }

  /**
   * Get all riders met recente changes (voor Live Velo dashboard)
   */
  async getRecentChanges(hours: number = 24): Promise<RiderDelta[]> {
    try {
      // Dit zou uit een cache komen in productie, maar voor nu halen we uit history
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);
      
      // Haal alle riders
      const riders = await this.supabase.getRiders();
      
      if (!riders || riders.length === 0) {
        console.log('[Rider Deltas] No riders found');
        return [];
      }
      
      const deltas: RiderDelta[] = [];
      
      for (const rider of riders) {
        try {
          const history = await this.supabase.getRiderHistory(rider.rider_id);
      
      // Filter recent history
      const recentHistory = history.filter(h => 
        new Date(h.snapshot_date) >= cutoffDate
      ).sort((a, b) => 
        new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
      );
      
      if (recentHistory.length < 2) continue;
      
      const [newest, previous] = recentHistory;
      const changes: RiderDelta['changes'] = [];
      
      // Check vELO rating change (stored as 'ranking' in history table)
      if (newest.ranking && previous.ranking) {
        const delta = newest.ranking - previous.ranking;
        if (Math.abs(delta) > 0.1) {
          changes.push({
            field: 'race_current_rating',
            old_value: previous.ranking,
            new_value: newest.ranking,
            delta,
            change_pct: (delta / previous.ranking) * 100
          });
        }
      }
      
      if (changes.length > 0) {
        deltas.push({
          rider_id: rider.rider_id,
          name: rider.name || `Rider ${rider.rider_id}`,
          changes,
          timestamp: newest.snapshot_date
        });
      }
        } catch (err) {
          console.error(`Failed to get history for rider ${rider.rider_id}:`, err);
          continue; // Skip this rider
        }
      }
      
      return deltas;
      
    } catch (error) {
      console.error('[Rider Deltas] Failed to get recent changes:', error);
      return []; // Return empty array instead of throwing
    }
  }
}

export const riderDeltaService = new RiderDeltaService();
