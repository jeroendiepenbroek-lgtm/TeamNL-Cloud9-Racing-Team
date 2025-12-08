# Railway Fresh Deployment - Step by Step Guide

**Situatie**: Huidige deployment hangt vast met oude versie (2.1.0)  
**Oplossing**: Verwijder oude deployment → Nieuwe deployment vanuit GitHub  
**Voordeel**: Behoudt project, credits, custom domain, maar met fresh build

---

## 🎯 Strategie: Verwijder + Herinstall Service

### Stap 1: Backup Environment Variables

**Open**: https://railway.app/project/teamnl-cloud9-racing-team-production

**Variables tab** → Kopieer **alle** variabelen naar safe place:

```bash
# Essential (keep deze)
NODE_ENV=production
PORT=8080
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MjQ1ODksImV4cCI6MjA0NjMwMDU4OX0.6hHXDxq_OOMM89GrSfN1CRd0XgGMqU72gBHG9CYmUE4

# Optional (voor later - als backend database weer gebruikt)
# SUPABASE_SERVICE_KEY=<backup dit ook>
# DATABASE_URL=<backup dit ook>
```

---

### Stap 2: Verwijder Oude Service

**Railway Dashboard** → **Settings** tab:

1. Scroll naar beneden: **"Danger Zone"**
2. Klik: **"Remove Service from Project"**
3. Confirm: Type service naam

> **Note**: Dit verwijdert alleen de **service**, niet het hele project. Custom domain en credits blijven behouden.

---

### Stap 3: Voeg Nieuwe Service Toe

**Railway Dashboard** → **"+ New"** button:

1. Kies: **"GitHub Repo"**
2. Selecteer: `jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team`
3. Branch: `main`
4. Root directory: `backend/` (BELANGRIJK!)

Railway zal automatisch:
- ✅ Detecteren: `backend/Dockerfile`
- ✅ Lezen: `railway.toml` (builder=dockerfile)
- ✅ Builden: Via Dockerfile
- ✅ Deployen: Nieuwe container

---

### Stap 4: Environment Variables Toevoegen

**Na deployment creation** → **Variables** tab:

Voeg **alleen essentials** toe:
```
NODE_ENV=production
PORT=8080
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Save** → Railway zal automatisch redeploy triggeren met nieuwe vars.

---

### Stap 5: Custom Domain Linken (als je die had)

**Settings** → **Domains** tab:

1. Klik: **"Custom Domain"**
2. Voer in: `teamnl-cloud9-racing-team-production.up.railway.app` (of jouw custom domain)
3. Railway genereert nieuwe railway.app URL als die veranderd is

---

### Stap 6: Verificatie

**Wait 2-3 minuten** voor build + deploy, dan:

```bash
# Check nieuwe versie
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health

# Verwacht:
{
  "status": "healthy",
  "version": "3.0.0-clean-slate",
  "message": "✅ Backend running - ready for rebuild"
}
```

**Verify frontend**:
```bash
curl -I https://teamnl-cloud9-racing-team-production.up.railway.app/
# Verwacht: HTTP/2 200
```

**Run test script**:
```bash
./verify-railway-deployment.sh
```

---

## 🔄 Alternatief: Nieuw Railway Project (meer werk)

Als bovenstaande niet werkt, maak **volledig nieuw project**:

### Stap 1: Nieuw Project Aanmaken

**Railway Dashboard** → **"New Project"**:

1. Klik: **"Deploy from GitHub repo"**
2. Selecteer: `TeamNL-Cloud9-Racing-Team`
3. Branch: `main`

### Stap 2: Project Settings

**Settings**:
- **Project Name**: `teamnl-cloud9-v3-clean`
- **Root Directory**: `backend/`

### Stap 3: Environment Variables

Voeg toe (zie hierboven).

### Stap 4: Oude Project Verwijderen

**Oude project** → **Settings** → **Danger Zone** → **Delete Project**

> **Cost**: Nieuw project start met $0 usage, oude project credits gaan verloren.

---

## ⚡ Snelste Optie: Force Rebuild via Railway CLI

Als je Railway CLI hebt:

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Force rebuild
railway up --detach

# Check logs
railway logs
```

---

## 📊 Comparison

| Methode | Tijd | Behoud Credits | Behoud Domain | Risk |
|---------|------|---------------|---------------|------|
| **Verwijder + Herinstall Service** | 5 min | ✅ Yes | ✅ Yes | Low |
| **Nieuw Project** | 10 min | ❌ No | ⚠️ Manual | Low |
| **Railway CLI** | 2 min | ✅ Yes | ✅ Yes | Low |
| **Wachten op auto-deploy** | 15+ min | ✅ Yes | ✅ Yes | Medium |

---

## ✅ Aanbeveling

**Best choice**: **Verwijder Service + Herinstall** (Stap 1-6 hierboven)

**Waarom**:
- ✅ Snelst (5 min)
- ✅ Behoudt project credits
- ✅ Behoudt custom domain
- ✅ Dwingt complete rebuild
- ✅ Fresh container (geen oude cache)

**Na deployment**:
- Frontend werkt (3 lege dashboards)
- Backend werkt (health endpoints)
- Geen `riders_unified` errors meer
- Clean slate voor rebuild

---

## 🎨 Frontend Migratie Plan (voor later)

Jouw frontend is **al clean** en **klaar om te migreren**:

```
backend/frontend/src/
├── pages/
│   ├── RacingMatrix.tsx      ✅ Lege template (ready)
│   ├── EventsDashboard.tsx   ✅ Lege template (ready)
│   └── ResultsDashboard.tsx  ✅ Lege template (ready)
├── components/
│   ├── LoginModal.tsx        ✅ Discord OAuth (werkt)
│   └── ProtectedRoute.tsx    ✅ Auth guard (werkt)
├── contexts/
│   └── AuthContext.tsx       ✅ Supabase auth (werkt)
└── App.tsx                   ✅ Clean routing (170 regels)
```

**Migratie is al gedaan!** Frontend zit in backend/frontend/ en wordt:
1. Gebuild via Dockerfile: `RUN npm run build`
2. Gekopieerd naar: `/app/public/dist/`
3. Geserveerd via Express: `app.use(express.static('public/dist'))`

**Geen extra migratie nodig** - alles zit al in correcte structuur.

---

## 🚀 Action Plan

**Now (5 min)**:
1. Backup Railway ENV vars
2. Verwijder oude service
3. Add new service from GitHub
4. Add ENV vars
5. Wait for deploy

**Result**:
- ✅ Backend v3.0 running
- ✅ Frontend loading (3 dashboards)
- ✅ No database errors
- ✅ Ready for feature rebuild

**Next (later)**:
1. Design Supabase schema
2. Build backend API endpoints
3. Connect dashboards to API
4. Add Zwift sync features

---

**TL;DR**: Ga naar Railway Dashboard → Verwijder service → Add new service from GitHub → Add ENV vars → Deploy succesvol in 5 minuten.
