# 🏭 TeamNL Cloud9 - Clean Production Workflow

## 📊 Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. DATA SOURCE: ZwiftRacing.app API                                 │
│    6 Public Endpoints:                                               │
│    • GET /public/clubs/{clubId}                                      │
│    • GET /public/riders/{riderId}                                    │
│    • GET /public/events/{eventId}                                    │
│    • GET /public/results/{eventId}                                   │
│    • GET /public/rider/{riderId}/history                             │
│    • GET /public/rider/{riderId}/events                              │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ Sync via Backend
┌─────────────────────────────────────────────────────────────────────┐
│ 2. DATABASE: Supabase PostgreSQL                                     │
│                                                                       │
│    SOURCE TABLES (6) - Raw API data, no business logic              │
│    ├─ clubs           (id, name, member_count)                       │
│    ├─ riders          (zwift_id, name, ranking, ftp, weight, ...)   │
│    ├─ events          (zwift_event_id, name, date, route, ...)      │
│    ├─ results         (event_id, rider_id, position, time, ...)     │
│    ├─ rider_history   (rider_id, date, ranking, ftp_snapshot, ...)  │
│    └─ sync_logs       (sync_type, status, records_processed, ...)   │
│                                                                       │
│    RELATION TABLE (1) - User selections                              │
│    └─ my_team_members (zwift_id FK, added_at, is_favorite)          │
│                                                                       │
│    VIEWS (Computed) - No data duplication!                           │
│    └─ view_my_team    (JOIN my_team_members + riders + clubs)       │
│        SELECT                                                         │
│          r.zwift_id, r.name, r.ranking, r.ftp, r.weight,            │
│          r.ftp / r.weight AS watts_per_kg,  ← Computed here!        │
│          c.name AS club_name,                ← Extracted from rider  │
│          tm.added_at, tm.is_favorite                                 │
│        FROM my_team_members tm                                       │
│        JOIN riders r ON tm.zwift_id = r.zwift_id                    │
│        LEFT JOIN clubs c ON r.club_id = c.id                        │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. BACKEND: Railway (Node.js + TypeScript)                           │
│    Location: /backend/                                               │
│                                                                       │
│    API Endpoints:                                                    │
│    GET  /health                    → Health check                    │
│    GET  /api/clubs/:clubId         → Club info from clubs table     │
│    GET  /api/riders                → All riders from riders table   │
│    GET  /api/riders/team           → My team from view_my_team ✨   │
│    POST /api/riders/team           → Add rider to my_team_members   │
│    POST /api/riders/team/bulk      → Bulk add riders                │
│    DELETE /api/riders/team/:id     → Remove from team               │
│    GET  /api/events                → Events from events table       │
│    GET  /api/results/:eventId      → Results from results table     │
│    GET  /api/sync-logs             → Sync history                   │
│    POST /api/sync/*                → Trigger data sync from API     │
│                                                                       │
│    Services:                                                         │
│    • supabase.service.ts   → Database queries via Supabase client   │
│    • sync.service.ts       → Sync data from ZwiftRacing API         │
│    • zwift-client.ts       → Rate-limited API client                │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. FRONTEND: Railway (React + Vite)                                  │
│    Location: /backend/frontend/                                      │
│    Build Output: /backend/public/dist/                               │
│                                                                       │
│    Pages:                                                            │
│    • /              → Dashboard (health check, API status)           │
│    • /clubs         → Club overview (member charts, leaderboard)    │
│    • /riders        → Riders table (MY TEAM via view_my_team) ✨    │
│    • /events        → Events calendar                                │
│    • /sync          → Sync monitoring dashboard                     │
│                                                                       │
│    Tech Stack:                                                       │
│    • React 18.3 + TypeScript                                         │
│    • TanStack Query (API fetching + caching)                         │
│    • TanStack Table (sortable/filterable tables)                     │
│    • Recharts (data visualization)                                   │
│    • TailwindCSS (styling)                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗃️ Database Schema Details

### SOURCE TABLES (6)

**Philosophy**: These tables store RAW data from ZwiftRacing API. No computed fields, no business logic.

```sql
-- 1. clubs: Club information
CREATE TABLE clubs (
  id INTEGER PRIMARY KEY,
  name TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 2. riders: All known riders
CREATE TABLE riders (
  id SERIAL PRIMARY KEY,
  zwift_id INTEGER UNIQUE NOT NULL,  -- API identifier
  name TEXT NOT NULL,
  club_id INTEGER REFERENCES clubs(id),
  
  -- Racing
  category_racing TEXT,  -- A, B, C, D, E
  ranking INTEGER,
  ranking_score NUMERIC,
  
  -- Power
  ftp NUMERIC,           -- Watts
  weight NUMERIC,        -- Kilograms
  -- NO watts_per_kg column! Computed in VIEW
  
  -- Stats
  total_races INTEGER,
  total_wins INTEGER,
  total_podiums INTEGER,
  total_dnfs INTEGER,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- 3. events: Race events
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  zwift_event_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  event_type TEXT,
  route_name TEXT,
  distance NUMERIC,
  elevation NUMERIC,
  club_id INTEGER REFERENCES clubs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. results: Race results
CREATE TABLE results (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(zwift_event_id),
  rider_id INTEGER REFERENCES riders(zwift_id),
  position INTEGER,
  finish_time_seconds INTEGER,
  avg_power NUMERIC,
  avg_hr NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);

-- 5. rider_history: Historical snapshots
CREATE TABLE rider_history (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER REFERENCES riders(zwift_id),
  snapshot_date DATE NOT NULL,
  ranking INTEGER,
  ftp NUMERIC,
  weight NUMERIC,
  total_races INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, snapshot_date)
);

-- 6. sync_logs: Sync monitoring
CREATE TABLE sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL,  -- 'club', 'rider', 'event', etc.
  status TEXT NOT NULL,      -- 'success', 'error'
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RELATION TABLE (1)

**Philosophy**: Minimal table, only stores zwift_id (FK). All rider data comes from riders table via JOIN.

```sql
-- my_team_members: Which riders are in MY team
CREATE TABLE my_team_members (
  zwift_id INTEGER PRIMARY KEY REFERENCES riders(zwift_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE
);

-- NO name, ranking, ftp, etc. - that's in riders table!
```

### VIEWS (Computed)

**Philosophy**: Views compute data on-the-fly via JOINs. No duplication, always up-to-date.

```sql
-- view_my_team: My team with all rider data
CREATE VIEW view_my_team AS
SELECT 
  r.zwift_id,
  r.name,
  r.club_id,
  c.name AS club_name,           -- Extracted from riders.club_id
  r.ranking,
  r.ftp,
  r.weight,
  r.ftp / NULLIF(r.weight, 0) AS watts_per_kg,  -- Computed here!
  r.category_racing,
  r.total_races,
  r.total_wins,
  r.total_podiums,
  tm.added_at AS team_added_at,
  tm.is_favorite
FROM my_team_members tm
INNER JOIN riders r ON tm.zwift_id = r.zwift_id
LEFT JOIN clubs c ON r.club_id = c.id
ORDER BY r.ranking ASC NULLS LAST;
```

**Key Benefits**:
- ✅ **No duplication**: rider data stored once in riders table
- ✅ **Always current**: VIEW queries riders table in real-time
- ✅ **Auto-updates**: when riders.ftp changes, watts_per_kg auto-recalculates
- ✅ **Club extraction**: clubs extracted from riders.club_id, not stored twice

---

## 🔄 Data Flow Examples

### Example 1: Add Rider to My Team

```
Frontend:
  POST /api/riders/team { zwiftId: 150437, name: "John Doe" }
    ↓
Backend:
  1. Check if rider exists in riders table
     - If NO + name provided: INSERT INTO riders
     - If NO + no name: Return error "Rider niet gevonden"
  2. INSERT INTO my_team_members (zwift_id) VALUES (150437)
  3. Return success
    ↓
Frontend:
  Refetch GET /api/riders/team
    ↓
Backend:
  SELECT * FROM view_my_team  ← Includes new rider with all data!
```

### Example 2: Sync Rider Data from API

```
Cron Schedule / Manual Trigger:
  POST /api/sync/riders
    ↓
Backend:
  1. Fetch riders from ZwiftRacing API
  2. UPSERT INTO riders (zwift_id, name, ranking, ftp, ...)
  3. INSERT INTO sync_logs (sync_type: 'riders', status: 'success')
    ↓
Database:
  - riders table updated with new data
  - view_my_team automatically shows updated watts_per_kg
  - Frontend auto-refreshes via React Query (30s interval)
```

### Example 3: View My Team

```
Frontend:
  GET /api/riders/team
    ↓
Backend:
  SELECT * FROM view_my_team
  ↓ (Supabase executes VIEW query)
  SELECT 
    r.zwift_id, r.name, r.ftp, r.weight,
    r.ftp / r.weight AS watts_per_kg,  ← Computed on-the-fly!
    c.name AS club_name                 ← Joined from clubs
  FROM my_team_members tm
  JOIN riders r ON tm.zwift_id = r.zwift_id
  LEFT JOIN clubs c ON r.club_id = c.id
    ↓
Backend:
  Return JSON {
    count: 5,
    clubs: ["TeamNL Cloud9", "TeamNL", "Other Club"],
    riders: [...]
  }
    ↓
Frontend:
  Display in TanStack Table with sorting/filtering
```

---

## 🚀 Deployment Workflow

### Local Development

```bash
# Backend
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
npm install
npm run dev  # Starts on http://localhost:3000

# Frontend (separate terminal)
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend/frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### Production (Railway)

```bash
# 1. Commit changes
git add -A
git commit -m "feat: clean production workflow"
git push origin main

# 2. Railway auto-deploys (triggered by push)
#    - Runs nixpacks.toml build steps
#    - npm ci in backend/ and backend/frontend/
#    - npm run build in frontend/ → outputs to backend/public/dist/
#    - Starts with: npx tsx backend/src/server.ts

# 3. Verify deployment
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health
# Expected: {"status":"ok","service":"TeamNL Cloud9 Backend",...}

# 4. Test frontend
open https://teamnl-cloud9-racing-team-production.up.railway.app/
# Expected: React app loads with dashboard
```

---

## 📝 Setup Checklist

### Supabase Setup

- [ ] Run migration: `supabase/migrations/005_my_team_clean.sql` in SQL Editor
- [ ] Verify tables exist: clubs, riders, events, results, rider_history, sync_logs, my_team_members
- [ ] Verify view exists: view_my_team
- [ ] Test view: `SELECT * FROM view_my_team;` (should return empty result)

### Railway Setup

- [ ] Environment variables set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ZWIFT_API_KEY`
  - `NODE_ENV=production`
- [ ] Health check works: `/health` returns 200 OK
- [ ] Backend API accessible
- [ ] Frontend React app loads

### Code Cleanup

- [x] Removed Prisma folder (not used)
- [x] Using only Supabase client
- [x] Backend queries via views (no complex JOINs in code)
- [x] Frontend uses TanStack Query for caching

---

## 🎯 Key Principles

1. **Single Source of Truth**: Riders data lives in `riders` table only
2. **Minimal Relations**: `my_team_members` only stores zwift_id (FK)
3. **Computed in Views**: watts_per_kg, club_name calculated in `view_my_team`
4. **API Sync**: ZwiftRacing API → Supabase SOURCE tables → Views
5. **No Duplication**: Never store same data in multiple tables
6. **Views for Logic**: Business logic in database views, not application code

---

## 🔧 Maintenance

### Add New Computed Field

**Wrong** ❌:
```sql
ALTER TABLE my_team_members ADD COLUMN watts_per_kg NUMERIC;
```

**Correct** ✅:
```sql
CREATE OR REPLACE VIEW view_my_team AS
SELECT 
  ...,
  r.ftp / NULLIF(r.weight, 0) AS watts_per_kg,
  r.ftp * 0.95 AS ftp_threshold  -- NEW computed field
FROM my_team_members tm
JOIN riders r ON tm.zwift_id = r.zwift_id;
```

### Sync New Rider Data

```bash
# Option 1: Via API
curl -X POST https://your-backend.up.railway.app/api/sync/riders

# Option 2: Via frontend
# Go to /sync page → Click "Sync Riders" button
```

---

## 📚 File Structure

```
/workspaces/TeamNL-Cloud9-Racing-Team/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── riders.ts       ← GET /api/riders/team uses view_my_team
│   │   │   │   ├── clubs.ts
│   │   │   │   ├── events.ts
│   │   │   │   ├── results.ts
│   │   │   │   └── sync-logs.ts
│   │   │   └── zwift-client.ts     ← Rate-limited API client
│   │   ├── services/
│   │   │   ├── supabase.service.ts ← getMyTeamMembers() queries view_my_team
│   │   │   └── sync.service.ts     ← Sync from ZwiftRacing API
│   │   └── server.ts               ← Express server + routes
│   ├── frontend/                   ← React app (builds to public/dist/)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Riders.tsx      ← Fetches GET /api/riders/team
│   │   │   │   ├── Clubs.tsx
│   │   │   │   ├── Events.tsx
│   │   │   │   └── Sync.tsx
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── public/dist/                ← Vite build output (served by Express)
│   ├── .env                        ← Local env vars
│   └── package.json
├── supabase/
│   └── migrations/
│       └── 005_my_team_clean.sql   ← Creates my_team_members + view_my_team
├── nixpacks.toml                   ← Railway build config
├── railway.json                    ← Railway service config
└── PRODUCTION_WORKFLOW.md          ← This file
```

---

## 🎉 Success Metrics

- ✅ Backend health check returns 200 OK
- ✅ GET /api/riders/team returns data from view_my_team
- ✅ Frontend Riders page displays table with sorting
- ✅ Add rider button inserts into my_team_members
- ✅ Bulk upload parses CSV and adds multiple riders
- ✅ Club names automatically extracted from riders.club_id
- ✅ watts_per_kg calculated in view (not stored redundantly)
- ✅ Zero-cost Railway deployment (within free tier)
