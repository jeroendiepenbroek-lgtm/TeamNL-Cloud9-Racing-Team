/**
 * TeamNL Cloud9 Racing Team - Clean Backend Server
 * 6 API Endpoints → 6 Supabase Tables
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Import endpoints
import clubsRouter from './api/endpoints/clubs.js';
import ridersRouter from './api/endpoints/riders.js';
import eventsRouter from './api/endpoints/events.js';
import resultsRouter from './api/endpoints/results.js';
import riderHistoryRouter from './api/endpoints/rider-history.js';
import syncLogsRouter from './api/endpoints/sync-logs.js';
import autoSyncRouter from './api/endpoints/auto-sync.js';
import syncConfigRouter from './api/endpoints/sync-config.js';
import syncV2Router from './api/endpoints/sync-v2.js';
import adminStatsRouter from './api/endpoints/admin-stats.js';
import rateLimiterRouter from './api/endpoints/rate-limiter.js';

// Sync services
import { autoSyncService } from './services/auto-sync.service.js';
import { syncConfig } from './config/sync.config.js';
import { SyncServiceV2 } from './services/sync-v2.service.js';
import { syncConfigService } from './services/sync-config.service.js';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Serve React frontend build (producti)
app.use(express.static(path.join(__dirname, '../public/dist')));

// Fallback: serve old public/index.html (development)
app.use(express.static(path.join(__dirname, '../public')));

// Logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  console.log('Health check received');
  res.status(200).json({
    status: 'ok',
    service: 'TeamNL Cloud9 Backend',
    timestamp: new Date().toISOString(),
    version: '2.0.0-clean',
    port: PORT,
  });
});

// Root route - Serve React app
app.get('/', (req: Request, res: Response) => {
  console.log('Root route accessed - serving React app');
  res.sendFile(path.join(__dirname, '../public/dist/index.html'));
});

// API Routes - 6 Endpoints
app.use('/api/clubs', clubsRouter);
app.use('/api/riders', ridersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/results', resultsRouter);
app.use('/api/history', riderHistoryRouter);
app.use('/api/sync-logs', syncLogsRouter);
app.use('/api/auto-sync', autoSyncRouter); // US8
app.use('/api/sync', syncV2Router); // Modern sync V2 (prioriteit)
app.use('/api/sync', syncConfigRouter); // Sync configuratie (fallback)
app.use('/api/admin/stats', adminStatsRouter); // Admin dashboard stats
app.use('/api/rate-limiter', rateLimiterRouter); // Rate limiter monitoring

// 404 handler
app.use((req: Request, res: Response) => {
  // If API call, return JSON error
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint niet gevonden',
      path: req.path,
    });
  } else {
    // Otherwise, serve React app (SPA fallback for client-side routing)
    res.sendFile(path.join(__dirname, '../public/dist/index.html'));
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Interne server fout',
    message: err.message,
  });
});

// Start server
console.log(`Starting server on port ${PORT}...`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Binding to: 0.0.0.0:${PORT}`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully started!`);
  console.log(`
╔════════════════════════════════════════════════╗
║  TeamNL Cloud9 Racing Team - Backend v2.0     ║
╠════════════════════════════════════════════════╣
║  🚀 Server running on port ${PORT}               ║
║  📍 Health: http://0.0.0.0:${PORT}/health        ║
║                                                ║
║  🔗 6 API Endpoints:                           ║
║  • GET  /api/clubs/:id                         ║
║  • GET  /api/riders                            ║
║  • GET  /api/events                            ║
║  • GET  /api/results/:eventId                  ║
║  • GET  /api/history/:riderId                  ║
║  • GET  /api/sync-logs                         ║
║                                                ║
║  🔄 Sync Endpoints:                            ║
║  • POST /api/clubs/:id/sync                    ║
║  • POST /api/riders/sync                       ║
║  • POST /api/events/sync                       ║
║  • POST /api/results/:eventId/sync             ║
║  • POST /api/history/:riderId/sync             ║
║  • POST /api/sync-logs/full-sync               ║
║                                                ║
║  ⏰ Auto-Sync (US8):                           ║
║  • Enabled: ${syncConfig.enabled ? 'YES' : 'NO'}                              ║
║  • Interval: Every ${syncConfig.intervalHours}h                      ║
╚════════════════════════════════════════════════╝
  `);
  
  // US7 + US8: Legacy auto-sync scheduler - DISABLED to prevent conflicts with V2
  // autoSyncService.start();  // ❌ DISABLED: conflicts with V2 syncs, causes rate limits
  
  // Modern V2 Auto-Sync Schedulers
  console.log('🔄 Configuring V2 Auto-Sync schedulers...');
  const config = syncConfigService.getConfig();
  const syncServiceV2 = new SyncServiceV2();
  
  // Rider Sync Scheduler
  if (config.riderSyncEnabled) {
    const riderCronExpression = `*/${config.riderSyncIntervalMinutes} * * * *`; // Every N minutes
    console.log(`  ✅ Rider Sync: Every ${config.riderSyncIntervalMinutes} minutes`);
    
    cron.schedule(riderCronExpression, async () => {
      console.log(`\n⏰ [CRON] Rider Sync triggered at ${new Date().toISOString()}`);
      try {
        const metrics = await syncServiceV2.syncRiders({
          intervalMinutes: config.riderSyncIntervalMinutes,
        });
        console.log(`✅ [CRON] Rider Sync completed: ${metrics.riders_processed} riders (${metrics.riders_new} new, ${metrics.riders_updated} updated)`);
      } catch (error) {
        console.error(`❌ [CRON] Rider Sync failed:`, error);
      }
    });
  } else {
    console.log(`  ⏸️  Rider Sync: Disabled`);
  }
  
  // Near Event Sync Scheduler
  const nearEventCronExpression = `*/${config.nearEventSyncIntervalMinutes} * * * *`;
  console.log(`  ✅ Near Event Sync: Every ${config.nearEventSyncIntervalMinutes} minutes (threshold: ${config.nearEventThresholdMinutes}min)`);
  
  cron.schedule(nearEventCronExpression, async () => {
    console.log(`\n⏰ [CRON] Near Event Sync triggered at ${new Date().toISOString()}`);
    try {
      const metrics = await syncServiceV2.syncNearEvents({
        intervalMinutes: config.nearEventSyncIntervalMinutes,
        thresholdMinutes: config.nearEventThresholdMinutes,
        lookforwardHours: config.lookforwardHours,
      });
      console.log(`✅ [CRON] Near Event Sync completed: ${metrics.events_near} near events, ${metrics.signups_synced} signups`);
    } catch (error) {
      console.error(`❌ [CRON] Near Event Sync failed:`, error);
    }
  });
  
  // Far Event Sync Scheduler
  const farEventCronExpression = `*/${config.farEventSyncIntervalMinutes} * * * *`;
  console.log(`  ✅ Far Event Sync: Every ${config.farEventSyncIntervalMinutes} minutes (lookforward: ${config.lookforwardHours}h)`);
  
  cron.schedule(farEventCronExpression, async () => {
    console.log(`\n⏰ [CRON] Far Event Sync triggered at ${new Date().toISOString()}`);
    try {
      const metrics = await syncServiceV2.syncFarEvents({
        intervalMinutes: config.farEventSyncIntervalMinutes,
        thresholdMinutes: config.nearEventThresholdMinutes,
        lookforwardHours: config.lookforwardHours,
      });
      console.log(`✅ [CRON] Far Event Sync completed: ${metrics.events_far} far events, ${metrics.signups_synced} signups`);
    } catch (error) {
      console.error(`❌ [CRON] Far Event Sync failed:`, error);
    }
  });
  
  console.log('✅ All V2 Auto-Sync schedulers configured\n');
});

// Server error handling
server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;
