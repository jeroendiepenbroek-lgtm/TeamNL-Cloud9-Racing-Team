/**
 * Rate Limiter Monitoring Endpoint
 * 
 * GET /api/rate-limiter/status - Check current rate limiter status
 */

import { Router, Request, Response } from 'express';
import { rateLimiter } from '../../utils/rate-limiter.js';

const router = Router();

/**
 * GET /api/rate-limiter/status
 * Returns current status van alle rate limited endpoints
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = rateLimiter.getStatus();
    
    // Format voor frontend display
    const formatted = Object.entries(status).map(([endpoint, data]) => ({
      endpoint,
      callsInWindow: data.callsInWindow,
      maxCalls: data.maxCalls,
      canCall: data.canCall,
      waitTimeMs: data.waitTimeMs,
      waitTimeFormatted: formatWaitTime(data.waitTimeMs),
      utilizationPercent: Math.round((data.callsInWindow / data.maxCalls) * 100),
      status: data.canCall ? 'available' : 'rate_limited',
    }));
    
    res.json({
      timestamp: new Date().toISOString(),
      endpoints: formatted,
      summary: {
        totalEndpoints: formatted.length,
        availableEndpoints: formatted.filter(e => e.canCall).length,
        rateLimitedEndpoints: formatted.filter(e => !e.canCall).length,
        maxWaitTimeMs: Math.max(...formatted.map(e => e.waitTimeMs)),
      },
    });
  } catch (error) {
    console.error('[RateLimiterAPI] Error getting status:', error);
    res.status(500).json({ error: 'Failed to get rate limiter status' });
  }
});

/**
 * POST /api/rate-limiter/reset
 * Reset rate limiter (alleen voor testing/development)
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    // Safety check: alleen in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        error: 'Rate limiter reset not allowed in production' 
      });
    }
    
    rateLimiter.reset();
    
    res.json({
      success: true,
      message: 'Rate limiter reset successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RateLimiterAPI] Error resetting:', error);
    res.status(500).json({ error: 'Failed to reset rate limiter' });
  }
});

function formatWaitTime(ms: number): string {
  if (ms === 0) return 'Ready';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.ceil(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.ceil(ms / 60000)}min`;
  return `${Math.ceil(ms / 3600000)}h`;
}

export default router;
