/**
 * Rider Historical Snapshots
 * GET /api/riders/:riderId/snapshot/:timestamp
 * 
 * Haalt rider data op uit ZwiftRacing API voor specifiek tijdstip (epoch)
 */

import { Router, Request, Response } from 'express';
import { zwiftClient } from '../zwift-client.js';
import { supabase } from '../../services/supabase.service.js';

const router = Router();

/**
 * GET /api/riders/:riderId/snapshot/:timestamp
 * 
 * @param riderId - Zwift rider ID
 * @param timestamp - Unix epoch timestamp (seconds, zonder milliseconds)
 * @returns Rider data zoals die was op dat moment
 */
router.get('/:riderId/snapshot/:timestamp', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    const timestamp = parseInt(req.params.timestamp);

    if (isNaN(riderId) || isNaN(timestamp)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid riderId or timestamp'
      });
    }

    // Validate timestamp (moet epoch zijn, max 10 digits)
    if (timestamp.toString().length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Timestamp must be in seconds (not milliseconds)'
      });
    }

    console.log(`📸 Fetching rider ${riderId} snapshot at ${timestamp} (${new Date(timestamp * 1000).toISOString()})`);

    // Call ZwiftRacing API historic endpoint
    const snapshot = await zwiftClient.getRiderAtTime(riderId, timestamp);

    // Optional: Save to database voor caching
    await supabase.saveRiderSnapshot({
      rider_id: riderId,
      snapshot_time: new Date(timestamp * 1000).toISOString(),
      data: snapshot
    });

    res.json({
      success: true,
      rider_id: riderId,
      snapshot_time: new Date(timestamp * 1000).toISOString(),
      snapshot
    });

  } catch (error: any) {
    console.error('Error fetching rider snapshot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rider snapshot',
      message: error.message
    });
  }
});

/**
 * GET /api/riders/:riderId/history
 * 
 * Haal alle opgeslagen snapshots voor rider op
 */
router.get('/:riderId/snapshots', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    const limit = parseInt(req.query.limit as string) || 50;

    const snapshots = await supabase.getRiderSnapshots(riderId, limit);

    res.json({
      success: true,
      rider_id: riderId,
      count: snapshots.length,
      snapshots
    });

  } catch (error: any) {
    console.error('Error fetching rider snapshots:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rider snapshots',
      message: error.message
    });
  }
});

export default router;
