# Railway Deployment - Quick Reference

**Problem**: Deployment hangt vast op v2.1.0 (oude versie)  
**Solution**: 3 opties (kies één)

---

## 🚀 Optie 1: Railway CLI (SNELST - 2 minuten)

**Requirements**: Railway CLI + login

```bash
# Install (if needed)
npm install -g @railway/cli

# Run automated script
./railway-force-deploy.sh
```

**Of handmatig**:
```bash
railway login
railway link
railway up --detach
railway logs
```

**Result**: Force rebuild + redeploy in 2 minuten

---

## 🔄 Optie 2: Verwijder + Herinstall Service (5 minuten)

**Railway Dashboard**: https://railway.app/project/teamnl-cloud9-racing-team-production

### Step by Step:
1. **Backup ENV vars** (Variables tab → copy alles)
2. **Settings** → Danger Zone → **"Remove Service"**
3. **+ New** → GitHub Repo → `TeamNL-Cloud9-Racing-Team` → main
4. **Root Directory**: `backend/`
5. **Variables** → Plak ENV vars terug
6. **Deploy** → Wait 3 min

**Result**: Volledig nieuwe deployment zonder oude cache

---

## 🆕 Optie 3: Nieuw Railway Project (10 minuten)

**Alleen als optie 1 & 2 niet werken**

### Steps:
1. Railway Dashboard → **New Project**
2. Deploy from GitHub → `TeamNL-Cloud9-Racing-Team`
3. Settings → Root Directory: `backend/`
4. Variables → Add ENV vars
5. Old project → Delete

**Cost**: Verliest oude project credits

---

## 📋 Environment Variables Checklist

**Essentials** (minimaal nodig):
```bash
NODE_ENV=production
PORT=8080
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MjQ1ODksImV4cCI6MjA0NjMwMDU4OX0.6hHXDxq_OOMM89GrSfN1CRd0XgGMqU72gBHG9CYmUE4
```

**Optioneel** (voor later als backend DB gebruikt):
```bash
SUPABASE_SERVICE_KEY=<backup deze ook>
DATABASE_URL=<backup deze ook>
```

**Remove** (niet meer nodig):
```bash
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

---

## ✅ Verificatie

**Na deployment (wait 2-3 min)**:

```bash
# Check versie
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health

# Verwacht:
{
  "status": "healthy",
  "version": "3.0.0-clean-slate",  # ← Moet nieuwe versie zijn!
  "message": "✅ Backend running - ready for rebuild"
}

# Run full test
./verify-railway-deployment.sh
```

**Logs checken**:
```
╔════════════════════════════════════════════════╗
║  TeamNL Cloud9 Racing Team - Backend v3.0     ║
║  🧹 Clean Slate Edition                        ║  # ← Moet deze zien!
╠════════════════════════════════════════════════╣
║  🚀 Server running on port 8080               ║
╚════════════════════════════════════════════════╝
```

**Frontend test**:
```bash
curl -I https://teamnl-cloud9-racing-team-production.up.railway.app/
# HTTP/2 200 ✅

# Open in browser:
# Should show 3 empty dashboards
```

---

## ❌ Troubleshooting

### "Still showing v2.1.0"
→ Railway deployment not triggered
→ Try: `railway up --detach` (force rebuild)

### "Dockerfile not found"
→ Root directory not set
→ Fix: Settings → Root Directory: `backend/`

### "Build fails"
→ Check build logs in Railway Dashboard
→ Mogelijk: `npm ci` errors → Check package.json

### "Frontend 404"
→ Frontend build niet gekopieerd
→ Check Dockerfile: `cp -r dist/* /app/public/dist/`

### "Database errors"
→ Nieuwe backend v3.0 heeft **geen** database code
→ Als je dit ziet = oude versie draait nog
→ Force redeploy (optie 1 of 2)

---

## 📊 Success Criteria

- [x] Health endpoint returns v3.0.0-clean-slate
- [x] Frontend loads (3 empty dashboards visible)
- [x] No `riders_unified` errors in logs
- [x] Discord login button works
- [x] Logs show "Backend v3.0 🧹 Clean Slate Edition"
- [x] Old API endpoints return 404 with message

---

## 🎯 Aanbeveling

**Voor jou**: Gebruik **Optie 1 (Railway CLI)**

**Waarom**:
- ✅ Snelst (2 min vs 5-10 min)
- ✅ Meeste controle (zie logs realtime)
- ✅ Force rebuild (geen cache issues)
- ✅ CLI is al geïnstalleerd

**Run**:
```bash
./railway-force-deploy.sh
```

**Alternatief**: Als CLI niet werkt → Optie 2 (dashboard)

---

**Files**:
- Guide: `RAILWAY_FRESH_DEPLOY.md` (detailed)
- Script: `railway-force-deploy.sh` (automated)
- This: `RAILWAY_CREDENTIALS_TOEVOEGEN.md` (quick ref)
