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

// ============================================================================
// ADMIN API ENDPOINTS
// ============================================================================

// Simple admin auth middleware (TODO: replace with proper auth)
const adminAuth = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const adminKey = process.env.ADMIN_KEY || 'teamnl-admin-2025';
  
  if (authHeader === `Bearer ${adminKey}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Get sync configuration
app.get('/api/admin/sync/config', adminAuth, async (req: Request, res: Response) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    const response = await fetch(`${supabaseUrl}/rest/v1/sync_config?id=eq.1`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    
    const data = await response.json() as any;
    res.json(data[0] || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update sync configuration
app.post('/api/admin/sync/config', adminAuth, express.json(), async (req: Request, res: Response) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    const response = await fetch(`${supabaseUrl}/rest/v1/sync_config?id=eq.1`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json() as any;
    res.json(data[0] || {});
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get sync logs
app.get('/api/admin/sync/logs', adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit || 50;
    const supabaseUrl = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/sync_logs?order=started_at.desc&limit=${limit}`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      }
    );
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get team members
app.get('/api/admin/team/members', adminAuth, async (req: Request, res: Response) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/team_members?order=display_order.asc.nullslast`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      }
    );
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add team member
app.post('/api/admin/team/members', adminAuth, express.json(), async (req: Request, res: Response) => {
  try {
    const { rider_id, notes } = req.body;
    const supabaseUrl = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    const response = await fetch(`${supabaseUrl}/rest/v1/team_members`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ rider_id, notes, added_by: 'admin' })
    });
    
    const data = await response.json() as any;
    res.json(data[0] || data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove team member
app.delete('/api/admin/team/members/:riderId', adminAuth, async (req: Request, res: Response) => {
  try {
    const { riderId } = req.params;
    const supabaseUrl = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/team_members?rider_id=eq.${riderId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      }
    );
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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

// Mock API: Team riders with power data (matching MatrixRider interface)
app.get('/api/riders/team', (req: Request, res: Response) => {
  const riders = [
    {
      rider_id: 1,
      name: 'Jan Jansen',
      zp_category: 'B',
      zp_ftp: 275,
      weight: 72,
      race_last_rating: 1950,
      race_max30_rating: 2050,
      race_wins: 5,
      race_podiums: 12,
      race_finishes: 48,
      race_dnfs: 2,
      watts_per_kg: 3.82,
      power_w5: 1245,
      power_w15: 985,
      power_w30: 785,
      power_w60: 625,
      power_w120: 475,
      power_w300: 385,
      power_w1200: 285
    },
    {
      rider_id: 2,
      name: 'Piet Pietersen',
      zp_category: 'C',
      zp_ftp: 235,
      weight: 65,
      race_last_rating: 1725,
      race_max30_rating: 1780,
      race_wins: 2,
      race_podiums: 8,
      race_finishes: 35,
      race_dnfs: 1,
      watts_per_kg: 3.62,
      power_w5: 1050,
      power_w15: 825,
      power_w30: 685,
      power_w60: 545,
      power_w120: 415,
      power_w300: 340,
      power_w1200: 245
    },
    {
      rider_id: 3,
      name: 'Marie van Dam',
      zp_category: 'A',
      zp_ftp: 305,
      weight: 68,
      race_last_rating: 2450,
      race_max30_rating: 2580,
      race_wins: 15,
      race_podiums: 28,
      race_finishes: 62,
      race_dnfs: 3,
      watts_per_kg: 4.49,
      power_w5: 1485,
      power_w15: 1125,
      power_w30: 895,
      power_w60: 705,
      power_w120: 545,
      power_w300: 425,
      power_w1200: 315
    },
    {
      rider_id: 4,
      name: 'Kees de Vries',
      zp_category: 'D',
      zp_ftp: 195,
      weight: 78,
      race_last_rating: 1250,
      race_max30_rating: 1320,
      race_wins: 1,
      race_podiums: 4,
      race_finishes: 28,
      race_dnfs: 5,
      watts_per_kg: 2.50,
      power_w5: 895,
      power_w15: 705,
      power_w30: 585,
      power_w60: 465,
      power_w120: 365,
      power_w300: 285,
      power_w1200: 205
    },
    {
      rider_id: 5,
      name: 'Lisa Bakker',
      zp_category: 'B',
      zp_ftp: 255,
      weight: 62,
      race_last_rating: 1880,
      race_max30_rating: 1945,
      race_wins: 4,
      race_podiums: 11,
      race_finishes: 42,
      race_dnfs: 2,
      watts_per_kg: 4.11,
      power_w5: 1145,
      power_w15: 895,
      power_w30: 725,
      power_w60: 585,
      power_w120: 445,
      power_w300: 365,
      power_w1200: 265
    }
  ];
  
  res.json(riders);
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
