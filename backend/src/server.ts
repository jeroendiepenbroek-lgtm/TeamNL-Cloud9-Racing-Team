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
import resultsSyncRouter from './api/endpoints/results-sync.js';
import adminStatsRouter from './api/endpoints/admin-stats.js';
import rateLimiterRouter from './api/endpoints/rate-limiter.js';
import cleanupRouter from './api/endpoints/cleanup.js';
import riderDeltasRouter from './api/endpoints/rider-deltas.js';
import schedulerRouter from './api/endpoints/scheduler.js';
import syncControlRouter from './api/endpoints/sync-control.js';
import riderEnrichmentRouter from './api/endpoints/rider-enrichment.js';
import zwiftpowerRouter from './api/endpoints/zwiftpower.js';
import apiDocumentationRouter from './api/endpoints/api-documentation.js';

// Sync services
import { syncConfig } from './config/sync.config.js';
import { SyncServiceV2 } from './services/sync-v2.service.js';
import { syncConfigService } from './services/sync-config.service.js';
import { SyncConfigValidator } from './services/sync-config-validator.js';
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
app.use('/api/sync/results', resultsSyncRouter); // Results sync from rider history
app.use('/api/admin/stats', adminStatsRouter); // Admin dashboard stats
app.use('/api/rate-limiter', rateLimiterRouter); // Rate limiter monitoring
app.use('/api/cleanup', cleanupRouter); // Event cleanup operations
app.use('/api/riders', riderDeltasRouter); // US2: Rider delta tracking voor Live Velo
app.use('/api/riders', riderEnrichmentRouter); // Rider data enrichment with recent races
app.use('/api/scheduler', schedulerRouter); // US4: Smart sync scheduler management
app.use('/api/sync-control', syncControlRouter); // Modern sync control center
app.use('/api/zwiftpower', zwiftpowerRouter); // ZwiftPower direct data access met category berekening
app.use('/api/admin/api-documentation', apiDocumentationRouter); // Complete API documentation for all 3 APIs

// Redirect /admin to /admin/ (HTML admin tools have priority over React router)
app.get('/admin', (req: Request, res: Response) => {
  res.redirect(301, '/admin/');
});

// 404 handler
app.use((req: Request, res: Response) => {
  // If API call, return JSON error
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint niet gevonden',
      path: req.path,
    });
  } else if (req.path.startsWith('/admin/')) {
    // Admin HTML tools - 404 if not found by static middleware
    res.status(404).send('Admin tool niet gevonden');
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
╚════════════════════════════════════════════════╝
  `);
  
  // ═══════════════════════════════════════════════════════════════
  //  UNIFIED SYNC SCHEDULER - Modern & Professional
  // ═══════════════════════════════════════════════════════════════
  // Scheduler gestart via endpoints (admin controle)
  // Zie /api/scheduler voor status en controle
  console.log('✅ Server ready - schedulers beschikbaar via /api/scheduler');
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
