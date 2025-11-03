/**
 * Standalone Production Server
 * Robuuste backend voor autonome cloud E2E workflow
 * - Health checks
 * - Graceful shutdown
 * - Error recovery
 * - Process management
 */

import express, { Request, Response, NextFunction } from 'express';
import { config } from './utils/config.js';
import { logger } from './utils/logger.js';
import { multiClubSyncService } from './services/multi-club-sync.service.js';
import { supabaseSyncService } from './services/supabase-sync.service.js';
import prisma from './database/client.js';

const app = express();
const startTime = Date.now();

// Middleware
app.use(express.json({ limit: '10mb' }));

// CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      uptime: `${uptime}s`,
      timestamp: new Date().toISOString(),
      env: config.nodeEnv,
      services: {
        database: 'connected',
        supabase: 'available',
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      uptime: `${uptime}s`,
    });
  }
});

// Config endpoint
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    clubId: config.zwiftClubId,
    clubName: 'TeamNL Cloud9',
    apiBaseUrl: config.zwiftApiBaseUrl,
    env: config.nodeEnv,
  });
});

// List tracked clubs
app.get('/api/clubs', async (_req: Request, res: Response) => {
  try {
    const clubs = await multiClubSyncService.getAllTrackedClubs();
    res.json({ success: true, clubs, count: clubs.length });
  } catch (error: any) {
    logger.error('GET /api/clubs failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Multi-club sync endpoint
app.post('/api/sync/riders-with-clubs', async (req: Request, res: Response) => {
  try {
    const { riderIds } = req.body;
    
    if (!Array.isArray(riderIds) || riderIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'riderIds array required (e.g., [150437, 123456])' 
      });
    }

    logger.info(`🔄 Multi-club sync: ${riderIds.length} riders`);

    // Background processing for large batches
    if (riderIds.length > 20) {
      // Return immediately, process in background
      multiClubSyncService.syncRidersWithClubs(riderIds)
        .then(result => {
          logger.info(`✅ Background sync complete:`, {
            riders: result.synced.riders,
            clubs: result.synced.clubs,
            errors: result.errors.length,
          });
        })
        .catch(error => {
          logger.error(`❌ Background sync failed:`, error);
        });

      return res.status(202).json({
        success: true,
        message: 'Bulk sync started in background',
        total: riderIds.length,
      });
    }

    // Immediate processing for small batches
    const result = await multiClubSyncService.syncRidersWithClubs(riderIds);
    
    res.json(result);
  } catch (error: any) {
    logger.error('POST /api/sync/riders-with-clubs failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      hint: 'Check logs for details',
    });
  }
});

// Single club sync
app.post('/api/sync/club/:clubId', async (req: Request, res: Response) => {
  try {
    const clubId = parseInt(req.params.clubId);
    
    if (isNaN(clubId)) {
      return res.status(400).json({ success: false, error: 'Invalid club ID' });
    }

    logger.info(`🔄 Club sync: ${clubId}`);

    // Import on-demand to avoid circular deps
    const { ZwiftApiClient } = await import('./api/zwift-client.js');
    const apiClient = new ZwiftApiClient({
      apiKey: config.zwiftApiKey,
      baseUrl: config.zwiftApiBaseUrl,
    });

    const clubData = await apiClient.getClubMembers(clubId);
    
    // Sync club
    const clubSynced = await supabaseSyncService.syncClub({
      id: clubData.clubId,
      name: clubData.name,
      memberCount: clubData.riders.length,
    });

    if (!clubSynced) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to sync club' 
      });
    }

    // Sync roster
    const rosterSynced = await supabaseSyncService.syncClubRoster(
      clubData.clubId,
      clubData.riders.map((r: any) => ({
        zwiftId: r.riderId,
        name: r.name,
        clubId: clubData.clubId,
        category: r.category,
        ftp: r.ftp,
        weight: r.weight,
      }))
    );

    res.json({
      success: true,
      clubId: clubData.clubId,
      clubName: clubData.name,
      memberCount: clubData.riders.length,
      rosterSynced,
    });

  } catch (error: any) {
    logger.error(`POST /api/sync/club/:clubId failed:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Supabase stats
app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await supabaseSyncService.getSupabaseStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    logger.error('GET /api/stats failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    hint: 'Available endpoints: GET /health, GET /api/config, POST /api/sync/riders-with-clubs',
  });
});

// Global error handler
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
  });
});

// Graceful shutdown
let server: any;

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await prisma.$disconnect();
        logger.info('Database disconnected');
      } catch (error) {
        logger.error('Error disconnecting database:', error);
      }
      
      logger.info('✅ Shutdown complete');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error('💥 Unhandled Rejection:', reason);
  shutdown('UNHANDLED_REJECTION');
});

// Start server
const PORT = config.port;

server = app.listen(PORT, () => {
  logger.info('🚀 Standalone Backend Server');
  logger.info(`   URL: http://localhost:${PORT}`);
  logger.info(`   Health: http://localhost:${PORT}/health`);
  logger.info(`   Env: ${config.nodeEnv}`);
  logger.info(`   Club ID: ${config.zwiftClubId}`);
  logger.info('');
  logger.info('📡 Endpoints:');
  logger.info('   GET  /health');
  logger.info('   GET  /api/config');
  logger.info('   GET  /api/clubs');
  logger.info('   GET  /api/stats');
  logger.info('   POST /api/sync/riders-with-clubs');
  logger.info('   POST /api/sync/club/:clubId');
  logger.info('');
  logger.info('✅ Ready for autonomous cloud E2E workflow');
});

export { app, server };
