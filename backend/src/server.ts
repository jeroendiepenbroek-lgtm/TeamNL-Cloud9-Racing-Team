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

// US7 + US8: Auto-sync service
import { autoSyncService } from './services/auto-sync.service.js';
import { syncConfig } from './config/sync.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toLocaleString('nl-NL');
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  console.log('❤️  Health check ontvangen');
  res.status(200).json({
    status: 'ok',
    service: 'TeamNL Cloud9 Racing Dashboard',
    timestamp: new Date().toISOString(),
    version: '1.0.0-mvp',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes - 6 Endpoints (BEFORE static files!)
app.use('/api/clubs', clubsRouter);
app.use('/api/riders', ridersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/results', resultsRouter);
app.use('/api/history', riderHistoryRouter);
app.use('/api/sync-logs', syncLogsRouter);
app.use('/api/auto-sync', autoSyncRouter); // US8

// Static files (AFTER API routes to avoid conflicts)
// Serve React frontend build (Vite builds to backend/public/dist/)
app.use(express.static(path.join(__dirname, '../public/dist')));

// SPA Fallback - LAST route (catch-all for client-side routing)
app.get('*', (req: Request, res: Response) => {
  // If API call that wasn't caught, return JSON error
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint niet gevonden',
      path: req.path,
    });
  } else {
    // Otherwise, serve React app index.html (SPA fallback)
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
console.log(`⏳ Server opstart...`);
console.log(`📍 Omgeving: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Binding: 0.0.0.0:${PORT}`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server succesvol gestart!\n`);
  console.log(`
╔════════════════════════════════════════════════╗
║  TeamNL Cloud9 Racing Dashboard - MVP v1.0    ║
╠════════════════════════════════════════════════╣
║  🚀 Server draait op poort ${PORT}               ║
║  ❤️  Health check: http://0.0.0.0:${PORT}/health ║
║                                                ║
║  � 6 API Endpoints:                           ║
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
║  ⏰ Auto-Sync:                                 ║
║  • Status: ${syncConfig.enabled ? 'Ingeschakeld' : 'Uitgeschakeld'}                        ║
║  • Interval: Elke ${syncConfig.intervalHours} uur                    ║
╚════════════════════════════════════════════════╝
  `);
  
  // Start auto-sync scheduler (indien enabled)
  autoSyncService.start();
});

// Server error handling
server.on('error', (error: any) => {
  console.error('❌ Server fout:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Poort ${PORT} is al in gebruik`);
    console.error(`💡 Tip: Kill het proces met: lsof -ti:${PORT} | xargs kill -9`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM ontvangen - server wordt afgesloten...');
  server.close(() => {
    console.log('✅ Server netjes afgesloten');
  });
});

export default app;
