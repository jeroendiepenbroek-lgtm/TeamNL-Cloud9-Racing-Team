# E2E Productie Workflow - Samenvatting

## 🎯 Quick Overview

De **TeamNL Cloud9 Racing Team Dashboard** gebruikt een 4-laags architectuur voor data synchronisatie en visualisatie:

```
ZwiftRacing API → Supabase → Railway → Vercel
     (Data)      (Database)  (Backend)  (Frontend)
```

---

## 📊 Componenten & Bijdrage

### 1. 🌐 ZwiftRacing API
**Bijdrage**: Externe data bron

- **Wat**: Zwift Racing statistieken API
- **Data**: Rider profiles (FTP, weight, ranking), race results, club members
- **Endpoint**: `https://zwift-ranking.herokuapp.com`
- **Auth**: Authorization header met API key
- **Rate Limits**: Club 1/60min, Riders 5/min, Results 1/min
- **Status**: ✅ Operationeel en gevalideerd

**Gebruik in workflow**:
```typescript
const response = await fetch(
  `https://zwift-ranking.herokuapp.com/public/riders/${riderId}`,
  { headers: { 'Authorization': '650c6d2fc4ef6858d74cbef1' } }
);
```

---

### 2. 🗄️ Supabase PostgreSQL
**Bijdrage**: Centrale database + REST API

- **Wat**: Hosted PostgreSQL database met REST API
- **Schema**: 7 tables (riders, clubs, events, results, sync_logs)
- **Features**:
  - Computed columns (watts_per_kg = ftp / weight)
  - Row Level Security (14 policies)
  - Real-time subscriptions
  - Automatic REST API via PostgREST
- **Storage**: 500MB (Free tier)
- **Status**: ✅ Schema deployed

**Database schema**:
```sql
riders (
  zwift_id INT PRIMARY KEY,
  name VARCHAR,
  ftp INT,
  weight DECIMAL,
  watts_per_kg DECIMAL GENERATED ALWAYS AS (ftp / weight) STORED,
  club_id INT,
  ranking INT,
  ...
)
```

**Gebruik in workflow**:
- Backend schrijft via Prisma ORM
- Frontend leest via Supabase client of REST API
- Computed columns automatisch berekend bij INSERT/UPDATE

---

### 3. 🚂 Railway Backend
**Bijdrage**: API server + sync orchestration

- **Wat**: Express.js server voor business logic
- **Runtime**: Node.js 20
- **Framework**: Express + Prisma ORM
- **Functionaliteit**:
  - REST API endpoints (`/api/riders`, `/api/clubs`, `/api/events`)
  - Sync orchestration (haal data van ZwiftRacing API)
  - Data transformatie (API response → Database schema)
  - Rate limiting (voorkom API throttling)
  - Scheduled jobs (cron: elke 60 min club sync)
  - Error handling & logging
- **Cost**: $0/month (Free tier: $5 credit)
- **Status**: ⚠️ Deployment pending

**API endpoints**:
```
GET  /api/health              → Healthcheck
GET  /api/riders              → List riders
GET  /api/riders/:zwiftId     → Get rider
POST /api/sync/club           → Sync club members
POST /api/sync/rider/:id      → Sync rider data
GET  /api/sync/logs           → Sync history
```

**Gebruik in workflow**:
- Ontvangt sync requests van frontend
- Haalt data op van ZwiftRacing API (met rate limiting)
- Transformeert en schrijft naar Supabase
- Logt sync status in sync_logs table

---

### 4. 🎨 Vercel Frontend
**Bijdrage**: User interface

- **Wat**: React webapp voor data visualisatie
- **Framework**: React 19 + Vite + Tailwind CSS
- **URL**: https://team-nl-cloud9-racing-team.vercel.app/
- **Features**:
  - **Dashboard**: Ranking tables (top riders op FTP/W/kg)
  - **Data Viewer**: Raw data exploratie
  - **Upload**: Bulk rider upload interface
  - **Sync Settings**: Configuratie voor automated sync
  - **E2E Test**: Workflow validatie GUI ✨
- **Cost**: $0/month (Hobby tier)
- **Status**: ✅ Live op production

**Componenten**:
```
src/components/
├── RankingTable.tsx    → Top riders lijst
├── DataViewer.tsx      → Database explorer
├── AdminPanel.tsx      → Rider upload form
├── SyncSettings.tsx    → Sync configuratie
└── E2ETest.tsx         → Workflow test GUI
```

**Gebruik in workflow**:
- User voert Rider IDs in
- Triggert sync via Railway backend (of direct Supabase)
- Toont live data updates
- Visualiseert ranking, stats, trends

---

## 🔄 Complete Data Flow

### Scenario: User Upload Rider

```
1. User Input
   └─> Vercel: Input Rider ID 150437
       └─> POST /api/sync/rider/150437

2. Backend Processing
   └─> Railway: Ontvang request
       └─> ZwiftRacing API: Fetch rider data
           └─> Response: { name: "JRøne", ftp: 270, weight: 74, ... }
       └─> Railway: Transform data
       └─> Supabase: INSERT INTO riders VALUES (...)
           └─> PostgreSQL: Compute watts_per_kg = 270 / 74 = 3.65
           └─> Return: { zwift_id: 150437, watts_per_kg: 3.65, ... }
       └─> Railway: Log sync in sync_logs
       └─> Response to frontend: { success: true, rider: {...} }

3. Frontend Update
   └─> Vercel: Receive response
       └─> Update UI: Show rider in ranking table
       └─> Highlight: New entry with green flash animation
```

### Scenario: Automated Sync (Cron)

```
1. Scheduled Trigger
   └─> Railway: Cron job (elke 60 min)
       └─> Fetch club members list
           └─> ZwiftRacing API: GET /public/clubs/11818

2. Batch Processing
   └─> Railway: Loop door 50 riders per batch
       └─> For each rider:
           └─> ZwiftRacing API: GET /public/riders/{id}
           └─> Wait 12s (rate limit: 5/min)
           └─> Supabase: UPSERT rider data
           └─> Log: Sync status

3. Completion
   └─> Railway: Insert sync_log
       └─> { sync_type: 'club', total: 234, success: 230, errors: 4 }
   └─> Frontend: Auto-refresh dashboard (if live)
```

---

## ��️ Issues Opgelost

### ✅ TypeScript Compile Errors
**Probleem**: `src/server.ts` had 2 compile errors
- Line 64: Missing return statement
- Line 145: Promise not awaited

**Oplossing**: 
```typescript
// Before
res.json(result);

// After
return res.json(result);

// Before
const firebaseInitialized = firebaseSyncService.initialize();

// After
const firebaseInitialized = await firebaseSyncService.initialize();
```

### ✅ Oude Scripts Met Import Errors
**Probleem**: 7 scripts verwijzen naar oude service files (470+ errors)
- `scripts/sync-cli.ts` → `src/services/sync.js` (verplaatst naar `sync-mvp.js`)
- `scripts/manage-riders.ts` → `src/database/repositories.js` (verwijderd)

**Oplossing**: Scripts disabled (renamed naar `.disabled`)
- Niet kritiek voor productie (alleen CLI tools)
- Gedocumenteerd in `scripts/.disabled-files.txt`

### ✅ Documentatie Toegevoegd
**Nieuw**:
- `docs/E2E_PRODUCTION_WORKFLOW.md` - Complete workflow analyse
- `docs/RAILWAY_DEPLOYMENT_GUIDE.md` - Deployment instructies
- `scripts/.disabled-files.txt` - Overzicht disabled scripts

---

## 📋 Volgende Stappen

### 🔴 HIGH Priority

#### 1. PostgREST Cache Refresh (1 min)
**Waarom**: REST API kan 401 errors geven na schema changes
**Hoe**:
```sql
-- Open Supabase SQL Editor
-- https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql

NOTIFY pgrst, 'reload schema';
```
**Verify**: Test REST API endpoint
```bash
curl https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/riders
```

#### 2. Railway Backend Deployment (15 min)
**Waarom**: Backend nodig voor sync orchestration
**Hoe**: Volg `docs/RAILWAY_DEPLOYMENT_GUIDE.md`

**Stappen**:
1. Ga naar https://railway.app
2. New Project → Deploy from GitHub
3. Selecteer repo: TeamNL-Cloud9-Racing-Team
4. Configureer environment variables:
   ```
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
   SUPABASE_SERVICE_KEY=eyJh...
   ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
   NODE_ENV=production
   PORT=3000
   ```
5. Deploy → Wait for build (~2 min)
6. Test: `curl https://[RAILWAY_URL]/api/health`

### 🟡 MEDIUM Priority

#### 3. E2E Workflow Test (3 min)
**Waarom**: Valideer complete data pipeline
**Hoe**:
1. Open https://team-nl-cloud9-racing-team.vercel.app/
2. Klik "🧪 E2E Test" tab
3. Input: Rider ID 150437
4. Klik "Start E2E Test"
5. Verwacht: Groene success box + rider stats (FTP 270W, W/kg 3.65)

#### 4. Eerste Data Upload (10 min)
**Waarom**: Vul database met productie data
**Hoe**:
1. Verzamel Rider IDs van team members
2. Open webapp → "➕ Upload" tab
3. Paste IDs (one per line)
4. Klik "Upload Riders"
5. Monitor sync progress

---

## 💰 Cost Breakdown

| Service | Tier | Cost | Limit | Status |
|---------|------|------|-------|--------|
| ZwiftRacing API | Free | $0 | Rate limited | ✅ |
| Supabase | Free | $0 | 500MB DB | ✅ |
| Railway | Free | $0 | $5 credit/month | ⚠️ |
| Vercel | Hobby | $0 | 100GB bandwidth | ✅ |
| **TOTAL** | | **$0/month** | | 🎉 |

---

## 📊 Status Dashboard

```
┌─────────────────────────────────────────────────┐
│               COMPONENT STATUS                  │
├─────────────────────────────────────────────────┤
│ ZwiftRacing API:  ✅ OPERATIONAL                │
│ Supabase:         ✅ OPERATIONAL (schema OK)    │
│ Railway:          ⚠️ DEPLOYMENT PENDING         │
│ Vercel:           ✅ OPERATIONAL (live)         │
│ E2E Test:         ✅ AVAILABLE                  │
├─────────────────────────────────────────────────┤
│ Overall:          🟡 PARTIALLY OPERATIONAL      │
└─────────────────────────────────────────────────┘
```

---

## 📚 Documentatie Links

- **Workflow Analyse**: [docs/E2E_PRODUCTION_WORKFLOW.md](docs/E2E_PRODUCTION_WORKFLOW.md)
- **Railway Deployment**: [docs/RAILWAY_DEPLOYMENT_GUIDE.md](docs/RAILWAY_DEPLOYMENT_GUIDE.md)
- **API Endpoints**: [docs/API.md](docs/API.md)
- **Deployment Checklist**: [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)
- **Disabled Scripts**: [scripts/.disabled-files.txt](scripts/.disabled-files.txt)

---

**Laatste Update**: 3 november 2025  
**Git Commit**: bbf9bde  
**Status**: 🟡 Partially Operational (Database + Frontend OK, Backend deployment pending)
