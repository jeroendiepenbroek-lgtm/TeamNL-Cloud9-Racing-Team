# Railway Cleanup Checklist

**Datum**: 7 december 2025  
**Doel**: Opschonen Railway deployment voor fresh start

---

## ✅ Cleanup Stappen

### 1. Environment Variables (Railway Dashboard)

**Te behouden** (essentieel):
```bash
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_KEY=<nieuwe key na database cleanup>
SUPABASE_ANON_KEY=<nieuwe key na database cleanup>

# ZwiftRacing API (optioneel - geen key nodig voor public endpoints)
ZWIFT_API_BASE_URL=https://zwift-ranking.herokuapp.com
```

**Te verwijderen** (deprecated/ongebruikt):
- ❌ `ENABLE_AUTO_SYNC` (oude scheduler config)
- ❌ `SYNC_INTERVAL_HOURS` (vervangen door nieuwe sync strategie)
- ❌ `USE_SMART_SCHEDULER` (oude scheduler)
- ❌ `CLUB_ID` (hardcoded, niet nodig als env var)
- ❌ Alle oude `ZWIFT_*` test credentials
- ❌ Oude OAuth keys (Discord/Google) als niet gebruikt

---

### 2. Railway Services Check

**Current deployment**: https://teamnl-cloud9-racing-team-production.up.railway.app

Check wat er draait:
```bash
# In Railway CLI of Dashboard:
railway status
railway logs --tail 50
```

**Te verwijderen**:
- ❌ Oude builds (keep laatste 3)
- ❌ Inactive deployments
- ❌ Oude environment backups

---

### 3. Database Cleanup (Supabase)

**Actie**: Run `supabase/CLEAN_DATABASE.sql` in Supabase SQL Editor

Dit verwijdert:
- Alle oude tabellen (`riders`, `events`, `zwift_api_*`, etc.)
- Alle views (`view_upcoming_events`, `view_team_events`, etc.)
- Alle functies en triggers
- Alle sequences

**Backup eerst**: Maak snapshot in Supabase Dashboard → Database → Backups

---

### 4. Git Cleanup

**Branches te verwijderen**:
```bash
# Check remote branches
git branch -r

# Verwijder oude feature branches (via GitHub of CLI)
git push origin --delete <branch-name>
```

**Branches te behouden**:
- ✅ `main` (production)
- ✅ `backup-before-rebuild-20251207` (safety backup)

---

### 5. Railway Build Configuration

**Check `railway.toml`**:
```toml
[build]
builder = "nixpacks"
buildCommand = "cd backend && npm install && cd frontend && npm install && npm run build"

[deploy]
startCommand = "cd backend && npm start"
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3

[[healthcheck]]
path = "/health"
timeout = 60
interval = 30
```

**Verify build works**:
```bash
# Lokaal testen
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
npm install
npm run build  # (als er een build script is)
npm start
```

---

### 6. Remove Old Logs/Cache

**Railway Dashboard**:
- ❌ Clear old deployment logs (keep laatste 7 dagen)
- ❌ Remove stale metrics data

---

## 🔄 Re-deployment Procedure

### Na cleanup:

1. **Database schema** (nieuw op te bouwen):
   ```sql
   -- Run in Supabase SQL Editor
   -- Nieuwe minimal schema met alleen:
   -- - riders_unified (core rider data)
   -- - my_team_members (team tracking)
   -- - sync_logs (monitoring)
   ```

2. **Backend code** (rebuild services):
   - Minimal `server.ts` met health check
   - Basic API endpoints: `/api/riders/team`, `/api/health`
   - Simplified sync service (geen scheduler nog)

3. **Deploy to Railway**:
   ```bash
   git add .
   git commit -m "feat: Clean rebuild - minimal backend"
   git push origin main
   # Railway auto-deploys
   ```

4. **Verify deployment**:
   ```bash
   curl https://teamnl-cloud9-racing-team-production.up.railway.app/health
   # Expected: {"status":"ok","service":"TeamNL Cloud9 Racing"}
   ```

5. **Test frontend** (lokaal eerst):
   ```bash
   cd backend/frontend
   npm run dev
   # Open http://localhost:5173
   ```

---

## 📊 Post-Cleanup Checklist

- [ ] Supabase database is leeg (0 tables)
- [ ] Railway environment variables opgeschoond
- [ ] Oude branches verwijderd
- [ ] Build succeeds lokaal
- [ ] Health endpoint werkt
- [ ] Frontend kan starten
- [ ] API endpoints return 200 OK
- [ ] Logs tonen geen errors

---

## 🚨 Rollback Plan

Als iets misgaat:

1. **Database**: Restore snapshot in Supabase Dashboard
2. **Code**: Checkout backup branch:
   ```bash
   git checkout backup-before-rebuild-20251207
   git push origin main --force
   ```
3. **Railway**: Redeploy previous working build in Railway Dashboard

---

## 📝 Notes

- Backup branch: `backup-before-rebuild-20251207` (bevat werkende code van vóór cleanup)
- Production URL blijft zelfde: teamnl-cloud9-racing-team-production.up.railway.app
- Frontend assets blijven bewaard in `backend/frontend/src/pages/`
- Architecture docs blijven bewaard in root directory

---

## ✅ Done

Als alles is opgeschoond:
- Clean database ✅
- Clean Railway env vars ✅
- Clean git branches ✅
- Ready voor rebuild ✅
