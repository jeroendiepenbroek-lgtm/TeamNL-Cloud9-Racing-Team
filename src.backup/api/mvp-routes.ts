/**
 * MVP API Routes
 * 
 * Clean API met alleen essentiële endpoints:
 * 1. Rider upload (TXT/CSV)
 * 2. Event scraping
 * 3. Event enrichment (brondatatabellen)
 * 4. Scheduler configuratie
 */

import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import prisma from '../database/client.js';
import { riderUploadService } from '../services/mvp-rider-upload.service.js';
import { eventScraperService } from '../services/mvp-event-scraper.service.js';
import { schedulerService } from '../services/mvp-scheduler.service.js';
import { mvpRiderSyncService } from '../services/mvp-rider-sync.service.js';
import { mvpClubSyncService } from '../services/mvp-club-sync.service.js';
import { logger } from '../utils/logger.js';
import { firebaseSyncService } from '../services/firebase-sync.service.js';
import { unifiedSyncService } from '../services/unified-sync.service.js';

// Dummy enricher service for legacy routes
const eventEnricherService = {
  async getEnrichmentStats() { return { enriched: 0, unenriched: 0 }; },
  async enrichEvent(eventId: number) { return { eventId, success: false, message: 'Use unified sync instead' }; },
  async getUnenrichedEvents(limit: number) { return []; },
  async enrichEvents(eventIds: number[]) { return { total: 0, enriched: 0, failed: 0 }; },
};

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

/**
 * Error handler middleware
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// HEALTH & STATUS
// ============================================================================

/**
 * Health check
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0-mvp',
  });
});

/**
 * MVP Status overview
 */
router.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const riders = await prisma.rider.count();
  const clubs = await prisma.club.count();
  const events = await prisma.event.count();
  const raceResults = await prisma.raceResult.count();
  
  const enrichmentStats = await eventEnricherService.getEnrichmentStats();
  const schedulerStatus = schedulerService.getStatus();

  res.json({
    database: {
      riders,
      clubs,
      events,
      raceResults,
    },
    enrichment: enrichmentStats,
    scheduler: schedulerStatus,
  });
}));

/**
 * POST /api/firebase/cleanup
 * Cleanup specified Firestore collections. Requires FIREBASE_CLEAN_TOKEN env var and matching token in body.
 * Body: { token: string, collections?: string[] }
 */
router.post('/firebase/cleanup', asyncHandler(async (req: Request, res: Response) => {
  const { token, collections } = req.body || {};
  const expected = process.env.FIREBASE_CLEAN_TOKEN;

  if (!expected) {
    return res.status(400).json({ error: 'FIREBASE_CLEAN_TOKEN is not configured on the server' });
  }

  if (!token || token !== expected) {
    return res.status(403).json({ error: 'Invalid cleanup token' });
  }

  if (!firebaseSyncService.isAvailable()) {
    return res.status(503).json({ error: 'Firebase not initialized' });
  }

  const toClean = Array.isArray(collections) && collections.length > 0
    ? collections
    : [
      'riders','clubs','events','raceResults','riderHistory','clubRoster','syncLogs'
    ];

  const results = await firebaseSyncService.cleanup(toClean);

  res.json({ message: 'Cleanup executed', results });
}));

// ============================================================================
// RIDER UPLOAD (US: Upload RiderIDs via TXT/CSV)
// ============================================================================

/**
 * POST /api/riders/upload
 * 
 * Upload RiderIDs via TXT or CSV file
 * 
 * Expected formats:
 * - TXT: One rider ID per line
 * - CSV: rider_id,name (optional name column)
 * 
 * @example
 * curl -X POST http://localhost:3000/api/riders/upload \
 *   -F "file=@riders.txt"
 */
router.post('/riders/upload', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  logger.info(`📤 Upload riders file: ${req.file.originalname} (${req.file.size} bytes)`);

  const fileContent = req.file.buffer.toString('utf-8');
  const riderIds = riderUploadService.parseRiderIds(fileContent);
  const result = await riderUploadService.uploadRiders(riderIds);

  res.json({
    success: true,
    message: `Processed ${result.totalProcessed} riders: ${result.successful} successful, ${result.failed} failed`,
    stats: {
      total: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
    },
    results: result.results,
  });
}));

/**
 * POST /api/riders/upload-json
 * 
 * Upload RiderIDs via JSON body
 * 
 * @example
 * curl -X POST http://localhost:3000/api/riders/upload-json \
 *   -H "Content-Type: application/json" \
 *   -d '{"riderIds": [150437, 123456]}'
 */
router.post('/riders/upload-json', asyncHandler(async (req: Request, res: Response) => {
  const { riderIds } = req.body;

  if (!Array.isArray(riderIds) || riderIds.length === 0) {
    res.status(400).json({ error: 'riderIds array is required' });
    return;
  }

  logger.info(`📤 Upload ${riderIds.length} riders via JSON`);

  const result = await riderUploadService.uploadRiders(riderIds);

  res.json({
    success: true,
    message: `Processed ${result.totalProcessed} riders: ${result.successful} successful, ${result.failed} failed`,
    stats: {
      total: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
    },
    results: result.results,
  });
}));

/**
 * GET /api/riders
 * 
 * List all riders
 */
router.get('/riders', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const riders = await prisma.rider.findMany({
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
    include: {
      club: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const total = await prisma.rider.count();

  res.json({
    total,
    limit,
    offset,
    riders: riders.map(r => ({
      zwiftId: r.zwiftId,
      name: r.name,
      club: r.club ? { id: r.club.id, name: r.club.name } : null,
      ftp: r.ftp,
      weight: r.weight,
      ranking: r.ranking,
      categoryRacing: r.categoryRacing,
      createdAt: r.createdAt,
    })),
  });
}));

/**
 * GET /api/riders/:zwiftId
 * 
 * Get single rider details
 */
router.get('/riders/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);

  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Invalid rider ID' });
    return;
  }

  const rider = await prisma.rider.findUnique({
    where: { zwiftId },
    include: {
      club: true,
      raceResults: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          event: true,
        },
      },
    },
  });

  if (!rider) {
    res.status(404).json({ error: 'Rider not found' });
    return;
  }

  res.json(rider);
}));

/**
 * DELETE /api/riders/:zwiftId
 * 
 * Delete rider and all associated data
 */
router.delete('/riders/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);

  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Invalid rider ID' });
    return;
  }

  const rider = await prisma.rider.findUnique({
    where: { zwiftId },
  });

  if (!rider) {
    res.status(404).json({ error: 'Rider not found' });
    return;
  }

  // Delete race results first (foreign key)
  await prisma.raceResult.deleteMany({
    where: { riderId: rider.id },
  });

  // Delete rider
  await prisma.rider.delete({
    where: { zwiftId },
  });

  logger.info(`🗑️  Deleted rider ${zwiftId} and associated data`);

  res.json({
    success: true,
    message: `Rider ${zwiftId} deleted`,
  });
}));

// ============================================================================
// EVENT SCRAPING (US: Scrape events via ZwiftRacing.app)
// ============================================================================

/**
 * POST /api/riders/:zwiftId/scrape-events
 * 
 * Scrape events voor specifieke rider
 * 
 * @example
 * curl -X POST http://localhost:3000/api/riders/150437/scrape-events \
 *   -H "Content-Type: application/json" \
 *   -d '{"days": 90}'
 */
router.post('/riders/:zwiftId/scrape-events', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);
  const { days = 90 } = req.body;

  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Invalid rider ID' });
    return;
  }

  logger.info(`🕷️  Scrape events voor rider ${zwiftId} (${days} dagen)`);

  const result = await eventScraperService.scrapeRiderEvents(zwiftId, days);

  res.json({
    success: true,
    message: `Found ${result.totalEvents} events (${result.newEvents} new)`,
    stats: result,
  });
}));

/**
 * POST /api/scrape-all-events
 * 
 * Scrape events voor alle riders in database
 * 
 * @example
 * curl -X POST http://localhost:3000/api/scrape-all-events \
 *   -H "Content-Type: application/json" \
 *   -d '{"days": 90}'
 */
router.post('/scrape-all-events', asyncHandler(async (req: Request, res: Response) => {
  const { days = 90 } = req.body;

  logger.info(`🕷️  Scrape events voor alle riders (${days} dagen)`);

  // Get all riders
  const riders = await prisma.rider.findMany({
    select: { zwiftId: true },
  });

  let totalNewEvents = 0;
  let ridersScraped = 0;
  let errors = 0;

  for (const rider of riders) {
    try {
      const result = await eventScraperService.scrapeRiderEvents(rider.zwiftId, days);
      totalNewEvents += result.newEvents;
      ridersScraped++;

      // Small delay between riders
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      logger.error(`  ❌ Error scraping rider ${rider.zwiftId}:`, error.message);
      errors++;
    }
  }

  res.json({
    success: true,
    message: `Scraped ${ridersScraped} riders, found ${totalNewEvents} new events`,
    stats: {
      ridersScraped,
      totalRiders: riders.length,
      newEvents: totalNewEvents,
      errors,
    },
  });
}));

/**
 * GET /api/events
 * 
 * List all events
 */
router.get('/events', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  const events = await prisma.event.findMany({
    take: limit,
    skip: offset,
    orderBy: { eventDate: 'desc' },
    include: {
      _count: {
        select: { results: true },
      },
    },
  });

  const total = await prisma.event.count();

  res.json({
    total,
    limit,
    offset,
    events: events.map(e => ({
      id: e.id,
      name: e.name,
      eventDate: e.eventDate,
      eventType: e.eventType,
      routeName: e.routeName,
      distance: e.distance,
      totalFinishers: e.totalFinishers,
      resultsCount: e._count.results,
    })),
  });
}));

/**
 * GET /api/events/:eventId
 * 
 * Get event details
 */
router.get('/events/:eventId', asyncHandler(async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.eventId);

  if (isNaN(eventId)) {
    res.status(400).json({ error: 'Invalid event ID' });
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      results: {
        include: {
          rider: {
            select: {
              zwiftId: true,
              name: true,
              club: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  res.json(event);
}));

// ============================================================================
// EVENT ENRICHMENT (US: Brondatatabellen via API endpoints)
// ============================================================================

/**
 * POST /api/events/:eventId/enrich
 * 
 * Enrich event met data van beide API endpoints
 * 
 * @example
 * curl -X POST http://localhost:3000/api/events/5163788/enrich
 */
router.post('/events/:eventId/enrich', asyncHandler(async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.eventId);

  if (isNaN(eventId)) {
    res.status(400).json({ error: 'Invalid event ID' });
    return;
  }

  logger.info(`🔍 Enrich event ${eventId}`);

  const result = await eventEnricherService.enrichEvent(eventId);

  if (result.error) {
    res.status(500).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.json({
    success: true,
    message: result.skipped ? 'Event already enriched' : 'Event enriched successfully',
    stats: result,
  });
}));

/**
 * POST /api/enrich-all-events
 * 
 * Enrich alle events die nog geen brondatatabellen data hebben
 * 
 * @example
 * curl -X POST http://localhost:3000/api/enrich-all-events \
 *   -H "Content-Type: application/json" \
 *   -d '{"limit": 50}'
 */
router.post('/enrich-all-events', asyncHandler(async (req: Request, res: Response) => {
  const { limit = 50 } = req.body;

  logger.info(`🔍 Enrich events (max ${limit})`);

  const eventIds = await eventEnricherService.getUnenrichedEvents(limit);

  if (eventIds.length === 0) {
    res.json({
      success: true,
      message: 'No events need enrichment',
      stats: {
        total: 0,
        enriched: 0,
        skipped: 0,
        failed: 0,
      },
    });
    return;
  }

  const result = await eventEnricherService.enrichEvents(eventIds);

  res.json({
    success: true,
    message: `Enriched ${result.enriched} events`,
    stats: result,
  });
}));

/**
 * GET /api/enrichment-stats
 * 
 * Get brondatatabellen coverage statistics
 */
router.get('/enrichment-stats', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await eventEnricherService.getEnrichmentStats();
  res.json(stats);
}));

// ============================================================================
// SCHEDULER (US: Configureerbare hourly jobs)
// ============================================================================

/**
 * GET /api/scheduler/status
 * 
 * Get scheduler status
 */
router.get('/scheduler/status', (_req: Request, res: Response) => {
  const status = schedulerService.getStatus();
  res.json(status);
});

/**
 * GET /api/scheduler/config
 * 
 * Get scheduler configuratie
 */
router.get('/scheduler/config', (_req: Request, res: Response) => {
  const config = schedulerService.getConfig();
  res.json(config);
});

/**
 * PUT /api/scheduler/config
 * 
 * Update scheduler configuratie
 * 
 * @example
 * curl -X PUT http://localhost:3000/api/scheduler/config \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "enabled": true,
 *     "scrapeEventsEnabled": true,
 *     "scrapeEventsCron": "0 * * * *",
 *     "syncRidersEnabled": true,
 *     "syncRidersCron": "15 * * * *",
 *     "enrichEventsEnabled": true,
 *     "enrichEventsCron": "30 * * * *",
 *     "maxEventsPerRun": 50
 *   }'
 */
router.put('/scheduler/config', asyncHandler(async (req: Request, res: Response) => {
  const updates = req.body;

  logger.info('⚙️  Update scheduler config');

  const config = await schedulerService.updateConfig(updates);

  res.json({
    success: true,
    message: 'Scheduler config updated',
    config,
  });
}));

/**
 * POST /api/scheduler/start
 * 
 * Start scheduler
 */
router.post('/scheduler/start', asyncHandler(async (_req: Request, res: Response) => {
  logger.info('▶️  Start scheduler');

  await schedulerService.start();

  res.json({
    success: true,
    message: 'Scheduler started',
  });
}));

/**
 * POST /api/scheduler/stop
 * 
 * Stop scheduler
 */
router.post('/scheduler/stop', (_req: Request, res: Response) => {
  logger.info('⏸️  Stop scheduler');

  schedulerService.stop();

  res.json({
    success: true,
    message: 'Scheduler stopped',
  });
});

// ============================================================================
// CLUBS (US: Extract ClubID van riders)
// ============================================================================

/**
 * GET /api/clubs
 * 
 * List all clubs (extracted from riders)
 */
router.get('/clubs', asyncHandler(async (_req: Request, res: Response) => {
  const clubs = await prisma.club.findMany({
    orderBy: { memberCount: 'desc' },
  });

  // Count riders per club
  const clubsWithCounts = await Promise.all(
    clubs.map(async (c) => {
      const ridersInDb = await prisma.rider.count({
        where: { clubId: c.id },
      });
      return {
        id: c.id,
        name: c.name,
        memberCount: c.memberCount,
        ridersInDb,
      };
    })
  );

  res.json({
    total: clubs.length,
    clubs: clubsWithCounts,
  });
}));

/**
 * GET /api/clubs/:clubId
 * 
 * Get club details with members
 */
router.get('/clubs/:clubId', asyncHandler(async (req: Request, res: Response) => {
  const clubId = parseInt(req.params.clubId);

  if (isNaN(clubId)) {
    res.status(400).json({ error: 'Invalid club ID' });
    return;
  }

  const club = await prisma.club.findUnique({
    where: { id: clubId },
  });

  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  // Get riders for this club
  const riders = await prisma.rider.findMany({
    where: { clubId },
    select: {
      zwiftId: true,
      name: true,
      ftp: true,
      weight: true,
      ranking: true,
      categoryRacing: true,
    },
    orderBy: { ranking: 'asc' },
  });

  res.json({
    ...club,
    riders,
  });
}));

// ============================================================================
// MVP SOURCE DATA SYNC ROUTES
// ============================================================================

/**
 * POST /riders/:zwiftId/sync
 * Sync actuele rider data naar rider_source_data
 */
router.post('/riders/:zwiftId/sync', asyncHandler(async (req, res) => {
  const riderId = parseInt(req.params.zwiftId);

  if (isNaN(riderId)) {
    return res.status(400).json({ error: 'Invalid rider ID' });
  }

  logger.info(`🔄 API: Start rider sync voor ${riderId}`);

  const result = await mvpRiderSyncService.syncRider(riderId);

  if (result.success) {
    res.status(202).json({
      message: 'Rider sync queued',
      riderId,
      result,
    });
  } else {
    res.status(500).json({
      error: 'Rider sync failed',
      riderId,
      result,
    });
  }
}));

/**
 * POST /sync-all-riders
 * Sync alle tracked riders
 */
router.post('/sync-all-riders', asyncHandler(async (req, res) => {
  const { limit, clubId } = req.body;

  logger.info('🔄 API: Start bulk rider sync', { limit, clubId });

  // Start async in background
  mvpRiderSyncService.syncAllRiders({ limit, clubId })
    .then(result => {
      logger.info(`✅ Bulk rider sync voltooid: ${result.successful}/${result.total}`);
    })
    .catch(error => {
      logger.error('❌ Bulk rider sync failed:', error);
    });

  res.status(202).json({
    message: 'Bulk rider sync started in background',
    options: { limit, clubId },
  });
}));

/**
 * GET /riders/:zwiftId/history
 * Haal rider history op uit rider_history_source_data
 */
router.get('/riders/:zwiftId/history', asyncHandler(async (req, res) => {
  const riderId = parseInt(req.params.zwiftId);
  const limit = parseInt(req.query.limit as string) || 30;

  if (isNaN(riderId)) {
    return res.status(400).json({ error: 'Invalid rider ID' });
  }

  logger.info(`📊 API: Get rider history voor ${riderId} (limit: ${limit})`);

  const history = await mvpRiderSyncService.getRiderHistory(riderId, limit);

  res.json({
    riderId,
    limit,
    count: history.length,
    history,
  });
}));

/**
 * POST /clubs/:clubId/sync
 * Sync club data naar club_source_data
 */
router.post('/clubs/:clubId/sync', asyncHandler(async (req, res) => {
  const clubId = parseInt(req.params.clubId);

  if (isNaN(clubId)) {
    return res.status(400).json({ error: 'Invalid club ID' });
  }

  logger.info(`🔄 API: Start club sync voor ${clubId}`);

  const result = await mvpClubSyncService.syncClub(clubId);

  if (result.success) {
    res.status(202).json({
      message: 'Club sync queued',
      clubId,
      result,
    });
  } else {
    res.status(500).json({
      error: 'Club sync failed',
      clubId,
      result,
    });
  }
}));

/**
 * POST /clubs/:clubId/roster
 * Sync club roster naar club_roster_source_data
 */
router.post('/clubs/:clubId/roster', asyncHandler(async (req, res) => {
  const clubId = parseInt(req.params.clubId);

  if (isNaN(clubId)) {
    return res.status(400).json({ error: 'Invalid club ID' });
  }

  logger.info(`🔄 API: Start roster sync voor club ${clubId}`);

  // Start async in background
  mvpClubSyncService.syncClubRoster(clubId)
    .then(result => {
      logger.info(`✅ Roster sync voltooid voor club ${clubId}: ${result.memberCount} members`);
    })
    .catch(error => {
      logger.error(`❌ Roster sync failed voor club ${clubId}:`, error);
    });

  res.status(202).json({
    message: 'Club roster sync started in background',
    clubId,
  });
}));

/**
 * GET /clubs/:clubId/history
 * Haal club history op uit club_source_data
 */
router.get('/clubs/:clubId/history', asyncHandler(async (req, res) => {
  const clubId = parseInt(req.params.clubId);

  if (isNaN(clubId)) {
    return res.status(400).json({ error: 'Invalid club ID' });
  }

  logger.info(`📊 API: Get club history voor ${clubId}`);

  const latestData = await mvpClubSyncService.getLatestClubData(clubId);

  res.json({
    clubId,
    latestData,
  });
}));

// ============================================================================
// UNIFIED SYNC ROUTES (NEW - CLEAN API)
// ============================================================================

/**
 * POST /sync/rider/:riderId
 * Sync single rider to Firestore
 */
router.post('/sync/rider/:riderId', asyncHandler(async (req, res) => {
  const riderId = parseInt(req.params.riderId);

  if (isNaN(riderId)) {
    return res.status(400).json({ error: 'Invalid rider ID' });
  }

  logger.info(`🔄 API: Sync rider ${riderId}`);

  const result = await unifiedSyncService.syncRider(riderId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
}));

/**
 * POST /sync/riders/bulk
 * Bulk sync riders to Firestore
 * Body: { riderIds: number[] }
 */
router.post('/sync/riders/bulk', asyncHandler(async (req, res) => {
  const { riderIds } = req.body;

  if (!Array.isArray(riderIds) || riderIds.length === 0) {
    return res.status(400).json({ error: 'riderIds must be a non-empty array' });
  }

  logger.info(`🔄 API: Bulk sync ${riderIds.length} riders`);

  // Start sync in background for large batches
  if (riderIds.length > 10) {
    // Background sync
    unifiedSyncService.syncRidersBulk(riderIds).then((result) => {
      logger.info(`✅ Background bulk sync complete: ${result.synced}/${result.total}`);
    }).catch((error) => {
      logger.error(`❌ Background bulk sync failed:`, error);
    });

    return res.status(202).json({
      message: 'Bulk sync started in background',
      total: riderIds.length,
    });
  }

  // Sync immediately for small batches
  const result = await unifiedSyncService.syncRidersBulk(riderIds);
  res.json(result);
}));

/**
 * POST /sync/club/:clubId
 * Sync club + members to Firestore
 */
router.post('/sync/club/:clubId', asyncHandler(async (req, res) => {
  const clubId = parseInt(req.params.clubId);

  if (isNaN(clubId)) {
    return res.status(400).json({ error: 'Invalid club ID' });
  }

  logger.info(`🔄 API: Sync club ${clubId}`);

  const result = await unifiedSyncService.syncClub(clubId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
}));

/**
 * POST /sync/event/:eventId
 * Sync event + results to Firestore
 */
router.post('/sync/event/:eventId', asyncHandler(async (req, res) => {
  const eventId = parseInt(req.params.eventId);

  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  logger.info(`🔄 API: Sync event ${eventId}`);

  const result = await unifiedSyncService.syncEvent(eventId);

  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
}));

/**
 * GET /riders
 * List all riders from Firestore
 */
router.get('/riders', asyncHandler(async (_req, res) => {
  logger.info(`📊 API: List riders from Firestore`);

  // Get from Firestore via admin SDK
  // Note: In production, add pagination
  const stats = await firebaseSyncService.getStats();

  res.json({
    message: 'Use Firestore client SDK in frontend for real-time data',
    stats,
    hint: 'Frontend should use onSnapshot() for live updates',
  });
}));

/**
 * GET /riders/:riderId/club
 * Get club ID for rider
 */
router.get('/riders/:riderId/club', asyncHandler(async (req, res) => {
  const riderId = parseInt(req.params.riderId);

  if (isNaN(riderId)) {
    return res.status(400).json({ error: 'Invalid rider ID' });
  }

  logger.info(`📊 API: Get club for rider ${riderId}`);

  // Fetch from Zwift API
  const result = await unifiedSyncService.syncRider(riderId);

  if (result.success && result.clubId) {
    res.json({
      riderId,
      clubId: result.clubId,
    });
  } else {
    res.status(404).json({
      riderId,
      clubId: null,
      error: 'Rider not found or no club',
    });
  }
}));

export default router;
