import express, { Request, Response, NextFunction } from 'express';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import apiRoutes from './api/routes.js';
import SyncService from './services/sync.js';
import { SmartScheduler } from './services/smart-scheduler.js';
import { getSyncQueue } from './services/sync-queue.js';
import { RiderRepository } from './database/repositories.js';
import prisma from './database/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json());

// Serve static files (HTML GUI)
app.use(express.static(path.join(__dirname, '..', 'public')));

// CORS voor development
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// API routes
app.use('/api', apiRoutes);

// Root endpoint - redirect to GUI
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/favorites-manager.html');
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

// Initialiseer sync service
const syncService = new SyncService();

// Initialiseer SmartScheduler (indien ingeschakeld via env)
let smartScheduler: SmartScheduler | null = null;
if (SmartScheduler.isEnabled()) {
  const riderRepo = new RiderRepository();
  const syncQueue = getSyncQueue();
  smartScheduler = new SmartScheduler(riderRepo, syncQueue);
  smartScheduler.start();
  logger.info('✅ SmartScheduler gestart (automatische sync op basis van priority)');
} else {
  logger.info('⏸️ SmartScheduler uitgeschakeld (SCHEDULER_ENABLED=false)');
}

// Export functie voor scheduler status (voor API)
export function getSchedulerStatus() {
  if (!smartScheduler) {
    return {
      enabled: false,
      message: 'Scheduler niet actief (SCHEDULER_ENABLED=false in .env)'
    };
  }
  return {
    enabled: true,
    ...smartScheduler.getStatus()
  };
}

// Setup cron job voor automatische sync (indien ingeschakeld)
if (config.enableAutoSync) {
  // Elke X minuten sync uitvoeren
  const cronExpression = `*/${config.syncIntervalMinutes} * * * *`;
  
  cron.schedule(cronExpression, async () => {
    logger.info('🔄 Automatische sync gestart (cron job)');
    try {
      await syncService.syncClubMembers();
      logger.info('✅ Automatische sync voltooid');
    } catch (error) {
      logger.error('❌ Automatische sync gefaald', error);
    }
  });
  
  logger.info(`⏰ Automatische sync ingeschakeld: elke ${config.syncIntervalMinutes} minuten`);
}

// Start server
const server = app.listen(config.port, () => {
  logger.info(`🚀 Server draait op http://localhost:${config.port}`);
  logger.info(`📊 Dashboard API: http://localhost:${config.port}/api`);
  logger.info(`🏁 Environment: ${config.nodeEnv}`);
});

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signaal ontvangen, sluit server af...');
  
  // Stop scheduler
  if (smartScheduler) {
    smartScheduler.stop();
  }
  
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server afgesloten');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signaal ontvangen (Ctrl+C), sluit server af...');
  
  // Stop scheduler
  if (smartScheduler) {
    smartScheduler.stop();
  }
  
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
