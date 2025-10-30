/**
 * MVP API Routes
 * 
 * Clean API met alleen essentiële endpoints:
 * 1. Rider upload (TXT/CSV)
 * 2. Event scraping
 * 3. Event enrichment (brondatatabellen)
 * 4. Scheduler configuratie
 */

import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import prisma from '../database/client.js';
import { riderUploadService } from '../services/mvp-rider-upload.service.js';
import { eventScraperService } from '../services/mvp-event-scraper.service.js';
import { eventEnricherService } from '../services/mvp-event-enricher.service.js';
import { schedulerService } from '../services/mvp-scheduler.service.js';
import { logger } from '../utils/logger.js';

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

export default router;
