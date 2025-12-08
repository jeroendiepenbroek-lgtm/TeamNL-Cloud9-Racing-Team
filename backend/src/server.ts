/**
 * TeamNL Cloud9 Racing Team - Minimal Backend Server
 * Clean slate na complete codebase cleanup
 * 
 * Status: Alleen health endpoint, geen database connecties
 * Frontend: Vite build served from public/dist/
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);
const ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: ENV,
    port: PORT,
    version: '3.0.0-clean-slate',
    message: '✅ Backend running - ready for rebuild'
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: ENV,
    message: 'API is operational (no database yet)'
  });
});

// ============================================================================
// SERVE FRONTEND (React/Vite build)
// ============================================================================

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, '../public/dist')));

// Fallback: serve index.html for client-side routing
app.get('*', (req: Request, res: Response) => {
  // Skip API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ 
      error: 'API endpoint not found',
      message: 'This endpoint has not been implemented yet',
      availableEndpoints: ['/health', '/api/health']
    });
  }
  
  // Serve React app
  res.sendFile(path.join(__dirname, '../public/dist/index.html'));
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  TeamNL Cloud9 Racing Team - Backend v3.0     ║');
  console.log('║  🧹 Clean Slate Edition                        ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  🚀 Server running on port ${PORT}               ║`);
  console.log(`║  📍 Health: http://0.0.0.0:${PORT}/health        ║`);
  console.log('║  🌍 Environment: ' + ENV.padEnd(27) + '║');
  console.log('║                                                ║');
  console.log('║  ✅ Ready for rebuild                          ║');
  console.log('║  • Frontend: React (3 empty dashboards)       ║');
  console.log('║  • Backend: Health endpoints only             ║');
  console.log('║  • Database: Ready for fresh schema           ║');
  console.log('╚════════════════════════════════════════════════╝\n');
});
