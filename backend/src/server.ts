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
import syncConfigRouter from './api/endpoints/sync-config.js';
import syncV2Router from './api/endpoints/sync-v2.js';
import syncRealResultsRouter from './api/endpoints/sync-real-results.js';
import adminStatsRouter from './api/endpoints/admin-stats.js';
import rateLimiterRouter from './api/endpoints/rate-limiter.js';
import cleanupRouter from './api/endpoints/cleanup.js';

// Sync services
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
app.use('/api/sync', syncV2Router); // Modern sync V2 (prioriteit)
app.use('/api/sync', syncConfigRouter); // Sync configuratie (fallback)
app.use('/api/sync', syncRealResultsRouter); // Real-time results sync
app.use('/api/admin/stats', adminStatsRouter); // Admin dashboard stats
app.use('/api/rate-limiter', rateLimiterRouter); // Rate limiter monitoring
app.use('/api/cleanup', cleanupRouter); // Event cleanup operations

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
  
  // Rider Sync Scheduler - Runs every 90 minutes (HIGHEST PRIORITY)
  // Trigger: 00:00, 01:30, 03:00, 04:30, 06:00, 07:30, 09:00, 10:30, 12:00, 13:30, 15:00, 16:30, 18:00, 19:30, 21:00, 22:30
  // POST rate limit: 1/15min → 90min interval = 6x safety margin
  if (config.riderSyncEnabled) {
    const riderCronExpression = '0,30 */3 * * *'; // At :00 and :30, every 3 hours (= every 90 min)
    console.log(`  ✅ Rider Sync (P1): Every 90 min - Safe POST rate limit (16x/dag)`);
    
    cron.schedule(riderCronExpression, async () => {
      console.log(`\n⏰ [CRON] Rider Sync (PRIORITY 1) triggered at ${new Date().toISOString()}`);
      try {
        const metrics = await syncServiceV2.syncRidersCoordinated({
          intervalMinutes: 90, // 90 minutes
        });
        console.log(`✅ [CRON] Rider Sync completed: ${metrics.riders_processed} riders (${metrics.riders_new} new, ${metrics.riders_updated} updated)`);
      } catch (error) {
        console.error(`❌ [CRON] Rider Sync failed:`, error);
      }
    });
  } else {
    console.log(`  ⏸️  Rider Sync: Disabled`);
  }
  
  // Combined Event Sync - NEAR only mode (Frequent: every 15 min)
  // Runs at :05, :20, :35, :50 - only syncs events < threshold (near events)
  const nearEventCronExpression = '5,20,35,50 * * * *';
  console.log(`  ✅ Event Sync NEAR (P2): At :05, :20, :35, :50 every hour`);
  
  cron.schedule(nearEventCronExpression, async () => {
    console.log(`\n⏰ [CRON] Event Sync (NEAR) triggered at ${new Date().toISOString()}`);
    try {
      const metrics = await syncServiceV2.syncEventsCoordinated({
        intervalMinutes: 15,
        thresholdMinutes: config.nearEventThresholdMinutes,
        lookforwardHours: config.lookforwardHours,
        mode: 'near_only', // Alleen near events + signups
      });
      console.log(`✅ [CRON] Event Sync (NEAR) completed: ${metrics.events_near} near events, ${metrics.signups_synced} signups`);
    } catch (error) {
      console.error(`❌ [CRON] Event Sync (NEAR) failed:`, error);
    }
  });
  
  // Combined Event Sync - FULL SCAN mode (Periodic: every 3 hours at :50)
  // Runs at :50 every 3 hours - syncs ALL events (near + far)
  // Samenvallend met NEAR run voor efficiency (00:50, 03:50, 06:50, 09:50, 12:50, 15:50, 18:50, 21:50)
  const fullEventCronExpression = '50 */3 * * *';
  console.log(`  ✅ Event Sync FULL (P2): At :50 every 3 hours (on NEAR slot!)`);
  
  cron.schedule(fullEventCronExpression, async () => {
    console.log(`\n⏰ [CRON] Event Sync (FULL) triggered at ${new Date().toISOString()}`);
    try {
      const metrics = await syncServiceV2.syncEventsCoordinated({
        intervalMinutes: 180, // 3 hours
        thresholdMinutes: config.nearEventThresholdMinutes,
        lookforwardHours: config.lookforwardHours,
        mode: 'full_scan', // Alle events + signups (near + far)
      });
      console.log(`✅ [CRON] Event Sync (FULL) completed: ${metrics.events_near} near + ${metrics.events_far} far events, ${metrics.signups_synced} signups`);
    } catch (error) {
      console.error(`❌ [CRON] Event Sync (FULL) failed:`, error);
    }
  });
  
  console.log('✅ All V2 Auto-Sync schedulers configured\n');

  // Weekly Event Cleanup - Zondag 03:00 (laag verkeer)
  console.log('🧹 Configuring weekly event cleanup...');
  
  cron.schedule('0 3 * * 0', async () => {
    console.log(`\n🧹 [CRON] Weekly event cleanup triggered at ${new Date().toISOString()}`);
    try {
      const { eventCleanupService } = await import('./services/event-cleanup.service.js');
      const result = await eventCleanupService.runFullCleanup();
      console.log(`✅ [CRON] Cleanup completed:`, result);
    } catch (error) {
      console.error(`❌ [CRON] Cleanup failed:`, error);
    }
  });
  
  console.log('  ✅ Weekly cleanup: Zondag 03:00 (past events + stale future)');
  console.log('✅ Event cleanup scheduler configured\n');
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
