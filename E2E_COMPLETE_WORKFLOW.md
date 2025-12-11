# 📚 E2E WORKFLOW DOCUMENTATION
## TeamNL Cloud9 Racing Team Dashboard

**Laatst bijgewerkt:** 11 december 2025  
**Versie:** 4.0 (fresh-start-v4)

---

## 🎯 OVERZICHT

Dit document documenteert de complete End-to-End workflow voor het TeamNL Cloud9 Racing Team Dashboard systeem, inclusief alle oplossingen voor problemen die we zijn tegengekomen.

### Belangrijkste Features
- ✅ Racing Matrix Dashboard met rider statistieken
- ✅ Race statistieken (wins, podiums, DNFs)
- ✅ Admin Dashboard met JWT authenticatie
- ✅ Auto-sync scheduler (configureerbaar 1-24 uur)
- ✅ Handmatig team management (single/bulk import)
- ✅ Complete audit logging
- ✅ Runtime config API (geen VITE_ var problemen meer)

---

## 🏗️ ARCHITECTUUR

### Stack
```
Frontend: React + TypeScript + Vite + TailwindCSS
Backend:  Node.js + Express + TypeScript
Database: Supabase PostgreSQL
Hosting:  Railway
APIs:     ZwiftRacing.app + Zwift Official API
```

### Data Flow
```
ZwiftRacing API → Backend Sync Script → Supabase Database → Backend API → Frontend Dashboard
                                                          ↓
                                                     Admin System
                                                     (JWT Auth + Team Management)
```

---

## 🔥 KRITIEKE OPLOSSINGEN

### Probleem 1: "Invalid API Key" Error (OPGELOST)

**Symptomen:**
- Frontend toonde herhaaldelijk "Invalid API key"
- Environment variables update vereiste volledige rebuild
- VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY werkten niet na Railway deploy

**Root Cause:**
Vite injecteert `VITE_*` environment variables tijdens **build time**, niet runtime. Railway environment variable changes werden niet opgepikt zonder complete redeploy + rebuild.

**Oplossing:**
Runtime Config API Pattern implementatie:

1. **Backend endpoint:** `/api/config/supabase`
```typescript
app.get('/api/config/supabase', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY
  });
});
```

2. **Frontend fetch config:**
```typescript
const configRes = await fetch('/api/config/supabase');
const { url, anonKey } = await configRes.json();
const supabase = createClient(url, anonKey);
```

**Resultaat:**
✅ API key changes werken direct zonder frontend rebuild  
✅ Railway env vars worden realtime gebruikt  
✅ Geen VITE_ prefix meer nodig

**Files gewijzigd:**
- `backend/src/server.ts` (config endpoint)
- `frontend/src/pages/RacingMatrix.tsx` (runtime fetch)

---

### Probleem 2: PostgreSQL View Column Reordering (OPGELOST)

**Symptomen:**
```
ERROR: cannot change name of view column "racing_ftp" to "race_wins"
```

**Root Cause:**
PostgreSQL `CREATE OR REPLACE VIEW` staat geen column reordering toe. Nieuwe kolommen kunnen alleen aan het einde toegevoegd worden.

**Oplossing:**
```sql
DROP VIEW IF EXISTS v_rider_complete;
CREATE VIEW v_rider_complete AS (
  SELECT 
    -- ... existing columns ...
    r.race_wins,
    r.race_podiums,
    -- ... new columns ...
);
```

**Resultaat:**
✅ View wordt volledig opnieuw gemaakt  
✅ Kolommen in gewenste volgorde  
✅ Migration 007 werkt perfect

**Files gewijzigd:**
- `migrations/007_add_race_results_stats.sql`

---

## 📊 DATABASE SCHEMA

### Bestaande Tables
```sql
api_zwiftracing_riders       -- ZwiftRacing API data (race stats)
api_zwift_api_profiles       -- Zwift Official API data
v_rider_complete             -- Combined view (JOIN beide tables)
```

### Nieuwe Admin System Tables (Migration 008)
```sql
admin_users                  -- JWT auth met bcrypt password hashing
team_roster                  -- Rider management (is_active flag)
sync_config                  -- Auto-sync settings (interval, enabled)
sync_logs                    -- Sync history (status, duration, errors)
audit_log                    -- Alle admin actions (JSONB details)
```

### Race Statistics Fields (Migration 007)
```sql
ALTER TABLE api_zwiftracing_riders ADD COLUMN:
- race_wins INTEGER DEFAULT 0
- race_podiums INTEGER DEFAULT 0
- race_finishes INTEGER DEFAULT 0
- race_dnfs INTEGER DEFAULT 0

Calculated in v_rider_complete:
- win_rate_pct (wins / finishes * 100)
- podium_rate_pct (podiums / finishes * 100)
- dnf_rate_pct (dnfs / (finishes + dnfs) * 100)
```

---

## 🔐 ADMIN SYSTEEM

### Authentication Flow
```
1. User navigeert naar /admin/login
2. POST /api/admin/login { email, password }
3. Backend verifieert bcrypt hash
4. JWT token gegenereerd (24h expiry)
5. Token opgeslagen in localStorage
6. Redirect naar /admin
7. Middleware verifieert token bij elke request
```

### Admin API Endpoints

#### Authentication
```
POST   /api/admin/login           Login (returns JWT token)
GET    /api/admin/verify          Verify token validity
```

#### Team Management
```
GET    /api/admin/team/roster                Fetch all team riders
POST   /api/admin/team/riders                Add single rider
POST   /api/admin/team/riders/bulk           Bulk import (array)
DELETE /api/admin/team/riders/:rider_id      Remove rider
```

#### Sync Configuration
```
GET    /api/admin/sync/config                Get auto-sync settings
PUT    /api/admin/sync/config                Update interval/enabled
GET    /api/admin/sync/logs                  Last 50 sync operations
POST   /api/admin/sync/trigger               Manual sync (async)
```

#### Audit Logging
```
GET    /api/admin/audit                      Last 100 admin actions
```

### Auto-Sync Scheduler
- **Interval:** Configureerbaar 1-24 uur
- **Enable/Disable:** Via admin dashboard
- **Concurrency Lock:** `sync_in_progress` flag voorkomt overlappende syncs
- **Logging:** Elke sync gelogd met status (success/failed/partial)
- **Async Execution:** Sync draait in background, blokt niet

---

## 🚀 DEPLOYMENT WORKFLOW

### 1. Lokale Development

```bash
# Backend starten
cd backend
npm install
npm run dev

# Frontend starten (andere terminal)
cd frontend
npm install
npm run dev

# Admin user aanmaken
node create-admin-user.js
```

### 2. Migraties Uitvoeren

```bash
# Migration 007 (race stats)
# Ga naar: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new
# Copy-paste migrations/007_add_race_results_stats.sql
# Run

# Migration 008 (admin system)
# Copy-paste migrations/008_admin_system.sql
# Run
```

### 3. Environment Variables

**Railway Backend:**
```env
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...HHa7K3J...
SUPABASE_SERVICE_KEY=eyJhbGci...Kt9Aolc...
JWT_SECRET=your-super-secret-jwt-key-here
ZWIFTRACING_API_TOKEN=650c6d2fc4ef6858d74cbef1
```

### 4. Railway Deploy

```bash
# Automatic deployment via GitHub
git push origin fresh-start-v4

# Of handmatig via Railway CLI
railway up
```

### 5. Verificatie

```bash
# Health check
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health

# Config test
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/config/supabase

# Riders data test
curl "https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/v_rider_complete?select=*" \
  -H "apikey: YOUR_ANON_KEY"
```

---

## 🔄 DATA SYNC WORKFLOW

### Handmatige Sync (Single Rider)
```bash
node fetch-zwiftracing-rider.js 150437
```

**Stappen:**
1. Fetch data van ZwiftRacing API: `/public/riders/{riderId}`
2. Extract race stats: `velo.wins`, `velo.podiums`, `velo.finishes`, `velo.dnfs`
3. Upsert naar `api_zwiftracing_riders` table
4. Log resultaat (console output)

### Auto-Sync (Scheduler)
1. Admin enable auto-sync in dashboard
2. Backend scheduler draait elke N uur (configureerbaar)
3. Voor elke rider in `team_roster`:
   - Fetch ZwiftRacing API data
   - Upsert naar database
   - Log success/failure
4. Update `sync_logs` table met summary:
   - `riders_synced` (aantal succesvol)
   - `riders_failed` (aantal gefaald)
   - `duration_seconds` (totale tijd)
   - `status` (success/failed/partial)

### Manual Trigger
- Admin klikt "Trigger Manual Sync Now" in dashboard
- POST `/api/admin/sync/trigger`
- Async execution met progress tracking
- Sync log wordt realtime bijgewerkt

---

## 📈 RACING MATRIX DASHBOARD

### Displayed Columns
```
Rank  | Name    | Category | FTP | Wins | Podiums | Finishes | DNFs | Rank Points
------|---------|----------|-----|------|---------|----------|------|-------------
#1    | Rider A | A        | 320 | 5    | 12      | 45       | 2    | 1250
#2    | Rider B | B        | 285 | 0    | 3       | 22       | 1    | 980
```

### Color Coding
- **Wins:** 🟢 Green text (hover toont win_rate_pct)
- **Podiums:** 🔵 Blue text (hover toont podium_rate_pct)
- **DNFs:** 🔴 Red text (hover toont dnf_rate_pct)

### Sorting
- Klik kolom header om te sorteren
- Default: gesorteerd op `rank_score` (DESC)
- Sortable: Alle kolommen inclusief wins/podiums/DNFs

### Data Refresh
- Auto-refresh elke 60 seconden
- Manual refresh knop beschikbaar
- Real-time updates via TanStack Query

---

## 🔍 TROUBLESHOOTING

### Frontend laadt niet
```bash
# Check Vite dev server
cd frontend
npm run dev

# Check build errors
npm run build
```

### Backend API errors
```bash
# Check server logs
cd backend
npm run dev

# Test Supabase connection
node test-supabase-connection.js
```

### Invalid API Key (opnieuw)
1. ✅ Gebruik `/api/config/supabase` endpoint (NIET meer VITE_ vars)
2. Verify Railway env vars zijn correct
3. Check backend server.ts config endpoint

### Migration failures
```bash
# Check migration file syntax
cat migrations/008_admin_system.sql

# Test lokaal met Supabase CLI
supabase db reset
supabase migration up
```

### Admin login werkt niet
```bash
# Verify admin user exists
node test-supabase-connection.js

# Check JWT_SECRET is set in Railway
railway variables

# Verify bcrypt password hash
node -e "console.log(require('bcrypt').compareSync('admin123', '$2b$10$...'))"
```

---

## 📝 AUDIT LOGGING

Alle admin acties worden gelogd in `audit_log` table:

```sql
SELECT 
  action_type,          -- 'login', 'add_rider', 'remove_rider', 'update_sync_config'
  admin_email,          -- Email van admin user
  action_details,       -- JSONB met details (rider_id, oude/nieuwe values, etc)
  created_at            -- Timestamp
FROM audit_log
ORDER BY created_at DESC;
```

**Voorbeelden:**
- Login: `{ "ip": "192.168.1.1", "user_agent": "Chrome" }`
- Add rider: `{ "rider_id": 150437, "method": "manual" }`
- Update config: `{ "old_interval": 1, "new_interval": 2 }`

---

## 🎨 FRONTEND ROUTES

```
/                       Racing Matrix Dashboard (public)
/events                 Events Dashboard (public)
/results                Results Dashboard (public)
/admin/login            Admin Login (public)
/admin                  Admin Dashboard (protected, JWT)
```

---

## 🔑 SECURITY

### Implementatie
- ✅ JWT tokens met 24h expiry
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Bearer token authentication
- ✅ Admin middleware op alle /api/admin/* routes
- ✅ Service key alleen in backend (niet in frontend)
- ✅ CORS configured voor Railway domain

### Best Practices
- ⚠️  Default admin password MOET gewijzigd worden na eerste login
- ⚠️  JWT_SECRET moet uniek zijn per deployment
- ⚠️  Service key NOOIT committen naar git
- ⚠️  HTTPS only in productie (Railway default)

---

## 📦 DEPENDENCIES

### Backend
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "@supabase/supabase-js": "^2.39.0",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "axios": "^1.6.2"
}
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-router-dom": "^6.20.1",
  "@tanstack/react-query": "^5.14.6",
  "react-hot-toast": "^2.4.1"
}
```

---

## 🎯 TESTING CHECKLIST

### E2E Test Scenario
1. ✅ Start backend: `cd backend && npm run dev`
2. ✅ Start frontend: `cd frontend && npm run dev`
3. ✅ Navigate to http://localhost:5173
4. ✅ Racing Matrix loads with rider 150437
5. ✅ Race stats visible (0 wins, 3 podiums, 22 finishes, 1 DNF)
6. ✅ Navigate to http://localhost:5173/admin/login
7. ✅ Login met admin@teamnl.cloud9 / admin123
8. ✅ Add rider 150437 (if not exists)
9. ✅ Enable auto-sync, set interval to 1 hour
10. ✅ Trigger manual sync
11. ✅ Check sync logs for success
12. ✅ Navigate back to dashboard, verify data refreshed
13. ✅ Logout

---

## 🚨 KNOWN ISSUES

### Rate Limiting
- ZwiftRacing API: 5 calls/minute
- Bulk sync moet throttling implementeren voor >5 riders

### Recommended Fixes
```javascript
// Add rate limiting in sync script
async function syncRidersWithThrottling(riderIds) {
  const chunks = [];
  for (let i = 0; i < riderIds.length; i += 5) {
    chunks.push(riderIds.slice(i, i + 5));
  }
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(syncRider));
    await new Promise(r => setTimeout(r, 60000)); // Wait 1 min
  }
}
```

---

## 📞 SUPPORT

**Project Owner:** TeamNL Cloud9  
**Repository:** https://github.com/your-repo/TeamNL-Cloud9-Racing-Team  
**Branch:** fresh-start-v4  
**Railway Project:** teamnl-backend-v4  
**Supabase Project:** bktbeefdmrpxhsyyalvc

---

## ✅ COMPLETION STATUS

**Completed Features:**
- ✅ Racing Matrix Dashboard met race stats
- ✅ Runtime config API (Invalid API Key fix)
- ✅ Admin authentication (JWT + bcrypt)
- ✅ Team roster management (add/bulk/remove)
- ✅ Auto-sync scheduler (configureerbaar)
- ✅ Manual sync trigger
- ✅ Complete audit logging
- ✅ Admin frontend dashboard
- ✅ E2E workflow documentatie

**Ready for Production!** 🎉
