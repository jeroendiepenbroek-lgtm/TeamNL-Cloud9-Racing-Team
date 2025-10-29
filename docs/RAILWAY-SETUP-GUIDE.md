# 🚂 Railway.app - Complete Beginner's Guide

## Stap 1: Account Aanmaken (2 minuten)

### 1.1 Ga naar Railway
🔗 Open: https://railway.app

### 1.2 Login met GitHub
```
┌─────────────────────────────────────┐
│  Railway                            │
│  ┌───────────────────────────────┐ │
│  │  Sign in with GitHub  🔐      │ │  ← Klik hier!
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │  Sign in with Email           │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

✅ **Resultaat**: Je ziet je Railway dashboard met "$5.00 available"

---

## Stap 2: Project Aanmaken (3 minuten)

### 2.1 New Project
```
Dashboard → [New Project] knop (rechts boven)
```

### 2.2 Kies Deploy methode
```
┌─────────────────────────────────────────┐
│  How would you like to deploy?         │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │  Deploy from GitHub repo  📦    │  │  ← Klik hier!
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Deploy from template            │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Empty project                   │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 2.3 Authorize GitHub
Als Railway vraagt om GitHub toegang:
```
┌────────────────────────────────────┐
│  GitHub Authorization              │
│  Railway wants to:                 │
│  ✓ Read your repositories          │
│  ✓ Create webhooks                 │
│                                     │
│  [Authorize Railway] ←────────────── Klik hier
└────────────────────────────────────┘
```

### 2.4 Selecteer Repository
```
┌────────────────────────────────────────┐
│  Select a repository                   │
│  ┌────────────────────────────────┐   │
│  │ 🔍 Search...                   │   │
│  └────────────────────────────────┘   │
│  📁 TeamNL-Cloud9-Racing-Team  ←──────── Klik hier!
│  📁 other-repo                          │
│  📁 another-repo                        │
└────────────────────────────────────────┘
```

### 2.5 Deploy Now
```
┌────────────────────────────────────┐
│  Configure your service            │
│  ┌──────────────────────────────┐ │
│  │  Branch: main                │ │
│  │  Root: /                     │ │
│  │  ✓ Auto-deploy on push      │ │
│  └──────────────────────────────┘ │
│  [Deploy Now] ←────────────────────── Klik hier
└────────────────────────────────────┘
```

✅ **Resultaat**: Railway begint met bouwen (kan 2-3 minuten duren)

---

## Stap 3: PostgreSQL Database Toevoegen (2 minuten)

### 3.1 Add Database
Terwijl je app bouwt:
```
In je project view:
[+ New] knop (rechts boven) → Database → PostgreSQL
```

Visueel:
```
┌─────────────────────────────────────────┐
│  TeamNL-Cloud9-Racing-Team             │
│  ┌─────────────┐  ┌──────────────┐    │
│  │ App Service │  │  [+ New] ▼   │ ←── Klik hier
│  │ Building... │  └──────────────┘    │
│  └─────────────┘                        │
└─────────────────────────────────────────┘

Dropdown menu:
┌──────────────────┐
│ Database         │ ←── Klik hier
│ Empty Service    │
│ GitHub Repo      │
└──────────────────┘

Kies database:
┌──────────────────┐
│ PostgreSQL  🐘   │ ←── Klik hier
│ MySQL            │
│ Redis            │
│ MongoDB          │
└──────────────────┘
```

✅ **Resultaat**: PostgreSQL database is toegevoegd en draait

### 3.2 Database Verbinding (Automatisch!)
Railway koppelt automatisch `DATABASE_URL` aan je app service.

Check dit:
```
App Service → Variables tab
Je ziet: DATABASE_URL = postgresql://postgres:...
```

---

## Stap 4: Environment Variables Configureren (5 minuten)

### 4.1 Ga naar Variables
```
App Service → Variables tab
```

### 4.2 Add Variables (kopieer deze exact)

Klik [+ New Variable] voor elk van deze:

```env
NODE_ENV=production
AUTH_ENABLED=true
API_USERNAME=admin
API_PASSWORD=JouwVeiligWachtwoord123!

ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
ZWIFT_API_BASE_URL=https://zwift-ranking.herokuapp.com
ZWIFT_CLUB_ID=2281

ENABLE_AUTO_SYNC=true
SCHEDULER_ENABLED=true

FAVORITES_SYNC_CRON=0 */6 * * *
CLUB_SYNC_CRON=0 */12 * * *
FORWARD_SCAN_CRON=0 * * * *
CLEANUP_CRON=0 3 * * *

SCHEDULER_P1_INTERVAL=15
SCHEDULER_P2_INTERVAL=30
SCHEDULER_P3_INTERVAL=60
SCHEDULER_P4_INTERVAL=120

ALLOWED_ORIGINS=*
LOG_LEVEL=info
HEALTH_CHECK_ENABLED=true
```

**Hoe toe te voegen:**
```
┌────────────────────────────────────────┐
│  Variables                             │
│  ┌──────────────────────────────────┐ │
│  │ Name: NODE_ENV                   │ │
│  │ Value: production                │ │
│  │ [Add] ←──────────────────────────── Klik
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

✅ **Resultaat**: Alle variables zijn toegevoegd

### 4.3 Redeploy (nodig na variables toevoegen)
```
Deployments tab → [Deploy] knop
```

---

## Stap 5: Eerste Deployment Testen (3 minuten)

### 5.1 Check Build Logs
```
Deployments tab → Laatste deployment → View logs
```

Zoek naar:
```
✓ Build successful
✓ Prisma migrations applied
✓ Server started on port 3000
```

### 5.2 Get je App URL
```
Settings tab → Domains sectie
```

Je ziet iets als:
```
teamnl-cloud9-racing-team-production.up.railway.app
```

### 5.3 Test je App

Open browser of gebruik curl:
```bash
# Health check (werkt zonder auth)
curl https://jouw-app-url.up.railway.app/api/health

# Expected response:
{"status":"ok","timestamp":"2025-10-29T..."}
```

Met authenticatie:
```bash
curl -u admin:JouwWachtwoord https://jouw-app-url.up.railway.app/api/workflow/status
```

✅ **Resultaat**: Je app is live!

---

## Stap 6: Staging Environment Toevoegen (5 minuten)

### 6.1 Create Environment
```
Project Settings → Environments → [New Environment]
```

### 6.2 Configure Staging
```
┌────────────────────────────────────┐
│  New Environment                   │
│  Name: staging                     │
│  Base environment: production      │ ← Kopieer variables
│  [Create]                          │
└────────────────────────────────────┘
```

### 6.3 Link to 'develop' branch
```
staging environment → Settings → Source
┌────────────────────────────────────┐
│  Source Branch                     │
│  Current: main                     │
│  Change to: develop  ←─────────────── Selecteer develop
│  [Save]                            │
└────────────────────────────────────┘
```

**LET OP**: develop branch bestaat nog niet! We maken die zo aan.

### 6.4 Add PostgreSQL voor Staging
```
In staging environment: [+ New] → Database → PostgreSQL
```

### 6.5 Update Staging Variables
```
Staging environment → Variables

Wijzig deze (andere blijven hetzelfde):
NODE_ENV=staging
AUTH_ENABLED=false         ← Geen auth voor sneller testen
ENABLE_AUTO_SYNC=false     ← Geen auto-syncs
SCHEDULER_ENABLED=false    ← Cron jobs uit
LOG_LEVEL=debug            ← Verbose logging
```

✅ **Resultaat**: Staging environment is klaar!

---

## 🎯 Overzicht van wat je nu hebt:

```
┌─────────────────────────────────────────────┐
│  Railway Project: TeamNL-Cloud9-Racing-Team │
│                                             │
│  📦 Production Environment                  │
│     ├─ App Service (Node.js)               │
│     ├─ PostgreSQL Database                 │
│     ├─ Branch: main                        │
│     └─ URL: teamnl-...production.railway   │
│                                             │
│  🧪 Staging Environment                     │
│     ├─ App Service (Node.js)               │
│     ├─ PostgreSQL Database                 │
│     ├─ Branch: develop (nog aan te maken)  │
│     └─ URL: teamnl-...staging.railway      │
└─────────────────────────────────────────────┘
```

---

## 💰 Cost Monitoring

Check je usage:
```
Dashboard → Usage tab
```

Je ziet:
```
┌────────────────────────────────┐
│  Current Usage                 │
│  $X.XX of $5.00 used          │
│  ████░░░░░░░░░░░░░░            │
└────────────────────────────────┘
```

Verwacht: ~$1-2 voor beide environments samen = ruim binnen limiet! ✅

---

## 🛠️ Handige Railway Features

### Logs bekijken (Real-time)
```
App Service → View Logs knop (rechts boven)
```

### Database verbinden
```
PostgreSQL service → Connect tab
Kopieer connection string voor lokale toegang
```

### Custom Domain (optioneel)
```
Settings → Domains → [Add Domain]
Voeg je eigen domain.com toe
```

### Rollback
```
Deployments tab → Oude deployment → Redeploy
```

---

## 🆘 Troubleshooting

### Build faalt
```
Deployments → View logs
Zoek naar error message
Vaak: missing dependency → npm install X
```

### Database connectie error
```
Check: DATABASE_URL variable is present
Check: PostgreSQL service is running (groen icoontje)
```

### App crashed
```
View logs → Zoek naar crash message
Check: Alle required env variables zijn set
```

### Out of credit
```
Impossible met onze setup! We gebruiken <$5/maand
Maar check: Usage tab → Current usage
```

---

## ✅ Railway Setup Compleet!

Je hebt nu:
- ✅ Railway account met $5 gratis credit
- ✅ Production environment (main branch)
- ✅ Staging environment (develop branch - komt zo)
- ✅ 2x PostgreSQL databases
- ✅ Auto-deploy configured
- ✅ Environment variables set

**Next Step**: Test workflow maken (Stap C)

---

## 📚 Meer Informatie

- Railway Docs: https://docs.railway.app
- Dashboard: https://railway.app/dashboard
- Status: https://status.railway.app
- Discord Support: https://discord.gg/railway
