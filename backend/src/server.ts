/**
 * TeamNL Cloud9 Racing Team - Clean Backend Server
 * 6 API Endpoints → 6 Supabase Tables
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import 'dotenv/config';

// Import endpoints
import clubsRouter from './api/endpoints/clubs.js';
import ridersRouter from './api/endpoints/riders.js';
import eventsRouter from './api/endpoints/events.js';
import resultsRouter from './api/endpoints/results.js';
import riderHistoryRouter from './api/endpoints/rider-history.js';
import syncLogsRouter from './api/endpoints/sync-logs.js';

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

// Root route for debugging
app.get('/', (req: Request, res: Response) => {
  console.log('Root route accessed');
  // Try React app first, fallback to old HTML
  const reactIndexPath = path.join(__dirname, '../public/dist/index.html');
  const oldIndexPath = path.join(__dirname, '../public/index.html');
  
  if (existsSync(reactIndexPath)) {
    res.sendFile(reactIndexPath);
  } else {
    console.log('React build not found, serving old HTML');
    res.sendFile(oldIndexPath);
  }
});

// API Routes - 6 Endpoints
app.use('/api/clubs', clubsRouter);
app.use('/api/riders', ridersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/results', resultsRouter);
app.use('/api/history', riderHistoryRouter);
app.use('/api/sync-logs', syncLogsRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  // If API call, return JSON error
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint niet gevonden',
      path: req.path,
    });
  } else {
    // Otherwise, serve React app (SPA fallback)
    const reactIndexPath = path.join(__dirname, '../public/dist/index.html');
    const oldIndexPath = path.join(__dirname, '../public/index.html');
    
    if (existsSync(reactIndexPath)) {
      res.sendFile(reactIndexPath);
    } else {
      res.sendFile(oldIndexPath);
    }
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
╚════════════════════════════════════════════════╝
  `);
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
