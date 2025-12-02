/**
 * Unified Dashboard API Endpoints
 * 
 * V2 endpoints voor 3 dashboards met multi-source data:
 * - Racing Matrix (Rider Stats)
 * - Events Dashboard
 * - Results Dashboard
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// RACING MATRIX - Rider Stats Endpoints
// ============================================================================

/**
 * GET /api/v2/riders/:id/detailed
 * 
 * Complete rider stats voor Racing Matrix dashboard
 * POC: Rider 150437
 * 
 * Multi-source data:
 * - riders_unified: Core stats, vELO, power profile, physical stats
 * - rider_activities: Recent training (last 30 days)
 * - race_results_unified: Race performance aggregation
 * - rider_rating_history: vELO trend data
 */
router.get('/riders/:id/detailed', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.id);
    
    if (isNaN(riderId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid rider ID' 
      });
    }
    
    console.log(`[API v2] Fetching detailed stats for rider ${riderId}...`);
    
    // Fetch rider core data
    const { data: rider, error: riderError } = await supabase
      .from('riders_unified')
      .select('*')
      .eq('rider_id', riderId)
      .single();
    
    if (riderError || !rider) {
      return res.status(404).json({ 
        success: false, 
        error: 'Rider not found' 
      });
    }
    
    // Fetch recent activities (last 30 days)
    const { data: activities, error: activitiesError } = await supabase
      .from('rider_activities')
      .select('*')
      .eq('rider_id', riderId)
      .gte('start_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_date', { ascending: false })
      .limit(10);
    
    // Fetch race results for aggregation (last 90 days)
    const { data: results, error: resultsError } = await supabase
      .from('race_results_unified')
      .select('*')
      .eq('rider_id', riderId)
      .gte('event_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('event_date', { ascending: false });
    
    // Fetch vELO history for chart (last 90 days)
    const { data: veloHistory, error: veloError } = await supabase
      .from('rider_rating_history')
      .select('rating, recorded_at')
      .eq('rider_id', riderId)
      .gte('recorded_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: true });
    
    // Compute derived stats
    const raceStats = computeRaceStats(results || []);
    const activityStats = computeActivityStats(activities || []);
    const dataCompleteness = computeDataCompleteness(rider);
    
    // Build response
    const response = {
      success: true,
      rider: {
        // Core identity
        rider_id: rider.rider_id,
        name: rider.name,
        avatar_url: rider.avatar_url,
        country_code: rider.country_code,
        country_flag: getCountryFlag(rider.country_code),
        
        // vELO rating (current state)
        velo_current: rider.velo_rating,
        velo_tier: getVeloTier(rider.velo_rating),
        velo_updated_at: rider.velo_rating_updated_at,
        
        // Physical stats
        ftp: rider.ftp,
        weight_kg: rider.weight_kg,
        height_cm: rider.height_cm,
        watts_per_kg: rider.ftp && rider.weight_kg ? (rider.ftp / rider.weight_kg).toFixed(2) : null,
        age_category: rider.age_category || null,
        gender: rider.gender || null,
        
        // ZwiftPower enrichment
        zp_category: rider.zp_category,
        
        // Race performance (aggregated from results)
        race_finishes: raceStats.finishes,
        race_dnfs: raceStats.dnfs,
        race_wins: raceStats.wins,
        race_podiums: raceStats.podiums,
        race_last_date: raceStats.lastRaceDate,
        dnf_rate: raceStats.dnfRate,
        podium_rate: raceStats.podiumRate,
        avg_position: raceStats.avgPosition,
        
        // Power profile (would come from ZwiftRacing API - placeholder for now)
        power_5s_w: null,   // TODO: Add from ZwiftRacing sync
        power_15s_w: null,
        power_30s_w: null,
        power_1m_w: null,
        power_5m_w: null,
        power_20m_w: null,
        
        // Recent activity stats (last 30 days)
        rides_last_30d: activityStats.count,
        distance_last_30d_km: activityStats.totalDistance,
        elevation_last_30d_m: activityStats.totalElevation,
        time_last_30d_hours: activityStats.totalTime,
        avg_power_last_30d: activityStats.avgPower,
        
        // Social & engagement
        followers_count: rider.followers_count || 0,
        followees_count: rider.followees_count || 0,
        
        // Sync tracking
        last_synced_zwift_racing: rider.last_synced_zwift_racing,
        last_synced_zwift_official: rider.last_synced_zwift_official,
        last_synced_zwiftpower: rider.last_synced_zwiftpower,
        data_completeness: dataCompleteness
      },
      
      // vELO history for chart
      velo_history: veloHistory || [],
      
      // Recent activities detail
      recent_activities: (activities || []).map(a => ({
        date: a.start_date,
        name: a.name,
        distance_km: a.distance_meters ? (a.distance_meters / 1000).toFixed(1) : null,
        duration_min: a.duration_seconds ? Math.round(a.duration_seconds / 60) : null,
        avg_watts: a.avg_watts,
        elevation_m: a.elevation_meters,
        calories: a.calories
      })),
      
      // Recent race results (last 5)
      recent_results: (results || []).slice(0, 5).map(r => ({
        date: r.event_date,
        event_name: r.event_name,
        position: r.position,
        pen: r.pen,
        velo_change: r.velo_change,
        avg_wkg: r.avg_wkg
      }))
    };
    
    res.json(response);
    
  } catch (error: any) {
    console.error('[API v2] Error fetching rider details:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/v2/riders/matrix
 * 
 * All team riders voor Racing Matrix table view
 * Returns compact stats for table display
 */
router.get('/riders/matrix', async (req: Request, res: Response) => {
  try {
    console.log('[API v2] Fetching team matrix data...');
    
    // Fetch all team riders
    const { data: riders, error } = await supabase
      .from('riders_unified')
      .select('*')
      .eq('is_team_member', true)
      .order('velo_rating', { ascending: false, nullsFirst: false });
    
    if (error) {
      throw error;
    }
    
    // For each rider, fetch race stats (last 90 days)
    const ridersWithStats = await Promise.all(
      (riders || []).map(async (rider) => {
        const { data: results } = await supabase
          .from('race_results_unified')
          .select('*')
          .eq('rider_id', rider.rider_id)
          .gte('event_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
        
        const raceStats = computeRaceStats(results || []);
        
        return {
          rider_id: rider.rider_id,
          name: rider.name,
          zp_category: rider.zp_category,
          zp_ftp: rider.ftp,
          weight: rider.weight_kg,
          race_last_rating: rider.velo_rating,
          race_max30_rating: null, // TODO: Track from vELO history
          race_wins: raceStats.wins,
          race_podiums: raceStats.podiums,
          race_finishes: raceStats.finishes,
          race_dnfs: raceStats.dnfs,
          watts_per_kg: rider.ftp && rider.weight_kg ? (rider.ftp / rider.weight_kg).toFixed(2) : null,
          // Power intervals - TODO: Add from ZwiftRacing sync
          power_w5: null,
          power_w15: null,
          power_w30: null,
          power_w60: null,
          power_w120: null,
          power_w300: null,
          power_w1200: null
        };
      })
    );
    
    res.json({
      success: true,
      count: ridersWithStats.length,
      riders: ridersWithStats,
      sync_status: {
        last_full_sync: new Date().toISOString(),
        sources_healthy: ['zwift_racing', 'zwift_official', 'zwiftpower']
      }
    });
    
  } catch (error: any) {
    console.error('[API v2] Error fetching matrix data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

function computeRaceStats(results: any[]) {
  const finishes = results.filter(r => !r.dnf).length;
  const dnfs = results.filter(r => r.dnf).length;
  const wins = results.filter(r => r.position === 1).length;
  const podiums = results.filter(r => r.position <= 3).length;
  
  const lastRaceDate = results.length > 0 ? results[0].event_date : null;
  
  const dnfRate = (finishes + dnfs) > 0 ? (dnfs / (finishes + dnfs)).toFixed(3) : null;
  const podiumRate = finishes > 0 ? (podiums / finishes).toFixed(3) : null;
  
  const positions = results.filter(r => !r.dnf && r.position).map(r => r.position);
  const avgPosition = positions.length > 0 
    ? (positions.reduce((sum, p) => sum + p, 0) / positions.length).toFixed(1)
    : null;
  
  return {
    finishes,
    dnfs,
    wins,
    podiums,
    lastRaceDate,
    dnfRate,
    podiumRate,
    avgPosition
  };
}

function computeActivityStats(activities: any[]) {
  const count = activities.length;
  
  const totalDistance = activities.reduce((sum, a) => 
    sum + (a.distance_meters || 0), 0) / 1000; // Convert to km
  
  const totalElevation = activities.reduce((sum, a) => 
    sum + (a.elevation_meters || 0), 0);
  
  const totalTime = activities.reduce((sum, a) => 
    sum + (a.duration_seconds || 0), 0) / 3600; // Convert to hours
  
  const powerValues = activities.filter(a => a.avg_watts).map(a => a.avg_watts);
  const avgPower = powerValues.length > 0
    ? Math.round(powerValues.reduce((sum, p) => sum + p, 0) / powerValues.length)
    : null;
  
  return {
    count,
    totalDistance: totalDistance.toFixed(1),
    totalElevation: Math.round(totalElevation),
    totalTime: totalTime.toFixed(1),
    avgPower
  };
}

function computeDataCompleteness(rider: any): number {
  const fields = [
    'name', 'velo_rating', 'ftp', 'weight_kg', 'height_cm',
    'zp_category', 'avatar_url', 'country_code', 'followers_count'
  ];
  
  const populated = fields.filter(f => rider[f] !== null && rider[f] !== undefined).length;
  return Math.round((populated / fields.length) * 100);
}

function getVeloTier(rating: number | null): string | null {
  if (!rating) return null;
  
  const tiers = [
    { name: 'Diamond', min: 2200 },
    { name: 'Ruby', min: 1900, max: 2200 },
    { name: 'Emerald', min: 1650, max: 1900 },
    { name: 'Sapphire', min: 1450, max: 1650 },
    { name: 'Amethyst', min: 1300, max: 1450 },
    { name: 'Platinum', min: 1150, max: 1300 },
    { name: 'Gold', min: 1000, max: 1150 },
    { name: 'Silver', min: 850, max: 1000 },
    { name: 'Bronze', min: 650, max: 850 },
    { name: 'Copper', min: 0, max: 650 }
  ];
  
  const tier = tiers.find(t => 
    rating >= t.min && (!t.max || rating < t.max)
  );
  
  return tier?.name || null;
}

function getCountryFlag(countryCode: string | null): string | null {
  if (!countryCode) return null;
  
  const flags: Record<string, string> = {
    'nl': '🇳🇱',
    'be': '🇧🇪',
    'de': '🇩🇪',
    'gb': '🇬🇧',
    'us': '🇺🇸',
    'fr': '🇫🇷',
    // Add more as needed
  };
  
  return flags[countryCode.toLowerCase()] || null;
}

export default router;
