/**
 * Endpoint 6: Sync Logs - GET /api/sync-logs
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
// Sync deprecated - use unified endpoints at /api/v2/*

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

// POST /api/sync-logs/full-sync - DEPRECATED
router.post('/full-sync', async (req: Request, res: Response) => {
  res.status(410).json({
    error: 'This endpoint is deprecated',
    message: 'Use /api/v2/sync/* endpoints for unified multi-source syncing',
    migration: 'POST /api/v2/sync/all for full sync'
  });
});

export default router;
