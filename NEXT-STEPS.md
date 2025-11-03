# 🚀 DEPLOYMENT COMPLETE - Volgende Stappen

## ✅ Wat is klaar

### Backend
- ✅ `src/services/supabase-client.ts` - Supabase client wrapper
- ✅ `src/services/supabase-sync.service.ts` - Complete sync service (riders, clubs, events, results)
- ✅ `src/services/unified-sync.service.ts` - Gebruikt nu Supabase (was al compatible)
- ✅ `.env.example` - Backend env placeholders

### Frontend  
- ✅ `frontend/src/supabase.ts` - Supabase client + TypeScript types
- ✅ `frontend/src/hooks/useRiders.ts` - Real-time hooks (useTopRiders, useRider, useClubRiders, etc.)
- ✅ `frontend/src/components/AdminPanel.tsx` - Environment-aware API URL
- ✅ `frontend/.env.example` - Frontend env placeholders (inclusief VITE_API_BASE_URL)

### Deployment Config
- ✅ `vercel.json` - Frontend deployment (Vite framework preset)
- ✅ `railway.toml` - Backend deployment config
- ✅ `.github/workflows/deploy-backend.yml` - Auto-deploy op push
- ✅ `.github/workflows/cron-hourly-sync.yml` - Hourly sync job
- ✅ `Dockerfile` - Production container (multi-stage build)
- ✅ `.dockerignore` - Optimized image size
- ✅ `DEPLOYMENT.md` - Complete deployment handleiding (9 stappen)

### Database
- ✅ `supabase/schema.sql` - PostgreSQL schema (riders, clubs, events, race_results, rider_history, club_roster, sync_logs)

---

## 📋 DEPLOYMENT CHECKLIST

### 1. Supabase Setup (5 min)
```bash
# 1. Create project op supabase.com/dashboard
# 2. Run supabase/schema.sql in SQL Editor
# 3. Enable Realtime voor riders, clubs, events tables (Database → Replication)
# 4. Copy credentials:
#    - Project URL → SUPABASE_URL
#    - Service Role Key → SUPABASE_SERVICE_KEY (backend)
#    - Anon Key → VITE_SUPABASE_ANON_KEY (frontend)
```

### 2. Vercel Deploy (2 min)
```bash
# Option A: Via Dashboard (Aanbevolen)
# 1. vercel.com → New Project → Import GitHub repo
# 2. Framework: Vite
# 3. Root Directory: frontend
# 4. Add env vars:
#    VITE_SUPABASE_URL = https://xxx.supabase.co
#    VITE_SUPABASE_ANON_KEY = eyJhbGc...
#    VITE_API_BASE_URL = https://your-backend.railway.app/api
# 5. Deploy

# Option B: CLI
cd frontend
vercel --prod
# Follow prompts, add env vars when asked
```

### 3. Railway Deploy (3 min)
```bash
# 1. railway.app → New Project → Deploy from GitHub
# 2. Select: TeamNL-Cloud9-Racing-Team
# 3. Add environment variables:
#    NODE_ENV = production
#    SUPABASE_URL = https://xxx.supabase.co
#    SUPABASE_SERVICE_KEY = eyJhbGc... (service role!)
#    ZWIFT_API_KEY = your-key
# 4. Railway auto-deploys
# 5. Get URL: https://teamnl-backend.up.railway.app
# 6. Test: curl https://teamnl-backend.up.railway.app/api/health
```

### 4. GitHub Actions Setup (1 min)
```bash
# GitHub repo → Settings → Secrets and variables → Actions
# Add secrets:
# - RAILWAY_TOKEN (get from railway.app/account/tokens)
# - BACKEND_URL (Railway deployment URL)
# - SYNC_API_KEY (generate random string voor auth)

# Workflows activeren automatisch bij push naar main
```

### 5. Update Vercel Backend URL
```bash
# Na Railway deployment:
# Vercel dashboard → Project → Settings → Environment Variables
# Update: VITE_API_BASE_URL = https://teamnl-backend.up.railway.app/api
# Redeploy: Deployments → latest → Redeploy
```

---

## 🧪 POST-DEPLOYMENT TESTS

### Test 1: Backend Health Check
```bash
curl https://teamnl-backend.railway.app/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Test 2: Supabase Stats
```bash
curl https://teamnl-backend.railway.app/api/supabase/stats
# Expected: {"riders":0,"clubs":0,"events":0,...}
```

### Test 3: Sync Test Rider
```bash
curl -X POST https://teamnl-backend.railway.app/api/sync/rider/150437
# Expected: {"success":true,"riderId":150437,...}

# Check Supabase Console → SQL Editor:
SELECT * FROM riders WHERE zwift_id = 150437;
# Should show 1 row
```

### Test 4: Frontend Real-time
```bash
# 1. Open https://teamnl-cloud9.vercel.app in 2 browser tabs
# 2. Tab 1: Go to Admin Panel → Upload rider 150437
# 3. Tab 2: Watch dashboard → rider appears instantly! ✨
```

### Test 5: Hourly Cron
```bash
# GitHub → Actions tab
# Wait for next hour (:05 past)
# Check "Hourly Sync Job" → should run successfully
```

---

## 🐛 TROUBLESHOOTING

### ❌ Vercel: "Supabase credentials ontbreken"
**Fix**: Vercel dashboard → Settings → Environment Variables → check VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

### ❌ Railway: "Supabase client not initialized"
**Fix**: Railway → Variables tab → check SUPABASE_URL + SUPABASE_SERVICE_KEY (NIET anon key!)

### ❌ Real-time werkt niet
**Fix**: Supabase Console → Database → Replication → Enable voor `riders` table → Restart Supabase

### ❌ AdminPanel API calls falen
**Fix**: 
1. Check browser DevTools → Network tab → wat is API URL?
2. Vercel env vars → VITE_API_BASE_URL correct? (met `/api` suffix)
3. Railway backend bereikbaar? Test health endpoint

### ❌ Cron job fails
**Fix**:
1. GitHub Actions logs bekijken
2. Check BACKEND_URL secret (geen trailing slash!)
3. Test manual: `curl -X POST $BACKEND_URL/api/sync/club/11818`

---

## 📊 MONITORING

### Vercel Logs
```bash
vercel logs --follow
# or: vercel.com/dashboard → project → Logs
```

### Railway Logs
```bash
# Railway dashboard → Deployments → View Logs
```

### Supabase Logs
```bash
# Supabase Console → Logs → Filter by:
# - postgres_logs (SQL errors)
# - realtime (WebSocket connections)
# - api (HTTP requests)
```

### GitHub Actions
```bash
# GitHub → Actions tab → select workflow → View logs
```

---

## 🎯 SUCCESS CRITERIA

Je deployment is succesvol als:
- ✅ Frontend bereikbaar: https://teamnl-cloud9.vercel.app
- ✅ Backend health: `{"status":"ok"}`
- ✅ Supabase heeft riders table met data
- ✅ Real-time updates werken (2 tabs test)
- ✅ AdminPanel kan riders uploaden
- ✅ Hourly cron draait (GitHub Actions log)

---

## 📝 NEXT STEPS (na deployment)

### Week 1: Monitoring & Finetuning
- [ ] Setup Sentry/LogRocket voor error tracking
- [ ] Add custom domain (teamnl-cloud9.nl)
- [ ] Configure Supabase email alerts voor database issues
- [ ] Add Vercel Analytics voor performance metrics

### Week 2: Features
- [ ] Rider history chart (90-day FTP trend)
- [ ] Club leaderboard page
- [ ] Event results page met filters
- [ ] Export to CSV functionaliteit

### Week 3: Advanced
- [ ] Materialized view refresh via pg_cron (Supabase)
- [ ] Webhook voor instant sync triggers
- [ ] Mobile responsive optimizations
- [ ] PWA support (offline mode)

---

## 📚 RESOURCES

- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app

---

**🎉 Succes met je deployment!**

Voor vragen: open GitHub Issue of check DEPLOYMENT.md
