import express, { Request, Response, NextFunction } from 'express';
import {
  RiderRepository,
  ClubRepository,
  ResultRepository,
  SyncLogRepository,
} from '../database/repositories.js';
import prisma from '../database/client.js';
import SyncService from '../services/sync.js';
import { getSyncQueue } from '../services/sync-queue.js';
import { SubteamService } from '../services/subteam.js';
import { EventService } from '../services/event.js';
import { ClubService } from '../services/club.js';
import { getScheduler } from '../services/scheduler.js';
// import DashboardService from '../services/dashboard.js'; // Disabled - wordt later herimplementeerd
import TeamService from '../services/team.js';
// import { workflowService } from '../services/workflow.js'; // TODO: Fix type errors first
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

const router = express.Router();

// Repositories
const riderRepo = new RiderRepository();
const clubRepo = new ClubRepository();
const resultRepo = new ResultRepository();
const syncLogRepo = new SyncLogRepository();
const syncService = new SyncService();
const syncQueue = getSyncQueue();
const subteamService = new SubteamService();
const eventService = new EventService();
const clubService = new ClubService();
// const dashboardService = new DashboardService(); // Disabled
const teamService = new TeamService();

/**
 * Error handler middleware
 */
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * System information endpoint (TEST FEATURE for workflow validation)
 */
router.get('/system', (_req: Request, res: Response) => {
  res.json({
    version: '0.2.0',
    environment: process.env.NODE_ENV || 'development',
    node: process.version,
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    },
    features: {
      authentication: process.env.AUTH_ENABLED === 'true',
      autoSync: process.env.ENABLE_AUTO_SYNC === 'true',
      scheduler: process.env.SCHEDULER_ENABLED === 'true'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * CLUB ENDPOINTS
 */

// GET /api/club - Haal club data op met members
router.get('/club', asyncHandler(async (_req: Request, res: Response) => {
  const clubId = config.zwiftClubId;
  const club = await clubRepo.getClub(clubId);
  
  if (!club) {
    res.status(404).json({ error: 'Club niet gevonden' });
    return;
  }
  
  res.json(club);
}));

// GET /api/club/members - Haal alle club members op
router.get('/club/members', asyncHandler(async (_req: Request, res: Response) => {
  const clubId = config.zwiftClubId;
  const members = await riderRepo.getClubRiders(clubId);
  res.json(members);
}));

// GET /api/club/results - Haal recente race resultaten van club members op
router.get('/club/results', asyncHandler(async (req: Request, res: Response) => {
  const clubId = config.zwiftClubId;
  const limit = parseInt(req.query.limit as string) || 50;
  const results = await resultRepo.getClubRecentResults(clubId, limit);
  res.json(results);
}));

/**
 * RIDER ENDPOINTS
 */

// GET /api/riders/:zwiftId - Haal specifieke rider op
router.get('/riders/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);
  
  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Ongeldige rider ID' });
    return;
  }
  
  const rider = await riderRepo.getRider(zwiftId);
  
  if (!rider) {
    res.status(404).json({ error: 'Rider niet gevonden' });
    return;
  }
  
  res.json(rider);
}));

// GET /api/riders/:zwiftId/history - Haal rider geschiedenis op
router.get('/riders/:zwiftId/history', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);
  const days = parseInt(req.query.days as string) || 30;
  
  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Ongeldige rider ID' });
    return;
  }
  
  const rider = await riderRepo.getRider(zwiftId);
  if (!rider) {
    res.status(404).json({ error: 'Rider niet gevonden' });
    return;
  }
  
  const history = await riderRepo.getRiderHistory(rider.id, days);
  res.json(history);
}));

// GET /api/riders/:zwiftId/results - Haal rider race resultaten op
router.get('/riders/:zwiftId/results', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);
  const limit = parseInt(req.query.limit as string) || 20;
  
  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Ongeldige rider ID' });
    return;
  }
  
  const rider = await riderRepo.getRider(zwiftId);
  if (!rider) {
    res.status(404).json({ error: 'Rider niet gevonden' });
    return;
  }
  
  const results = await resultRepo.getRiderResults(rider.id, limit);
  res.json(results);
}));

/**
 * RESULTS ENDPOINTS
 */

// GET /api/results/:eventId - Haal event resultaten op
router.get('/results/:eventId', asyncHandler(async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.eventId);
  
  if (isNaN(eventId)) {
    res.status(400).json({ error: 'Ongeldige event ID' });
    return;
  }
  
  const results = await resultRepo.getEventResults(eventId);
  res.json(results);
}));

/**
 * SUBTEAM ENDPOINTS (Favorites Workflow)
 */

// GET /api/subteam/riders - List all favorite riders
router.get('/subteam/riders', asyncHandler(async (_req: Request, res: Response) => {
  const favorites = await subteamService.listFavorites();
  res.json({
    count: favorites.length,
    riders: favorites,
  });
}));

// POST /api/subteam/riders - Add favorite riders (bulk)
router.post('/subteam/riders', asyncHandler(async (req: Request, res: Response) => {
  const { zwiftIds } = req.body;
  
  if (!Array.isArray(zwiftIds) || zwiftIds.length === 0) {
    res.status(400).json({ error: 'zwiftIds array vereist (bijv. [1495, 2281])' });
    return;
  }
  
  // Validate alle IDs zijn numbers
  if (!zwiftIds.every(id => typeof id === 'number' && !isNaN(id))) {
    res.status(400).json({ error: 'Alle zwiftIds moeten valid numbers zijn' });
    return;
  }
  
  logger.info(`Adding ${zwiftIds.length} favorites via API...`);
  const result = await subteamService.addFavorites(zwiftIds);
  
  res.json({
    message: `Processed ${zwiftIds.length} riders`,
    summary: {
      added: result.added,
      updated: result.updated,
      alreadyExists: result.alreadyExists,
      failed: result.failed,
    },
    riders: result.riders,
  });
}));

// DELETE /api/subteam/riders/:zwiftId - Remove favorite rider
router.delete('/subteam/riders/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);
  
  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Ongeldige rider ID' });
    return;
  }
  
  logger.info(`Removing favorite ${zwiftId} via API...`);
  await subteamService.removeFavorite(zwiftId);
  
  res.json({ 
    message: `Favorite rider ${zwiftId} verwijderd`,
    zwiftId,
  });
}));

// POST /api/subteam/sync - Sync stats for all or specific favorite
router.post('/subteam/sync', asyncHandler(async (req: Request, res: Response) => {
  const { zwiftId } = req.body;
  
  if (zwiftId !== undefined) {
    const id = parseInt(zwiftId);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ongeldige rider ID' });
      return;
    }
    
    logger.info(`Syncing stats for rider ${id} via API...`);
    const result = await subteamService.syncFavoriteStats(id);
    res.json(result);
  } else {
    logger.info('Syncing stats for all favorites via API...');
    const result = await subteamService.syncFavoriteStats();
    res.json(result);
  }
}));

/**
 * DASHBOARD ENDPOINTS (User Stories)
 * TODO: Herimplementeren met nieuwe Rider (favorieten) + ClubMember (club roster) structuur
 */

/*
// GET /api/dashboard/club-results/:riderId - Story 1: Recent club results
router.get('/dashboard/club-results/:riderId', asyncHandler(async (req: Request, res: Response) => {
  const riderId = parseInt(req.params.riderId);
  const limit = parseInt(req.query.limit as string) || 50;
  
  if (isNaN(riderId)) {
    res.status(400).json({ error: 'Ongeldige rider ID' });
    return;
  }
  
  const results = await dashboardService.getClubRecentResults(riderId, limit);
  res.json(results);
}));

// GET /api/dashboard/favorites/:userId - Story 2: Get favorite riders
router.get('/dashboard/favorites/:userId', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  
  if (isNaN(userId)) {
    res.status(400).json({ error: 'Ongeldige user ID' });
    return;
  }
  
  const favorites = await dashboardService.getFavoriteRiders(userId);
  res.json(favorites);
}));

// POST /api/dashboard/favorites/:userId/:favoriteId - Add favorite
router.post('/dashboard/favorites/:userId/:favoriteId', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const favoriteId = parseInt(req.params.favoriteId);
  const { notes } = req.body;
  
  if (isNaN(userId) || isNaN(favoriteId)) {
    res.status(400).json({ error: 'Ongeldige IDs' });
    return;
  }
  
  const favorite = await dashboardService.addFavorite(userId, favoriteId, notes);
  res.json({ message: 'Favorite toegevoegd', favorite });
}));

// DELETE /api/dashboard/favorites/:userId/:favoriteId - Remove favorite
router.delete('/dashboard/favorites/:userId/:favoriteId', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const favoriteId = parseInt(req.params.favoriteId);
  
  if (isNaN(userId) || isNaN(favoriteId)) {
    res.status(400).json({ error: 'Ongeldige IDs' });
    return;
  }
  
  await dashboardService.removeFavorite(userId, favoriteId);
  res.json({ message: 'Favorite verwijderd' });
}));

// GET /api/dashboard/rider-events/:riderId - Story 3: Rider recent events
router.get('/dashboard/rider-events/:riderId', asyncHandler(async (req: Request, res: Response) => {
  const riderId = parseInt(req.params.riderId);
  const days = parseInt(req.query.days as string) || 90;
  
  if (isNaN(riderId)) {
    res.status(400).json({ error: 'Ongeldige rider ID' });
    return;
  }
  
  const events = await dashboardService.getRiderRecentEvents(riderId, days);
  res.json(events);
}));
*/

/**
 * SYNC ENDPOINTS
 */

// POST /api/sync/club - Trigger club sync
router.post('/sync/club', asyncHandler(async (_req: Request, res: Response) => {
  logger.info('Manual club sync gestart via API');
  await syncService.syncClubMembers();
  res.json({ message: 'Club sync voltooid' });
}));

// POST /api/sync/favorites - Trigger favorites sync (NON-BLOCKING via queue)
router.post('/sync/favorites', asyncHandler(async (_req: Request, res: Response) => {
  logger.info('Manual favorites sync gestart via API');
  
  // Haal alle favorites op
  const favorites = await riderRepo.getFavoriteRiders();
  
  if (favorites.length === 0) {
    res.json({ message: 'Geen favorites om te syncen', jobIds: [] });
    return;
  }
  
  // Add to queue (non-blocking, instant return)
  const jobIds = syncQueue.enqueueBulk(
    favorites.map(f => ({ 
      riderId: f.zwiftId, 
      priority: (f.syncPriority || 1) as 1 | 2 | 3 | 4 
    })),
    'manual-sync'
  );
  
  res.json({
    message: `${favorites.length} riders toegevoegd aan sync queue`,
    queueDepth: syncQueue.getStatus().queueDepth,
    jobIds,
  });
}));

// POST /api/sync/event/:eventId - Trigger event results sync
router.post('/sync/event/:eventId', asyncHandler(async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.eventId);
  const source = (req.query.source as 'zwiftpower' | 'zwiftranking') || 'zwiftranking';
  
  if (isNaN(eventId)) {
    res.status(400).json({ error: 'Ongeldige event ID' });
    return;
  }
  
  logger.info(`Manual event sync gestart voor event ${eventId}`);
  await syncService.syncEventResults(eventId, source);
  res.json({ message: 'Event sync voltooid' });
}));

// GET /api/sync/stats - Haal sync statistieken op
router.get('/sync/stats', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await syncService.getSyncStats();
  res.json(stats);
}));

// GET /api/sync/logs - Haal sync logs op
router.get('/sync/logs', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const logs = await syncLogRepo.getRecentLogs(limit);
  res.json(logs);
}));

/**
 * QUEUE ENDPOINTS (NEW - Phase 1)
 */

// GET /api/queue/status - Haal queue status op
router.get('/queue/status', asyncHandler(async (_req: Request, res: Response) => {
  const status = syncQueue.getStatus();
  res.json(status);
}));

// GET /api/queue/job/:jobId - Haal specifieke job status op
router.get('/queue/job/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = syncQueue.getItem(jobId);
  
  if (!job) {
    res.status(404).json({ error: 'Job niet gevonden' });
    return;
  }
  
  res.json(job);
}));

// POST /api/queue/cancel/:jobId - Annuleer pending job
router.post('/queue/cancel/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const cancelled = syncQueue.cancel(jobId);
  
  if (!cancelled) {
    res.status(404).json({ error: 'Job niet gevonden of niet meer pending' });
    return;
  }
  
  res.json({ message: 'Job geannuleerd', jobId });
}));

// POST /api/queue/retry/:jobId - Retry gefaalde job
router.post('/queue/retry/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const retried = syncQueue.retry(jobId);
  
  if (!retried) {
    res.status(404).json({ error: 'Job niet gevonden of niet gefaald' });
    return;
  }
  
  res.json({ message: 'Job opnieuw ingepland', jobId });
}));

// POST /api/queue/retry-all - Retry alle gefaalde jobs
router.post('/queue/retry-all', asyncHandler(async (_req: Request, res: Response) => {
  const count = syncQueue.retryAll();
  res.json({ message: `${count} jobs opnieuw ingepland` });
}));

// POST /api/queue/pause - Pauzeer queue processing
router.post('/queue/pause', asyncHandler(async (_req: Request, res: Response) => {
  syncQueue.pause();
  res.json({ message: 'Queue gepauzeerd' });
}));

// POST /api/queue/resume - Hervat queue processing
router.post('/queue/resume', asyncHandler(async (_req: Request, res: Response) => {
  syncQueue.resume();
  res.json({ message: 'Queue hervat' });
}));

// POST /api/queue/clear-completed - Verwijder voltooide jobs
router.post('/queue/clear-completed', asyncHandler(async (_req: Request, res: Response) => {
  const count = syncQueue.clearCompleted();
  res.json({ message: `${count} voltooide jobs verwijderd` });
}));

/**
 * FAVORITES ENDPOINTS
 */

// GET /api/favorites - Haal alle favorite riders op
router.get('/favorites', asyncHandler(async (_req: Request, res: Response) => {
  const favorites = await riderRepo.getFavoriteRiders();
  res.json(favorites);
}));

// POST /api/favorites - Voeg favorite rider toe via Zwift ID (with queue)
router.post('/favorites', asyncHandler(async (req: Request, res: Response) => {
  const { zwiftId, priority, addedBy } = req.body;
  
  if (!zwiftId || isNaN(parseInt(zwiftId))) {
    res.status(400).json({ error: 'Geldige zwiftId is verplicht' });
    return;
  }
  
  const id = parseInt(zwiftId);
  const syncPriority = (priority && !isNaN(parseInt(priority)) ? parseInt(priority) : 1) as 1 | 2 | 3 | 4;
  
  logger.info(`Toevoegen favorite rider ${id} met priority ${syncPriority}`);
  
  // Haal rider data op van API
  const apiClient = syncService['apiClient']; // Access via index signature
  const riderData = await apiClient.getRider(id);
  
  // Sla op als favorite
  const rider = await riderRepo.upsertRider(riderData, undefined, {
    isFavorite: true,
    addedBy: addedBy || 'api',
    syncPriority,
  });
  
  // Add to sync queue for automatic updates
  const jobId = syncQueue.enqueue(id, syncPriority, addedBy || 'api-add');
  
  res.status(201).json({ 
    message: 'Favorite rider toegevoegd en in sync queue geplaatst',
    rider,
    jobId,
    queueDepth: syncQueue.getStatus().queueDepth
  });
}));

// DELETE /api/favorites/:zwiftId - Verwijder favorite (soft delete)
router.delete('/favorites/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);
  
  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Ongeldige Zwift ID' });
    return;
  }
  
  logger.info(`Soft delete favorite rider ${zwiftId}`);
  
  // Soft delete: set isFavorite = false (behoud data)
  const rider = await riderRepo.getRider(zwiftId);
  if (!rider) {
    res.status(404).json({ error: 'Rider niet gevonden' });
    return;
  }
  
  await prisma.rider.update({
    where: { zwiftId },
    data: { isFavorite: false },
  });
  
  res.json({ message: 'Favorite rider verwijderd (data behouden)' });
}));

// PATCH /api/favorites/:zwiftId - Update favorite priority
router.patch('/favorites/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);
  const { priority } = req.body;
  
  if (isNaN(zwiftId)) {
    res.status(400).json({ error: 'Ongeldige Zwift ID' });
    return;
  }
  
  if (!priority || isNaN(parseInt(priority))) {
    res.status(400).json({ error: 'Geldige priority is verplicht (1-4)' });
    return;
  }
  
  const syncPriority = parseInt(priority);
  if (syncPriority < 1 || syncPriority > 4) {
    res.status(400).json({ error: 'Priority moet tussen 1 en 4 zijn' });
    return;
  }
  
  logger.info(`Update priority voor favorite rider ${zwiftId} naar ${syncPriority}`);
  
  const rider = await riderRepo.getRider(zwiftId);
  if (!rider || !rider.isFavorite) {
    res.status(404).json({ error: 'Favorite rider niet gevonden' });
    return;
  }
  
  await prisma.rider.update({
    where: { zwiftId },
    data: { syncPriority },
  });
  
  res.json({ message: 'Priority bijgewerkt' });
}));

/**
 * TEAM MANAGEMENT ENDPOINTS
 */

// POST /api/team - Create new team
router.post('/team', asyncHandler(async (req: Request, res: Response) => {
  const { name, description, autoSyncEnabled, syncIntervalMinutes } = req.body;
  
  if (!name) {
    res.status(400).json({ error: 'Team naam is verplicht' });
    return;
  }
  
  const team = await teamService.createTeam({
    name,
    description,
    autoSyncEnabled,
    syncIntervalMinutes,
  });
  
  res.status(201).json({ message: 'Team aangemaakt', team });
}));

// GET /api/team - List all teams
router.get('/team', asyncHandler(async (_req: Request, res: Response) => {
  const teams = await teamService.listTeams();
  res.json(teams);
}));

// GET /api/team/:teamId - Get team details
router.get('/team/:teamId', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  
  if (isNaN(teamId)) {
    res.status(400).json({ error: 'Ongeldige team ID' });
    return;
  }
  
  const team = await teamService.getTeam(teamId);
  res.json(team);
}));

// GET /api/team/:teamId/stats - Get team statistics
router.get('/team/:teamId/stats', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  
  if (isNaN(teamId)) {
    res.status(400).json({ error: 'Ongeldige team ID' });
    return;
  }
  
  const stats = await teamService.getTeamStatistics(teamId);
  res.json(stats);
}));

// POST /api/team/:teamId/members/:zwiftId - Add single member
router.post('/team/:teamId/members/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  const zwiftId = parseInt(req.params.zwiftId);
  const { role, notes } = req.body;
  
  if (isNaN(teamId) || isNaN(zwiftId)) {
    res.status(400).json({ error: 'Ongeldige IDs' });
    return;
  }
  
  const member = await teamService.addMember(teamId, zwiftId, role, notes);
  res.status(201).json({ 
    message: `Rider ${zwiftId} toegevoegd aan team (sync loopt in achtergrond)`,
    member 
  });
}));

// POST /api/team/:teamId/members - Add multiple members (bulk)
router.post('/team/:teamId/members', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  const { zwiftIds, role, batchSize } = req.body;
  
  if (isNaN(teamId)) {
    res.status(400).json({ error: 'Ongeldige team ID' });
    return;
  }
  
  if (!Array.isArray(zwiftIds) || zwiftIds.length === 0) {
    res.status(400).json({ error: 'zwiftIds array is verplicht en mag niet leeg zijn' });
    return;
  }
  
  // Validate all IDs are numbers
  const validIds = zwiftIds.every(id => typeof id === 'number' && !isNaN(id));
  if (!validIds) {
    res.status(400).json({ error: 'Alle zwiftIds moeten geldige nummers zijn' });
    return;
  }
  
  logger.info(`Bulk add gestart: ${zwiftIds.length} riders naar team ${teamId}`);
  
  const results = await teamService.addMembersBulk(teamId, zwiftIds, role, batchSize);
  
  res.status(201).json({ 
    message: `Bulk add voltooid: ${results.added.length} toegevoegd, ${results.skipped.length} overgeslagen, ${results.failed.length} gefaald`,
    results 
  });
}));

// DELETE /api/team/:teamId/members/:zwiftId - Remove member
router.delete('/team/:teamId/members/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  const zwiftId = parseInt(req.params.zwiftId);
  
  if (isNaN(teamId) || isNaN(zwiftId)) {
    res.status(400).json({ error: 'Ongeldige IDs' });
    return;
  }
  
  await teamService.removeMember(teamId, zwiftId);
  res.json({ message: `Rider ${zwiftId} verwijderd uit team` });
}));

// POST /api/team/:teamId/sync - Trigger sync for pending team members
router.post('/team/:teamId/sync', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  
  if (isNaN(teamId)) {
    res.status(400).json({ error: 'Ongeldige team ID' });
    return;
  }
  
  logger.info(`Manual team sync gestart voor team ${teamId}`);
  const results = await teamService.syncTeamMembers(teamId);
  
  res.json({ 
    message: 'Team sync voltooid',
    results 
  });
}));

// DELETE /api/team/:teamId - Delete team
router.delete('/team/:teamId', asyncHandler(async (req: Request, res: Response) => {
  const teamId = parseInt(req.params.teamId);
  
  if (isNaN(teamId)) {
    res.status(400).json({ error: 'Ongeldige team ID' });
    return;
  }
  
  await teamService.deleteTeam(teamId);
  res.json({ message: `Team ${teamId} verwijderd` });
}));

/**
 * SCHEDULER ENDPOINTS
 */

// GET /api/scheduler/status - Haal scheduler status op
router.get('/scheduler/status', asyncHandler(async (_req: Request, res: Response) => {
  // Import scheduler instance from server (workaround for circular dependency)
  const { getSchedulerStatus } = await import('../server.js');
  const status = getSchedulerStatus();
  res.json(status);
}));

/**
 * SUBTEAM ENDPOINTS (Workflow Step 1-3)
 */

// POST /api/subteam/riders - Add favorite riders
router.post('/subteam/riders', asyncHandler(async (req: Request, res: Response) => {
  const { zwiftIds } = req.body;

  if (!Array.isArray(zwiftIds) || zwiftIds.length === 0) {
    res.status(400).json({ error: 'zwiftIds array required' });
    return;
  }

  // Validate all are numbers
  if (!zwiftIds.every(id => typeof id === 'number' && id > 0)) {
    res.status(400).json({ error: 'All zwiftIds must be positive numbers' });
    return;
  }

  const result = await subteamService.addFavorites(zwiftIds);

  res.json({
    added: result.added,
    updated: result.updated,
    failed: result.failed,
    alreadyExists: result.alreadyExists,
    riders: result.riders,
  });
}));

// DELETE /api/subteam/riders/:zwiftId - Remove favorite rider
router.delete('/subteam/riders/:zwiftId', asyncHandler(async (req: Request, res: Response) => {
  const zwiftId = parseInt(req.params.zwiftId);

  if (isNaN(zwiftId) || zwiftId <= 0) {
    res.status(400).json({ error: 'Invalid zwiftId' });
    return;
  }

  await subteamService.removeFavorite(zwiftId);

  res.json({
    success: true,
    deleted: zwiftId,
    message: `Favorite rider ${zwiftId} removed`,
  });
}));

// GET /api/subteam/riders - List all favorites
router.get('/subteam/riders', asyncHandler(async (_req: Request, res: Response) => {
  const riders = await subteamService.listFavorites();

  res.json({
    total: riders.length,
    riders: riders.map(r => ({
      zwiftId: r.zwiftId,
      name: r.name,
      category: r.categoryRacing,
      ftp: r.ftp,
      ftpWkg: r.ftpWkg,
      ranking: r.ranking,
      club: r.club ? {
        id: r.club.id,
        name: r.club.name,
      } : null,
      addedBy: r.addedBy,
      addedAt: r.addedAt,
    })),
  });
}));

// POST /api/subteam/sync - Sync stats for all or specific favorite
router.post('/subteam/sync', asyncHandler(async (req: Request, res: Response) => {
  const { zwiftId } = req.body;

  if (zwiftId !== undefined && (typeof zwiftId !== 'number' || zwiftId <= 0)) {
    res.status(400).json({ error: 'Invalid zwiftId' });
    return;
  }

  const result = await subteamService.syncFavoriteStats(zwiftId);

  res.json({
    synced: result.synced,
    failed: result.failed,
    clubsExtracted: result.clubsExtracted,
    riders: result.riders,
  });
}));

/**
 * FORWARD SCAN ENDPOINTS (Workflow Step 5)
 */

// POST /api/sync/forward - Trigger forward event scan
router.post('/sync/forward', asyncHandler(async (req: Request, res: Response) => {
  const { maxEvents, startEventId, retentionDays } = req.body;

  // Validate inputs
  if (maxEvents !== undefined && (typeof maxEvents !== 'number' || maxEvents <= 0 || maxEvents > 5000)) {
    res.status(400).json({ error: 'maxEvents must be between 1 and 5000' });
    return;
  }

  if (startEventId !== undefined && (typeof startEventId !== 'number' || startEventId <= 0)) {
    res.status(400).json({ error: 'startEventId must be a positive number' });
    return;
  }

  if (retentionDays !== undefined && (typeof retentionDays !== 'number' || retentionDays < 30 || retentionDays > 365)) {
    res.status(400).json({ error: 'retentionDays must be between 30 and 365' });
    return;
  }

  const result = await eventService.forwardScan({
    maxEvents,
    startEventId,
    retentionDays,
  });

  res.json(result);
}));

// GET /api/events/tracked - Get events with tracked riders
router.get('/events/tracked', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;

  if (isNaN(limit) || limit <= 0 || limit > 200) {
    res.status(400).json({ error: 'limit must be between 1 and 200' });
    return;
  }

  const events = await eventService.getTrackedEvents(limit);

  res.json({
    total: events.length,
    events,
  });
}));

/**
 * CLUB ROSTER SYNC ENDPOINTS (Step 4)
 */

// POST /api/clubs/sync - Sync alle favorite club rosters
router.post('/clubs/sync', asyncHandler(async (_req: Request, res: Response) => {
  logger.info('📋 Manual club rosters sync triggered (Step 4)');

  const result = await clubService.syncAllClubRosters();

  res.json({
    success: true,
    synced: result.synced,
    failed: result.failed,
    totalMembers: result.totalMembers,
    clubs: result.clubs,
  });
}));

// POST /api/clubs/:clubId/sync - Sync een specifieke club
router.post('/clubs/:clubId/sync', asyncHandler(async (req: Request, res: Response) => {
  const clubId = parseInt(req.params.clubId, 10);

  if (isNaN(clubId) || clubId <= 0) {
    res.status(400).json({ error: 'Invalid clubId' });
    return;
  }

  logger.info(`📋 Manual sync for club ${clubId}`);

  const result = await clubService.syncSingleClub(clubId);

  res.json({
    success: true,
    synced: result.synced,
    failed: result.failed,
    totalMembers: result.totalMembers,
    club: result.clubs[0],
  });
}));

// GET /api/clubs/members - Get alle tracked club members
router.get('/clubs/members', asyncHandler(async (_req: Request, res: Response) => {
  const members = await clubService.getAllTrackedClubMembers();

  res.json({
    total: members.length,
    members,
  });
}));

// GET /api/clubs/:clubId/favorites - Get favorites binnen een club
router.get('/clubs/:clubId/favorites', asyncHandler(async (req: Request, res: Response) => {
  const clubId = parseInt(req.params.clubId, 10);

  if (isNaN(clubId) || clubId <= 0) {
    res.status(400).json({ error: 'Invalid clubId' });
    return;
  }

  const members = await clubService.getFavoriteClubMembers(clubId);

  res.json({
    clubId,
    total: members.length,
    members,
  });
}));

/**
 * SCHEDULER ENDPOINTS
 */

// GET /api/scheduler/status - Get status van alle cron jobs
router.get('/scheduler/status', (_req: Request, res: Response) => {
  const scheduler = getScheduler();
  const jobs = scheduler.getStatus();

  res.json({
    enabled: jobs.length > 0,
    totalJobs: jobs.length,
    jobs,
    config: {
      favoritesSyncCron: process.env.FAVORITES_SYNC_CRON || '0 */6 * * *',
      clubSyncCron: process.env.CLUB_SYNC_CRON || '0 */12 * * *',
      forwardScanCron: process.env.FORWARD_SCAN_CRON || '0 4 * * *',
      cleanupCron: process.env.CLEANUP_CRON || '0 3 * * *',
    },
  });
});

/**
 * WORKFLOW ENDPOINTS - Production Workflow
 */

// GET /api/workflow/status - Get complete workflow status
router.get('/workflow/status', asyncHandler(async (_req: Request, res: Response) => {
  // Get counts from database
  const favorites = await prisma.rider.count({ where: { isFavorite: true } });
  const clubs = await prisma.club.count();
  const clubMembers = await prisma.clubMember.count();
  const events = await prisma.event.count();
  
  // Use raw SQL for date filtering (Prisma has DateTime comparison bug with SQLite)
  const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff100d = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
  
  const rawRecentEvents = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM events WHERE eventDate >= ${cutoff90d}
  `;
  const recentEvents = Number(rawRecentEvents[0]?.count || 0);
  
  const rawOldEvents = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM events WHERE eventDate < ${cutoff100d}
  `;
  const oldEvents = Number(rawOldEvents[0]?.count || 0);
  
  const raceResults = await prisma.raceResult.count();
  const favoriteResults = await prisma.raceResult.count({ where: { riderType: 'favorite' } });
  const clubResults = await prisma.raceResult.count({ where: { riderType: 'club_member' } });

  res.json({
    favorites,
    clubs,
    clubMembers,
    events: {
      total: events,
      recent: recentEvents,
      old: oldEvents,
    },
    results: {
      total: raceResults,
      favorites: favoriteResults,
      club: clubResults,
    },
  });
}));

// GET /api/workflow/clubs - Get clubs waar favorites rijden
router.get('/workflow/clubs', asyncHandler(async (_req: Request, res: Response) => {
  // Get favorite riders with their clubId
  const favorites = await prisma.rider.findMany({
    where: { 
      isFavorite: true,
    },
    select: {
      zwiftId: true,
      name: true,
      clubId: true,
    }
  });

  // For now, use hardcoded club 2281 as bypass
  const clubMembers = await prisma.clubMember.findMany({
    where: { clubId: 2281 },
    select: {
      zwiftId: true,
      name: true,
      isFavorite: true,
    }
  });

  const club = await prisma.club.findUnique({
    where: { id: 2281 },
    select: { id: true, name: true, memberCount: true }
  });

  res.json({
    clubs: [
      {
        clubId: 2281,
        clubName: club?.name || 'TeamNL',
        memberCount: clubMembers.length,
        favoriteMembers: clubMembers.filter(m => m.isFavorite).length,
        members: clubMembers.slice(0, 10), // First 10 for preview
      }
    ],
    totalFavorites: favorites.length,
  });
}));

// POST /api/workflow/cleanup - Cleanup oude events (>100 dagen)
router.post('/workflow/cleanup', asyncHandler(async (req: Request, res: Response) => {
  const { daysThreshold = 100, dryRun = false } = req.body;
  
  // Bereken cutoff date: nu MINUS threshold dagen
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);
  
  // Count what would be deleted (use raw SQL - Prisma has DateTime comparison bug with SQLite)
  const rawOldEvents = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM events WHERE eventDate < ${cutoffDate.toISOString()}
  `;
  const oldEvents = Number(rawOldEvents[0]?.count || 0);
  
  const rawOldResults = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM race_results 
    WHERE eventId IN (SELECT id FROM events WHERE eventDate < ${cutoffDate.toISOString()})
  `;
  const oldResults = Number(rawOldResults[0]?.count || 0);

  if (dryRun) {
    res.json({
      message: 'Dry run - geen data verwijderd',
      daysThreshold,
      cutoffDate,
      wouldDelete: {
        events: oldEvents,
        results: oldResults,
      }
    });
    return;
  }

  // Delete old results first (foreign key) - use raw SQL
  // @ts-expect-error - TypeScript doesn't parse SQL in template literals correctly
  const deletedResultsCount = await prisma.$executeRaw`
    DELETE FROM race_results 
    WHERE eventId IN (SELECT id FROM events WHERE eventDate < ${cutoffDate.toISOString()})
  `;

  // Delete old events - use raw SQL
  // @ts-expect-error - TypeScript doesn't parse SQL in template literals correctly
  const deletedEventsCount = await prisma.$executeRaw`
    DELETE FROM events WHERE eventDate < ${cutoffDate.toISOString()}
  `;

  logger.info(`Cleanup: Verwijderd ${deletedEventsCount} events en ${deletedResultsCount} results ouder dan ${daysThreshold} dagen`);

  res.json({
    message: `Cleanup voltooid: ${deletedEventsCount} events verwijderd`,
    daysThreshold,
    cutoffDate,
    deleted: {
      events: deletedEventsCount,
      results: deletedResultsCount,
    }
  });
}));

// GET /api/workflow/events/favorites - Get events voor favorite riders
router.get('/workflow/events/favorites', asyncHandler(async (req: Request, res: Response) => {
  const { days = 90 } = req.query;
  const cutoffDate = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      eventDate: { gte: cutoffDate },
      results: {
        some: { riderType: 'favorite' }
      }
    },
    include: {
      results: {
        where: { riderType: 'favorite' },
        include: {
          rider: {
            select: { zwiftId: true, name: true }
          }
        }
      }
    },
    orderBy: { eventDate: 'desc' }
  });

  res.json({
    days: parseInt(days as string),
    cutoffDate,
    events: events.length,
    data: events.map(e => ({
      id: e.id,
      name: e.name,
      eventDate: e.eventDate,
      eventType: e.eventType,
      results: e.results.length,
      riders: e.results.map(r => r.rider?.name).filter(Boolean),
    }))
  });
}));

// GET /api/workflow/events/club - Get events voor club members
router.get('/workflow/events/club', asyncHandler(async (req: Request, res: Response) => {
  const { hours = 24, clubId = 2281 } = req.query;
  const cutoffDate = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      eventDate: { gte: cutoffDate },
      results: {
        some: { 
          riderType: 'club_member',
          clubMember: { clubId: parseInt(clubId as string) }
        }
      }
    },
    include: {
      results: {
        where: { riderType: 'club_member' },
        include: {
          clubMember: {
            select: { zwiftId: true, name: true, clubId: true }
          }
        }
      }
    },
    orderBy: { eventDate: 'desc' }
  });

  res.json({
    clubId: parseInt(clubId as string),
    hours: parseInt(hours as string),
    cutoffDate,
    events: events.length,
    data: events.map(e => ({
      id: e.id,
      name: e.name,
      eventDate: e.eventDate,
      eventType: e.eventType,
      results: e.results.length,
      members: e.results.map(r => r.clubMember?.name).filter(Boolean),
    }))
  });
}));

// GET /api/workflow/summary - Complete workflow summary
router.get('/workflow/summary', asyncHandler(async (_req: Request, res: Response) => {
  const favorites = await prisma.rider.findMany({
    where: { isFavorite: true },
    select: {
      zwiftId: true,
      name: true,
      totalRaces: true,
      raceResults: {
        select: { id: true }
      }
    }
  });

  const clubMembers = await prisma.clubMember.findMany({
    where: { clubId: 2281 },
    select: {
      zwiftId: true,
      name: true,
      isFavorite: true,
      totalRaces: true,
    }
  });

  const recentEvents = await prisma.event.count({
    where: { eventDate: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
  });

  const oldEvents = await prisma.event.count({
    where: { eventDate: { lt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) } }
  });

  res.json({
    workflow: {
      step1: { description: 'Favorite riders opgegeven', count: favorites.length },
      step2: { description: 'Rider details opgeslagen', status: 'complete' },
      step3: { description: 'Clubs van subteam', clubId: 2281, clubName: 'TeamNL' },
      step4: { description: 'Club members tracked', count: clubMembers.length },
      step5: { description: 'Favorite events (90d)', count: recentEvents },
      step6: { description: 'Club events tracked', status: 'active' },
      step7: { description: 'Old events (>100d)', count: oldEvents, action: 'cleanup available' },
    },
    favorites: favorites.map(f => ({
      zwiftId: f.zwiftId,
      name: f.name,
      totalRaces: f.totalRaces,
      resultsInDb: f.raceResults.length,
    })),
    club: {
      id: 2281,
      name: 'TeamNL',
      members: clubMembers.length,
      favoriteMembers: clubMembers.filter(m => m.isFavorite).length,
    }
  });
}));

export default router;
