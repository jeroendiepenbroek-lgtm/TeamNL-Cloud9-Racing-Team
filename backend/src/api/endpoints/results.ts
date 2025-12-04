/**
 * Endpoint 4: Results - GET /api/results
 * Feature: Results Dashboard met team results en rider details
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { simpleSyncService as syncService } from '../../services/simple-sync.service.js';

const router = Router();

// GET /api/results/team/recent - Haal recente results van team members op (gegroepeerd per event)
router.get('/team/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const days = parseInt(req.query.days as string) || 90;
    
    // Use Supabase Service methode
    const data = await supabase.getTeamRecentResults(days, limit);
    
    // Group by event for dashboard display
    const groupedByEvent = (data || []).reduce((acc: any, result: any) => {
      const eventKey = result.event_id;
      if (!acc[eventKey]) {
        acc[eventKey] = {
          event_id: result.event_id,
          event_name: result.event_name,
          event_date: result.event_date,
          pen: result.pen,
          total_riders: result.total_riders,
          // Route details (US6)
          route_world: result.route_world,
          route_name: result.route_name,
          route_profile: result.route_profile,
          distance_km: result.distance_km,
          elevation_m: result.elevation_m,
          laps: result.laps,
          event_type: result.event_type,
          sub_type: result.sub_type,
          results: []
        };
      }
      
      // Format result met power curves + US1/US2 fields + DNF + HR + position_in_category
      acc[eventKey].results.push({
        rider_id: result.rider_id,
        rider_name: result.rider?.name || result.rider_name,
        rank: result.rank,
        position: result.position,  // Overall position
        position_in_category: result.position_in_category,  // Position within category/pen
        total_riders: result.total_riders,  // Total participants in event
        pen_total: result.pen_total,  // Total participants in pen/category
        time_seconds: result.time_seconds,
        avg_wkg: result.avg_wkg,
        pen: result.pen,  // US1: PEN per result
        velo_rating: result.velo_rating,
        velo_previous: result.velo_previous,  // US2: Voor delta
        velo_change: result.velo_change,
        power_5s: result.power_5s,
        power_15s: result.power_15s,
        power_30s: result.power_30s,
        power_1m: result.power_1m,
        power_2m: result.power_2m,
        power_5m: result.power_5m,
        power_20m: result.power_20m,
        effort_score: result.effort_score,
        race_points: result.race_points,
        delta_winner_seconds: result.delta_winner_seconds,
        heartrate_avg: result.heartrate_avg,  // Average heartrate
        heartrate_max: result.heartrate_max,  // Max heartrate
        dnf: result.dnf || false  // DNF flag
      });
      
      return acc;
    }, {});
    
    // Sorteer events van nieuw naar oud (DESC)
    const events = Object.values(groupedByEvent).sort((a: any, b: any) => {
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });
    
    res.json({
      success: true,
      count: data?.length || 0,
      events_count: events.length,
      limit,
      days,
      events
    });
  } catch (error) {
    console.error('Error fetching team results:', error);
    res.status(500).json({ error: 'Fout bij ophalen team results' });
  }
});

// GET /api/results/rider/:riderId - Haal results voor specifieke rider op
router.get('/rider/:riderId', async (req: Request, res: Response) => {
  console.log('🎯 /api/results/rider/:riderId endpoint HIT');
  try {
    const riderId = parseInt(req.params.riderId);
    const days = parseInt(req.query.days as string) || 90;
    const limit = parseInt(req.query.limit as string) || 50;
    
    console.log(`📊 Parameters: riderId=${riderId}, days=${days}, limit=${limit}`);
    console.log('🔄 Calling supabase.getRiderResults...');
    
    // Use Supabase Service methodes - alleen results, geen PRs
    const results = await supabase.getRiderResults(riderId, days, limit);
    
    console.log(`✅ Got ${results.length} results`);
    console.log(`📦 Result size: ${JSON.stringify(results).length} bytes`);
    
    const response = {
      success: true,
      rider_id: riderId,
      count: results.length,
      days,
      results
    };
    
    console.log('🚀 Sending JSON response...');
    res.json(response);
    console.log('✅ Response sent!');
  } catch (error) {
    console.error('❌ Error fetching rider results:', error);
    res.status(500).json({ error: 'Fout bij ophalen rider results' });
  }
});

// GET /api/results/rider/:riderId/stats - Statistieken voor rider
router.get('/rider/:riderId/stats', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    const days = parseInt(req.query.days as string) || 90;
    
    // Use Supabase Service methode
    const stats = await supabase.getRiderStats(riderId, days);
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Error fetching rider stats:', error);
    res.status(500).json({ error: 'Fout bij ophalen rider stats' });
  }
});

// GET /api/results/:eventId - Haal results voor event op
router.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const results = await supabase.getEventResults(eventId);
    
    res.json({
      eventId,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Fout bij ophalen results' });
  }
});

// POST /api/results/:eventId/sync - Sync results vanaf ZwiftRacing API
router.post('/:eventId/sync', async (req: Request, res: Response) => {
  try {
    const eventId = req.params.eventId; // Keep as string for API consistency
    
    // TODO: Implementeer result sync via ZwiftRacing API
    // Voor nu: return existing results
    const results = await supabase.getEventResults(parseInt(eventId));
    
    res.json({
      success: true,
      eventId,
      count: results.length,
      results,
      message: 'Result sync feature coming soon - returning existing results'
    });
  } catch (error) {
    console.error('Error syncing results:', error);
    res.status(500).json({ error: 'Fout bij synchroniseren results' });
  }
});

// GET /api/results/export/csv - Export results naar CSV
router.get('/export/csv', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    const riderId = req.query.riderId ? parseInt(req.query.riderId as string) : undefined;
    
    let results;
    let filename;
    
    if (riderId) {
      // Export voor specifieke rider
      results = await supabase.getRiderResults(riderId, days, 500);
      filename = `teamnl_rider_${riderId}_results_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // Export voor hele team
      results = await supabase.getTeamRecentResults(days, 500);
      filename = `teamnl_team_results_${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    // CSV headers
    const headers = [
      'rider_id', 'rider_name', 'event_id', 'event_name', 'event_date',
      'rank', 'pen', 'time_seconds', 'category',
      'avg_wkg', 'power_5s', 'power_15s', 'power_30s',
      'power_1m', 'power_2m', 'power_5m', 'power_20m',
      'effort_score', 'race_points',
      'velo_rating', 'velo_change', 'delta_winner_seconds'
    ];
    
    // Convert to CSV
    const csvRows = [headers.join(',')];
    
    for (const result of results) {
      const row = [
        result.rider_id || '',
        `"${(result.rider?.name || result.rider_name || '').replace(/"/g, '""')}"`,
        result.event_id || '',
        `"${(result.event_name || '').replace(/"/g, '""')}"`,
        result.event_date || '',
        result.rank || '',
        result.pen || '',
        result.time_seconds || '',
        result.category || '',
        result.avg_wkg || '',
        result.power_5s || '',
        result.power_15s || '',
        result.power_30s || '',
        result.power_1m || '',
        result.power_2m || '',
        result.power_5m || '',
        result.power_20m || '',
        result.effort_score || '',
        result.race_points || '',
        result.velo_rating || '',
        result.velo_change || '',
        result.delta_winner_seconds || ''
      ];
      csvRows.push(row.join(','));
    }
    
    const csv = csvRows.join('\n');
    
    // Set headers voor file download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Fout bij exporteren CSV' });
  }
});

export default router;
