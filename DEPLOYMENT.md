# 🚀 Deployment Guide - TeamNL Cloud9 Dashboard

Complete deployment instructions voor productie omgeving met Supabase + Vercel + Railway.

---

## 📋 Pre-requisites

- [ ] Supabase project aangemaakt (gratis tier)
- [ ] GitHub repository connected
- [ ] Vercel account (gratis tier)
- [ ] Railway account (gratis $5 credit)

---

## 1️⃣ Supabase Setup (Database)

### Stap 1: Create Supabase Project
1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard)
2. Klik **New Project**
3. Kies naam: `teamnl-cloud9`
4. Kies region: **Amsterdam (eu-west-1)** (dichtbij Nederland)
5. Genereer strong database password → **bewaar deze!**
6. Wacht 2 minuten tot database live is

### Stap 2: Run Database Schema
1. Open project → **SQL Editor**
2. Kopieer inhoud van `supabase/schema.sql`
3. Plak in SQL Editor → klik **Run**
4. Verifieer dat tabellen zijn aangemaakt:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   Je moet zien: `riders`, `clubs`, `club_roster`, `events`, `race_results`, `rider_history`, `sync_logs`

### Stap 3: Enable Realtime
1. Ga naar **Database** → **Replication**
2. Schakel in voor tabellen:
   - ✅ `riders`
   - ✅ `clubs`
   - ✅ `events`
   - ✅ `race_results`

### Stap 4: Get API Credentials
1. Ga naar **Settings** → **API**
2. Kopieer:
   - **Project URL**: `https://xyzproject.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...` (voor frontend)
   - **Service Role Key**: `eyJhbGc...` (voor backend) ⚠️ **Geheim!**

---

## 2️⃣ Frontend Deployment (Vercel)

### Option A: Via Vercel Dashboard (Aanbevolen - 2 minuten)

1. Ga naar [vercel.com](https://vercel.com) → **Add New Project**
2. Import GitHub repo: `TeamNL-Cloud9-Racing-Team`
3. **Framework Preset**: Vite
4. **Root Directory**: `frontend` ← **Belangrijk!**
5. **Build Command**: `npm run build`
6. **Output Directory**: `dist`
7. **Environment Variables** toevoegen:
   ```
   VITE_SUPABASE_URL = https://xyzproject.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGc... (anon key)
   ```
8. Klik **Deploy** → wacht 1-2 minuten
9. Je krijgt URL: `https://teamnl-cloud9.vercel.app` 🎉

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod

# Follow prompts:
# - Link to existing project? No
# - Project name: teamnl-cloud9
# - Framework: Vite
# - Root directory: .
# - Build command: npm run build
# - Output: dist
```

### Auto-Deploy Setup
✅ Vercel detecteert automatisch pushes naar `main` branch
- Elke commit → automatic deploy
- Pull requests → preview deployments

---

## 3️⃣ Backend Deployment (Railway)

### Stap 1: Create Railway Project

1. Ga naar [railway.app](https://railway.app) → **New Project**
2. Kies **Deploy from GitHub repo**
3. Selecteer `TeamNL-Cloud9-Racing-Team`
4. Railway detecteert automatisch Node.js project

### Stap 2: Configure Environment Variables

In Railway dashboard → **Variables** tab:

```bash
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://xyzproject.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc... (service role key - NIET anon key!)
ZWIFT_API_KEY=your-zwift-api-key
```

### Stap 3: Configure Build

Railway gebruikt automatisch:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start` (van package.json)

### Stap 4: Deploy

1. Railway deploy automatisch bij elke push naar `main`
2. Je krijgt URL: `https://teamnl-backend.up.railway.app`
3. Test health check: `https://teamnl-backend.up.railway.app/api/health`

### Stap 5: Enable Custom Domain (Optioneel)

Railway dashboard → **Settings** → **Domains**:
- Add custom domain: `api.teamnl-cloud9.nl`
- Update DNS records zoals Railway aangeeft

---

## 4️⃣ GitHub Actions Cron Jobs

### Stap 1: Add GitHub Secrets

GitHub repo → **Settings** → **Secrets and variables** → **Actions**:

```
RAILWAY_TOKEN = <get from railway.app/account/tokens>
BACKEND_URL = https://teamnl-backend.up.railway.app
SYNC_API_KEY = <genereer random key voor auth>
```

### Stap 2: Enable Workflows

GitHub Actions zijn al configured in `.github/workflows/`:
- ✅ `cron-hourly-sync.yml` - Runs every hour (syncs club data)
- ✅ `deploy-backend.yml` - Auto-deploy backend on push

Workflows zijn **automatisch actief** na push naar `main`!

### Stap 3: Verify Cron

1. Ga naar **Actions** tab in GitHub
2. Wacht tot eerste hourly sync (elke uur op :05)
3. Check logs → moet `✅ Hourly sync complete` tonen

---

## 5️⃣ Post-Deployment Verification

### ✅ Checklist

**Frontend (Vercel)**:
```bash
# Open in browser
https://teamnl-cloud9.vercel.app

# Should load dashboard
# Check browser console - geen Supabase errors
```

**Backend (Railway)**:
```bash
# Health check
curl https://teamnl-backend.up.railway.app/api/health

# Expected response:
{"status":"ok","timestamp":"2025-11-01..."}

# Test sync endpoint
curl -X POST https://teamnl-backend.up.railway.app/api/sync/club/11818

# Expected:
{"success":true,"memberCount":50}
```

**Supabase Database**:
```sql
-- Check riders table in Supabase SQL Editor
SELECT COUNT(*) FROM riders;

-- Should show > 0 after first sync
```

**Real-time Test**:
1. Open frontend in 2 browser tabs
2. In AdminPanel: Upload rider ID `150437`
3. Check andere tab → rider verschijnt automatisch! ✨

---

## 6️⃣ Monitoring & Logs

### Vercel Logs
```bash
vercel logs --follow
# or via dashboard: vercel.com/dashboard → project → Logs
```

### Railway Logs
Railway dashboard → **Deployments** → click deployment → **View Logs**

### Supabase Logs
Supabase dashboard → **Logs** → Filter by table/operation

### GitHub Actions Logs
GitHub repo → **Actions** tab → click workflow run

---

## 7️⃣ Cost Breakdown (Zero-Cost Setup)

| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| **Supabase** | 500MB DB, Unlimited API | ~50 riders, 1K reqs/day | **€0** |
| **Vercel** | 100GB bandwidth | Dashboard + static assets | **€0** |
| **Railway** | $5 credit/month | Backend API (~10 req/min) | **€0-1** |
| **GitHub Actions** | 2000 min/month | Hourly cron (24h × 1min) | **€0** |
| **TOTAL** | | | **€0-1/maand** 🎉 |

**Schaalt naar 10K users**: Upgrade Supabase Pro (€25/maand) + Vercel Pro (€20/maand) = **€45/maand**

---

## 8️⃣ Troubleshooting

### ❌ Frontend: "Supabase credentials ontbreken"
**Fix**: Check Vercel env vars → VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY set?
```bash
vercel env pull  # Download env vars lokaal om te checken
```

### ❌ Backend: "Supabase client not initialized"
**Fix**: Railway env vars → SUPABASE_URL & SUPABASE_SERVICE_KEY (NIET anon key!)

### ❌ Real-time werkt niet
**Fix**: 
1. Supabase → Database → Replication → Enable voor `riders` table
2. Check browser console → WebSocket connected?

### ❌ Cron job faalt
**Fix**:
1. Check GitHub Actions logs
2. Verify BACKEND_URL secret is correct (zonder trailing slash)
3. Test endpoint manually: `curl -X POST $BACKEND_URL/api/sync/club/11818`

### ❌ Railway deploy faalt
**Fix**:
```bash
# Check build logs in Railway dashboard
# Vaak: missing dependency of TS compile error
# Test lokaal:
npm run build
npm start
```

---

## 9️⃣ Custom Domain Setup (Optioneel)

### Frontend (Vercel)
1. Vercel dashboard → **Settings** → **Domains**
2. Add: `teamnl-cloud9.nl`
3. Update DNS bij domeinregistrar:
   ```
   CNAME  @  cname.vercel-dns.com
   ```

### Backend (Railway)
1. Railway → **Settings** → **Domains**
2. Add: `api.teamnl-cloud9.nl`
3. Update DNS:
   ```
   CNAME  api  <railway-generated-cname>
   ```

---

## 🎯 Quick Start Commands (na setup)

```bash
# Deploy frontend update
cd frontend
git add .
git commit -m "feat: update UI"
git push  # Auto-deploys via Vercel

# Deploy backend update
git add .
git commit -m "fix: sync logic"
git push  # Auto-deploys via Railway

# Manual sync trigger
curl -X POST https://teamnl-backend.up.railway.app/api/sync/club/11818

# Check deployment status
vercel ls           # Frontend deployments
railway status      # Backend status

# View logs
vercel logs --follow
railway logs        # In dashboard
```

---

## 📚 Nuttige Links

- **Frontend**: https://teamnl-cloud9.vercel.app
- **Backend API**: https://teamnl-backend.up.railway.app
- **Supabase Console**: https://supabase.com/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard
- **GitHub Actions**: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team/actions

---

## ✅ Success Criteria

Je deployment is succesvol als:
- ✅ Frontend bereikbaar op Vercel URL
- ✅ Backend health check returnt `{"status":"ok"}`
- ✅ Supabase database heeft `riders` table met data
- ✅ Real-time updates werken (test met 2 browser tabs)
- ✅ Hourly cron job draait (check GitHub Actions)
- ✅ Admin panel kan riders uploaden via backend API

---

**🎉 Je hebt nu een volledig geautomatiseerde, zero-cost cloud stack!**

Voor vragen: check logs of open GitHub issue.
