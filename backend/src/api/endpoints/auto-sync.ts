/**
 * US8: Auto-Sync Status & Manual Trigger Endpoints
 */

import { Request, Response, Router } from 'express';
import { autoSyncService } from '../../services/auto-sync.service.js';

const router = Router();

// GET /api/auto-sync/status - Haal sync status op
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = autoSyncService.getStatus();
    
    res.json({
      ...status,
      lastSync: status.lastSync?.toISOString() || null,
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Fout bij ophalen sync status' });
  }
});

// POST /api/auto-sync/trigger - Trigger handmatige sync
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    console.log('[Manual Sync] Triggered via API');
    const result = await autoSyncService.syncTeamMembers();
    
    res.json({
      success: true,
      message: 'Sync voltooid',
      result,
    });
  } catch (error) {
    console.error('Error triggering manual sync:', error);
    res.status(500).json({ error: 'Fout bij uitvoeren sync' });
  }
});

export default router;
