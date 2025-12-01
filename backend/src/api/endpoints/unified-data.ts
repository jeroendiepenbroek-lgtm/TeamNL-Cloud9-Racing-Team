/**
 * Unified Data Endpoints
 * GET /api/unified/rider/:id - Multi-source rider data
 * GET /api/unified/riders - Bulk unified data  
 * GET /api/unified/cache/stats - Cache statistics
 * DELETE /api/unified/cache/:id? - Clear cache
 */

import { Router, Request, Response } from 'express';
import { unifiedRiderDataService } from '../../services/unified-rider-data.service.js';

const router = Router();

/**
 * GET /api/unified/rider/:id
 * Get single rider with all available sources
 * 
 * Query params:
 * - useCache: boolean (default: true)
 * - includeZwiftOfficial: boolean (default: true)  
 * - includeZwiftPower: boolean (default: true)
 * - persistToDb: boolean (default: false)
 */
router.get('/rider/:id', async (req: Request, res: Response) => {
  try {
    const riderId = parseInt(req.params.id);
    
    if (isNaN(riderId)) {
      return res.status(400).json({ error: 'Ongeldige rider ID' });
    }

    const options = {
      useCache: req.query.useCache !== 'false',
      includeZwiftOfficial: req.query.includeZwiftOfficial !== 'false',
      includeZwiftPower: req.query.includeZwiftPower !== 'false',
      persistToDb: req.query.persistToDb === 'true',
    };

    const data = await unifiedRiderDataService.getUnifiedRiderData(riderId, options);

    res.json({
      success: true,
      rider: data,
      sources: {
        zwiftRacing: data.enrichment.sources.find(s => s.source === 'zwift-racing')?.available || false,
        zwiftOfficial: data.enrichment.sources.find(s => s.source === 'zwift-official')?.available || false,
        zwiftPower: data.enrichment.sources.find(s => s.source === 'zwiftpower')?.available || false,
      },
      cached: options.useCache,
    });
  } catch (error: any) {
    console.error('[Unified API] Error fetching rider:', error);
    res.status(500).json({ 
      error: 'Fout bij ophalen rider data',
      details: error.message 
    });
  }
});

/**
 * GET /api/unified/riders
 * Get multiple riders (bulk)
 * 
 * Query params:
 * - ids: comma-separated rider IDs (required)
 * - useCache: boolean (default: true)
 */
router.get('/riders', async (req: Request, res: Response) => {
  try {
    const idsParam = req.query.ids as string;
    
    if (!idsParam) {
      return res.status(400).json({ error: 'Parameter "ids" is verplicht (comma-separated)' });
    }

    const riderIds = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (riderIds.length === 0) {
      return res.status(400).json({ error: 'Geen geldige rider IDs opgegeven' });
    }

    const options = {
      useCache: req.query.useCache !== 'false',
      includeZwiftOfficial: false, // Bulk = alleen ZwiftRacing voor performance
      includeZwiftPower: false,
    };

    const data = await unifiedRiderDataService.getBulkUnifiedData(riderIds, options);

    res.json({
      success: true,
      count: data.length,
      riders: data,
    });
  } catch (error: any) {
    console.error('[Unified API] Error fetching bulk riders:', error);
    res.status(500).json({ 
      error: 'Fout bij ophalen riders',
      details: error.message 
    });
  }
});

/**
 * GET /api/unified/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = unifiedRiderDataService.getCacheStats();
    
    res.json({
      success: true,
      cache: {
        size: stats.size,
        entries: stats.entries.length,
        riderIds: stats.entries,
      },
    });
  } catch (error: any) {
    console.error('[Unified API] Error getting cache stats:', error);
    res.status(500).json({ 
      error: 'Fout bij ophalen cache stats',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/unified/cache/:id?
 * Clear cache (all or specific rider)
 */
router.delete('/cache/:id?', async (req: Request, res: Response) => {
  try {
    const riderIdParam = req.params.id;
    
    if (riderIdParam) {
      const riderId = parseInt(riderIdParam);
      if (isNaN(riderId)) {
        return res.status(400).json({ error: 'Ongeldige rider ID' });
      }
      
      unifiedRiderDataService.clearCache(riderId);
      
      res.json({
        success: true,
        message: `Cache gecleared voor rider ${riderId}`,
      });
    } else {
      unifiedRiderDataService.clearCache();
      
      res.json({
        success: true,
        message: 'Volledige cache gecleared',
      });
    }
  } catch (error: any) {
    console.error('[Unified API] Error clearing cache:', error);
    res.status(500).json({ 
      error: 'Fout bij clearen cache',
      details: error.message 
    });
  }
});

export default router;
