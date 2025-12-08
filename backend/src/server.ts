import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const VERSION = '4.0.0-fresh-start';

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: VERSION,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock API endpoints (later te vervangen door Supabase)
app.get('/api/events/upcoming', (req: Request, res: Response) => {
  res.json({
    success: true,
    count: 2,
    events: [
      {
        id: 1,
        name: 'Zwift Racing League - Stage 3',
        route: 'Watopia - Volcano Circuit',
        distance: 32.5,
        elevation: 425,
        start_time: new Date(Date.now() + 3600000).toISOString(),
        participants: 245,
        pen: 'B'
      },
      {
        id: 2,
        name: 'TeamNL Training Race',
        route: 'Richmond - UCI Worlds Course',
        distance: 28.3,
        elevation: 380,
        start_time: new Date(Date.now() + 7200000).toISOString(),
        participants: 89,
        pen: 'C'
      }
    ]
  });
});

app.get('/api/results/team/recent', (req: Request, res: Response) => {
  res.json({
    success: true,
    events_count: 1,
    events: [
      {
        event_id: 1,
        event_name: 'Zwift Racing League - Stage 2',
        event_date: new Date(Date.now() - 86400000).toISOString(),
        pen: 'B',
        total_riders: 156,
        results: [
          {
            rider_id: 1,
            rider_name: 'Jan Jansen',
            rank: 12,
            time_seconds: 3245,
            avg_wkg: 3.8,
            velo_rating: 4,
            velo_change: 1,
            power_20m: 285,
            effort_score: 92
          },
          {
            rider_id: 2,
            rider_name: 'Piet Pietersen',
            rank: 28,
            time_seconds: 3312,
            avg_wkg: 3.2,
            velo_rating: 3,
            velo_change: 0,
            power_20m: 245,
            effort_score: 88
          }
        ]
      }
    ]
  });
});

app.get('/api/admin/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    stats: {
      total_riders: 24,
      total_events: 48,
      total_results: 1156,
      avg_velo: 3.8
    }
  });
});

app.get('/api/sync/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    config: {
      auto_sync_enabled: false,
      sync_interval_minutes: 60
    }
  });
});

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
