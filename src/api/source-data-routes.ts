import { Router, Request, Response } from 'express';
import {
  clubSourceRepo,
  eventResultsSourceRepo,
  eventZpSourceRepo,
  riderSourceRepo,
  rateLimitRepo,
} from '../database/source-repositories.js';
import { SourceDataCollector } from '../services/source-data-collector.js';
import { ZwiftApiClient } from './zwift-client.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

/**
 * 🚀 SOURCE DATA API ROUTES (Brondatatabellen)
 * 
 * 🇳🇱 DOEL:
 * REST API endpoints voor toegang tot immutable source data snapshots.
 * Gebruikt voor debugging, trend analyse, en data auditing.
 * 
 * ENDPOINT CATEGORIEËN:
 * 
 * 1️⃣ READ ENDPOINTS (GET) - Query opgeslagen snapshots:
 *    - /clubs/:clubId - Alle club snapshots
 *    - /clubs/:clubId/latest - Laatste club snapshot + raw JSON
 *    - /events/:eventId/results - Event results data
 *    - /events/:eventId/zp - ZwiftPower data (power curves!)
 *    - /events/recent?days=90 - Recent events (beide endpoints)
 *    - /riders/:riderId - Alle rider snapshots
 *    - /riders/:riderId/latest - Laatste rider snapshot + raw JSON
 *    - /rate-limits?hours=24 - Rate limit monitoring
 * 
 * 2️⃣ COLLECTION ENDPOINTS (POST) - Trigger data fetching:
 *    - POST /collect/rider/:riderId - US5: Fetch rider + club data
 *    - POST /collect/events/:riderId - US6: Fetch 90-dagen event history
 *    - POST /scan/events - US7: Scan nieuwe events (hourly cron)
 * 
 * RATE LIMITS:
 * - Rider: 5 calls/min
 * - Club: 1 call/60min
 * - Events: 1 call/min (per endpoint)
 * 
 * RESPONSE FORMAT:
 * - Parsed key fields: name, eventId, riderId, fetchedAt, etc.
 * - Raw JSON: Complete API response (alleen in /latest endpoints)
 * - Metadata: responseTime, rateLimitRemaining, rateLimitReset
 * 
 * ARCHITECTUUR:
 * Routes → Repositories → Prisma → SQLite/PostgreSQL
 *       ↘ SourceDataCollector → ZwiftApiClient → External API
 */

const router = Router();

// Create API client instance
const zwiftApiClient = new ZwiftApiClient({
  apiKey: config.zwiftApiKey,
  baseUrl: config.zwiftApiBaseUrl,
  timeout: 30000,
}, true); // Enable rate limit tracking

// Simple async handler - wraps async routes to catch errors
const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response) => {
    Promise.resolve(fn(req, res)).catch((error: Error) => {
      logger.error('Route error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    });
  };
};

// ============================================================================
// SOURCE DATA ENDPOINTS (READ-ONLY ACCESS TO RAW API DATA)
// ============================================================================

/**
 * GET /api/source-data/clubs/:clubId
 * Haal alle opgeslagen club data snapshots op
 */
router.get('/clubs/:clubId', asyncHandler(async (req: Request, res: Response) => {
  const clubId = parseInt(req.params.clubId);
  const limit = parseInt(req.query.limit as string) || 10;

  const snapshots = await clubSourceRepo.getAllClubSnapshots(clubId, limit);

  res.json({
    clubId,
    snapshotCount: snapshots.length,
    snapshots: snapshots.map(s => ({
      id: s.id,
      name: s.name,
      memberCount: s.memberCount,
      countryCode: s.countryCode,
      fetchedAt: s.fetchedAt,
      rateLimitRemaining: s.rateLimitRemaining,
      responseTime: s.responseTime,
    })),
  });
}));

/**
 * GET /api/source-data/clubs/:clubId/latest
 * Haal laatste club data snapshot op
 */
router.get('/clubs/:clubId/latest', asyncHandler(async (req: Request, res: Response) => {
  const clubId = parseInt(req.params.clubId);

  const snapshot = await clubSourceRepo.getLatestClubData(clubId);

  if (!snapshot) {
    return res.status(404).json({ error: 'Geen club data gevonden' });
  }

  res.json({
    id: snapshot.id,
    clubId: snapshot.clubId,
    name: snapshot.name,
    memberCount: snapshot.memberCount,
    countryCode: snapshot.countryCode,
    fetchedAt: snapshot.fetchedAt,
    responseTime: snapshot.responseTime,
    rawData: JSON.parse(snapshot.rawData),
  });
}));

/**
 * GET /api/source-data/events/:eventId/results
 * Haal event results data op (/public/results/:eventId)
 */
router.get('/events/:eventId/results', asyncHandler(async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.eventId);

  const snapshot = await eventResultsSourceRepo.getLatestEventResults(eventId);

  if (!snapshot) {
    return res.status(404).json({ error: 'Geen event results data gevonden' });
  }

  res.json({
    id: snapshot.id,
    eventId: snapshot.eventId,
    eventName: snapshot.eventName,
    eventDate: snapshot.eventDate,
    participantsCount: snapshot.participantsCount,
    finishersCount: snapshot.finishersCount,
    fetchedAt: snapshot.fetchedAt,
    responseTime: snapshot.responseTime,
    rawData: JSON.parse(snapshot.rawData),
  });
}));

/**
 * GET /api/source-data/events/:eventId/zp
 * Haal ZwiftPower event data op (/public/zp/:eventId/results)
 */
router.get('/events/:eventId/zp', asyncHandler(async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.eventId);

  const snapshot = await eventZpSourceRepo.getLatestEventZpData(eventId);

  if (!snapshot) {
    return res.status(404).json({ error: 'Geen ZwiftPower event data gevonden' });
  }

  res.json({
    id: snapshot.id,
    eventId: snapshot.eventId,
    eventName: snapshot.eventName,
    eventDate: snapshot.eventDate,
    participantsCount: snapshot.participantsCount,
    fetchedAt: snapshot.fetchedAt,
    responseTime: snapshot.responseTime,
    rawData: JSON.parse(snapshot.rawData),
  });
}));

/**
 * GET /api/source-data/events/recent
 * Haal recente events op (beide endpoints)
 */
router.get('/events/recent', asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 90;

  const resultsEvents = await eventResultsSourceRepo.getRecentEvents(days);
  const zpEvents = await eventZpSourceRepo.getRecentZpEvents(days);

  res.json({
    days,
    resultsEndpoint: {
      count: resultsEvents.length,
      events: resultsEvents.map(e => ({
        eventId: e.eventId,
        eventName: e.eventName,
        eventDate: e.eventDate,
        participantsCount: e.participantsCount,
        fetchedAt: e.fetchedAt,
      })),
    },
    zpEndpoint: {
      count: zpEvents.length,
      events: zpEvents.map(e => ({
        eventId: e.eventId,
        eventName: e.eventName,
        eventDate: e.eventDate,
        participantsCount: e.participantsCount,
        fetchedAt: e.fetchedAt,
      })),
    },
  });
}));

/**
 * GET /api/source-data/riders/:riderId
 * Haal alle rider data snapshots op
 */
router.get('/riders/:riderId', asyncHandler(async (req: Request, res: Response) => {
  const riderId = parseInt(req.params.riderId);
  const limit = parseInt(req.query.limit as string) || 10;

  const snapshots = await riderSourceRepo.getAllRiderSnapshots(riderId, limit);

  res.json({
    riderId,
    snapshotCount: snapshots.length,
    snapshots: snapshots.map(s => ({
      id: s.id,
      name: s.name,
      ranking: s.ranking,
      categoryRacing: s.categoryRacing,
      ftp: s.ftp,
      fetchedAt: s.fetchedAt,
      responseTime: s.responseTime,
    })),
  });
}));

/**
 * GET /api/source-data/riders/:riderId/latest
 * Haal laatste rider data snapshot op
 */
router.get('/riders/:riderId/latest', asyncHandler(async (req: Request, res: Response) => {
  const riderId = parseInt(req.params.riderId);

  const snapshot = await riderSourceRepo.getLatestRiderData(riderId);

  if (!snapshot) {
    return res.status(404).json({ error: 'Geen rider data gevonden' });
  }

  res.json({
    id: snapshot.id,
    riderId: snapshot.riderId,
    name: snapshot.name,
    ranking: snapshot.ranking,
    categoryRacing: snapshot.categoryRacing,
    ftp: snapshot.ftp,
    fetchedAt: snapshot.fetchedAt,
    responseTime: snapshot.responseTime,
    rawData: JSON.parse(snapshot.rawData),
  });
}));

/**
 * GET /api/source-data/rate-limits
 * Haal rate limit status op voor alle endpoints
 */
router.get('/rate-limits', asyncHandler(async (req: Request, res: Response) => {
  const hours = parseInt(req.query.hours as string) || 24;

  const stats = await rateLimitRepo.getRateLimitStats(hours);
  const activeResets = await rateLimitRepo.getActiveRateLimits();

  res.json({
    period: `${hours} hours`,
    stats,
    activeRateLimits: activeResets.map(r => ({
      endpoint: r.endpoint,
      limitMax: r.limitMax,
      limitRemaining: r.limitRemaining,
      limitResetAt: r.limitResetAt,
      minutesUntilReset: Math.ceil((r.limitResetAt.getTime() - Date.now()) / 60000),
    })),
  });
}));

// ============================================================================
// DATA COLLECTION ENDPOINTS (TRIGGER US5-US7)
// ============================================================================

/**
 * POST /api/source-data/collect/rider/:riderId
 * US5: Trigger data collection voor specific rider (alle endpoints)
 */
router.post('/collect/rider/:riderId', asyncHandler(async (req: Request, res: Response) => {
  const riderId = parseInt(req.params.riderId);

  logger.info(`📥 API trigger: US5 data collection voor rider ${riderId}`);

  const collector = new SourceDataCollector(zwiftApiClient);
  const results = await collector.fetchAllRiderData(riderId);

  res.json({
    success: results.errors.length === 0,
    riderId,
    results: {
      riderDataSaved: !!results.riderData,
      clubDataSaved: !!results.clubData,
    },
    errors: results.errors,
  });
}));

/**
 * POST /api/source-data/collect/events/:riderId
 * US6: Trigger event collection voor rider (laatste 90 dagen, beide endpoints)
 */
router.post('/collect/events/:riderId', asyncHandler(async (req: Request, res: Response) => {
  const riderId = parseInt(req.params.riderId);
  const days = parseInt(req.body.days as string) || 90;

  logger.info(`📥 API trigger: US6 event collection voor rider ${riderId} (laatste ${days} dagen)`);

  const collector = new SourceDataCollector(zwiftApiClient);
  const results = await collector.fetchRecentEvents(riderId, days);

  res.json({
    success: results.errors.length === 0,
    riderId,
    days,
    results: {
      eventsProcessed: results.eventsProcessed,
      resultsDataSaved: results.resultsDataSaved,
      zpDataSaved: results.zpDataSaved,
    },
    errors: results.errors,
  });
}));

/**
 * POST /api/source-data/scan/events
 * US7: Trigger hourly event scan voor multiple riders
 */
router.post('/scan/events', asyncHandler(async (req: Request, res: Response) => {
  const riderIds = req.body.riderIds as number[];

  if (!riderIds || !Array.isArray(riderIds)) {
    return res.status(400).json({ error: 'riderIds array vereist' });
  }

  logger.info(`📥 API trigger: US7 hourly event scan voor ${riderIds.length} riders`);

  const collector = new SourceDataCollector(zwiftApiClient);
  const results = await collector.scanForNewEvents(riderIds);

  res.json({
    success: results.errors.length === 0,
    riderCount: riderIds.length,
    results: {
      ridersScanned: results.ridersScanned,
      newEventsFound: results.newEventsFound,
    },
    errors: results.errors,
  });
}));

export default router;
