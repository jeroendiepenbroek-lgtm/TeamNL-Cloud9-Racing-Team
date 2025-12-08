# Deployment Status - Complete Cleanup

**Datum**: 8 december 2025  
**Status**: 🟡 Deployment in progress

---

## ✅ Voltooid

### 1. Codebase Cleanup
- ✅ 449 bestanden verwijderd (-86.354 regels)
- ✅ Alle test/POC/admin bestanden weg
- ✅ Frontend: 3 lege dashboards (RacingMatrix, Events, Results)
- ✅ App.tsx versimpeld: 390→170 regels

### 2. Backend Rebuild
- ✅ server.ts: 168→95 regels (minimal)
- ✅ Alleen health endpoints: `/health`, `/api/health`
- ✅ Geen database connecties meer
- ✅ Geen sync logic, geen schedulers
- ✅ Serveert React frontend vanaf `public/dist/`

### 3. Git & Push
- ✅ Committed: `feat: Minimal backend rebuild - alleen health endpoints`
- ✅ Pushed naar GitHub main branch
- ✅ Railway deployment getriggerd

---

## 🟡 In Progress

### Railway Deployment
- Status: Building...
- Huidige versie: `2.1.0-unified-sync` (oud)
- Target versie: `3.0.0-clean-slate` (nieuw)

**Monitor deployment**:
```bash
/tmp/monitor-railway.sh
```

Of handmatig check:
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health
```

---

## ⏳ Te doen (handmatig)

### 1. Railway Environment Variables Cleanup

**Open**: https://railway.app/project/teamnl-cloud9-racing-team-production

**KEEP** (4 variabelen):
```
NODE_ENV=production
PORT=8080
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (voor Discord OAuth)
```

**REMOVE** (~10 variabelen):
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
DATABASE_URL
ZWIFT_RACING_API_KEY
ZWIFT_CLIENT_ID
ZWIFT_CLIENT_SECRET
ZWIFT_REFRESH_TOKEN
ZWIFTPOWER_USERNAME
ZWIFTPOWER_PASSWORD
ENABLE_AUTO_SYNC
USE_SMART_SCHEDULER
SYNC_INTERVAL_MINUTES
```

> **Note**: Na ENV cleanup zal Railway automatisch re-deployen

---

### 2. Supabase Database Cleanup (optioneel)

**Script**: `supabase/CLEAN_DATABASE.sql`

**Open**: https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql

**Actie**:
1. Copy/paste hele script in SQL Editor
2. Run script (dropt alle tables, views, functions)
3. Verify: 0 tables, 0 views, 0 functions

> **Note**: Alleen runnen als je database volledig wilt resetten. Niet nodig voor huidige minimal backend (gebruikt geen database).

---

## 🎯 Verwacht Resultaat

### Na Railway Deployment

**Health endpoint** (`/health`):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-08T...",
  "environment": "production",
  "port": 8080,
  "version": "3.0.0-clean-slate",
  "message": "✅ Backend running - ready for rebuild"
}
```

**Logs** (Railway dashboard):
```
╔════════════════════════════════════════════════╗
║  TeamNL Cloud9 Racing Team - Backend v3.0     ║
║  🧹 Clean Slate Edition                        ║
╠════════════════════════════════════════════════╣
║  🚀 Server running on port 8080               ║
║  📍 Health: http://0.0.0.0:8080/health        ║
║  🌍 Environment: production                   ║
║                                                ║
║  ✅ Ready for rebuild                          ║
║  • Frontend: React (3 empty dashboards)       ║
║  • Backend: Health endpoints only             ║
║  • Database: Ready for fresh schema           ║
╚════════════════════════════════════════════════╝
```

**GEEN errors meer**:
- ❌ `riders_unified table not found` → Gone (geen database calls)
- ❌ OAuth token refresh errors → Gone (geen Zwift API)
- ❌ Sync scheduler errors → Gone (geen sync logic)

**Frontend werkt**:
- ✅ `https://teamnl-cloud9-racing-team-production.up.railway.app/` laadt
- ✅ 3 lege dashboards zichtbaar
- ✅ Discord login button werkt (via Supabase OAuth)

---

## 📋 Verificatie Checklist

Run na deployment:
```bash
./verify-railway-deployment.sh
```

Of handmatig:

- [ ] Health endpoint: `curl .../health` → versie 3.0.0-clean-slate
- [ ] API health: `curl .../api/health` → healthy
- [ ] Frontend: open in browser → 3 dashboards zichtbaar
- [ ] Oude endpoints: `curl .../api/riders/team` → 404 met message
- [ ] Railway logs: geen database errors
- [ ] ENV vars: alleen 4 essentials behouden

---

## 🚀 Volgende Stappen (toekomstig)

### Phase 1: Database Schema
1. Design fresh Supabase schema
2. Create migration SQL
3. Run in Supabase SQL Editor

### Phase 2: Backend API
1. Create `GET /api/riders/team` endpoint
2. Connect to Supabase
3. Test with curl

### Phase 3: Frontend Integration
1. Connect dashboards to API
2. Display real data
3. Add interactive features

### Phase 4: Zwift API Integration
1. Add sync services
2. Implement rate limiting
3. Schedule automatic syncs

---

## 📚 Documentatie

- **Railway ENV Cleanup**: `RAILWAY_ENV_MINIMAL.md`
- **Database Cleanup**: `supabase/CLEAN_DATABASE.sql`
- **Railway Config**: `railway.toml`
- **Backend Code**: `backend/src/server.ts`
- **Frontend**: `backend/frontend/src/App.tsx`

---

**Status Update**: Run `/tmp/monitor-railway.sh` to track deployment progress
