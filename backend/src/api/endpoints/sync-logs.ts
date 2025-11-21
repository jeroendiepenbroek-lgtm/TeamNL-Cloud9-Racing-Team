/**
 * Endpoint 6: Sync Logs - GET /api/sync-logs
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
import { syncServiceV2 as syncService } from '../../services/sync-v2.service.js';

const router = Router();

// GET /api/sync-logs - Haal sync logs op
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const rawLogs = await supabase.getSyncLogs(limit);
    
    // Map database fields to expected frontend fields
    const logs = rawLogs.map(log => ({
      ...log,
      type_label: log.endpoint,
      items_synced: log.records_processed,
      synced_at: log.created_at,
    }));
    
    res.json({
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Fout bij ophalen sync logs' });
  }
});

// POST /api/sync-logs/full-sync - Voer volledige sync uit
router.post('/full-sync', async (req: Request, res: Response) => {
  try {
    const clubId = req.body.clubId || 11818;
    await syncService.syncAll(clubId);
    
    const logs = await supabase.getSyncLogs(10);
    
    res.json({
      success: true,
      message: 'Volledige synchronisatie voltooid',
      recentLogs: logs,
    });
  } catch (error) {
    console.error('Error during full sync:', error);
    res.status(500).json({ error: 'Fout bij volledige synchronisatie' });
  }
});

export default router;
