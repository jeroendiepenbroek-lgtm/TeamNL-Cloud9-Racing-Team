/**
 * Endpoint 4: Results - GET /api/results
 * Feature: Results Dashboard met team results en rider details
 */
import { Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncServiceV2 as syncService } from '../../services/sync-v2.service.js';
const router = Router();
// GET /api/results/team - Haal recente results van team members op
router.get('/team', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const days = parseInt(req.query.days) || 90;
        // Query team recent results from materialized view
        const { data, error } = await supabase.client
            .from('view_team_recent_results')
            .select('*')
            .order('event_date', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
        // Group by event for dashboard display
        const groupedByEvent = (data || []).reduce((acc, result) => {
            const eventKey = result.event_id;
            if (!acc[eventKey]) {
                acc[eventKey] = {
                    event_id: result.event_id,
                    event_name: result.event_name,
                    event_date: result.event_date,
                    event_type: result.event_type,
                    sub_type: result.sub_type,
                    route_name: result.route_name,
                    results: []
                };
            }
            acc[eventKey].results.push(result);
            return acc;
        }, {});
        const events = Object.values(groupedByEvent);
        res.json({
            count: data?.length || 0,
            events_count: events.length,
            limit,
            days,
            events
        });
    }
    catch (error) {
        console.error('Error fetching team results:', error);
        res.status(500).json({ error: 'Fout bij ophalen team results' });
    }
});
// GET /api/results/rider/:riderId - Haal results voor specifieke rider op
router.get('/rider/:riderId', async (req, res) => {
    try {
        const riderId = parseInt(req.params.riderId);
        const days = parseInt(req.query.days) || 90;
        const limit = parseInt(req.query.limit) || 50;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const { data, error } = await supabase.client
            .from('event_results')
            .select(`
        *,
        event:events!inner(
          event_id, name, event_date, route, laps, distance_meters
        )
      `)
            .eq('rider_id', riderId)
            .gte('event_date', cutoffDate.toISOString())
            .order('event_date', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
        // Get rider personal records
        const { data: prs } = await supabase.client
            .from('rider_personal_records')
            .select('*')
            .eq('rider_id', riderId);
        res.json({
            rider_id: riderId,
            count: data?.length || 0,
            days,
            results: data || [],
            personal_records: prs || []
        });
    }
    catch (error) {
        console.error('Error fetching rider results:', error);
        res.status(500).json({ error: 'Fout bij ophalen rider results' });
    }
});
// GET /api/results/rider/:riderId/stats - Statistieken voor rider
router.get('/rider/:riderId/stats', async (req, res) => {
    try {
        const riderId = parseInt(req.params.riderId);
        const days = parseInt(req.query.days) || 90;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const { data, error } = await supabase.client
            .from('event_results')
            .select('*')
            .eq('rider_id', riderId)
            .gte('event_date', cutoffDate.toISOString());
        if (error)
            throw error;
        const results = data || [];
        const totalRaces = results.length;
        const wins = results.filter(r => r.rank === 1).length;
        const podiums = results.filter(r => r.rank && r.rank <= 3).length;
        const top10 = results.filter(r => r.rank && r.rank <= 10).length;
        const avgRank = results.reduce((sum, r) => sum + (r.rank || 0), 0) / (totalRaces || 1);
        const avgWkg = results.reduce((sum, r) => sum + (r.avg_wkg || 0), 0) / (totalRaces || 1);
        const avgEffort = results.reduce((sum, r) => sum + (r.effort_score || 0), 0) / (totalRaces || 1);
        res.json({
            rider_id: riderId,
            period_days: days,
            total_races: totalRaces,
            wins,
            podiums,
            top10,
            avg_rank: Math.round(avgRank * 10) / 10,
            avg_wkg: Math.round(avgWkg * 100) / 100,
            avg_effort_score: Math.round(avgEffort)
        });
    }
    catch (error) {
        console.error('Error fetching rider stats:', error);
        res.status(500).json({ error: 'Fout bij ophalen rider stats' });
    }
});
// GET /api/results/:eventId - Haal results voor event op
router.get('/:eventId', async (req, res) => {
    try {
        const eventId = parseInt(req.params.eventId);
        const results = await supabase.getEventResults(eventId);
        res.json({
            eventId,
            count: results.length,
            results,
        });
    }
    catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Fout bij ophalen results' });
    }
});
// POST /api/results/:eventId/sync - Sync results vanaf ZwiftRacing API
router.post('/:eventId/sync', async (req, res) => {
    try {
        const eventId = parseInt(req.params.eventId);
        const results = await syncService.syncEventResults(eventId);
        res.json({
            success: true,
            eventId,
            count: results.length,
            results,
        });
    }
    catch (error) {
        console.error('Error syncing results:', error);
        res.status(500).json({ error: 'Fout bij synchroniseren results' });
    }
});
export default router;
//# sourceMappingURL=results.js.map