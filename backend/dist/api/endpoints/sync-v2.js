/**
 * Sync V2 API Endpoints
 * Modern sync met separate flows en metrics
 */
import { Router } from 'express';
import { syncServiceV2 } from '../../services/sync-v2.service.js';
import { syncConfigService } from '../../services/sync-config.service.js';
import { syncCoordinator } from '../../services/sync-coordinator.service.js';
const router = Router();
// GET /api/sync/metrics - Haal laatste sync metrics op
router.get('/metrics', async (req, res) => {
    try {
        const metrics = await syncServiceV2.getLatestMetrics();
        res.json(metrics);
    }
    catch (error) {
        console.error('Error fetching sync metrics:', error);
        res.status(500).json({ error: 'Failed to fetch sync metrics' });
    }
});
// POST /api/sync/riders - Trigger rider sync
router.post('/riders', async (req, res) => {
    try {
        const config = syncConfigService.getConfig();
        const metrics = await syncServiceV2.syncRiders({
            intervalMinutes: config.riderSyncIntervalMinutes,
        });
        res.json({
            message: 'Rider sync completed',
            metrics,
        });
    }
    catch (error) {
        console.error('Error in rider sync:', error);
        res.status(500).json({
            error: 'Rider sync failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/sync/events/near - Trigger near event sync
router.post('/events/near', async (req, res) => {
    try {
        const config = syncConfigService.getConfig();
        const metrics = await syncServiceV2.syncNearEvents({
            intervalMinutes: config.nearEventSyncIntervalMinutes,
            thresholdMinutes: config.nearEventThresholdMinutes,
            lookforwardHours: config.lookforwardHours,
        });
        res.json({
            message: 'Near event sync completed',
            metrics,
        });
    }
    catch (error) {
        console.error('Error in near event sync:', error);
        res.status(500).json({
            error: 'Near event sync failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/sync/events/far - Trigger far event sync
// Body params (optional):
//   - lookforwardHours: number (default: from config, typically 48)
//   - force: boolean (sync all events, not just new ones)
router.post('/events/far', async (req, res) => {
    try {
        const config = syncConfigService.getConfig();
        // Allow custom lookforward hours via body (om meer events te laden)
        const lookforwardHours = req.body?.lookforwardHours
            ? Number(req.body.lookforwardHours)
            : config.lookforwardHours;
        // Validate lookforwardHours
        if (isNaN(lookforwardHours) || lookforwardHours < 1 || lookforwardHours > 168) {
            return res.status(400).json({
                error: 'Invalid lookforwardHours',
                message: 'lookforwardHours must be between 1 and 168 (7 days)'
            });
        }
        const force = req.body?.force === true;
        console.log(`[API] Far event sync triggered - lookforward: ${lookforwardHours}h, force: ${force}`);
        const metrics = await syncServiceV2.syncFarEvents({
            intervalMinutes: config.farEventSyncIntervalMinutes,
            thresholdMinutes: config.nearEventThresholdMinutes,
            lookforwardHours,
            force, // Will be used to bypass "new events only" check
        });
        res.json({
            message: 'Far event sync completed',
            metrics,
            config: {
                lookforwardHours,
                force,
            }
        });
    }
    catch (error) {
        console.error('Error in far event sync:', error);
        res.status(500).json({
            error: 'Far event sync failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/sync/coordinator/status - Get sync coordinator status
router.get('/coordinator/status', (req, res) => {
    try {
        const status = syncCoordinator.getStatus();
        res.json(status);
    }
    catch (error) {
        console.error('Error getting coordinator status:', error);
        res.status(500).json({ error: 'Failed to get coordinator status' });
    }
});
export default router;
//# sourceMappingURL=sync-v2.js.map