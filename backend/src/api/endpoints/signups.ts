/**
 * Signups API Endpoints
 * Sync and query event signups
 */

import { Router, Request, Response } from 'express';
// Sync deprecated - use unified endpoints at /api/v2/*
import { supabase } from '../../services/supabase.service.js';

const router = Router();
const supabaseService = supabase;

/**
 * POST /api/signups/sync/:eventId - DEPRECATED
 */
router.post('/sync/:eventId', async (req: Request, res: Response) => {
  res.status(410).json({
    error: 'This endpoint is deprecated',
    message: 'Use /api/v2/sync/* endpoints for unified multi-source syncing'
  });
});

/**
 * POST /api/signups/sync-batch - DEPRECATED
 */
router.post('/sync-batch', async (req: Request, res: Response) => {
  res.status(410).json({
    error: 'This endpoint is deprecated',
    message: 'Use /api/v2/sync/* endpoints for unified multi-source syncing'
  });
});

/**
 * GET /api/signups/debug/:eventId
 * Debug endpoint - check raw signup data voor event
 */
router.get('/debug/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    // Direct query via supabase service
    const allSignups = await supabaseService['client']
      .from('zwift_api_event_signups')
      .select('event_id, rider_name, pen_name')
      .limit(1000);

    if (allSignups.error) throw allSignups.error;

    // Filter voor dit event
    const forEvent = (allSignups.data || []).filter((s: any) => 
      String(s.event_id) === String(eventId)
    );

    res.json({
      eventId,
      totalInDb: allSignups.data?.length || 0,
      forThisEvent: forEvent.length,
      sampleAll: allSignups.data?.slice(0, 3).map((s: any) => ({
        event_id: s.event_id,
        event_id_type: typeof s.event_id,
        rider_name: s.rider_name,
        pen_name: s.pen_name,
      })),
      forEvent: forEvent.slice(0, 5),
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: String(error) });
  }
});

export default router;
