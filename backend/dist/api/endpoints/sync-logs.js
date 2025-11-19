/**
 * Endpoint 6: Sync Logs - GET /api/sync-logs
 */
import { Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncServiceV2 as syncService } from '../../services/sync-v2.service.js';
const router = Router();
// GET /api/sync-logs - Haal sync logs op
router.get('/', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const logs = await supabase.getSyncLogs(limit);
        res.json({
            count: logs.length,
            logs,
        });
    }
    catch (error) {
        console.error('Error fetching sync logs:', error);
        res.status(500).json({ error: 'Fout bij ophalen sync logs' });
    }
});
// POST /api/sync-logs/full-sync - Voer volledige sync uit
router.post('/full-sync', async (req, res) => {
    try {
        const clubId = req.body.clubId || 11818;
        await syncService.syncAll(clubId);
        const logs = await supabase.getSyncLogs(10);
        res.json({
            success: true,
            message: 'Volledige synchronisatie voltooid',
            recentLogs: logs,
        });
    }
    catch (error) {
        console.error('Error during full sync:', error);
        res.status(500).json({ error: 'Fout bij volledige synchronisatie' });
    }
});
export default router;
//# sourceMappingURL=sync-logs.js.map