# 🚀 Start Hier - 4 november 2025

## Quick Start Commands

```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
npm install
```

## 📝 Te Maken Bestanden (in volgorde)

### 1. `src/supabaseClient.js` (2 min)
```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

### 2. `src/repositories.js` (10 min)
```javascript
import { supabase } from './supabaseClient.js';

export async function getRiders() {
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .order('ranking', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function getClubs() {
  const { data, error } = await supabase
    .from('clubs')
    .select('*');
  
  if (error) throw error;
  return data;
}

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getResults() {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .order('position', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function getRiderHistory() {
  const { data, error } = await supabase
    .from('rider_history')
    .select('*')
    .order('snapshot_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getSyncLogs() {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data;
}
```

### 3. `src/sync.js` (15 min)
```javascript
import axios from 'axios';
import { supabase } from './supabaseClient.js';

const ZWIFT_API_BASE = 'https://zwift-ranking.herokuapp.com/api';
const API_KEY = process.env.ZWIFT_API_KEY;
const CLUB_ID = 11818;

export async function syncClubData() {
  console.log('🔄 Start sync: Club data...');
  
  try {
    // Fetch club info
    const response = await axios.get(
      `${ZWIFT_API_BASE}/public/club/${CLUB_ID}`,
      { headers: { 'X-API-Key': API_KEY } }
    );
    
    const clubData = response.data;
    
    // Upsert club
    const { error: clubError } = await supabase
      .from('clubs')
      .upsert({
        zwift_id: clubData.id,
        name: clubData.name,
        description: clubData.description || '',
        member_count: clubData.memberCount || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: 'zwift_id' });
    
    if (clubError) throw clubError;
    
    console.log('✅ Club synced');
    
    // Log sync
    await supabase.from('sync_logs').insert({
      sync_type: 'club',
      status: 'success',
      records_processed: 1,
      created_at: new Date().toISOString()
    });
    
    return { success: true, club: clubData.name };
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    
    // Log failure
    await supabase.from('sync_logs').insert({
      sync_type: 'club',
      status: 'error',
      error_message: error.message,
      created_at: new Date().toISOString()
    });
    
    throw error;
  }
}

export async function syncRiders() {
  console.log('🔄 Start sync: Riders...');
  
  try {
    // Fetch club members
    const response = await axios.get(
      `${ZWIFT_API_BASE}/public/club/${CLUB_ID}/members`,
      { headers: { 'X-API-Key': API_KEY } }
    );
    
    const riders = response.data;
    
    // Upsert riders
    const ridersToInsert = riders.map(rider => ({
      zwift_id: rider.riderId,
      name: rider.name,
      club_id: CLUB_ID,
      ranking: rider.ranking || 0,
      rating: rider.rating || 0,
      is_active: true,
      updated_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('riders')
      .upsert(ridersToInsert, { onConflict: 'zwift_id' });
    
    if (error) throw error;
    
    console.log(`✅ ${riders.length} riders synced`);
    
    // Log sync
    await supabase.from('sync_logs').insert({
      sync_type: 'riders',
      status: 'success',
      records_processed: riders.length,
      created_at: new Date().toISOString()
    });
    
    return { success: true, count: riders.length };
    
  } catch (error) {
    console.error('❌ Riders sync failed:', error.message);
    
    // Log failure
    await supabase.from('sync_logs').insert({
      sync_type: 'riders',
      status: 'error',
      error_message: error.message,
      created_at: new Date().toISOString()
    });
    
    throw error;
  }
}
```

### 4. `src/server.js` (15 min)
```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getRiders,
  getClubs,
  getEvents,
  getResults,
  getRiderHistory,
  getSyncLogs
} from './repositories.js';
import { syncClubData, syncRiders } from './sync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'TeamNL Cloud9 Backend'
  });
});

// API Endpoints
app.get('/api/riders', async (req, res) => {
  try {
    const riders = await getRiders();
    res.json({ success: true, count: riders.length, data: riders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clubs', async (req, res) => {
  try {
    const clubs = await getClubs();
    res.json({ success: true, count: clubs.length, data: clubs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await getEvents();
    res.json({ success: true, count: events.length, data: events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/results', async (req, res) => {
  try {
    const results = await getResults();
    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rider_history', async (req, res) => {
  try {
    const history = await getRiderHistory();
    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sync_logs', async (req, res) => {
  try {
    const logs = await getSyncLogs();
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync endpoints (POST)
app.post('/api/sync/club', async (req, res) => {
  try {
    const result = await syncClubData();
    res.json({ success: true, message: 'Club data synced', data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sync/riders', async (req, res) => {
  try {
    const result = await syncRiders();
    res.json({ success: true, message: 'Riders synced', data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint niet gevonden', 
    path: req.path,
    availableEndpoints: [
      'GET /health',
      'GET /api/riders',
      'GET /api/clubs',
      'GET /api/events',
      'GET /api/results',
      'GET /api/rider_history',
      'GET /api/sync_logs',
      'POST /api/sync/club',
      'POST /api/sync/riders'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏁 Riders API: http://localhost:${PORT}/api/riders`);
});
```

## 🔑 Environment Setup

Maak `backend/.env` (NIET committen!):
```bash
cp .env.example .env
```

Vul in `.env` de **SUPABASE_SERVICE_ROLE_KEY** in:
1. Ga naar https://supabase.com/dashboard
2. Selecteer project `bktbeefdmrpxhsyyalvc`
3. Settings → API → Service Role Key (secret)
4. Kopieer naar `.env`

## ✅ Test Checklist

Na `npm run dev`:

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Test empty endpoints
curl http://localhost:3000/api/riders
curl http://localhost:3000/api/clubs

# 3. Sync data
curl -X POST http://localhost:3000/api/sync/club
curl -X POST http://localhost:3000/api/sync/riders

# 4. Verify data
curl http://localhost:3000/api/riders
curl http://localhost:3000/api/sync_logs
```

## 📊 Expected Results

**Before sync**:
```json
{ "success": true, "count": 0, "data": [] }
```

**After sync**:
```json
{ 
  "success": true, 
  "count": 25, 
  "data": [
    { "zwift_id": 123, "name": "Rider Name", "ranking": 500, ... }
  ] 
}
```

## 🚨 Troubleshooting

**Error: "Missing SUPABASE_SERVICE_ROLE_KEY"**
→ Check `.env` file bestaat en key is ingevuld

**Error: "connect ECONNREFUSED"**
→ Check Supabase URL correct is

**Error: "Rate limit exceeded"**
→ Wacht 1 minuut tussen sync calls

## ⏱️ Estimated Time

- Setup + npm install: **5 min**
- Create 4 files: **30 min**
- Testing: **10 min**
- Debugging: **15 min**

**Total: ~1 uur**

## 🎯 Success Criteria

✅ Server start zonder errors  
✅ `/health` geeft 200 OK  
✅ 6 GET endpoints werken (leeg is OK)  
✅ 2 POST sync endpoints werken  
✅ Data verschijnt in Supabase na sync  
✅ Sync logs worden bijgehouden  

## 📞 Next Steps After This

1. Commit & push naar GitHub
2. Deploy naar Railway (backend + frontend samen)
3. Verify productie URL werkt
4. Test API endpoints via dashboard

---

**LET OP**: Alle code hierboven is **copy-paste ready** - geen aanpassingen nodig!
