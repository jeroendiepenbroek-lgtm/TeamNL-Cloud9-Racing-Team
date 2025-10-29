# TeamNL Cloud9 - Huidige Status & Roadmap

**Datum**: 29 oktober 2025, 17:05  
**Branch**: `feature/test-workflow`  
**Laatste cleanup**: Alle incomplete MVP code verwijderd

---

## ✅ WAT WERKT (PRODUCTION-READY)

### 🚀 **Backend API**
```bash
Server: http://localhost:3000
Database: SQLite (dev.db) met 1 rider
Environment: Development (no auth, no auto-sync)
```

**Werkende Endpoints**:
- `GET /api/health` → Status check
- `GET /api/system` → System info (version, uptime, memory)
- `GET /api/riders/:zwiftId` → Rider details + club + phenotype + rating
- `POST /api/clubs/:clubId/sync` → Sync club members
- `GET /api/clubs/:clubId` → Club details

**Test Data**:
```bash
✅ 1 Rider: 150437 (JRøne | CloudRacer-9 @YouTube)
   - FTP: 270w (3.65 w/kg)
   - Club: TeamNL (2281)
   - Phenotype: Sprinter (96.5/100)
   - Race Rating: 1377 (current), 1472.8 (max90)
   - Power Curve: 964w @ 5s → 250w @ 20min

✅ 1 Club: TeamNL (2281) - 422 members
✅ 1 Phenotype record
✅ 1 Race Rating record
```

### 🎨 **Frontend GUI**
- **`favorites-manager.html`** ✅
  - Rider upload via textarea (bulk IDs)
  - Basic UI voor favorite riders management
  - Accessible via: http://localhost:3000/favorites-manager.html

### 🔐 **Authentication (Backend klaar, niet actief)**
- Firebase Admin SDK geïntegreerd
- Middleware: `firebaseAuth`, `requireAdmin`
- Config: `.env.production.example` heeft Firebase vars
- Status: **Disabled in dev** (AUTH_ENABLED=false)
- Documentatie: `docs/FIREBASE-INTEGRATION.md`

### 🚢 **Deployment Config (Klaar, niet deployed)**
- Docker: `Dockerfile` + `docker-compose.yml`
- Railway: `railway.json` + CI/CD workflows
- Environments: dev (SQLite) / staging (PostgreSQL) / prod (PostgreSQL)
- Documentatie: `docs/RAILWAY-SETUP-GUIDE.md` (600+ lines)

### 📚 **Documentatie**
```
20+ docs files, waaronder:
✅ API.md - Complete API reference
✅ FIREBASE-INTEGRATION.md - Auth setup
✅ RAILWAY-SETUP-GUIDE.md - Deployment guide
✅ DEV-PROD-WORKFLOW.md - 3-tier workflow
✅ EVENT_DISCOVERY_SOLUTION.md - Event scanning strategies
✅ HISTORICAL-SNAPSHOTS.md - Rider history tracking
```

---

## ❌ WAT ONTBREEKT (TODO)

### 🔍 **Event Discovery & Scanning**
**Probleem**: Geen direct API endpoint `GET /riders/{id}/events`

**Oplossingen beschikbaar maar niet geïmplementeerd**:
- ⏳ Script: `scripts/find-recent-rider-events.ts` (backward scanning)
- ⏳ Script: `scripts/scan-rider-events.ts` (forward tracking)
- ❌ Geen integratie in workflow
- ❌ Geen auto-sync scheduler

**Wat nodig is**:
1. Implementeer incremental event scanner (laatste 50 events/uur)
2. Stop criteria: bij X matches of na Y scans
3. Integreer in cron job (elk uur)
4. Sla events + results op in database

### ⏰ **Auto-Sync Scheduler**
**Status**: Geconfigureerd maar **disabled**

**Beschikbaar in code**:
```typescript
// src/services/scheduler.ts - SmartScheduler exists
// Environment vars:
SCHEDULER_ENABLED=false         // ❌ Disabled
FAVORITES_SYNC_CRON=0 */6 * * * // Every 6 hours (not running)
CLUB_SYNC_CRON=0 */12 * * *     // Every 12 hours (not running)
FORWARD_SCAN_CRON=0 * * * *     // Every hour (not running)
```

**Wat nodig is**:
1. Enable scheduler: `SCHEDULER_ENABLED=true`
2. Implementeer event scan job
3. Test lokaal (run jobs manually first)
4. Monitor via `GET /api/sync/logs`

### 📊 **Complete Dashboard GUI**
**Huidig**: Alleen `favorites-manager.html` (basic rider upload)

**Wat ontbreekt**:
- ❌ Dashboard overview (riders count, clubs, events, last syncs)
- ❌ Rider stats viewer (power curve, race history)
- ❌ Event timeline (recent races)
- ❌ Club comparison view
- ❌ Sync status & logs viewer

**Voorgestelde views**:
```
/                           → Dashboard overview (stats cards)
/favorites-manager.html     → Rider upload & management (EXISTS ✅)
/riders.html               → Rider list + details
/clubs.html                → Club list + members
/events.html               → Event timeline + results
/sync-status.html          → Sync logs & scheduler status
```

### 🗄️ **Database: Historische Data**
**Huidig**: 1 rider, 1 club, 0 events, 0 race results

**Voor MVP (20:00 race)**:
1. ✅ Rider 150437 → **DONE**
2. ❌ Scan laatste 50-100 events → Find 150437's races
3. ❌ Sync found events + results
4. ❌ Enable auto-scanner (elk uur)

**Geschat werk**: 2-3 uur voor complete event backfill

---

## 🎯 ROADMAP - Prioriteiten

### **PRIO 1: MVP voor 20:00 Race** ⏰
**Doel**: Event scanner draait, detecteert race van 20:00 automatisch

**Tasks**:
1. [ ] Implementeer incremental event scanner
2. [ ] Test: scan laatste 20 events handmatig
3. [ ] Integreer in scheduler (cron: elk uur)
4. [ ] Enable scheduler: `SCHEDULER_ENABLED=true`
5. [ ] Monitor: check logs na 20:00 race

**Schatting**: 1-2 uur werk

---

### **PRIO 2: Complete Dashboard GUI**
**Doel**: Visuele feedback van data (riders, events, stats)

**Tasks**:
1. [ ] `/dashboard.html` - Overview met stats cards
2. [ ] `/riders.html` - Rider lijst + detail view
3. [ ] `/events.html` - Event timeline
4. [ ] Update `favorites-manager.html` (integreer in dashboard)

**Schatting**: 3-4 uur werk

---

### **PRIO 3: Historical Backfill** (optioneel)
**Doel**: Vind alle 23 finishes + 2 DNFs van rider 150437

**Tasks**:
1. [ ] Run `scripts/find-recent-rider-events.ts 150437 200`
2. [ ] Duurt ~3-4 uur (rate limit 1/min)
3. [ ] Sync gevonden events
4. [ ] Verificatie: 25 events in database

**Schatting**: 4 uur (meeste tijd = wachten op API)

---

### **PRIO 4: Railway Deployment**
**Doel**: Production omgeving met PostgreSQL + auto-syncs

**Tasks**:
1. [ ] Volg `docs/RAILWAY-SETUP-GUIDE.md`
2. [ ] Setup PostgreSQL database (production + staging)
3. [ ] Configure environment variables (Firebase, API keys)
4. [ ] Deploy via GitHub push (auto CI/CD)
5. [ ] Test production deployment

**Schatting**: 1-2 uur (eerste keer), 15 min (daarna)

---

### **PRIO 5: Firebase Authentication** (optioneel)
**Doel**: Login required voor production dashboard

**Tasks**:
1. [ ] Download service account key
2. [ ] Create admin users in Firebase Console
3. [ ] Set admin custom claims via Firebase CLI
4. [ ] Test login flow
5. [ ] Enable auth: `AUTH_ENABLED=true` in production

**Schatting**: 30 min

---

## 🧪 REGRESSIE TEST RESULTATEN

**Laatste test**: 29 okt 2025, 17:04

```bash
✅ TEST 1: Health check          → PASS
✅ TEST 2: System info            → PASS (version 0.2.0)
✅ TEST 3: Rider 150437 data      → PASS (FTP 270w)
✅ TEST 4: Club sync endpoint     → PASS (HTTP 200)
✅ TEST 5: Favorites GUI          → PASS (HTTP 200)
```

**Conclusie**: Alle core functionaliteit werkt stabiel ✅

---

## 📝 CLEANUP LOG

**Verwijderd** (29 okt 2025, 17:03):
- `src/services/mvp.ts` → Incomplete, compile errors
- `public/mvp-dashboard.html` → Niet getest, incomplete
- `scripts/smart-event-discovery.ts` → Compile errors
- MVP routes in `src/api/routes.ts` → Reverted naar clean version

**Reden**: Opschonen van half-af MVP werk dat niet werkend was.

---

## 🚀 VOLGENDE STAPPEN

**Keuze aan jou**:

**A) Focus op MVP voor 20:00 race** (aangeraden)
   → Implementeer event scanner in 1-2 uur
   → Detecteert automatisch race vanavond

**B) Complete Dashboard eerst**
   → Betere visibility van data
   → Langer werk (3-4 uur)

**C) Railway Deployment eerst**
   → Production environment setup
   → Event scanner draait dan in cloud 24/7

**D) Historical backfill**
   → Alle oude races van 150437 ophalen
   → Langzaam (3-4 uur wachten)

---

**Welke richting wil je opgaan?** 🎯
