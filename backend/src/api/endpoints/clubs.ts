/**
 * Endpoint 1: Clubs - GET /api/clubs/:id
 */

import { Request, Response, Router } from 'express';
import { supabase } from '../../services/supabase.service.js';
// Sync deprecated - use unified endpoints at /api/v2/*

const router = Router();

// GET /api/clubs/:id - Haal club op uit database
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.id);
    const club = await supabase.getClub(clubId);
    
    if (!club) {
      return res.status(404).json({ error: 'Club niet gevonden' });
    }
    
    res.json(club);
  } catch (error) {
    console.error('Error fetching club:', error);
    res.status(500).json({ error: 'Fout bij ophalen club' });
  }
});

// POST /api/clubs/:id/sync - DEPRECATED
router.post('/:id/sync', async (req: Request, res: Response) => {
  res.status(410).json({
    error: 'This endpoint is deprecated',
    message: 'Use /api/v2/sync/* endpoints for unified multi-source syncing',
    migration: 'POST /api/v2/sync/riders for club member sync'
  });
});

export default router;
