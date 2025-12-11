// Load environment variables FIRST
import { config } from 'dotenv';
config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const VERSION = '4.0.0-fresh-start';

// Middleware
app.use(cors());
app.use(express.json());

// Admin API routes
app.use('/api/admin', adminRoutes);

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: VERSION,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Supabase config endpoint - serves runtime config to frontend
app.get('/api/config/supabase', (req: Request, res: Response) => {
  res.json({
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  });
});

// Note: All API routes handled by dedicated route files
// - Admin routes: backend/src/routes/admin.ts (JWT authenticated)
// - Public data served from Supabase via v_rider_complete view

// Serve static frontend files
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
console.log('📁 Frontend path:', frontendDistPath);

app.use(express.static(frontendDistPath, { 
  index: 'index.html',
  extensions: ['html']
}));

// SPA fallback - alle routes naar index.html
app.get('*', (req: Request, res: Response) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(404).send('Frontend not found');
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 TeamNL Cloud9 Racing Team Dashboard');
  console.log(`📦 Version: ${VERSION}`);
  console.log(`🌍 Port: ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Server running!\n`);
});
