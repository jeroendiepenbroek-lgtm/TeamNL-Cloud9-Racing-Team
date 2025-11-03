import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
// import mvpRoutes from './api/mvp-routes.js'; // Temporarily disabled - use Supabase
// import { schedulerService } from './services/mvp-scheduler.service.js'; // Temporarily disabled
// import { firebaseSyncService } from './services/firebase-sync.service.js'; // DISABLED - optional feature, not in MVP
import { basicAuth, corsMiddleware } from './middleware/auth.js';
import prisma from './database/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());

// CORS middleware (configureerbaar via env)
app.use(corsMiddleware);

// Authentication middleware (alleen in productie als enabled)
if (process.env.AUTH_ENABLED === 'true') {
  logger.info('🔒 Basic Authentication enabled');
  app.use(basicAuth);
}

// Serve static files (HTML GUI)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// MVP API routes - TEMPORARILY DISABLED, using Supabase instead
// app.use('/api', mvpRoutes);

// Simple Supabase test endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Supabase backend ready', timestamp: new Date().toISOString() });
});

app.get('/api/config', (_req: Request, res: Response) => {
  res.json({ 
    clubId: config.zwiftClubId,
    clubName: 'TeamNL Cloud9',
    apiBaseUrl: config.zwiftApiBaseUrl
  });
});

app.get('/api/clubs', async (_req: Request, res: Response) => {
  try {
    const { multiClubSyncService } = await import('./services/multi-club-sync.service.js');
    const clubs = await multiClubSyncService.getAllTrackedClubs();
    res.json({ success: true, clubs, count: clubs.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sync/riders-with-clubs', async (req: Request, res: Response) => {
  try {
    const { riderIds } = req.body;
    
    if (!Array.isArray(riderIds) || riderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'riderIds array required' });
    }

    const { multiClubSyncService } = await import('./services/multi-club-sync.service.js');
    const result = await multiClubSyncService.syncRidersWithClubs(riderIds);
    
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/supabase/stats', async (_req: Request, res: Response) => {
  try {
    const { supabaseSyncService } = await import('./services/supabase-sync.service.js');
    const stats = await supabaseSyncService.getSupabaseStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Root endpoint - redirect to GUI
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/rider-upload.html');
});

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'TeamNL Cloud9 Racing Team API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      club: '/api/club',
      clubMembers: '/api/club/members',
      clubResults: '/api/club/results',
      rider: '/api/riders/:zwiftId',
      riderHistory: '/api/riders/:zwiftId/history',
      riderResults: '/api/riders/:zwiftId/results',
      eventResults: '/api/results/:eventId',
      syncClub: 'POST /api/sync/club',
      syncEvent: 'POST /api/sync/event/:eventId',
      syncStats: '/api/sync/stats',
      syncLogs: '/api/sync/logs',
      favorites: '/api/favorites',
      addFavorite: 'POST /api/favorites',
      deleteFavorite: 'DELETE /api/favorites/:zwiftId',
      updatePriority: 'PATCH /api/favorites/:zwiftId',
      syncFavorites: 'POST /api/sync/favorites',
    },
    gui: '/favorites-manager.html',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Onafgehandelde fout:', err);
  
  // Prevent server crash - always send response
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: config.nodeEnv === 'development' ? err.message : undefined,
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
    });
  }
});

// Start scheduler (if enabled) - TEMPORARILY DISABLED
logger.info('⏰ Scheduler disabled during Supabase migration');
// await schedulerService.start();

// Initialize Firebase (optional - falls back to local-only if not configured)
// DISABLED - Firebase sync not in MVP
// logger.info('🔥 Initializing Firebase sync');
// const firebaseInitialized = await firebaseSyncService.initialize();
// if (firebaseInitialized) {
//   const stats = await firebaseSyncService.getStats();
//   logger.info('🔥 Firebase stats:', stats);
// } else {
//   logger.info('   Using local database only');
// }
logger.info('   Using Supabase PostgreSQL database');

// Export functie voor scheduler status (voor API)
export function getSchedulerStatus() {
  return { status: 'disabled', message: 'Scheduler temporarily disabled during Supabase migration' };
  // return schedulerService.getStatus();
}

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 MVP Server draait op http://localhost:${config.port}`);
  logger.info(`📊 API: http://localhost:${config.port}/api`);
  logger.info(`📤 Rider Upload: http://localhost:${config.port}/rider-upload.html`);
  logger.info(`🏁 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signaal ontvangen, sluit server af...');
  
  // Stop scheduler - DISABLED
  // schedulerService.stop();
  
  // Close Firebase - DISABLED (not in MVP)
  // await firebaseSyncService.close();
  
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server afgesloten');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signaal ontvangen (Ctrl+C), sluit server af...');
  
  // Stop scheduler - DISABLED
  // schedulerService.stop();
  
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server afgesloten');
    process.exit(0);
  });
});

// Uncaught exception handler - prevent crash
process.on('uncaughtException', (error: Error) => {
  logger.error('💥 Uncaught Exception:', error);
  logger.error('Stack:', error.stack);
  // Don't exit - let nodemon handle restart if needed
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('💥 Unhandled Promise Rejection at:', promise);
  logger.error('Reason:', reason);
  // Don't exit - let nodemon handle restart if needed
});

export default app;
