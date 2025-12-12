// ULTRA CLEAN SERVER - ALLEEN RACING MATRIX DATA
// Geen sync, geen teammanager, geen gedoe
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Railway environment variables (direct access)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

console.log('🚀 Environment loaded:', {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasSupabaseKey: !!SUPABASE_SERVICE_KEY,
  nodeEnv: process.env.NODE_ENV
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// API ENDPOINTS - READ ONLY
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: '6.0.0-clean',
    timestamp: new Date().toISOString()
  });
});

// Supabase config for frontend
app.get('/api/config/supabase', (req, res) => {
  res.json({
    url: SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// Get all riders from v_rider_complete view
app.get('/api/riders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('v_rider_complete')
      .select('*')
      .order('velo_live', { ascending: false, nullsFirst: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data?.length || 0,
      riders: data || []
    });
  } catch (error: any) {
    console.error('❌ Error fetching riders:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// FRONTEND SERVING
// ============================================

const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`✅ Server on ${PORT}`);
  console.log(`📊 Racing Matrix: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
});
