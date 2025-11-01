/**
 * Simple Test Server - Supabase Integration
 * Test zonder MVP dependencies
 */

import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger.js';
import { unifiedSyncService } from './services/unified-sync.service.js';
import { supabaseSyncService } from './services/supabase-sync.service.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supabase: process.env.SUPABASE_URL ? 'configured' : 'missing'
  });
});

// Test Supabase connection
app.get('/api/test/supabase', async (req, res) => {
  try {
    const stats = await supabaseSyncService.getSupabaseStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync single rider
app.post('/api/sync/rider/:riderId', async (req, res) => {
  try {
    const riderId = parseInt(req.params.riderId);
    const result = await unifiedSyncService.syncRider(riderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync riders bulk
app.post('/api/sync/riders/bulk', async (req, res) => {
  try {
    const { riderIds } = req.body;
    
    if (!riderIds || !Array.isArray(riderIds)) {
      return res.status(400).json({ error: 'riderIds array required' });
    }
    
    const result = await unifiedSyncService.syncRidersBulk(riderIds);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync club
app.post('/api/sync/club/:clubId', async (req, res) => {
  try {
    const clubId = parseInt(req.params.clubId);
    const result = await unifiedSyncService.syncClub(clubId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync event
app.post('/api/sync/event/:eventId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.eventId);
    const result = await unifiedSyncService.syncEvent(eventId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get sync logs
app.get('/api/sync/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await supabaseSyncService.getSyncLogs(limit);
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server started on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`🔧 Test Supabase: http://localhost:${PORT}/api/test/supabase`);
});
