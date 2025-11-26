/**
 * Rider Enrichment API Endpoint
 * GET /api/riders/:riderId/enriched - Get rider with most recent data
 */

import { Router, Request, Response } from 'express';
import { riderEnrichmentService } from '../../services/rider-enrichment.service.js';

const router = Router();

/**
 * GET /api/riders/:riderId/enriched
 * Get rider data enriched with recent race results
 */
router.get('/:riderId/enriched', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.riderId);
    
    if (isNaN(riderId)) {
      return res.status(400).json({ error: 'Invalid rider ID' });
    }
    
    console.log(`[API] Enriching rider ${riderId}...`);
    
    const enriched = await riderEnrichmentService.enrichRiderData(riderId);
    
    res.json({
      success: true,
      rider: enriched,
      meta: {
        ftpSource: enriched.enrichmentSource.ftpSource,
        categorySource: enriched.enrichmentSource.categorySource,
        confidence: enriched.enrichmentSource.confidence,
        lastResultDate: enriched.enrichmentSource.lastResultDate,
      },
    });
    
  } catch (error: any) {
    console.error('[API] Enrichment error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to enrich rider data',
      message: error.message,
    });
  }
});

export default router;
