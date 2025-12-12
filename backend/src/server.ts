// MINIMAL SERVER - READ ONLY DATA
import './env';
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

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '5.0.0-minimal' });
});

// Supabase config for frontend
app.get('/api/config/supabase', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
});

// Riders data - READ ONLY
app.get('/api/riders', async (req, res) => {
  const { data } = await supabase.from('v_rider_complete').select('*');
  res.json(data || []);
});

// Frontend
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.listen(PORT, () => console.log(`✅ Server on ${PORT}`));
