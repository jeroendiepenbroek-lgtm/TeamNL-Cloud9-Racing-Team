/**
 * Event Cleanup API Endpoints
 * Manual triggers voor event cleanup operations
 */
import { Router } from 'express';
import { eventCleanupService } from '../../services/event-cleanup.service.js';
const router = Router();
// POST /api/cleanup/events - Run full cleanup (past + stale future)
router.post('/events', async (req, res) => {
    try {
        console.log('[API] Full event cleanup triggered');
        const result = await eventCleanupService.runFullCleanup();
        res.json({
            message: 'Event cleanup completed',
            result
        });
    }
    catch (error) {
        console.error('[API] Event cleanup failed:', error);
        res.status(500).json({
            error: 'Event cleanup failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/cleanup/events/past - Cleanup alleen past events
router.post('/events/past', async (req, res) => {
    try {
        console.log('[API] Past events cleanup triggered');
        const result = await eventCleanupService.cleanupOldEvents();
        res.json({
            message: 'Past events cleanup completed',
            result
        });
    }
    catch (error) {
        console.error('[API] Past cleanup failed:', error);
        res.status(500).json({
            error: 'Past cleanup failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/cleanup/events/stale - Cleanup alleen stale future events
router.post('/events/stale', async (req, res) => {
    try {
        console.log('[API] Stale future events cleanup triggered');
        const deleted = await eventCleanupService.cleanupStaleUpcomingEvents();
        res.json({
            message: 'Stale events cleanup completed',
            deleted
        });
    }
    catch (error) {
        console.error('[API] Stale cleanup failed:', error);
        res.status(500).json({
            error: 'Stale cleanup failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/cleanup/stats - Stats voor cleanup (dry-run)
router.get('/stats', async (req, res) => {
    try {
        const now = Math.floor(Date.now() / 1000);
        const hundredDaysAgo = now - (100 * 24 * 60 * 60);
        const twoDaysAgo = now - (2 * 24 * 60 * 60);
        // Count events in various categories
        const [totalEvents, pastEvents, veryOldEvents, futureEvents] = await Promise.all([
            eventCleanupService['supabase'].client
                .from('zwift_api_events')
                .select('id', { count: 'exact', head: true }),
            eventCleanupService['supabase'].client
                .from('zwift_api_events')
                .select('id', { count: 'exact', head: true })
                .lt('time_unix', twoDaysAgo),
            eventCleanupService['supabase'].client
                .from('zwift_api_events')
                .select('id', { count: 'exact', head: true })
                .lt('time_unix', hundredDaysAgo),
            eventCleanupService['supabase'].client
                .from('zwift_api_events')
                .select('id', { count: 'exact', head: true })
                .gte('time_unix', now)
        ]);
        res.json({
            total_events: totalEvents.count || 0,
            past_events: pastEvents.count || 0,
            very_old_events: veryOldEvents.count || 0,
            future_events: futureEvents.count || 0,
            retention_policy: {
                max_age_days: 100,
                keep_team_events_only: true
            },
            recommendations: {
                should_cleanup: (veryOldEvents.count || 0) > 10 || (pastEvents.count || 0) > 500
            }
        });
    }
    catch (error) {
        console.error('[API] Cleanup stats failed:', error);
        res.status(500).json({ error: 'Failed to get cleanup stats' });
    }
});
export default router;
//# sourceMappingURL=cleanup.js.map