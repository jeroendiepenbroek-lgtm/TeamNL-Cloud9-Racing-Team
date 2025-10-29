# Kosten Analyse & Free-Tier Strategie
**Project**: TeamNL Cloud9 Racing Team Dashboard  
**Datum**: 27 oktober 2025  
**Doel**: Zero extra kosten implementatie

---

## 🎯 Huidige Situatie

### ZwiftRacing.app API
- **Status**: ✅ GRATIS
- **API Key**: `650c6d2fc4ef6858d74cbef1`
- **Limits**: 
  - Riders: 5 req/min
  - Clubs: 1 req/60min
  - Results: 1 req/min
- **Kosten**: €0/maand
- **Restrictions**: Rate limits (geen extra kosten, wel tijd)

### Ontwikkel Environment
- **Dev Container**: ✅ Gratis (GitHub Codespaces free tier of lokaal)
- **SQLite Database**: ✅ Gratis (lokaal bestand)
- **Node.js + TypeScript**: ✅ Gratis (open source)
- **Prisma ORM**: ✅ Gratis (open source)

**Totaal Development**: **€0/maand**

---

## 💰 Potentiële Kosten (Te Vermijden!)

### ❌ Database Hosting

| Service | Free Tier | Paid | Advies |
|---------|-----------|------|--------|
| **Supabase** | 500MB PostgreSQL | €25/maand | ⚠️ Vermijd - gebruik SQLite |
| **PlanetScale** | 1GB MySQL | €29/maand | ⚠️ Vermijd |
| **Railway** | $5 credit/maand | $5+/maand | ⚠️ Te klein free tier |
| **Neon** | 3GB PostgreSQL | €19/maand | ⚠️ Alleen als echt nodig |

**Oplossing**: ✅ **SQLite blijven gebruiken** (gratis, geen hosting nodig)

---

### ❌ Backend Hosting

| Service | Free Tier | Paid | Advies |
|---------|-----------|------|--------|
| **Vercel** | Serverless functions | €20/maand (team) | ⚠️ Alleen frontend |
| **Railway** | $5 credit/maand | $5+/maand | ⚠️ Te duur voor 24/7 |
| **Render** | Free tier (slaapt) | €7/maand | ⚠️ Free tier slaapt na 15 min |
| **Fly.io** | 3 VMs gratis | €0-10/maand | ✅ Beste gratis optie |
| **DigitalOcean** | - | €6/maand | ❌ Geen free tier |

**Oplossing**: ✅ **Lokaal draaien** of **Fly.io free tier**

---

### ❌ Frontend Hosting

| Service | Free Tier | Paid | Advies |
|---------|-----------|------|--------|
| **Vercel** | Onbeperkt static sites | €20/maand (team) | ✅ Gratis blijven |
| **Netlify** | 100GB bandwidth | €19/maand | ✅ Gratis blijven |
| **GitHub Pages** | Onbeperkt | Gratis | ✅ Perfecte optie |
| **Cloudflare Pages** | Onbeperkt | Gratis | ✅ Perfecte optie |

**Oplossing**: ✅ **Vercel/Netlify/GitHub Pages** (allemaal gratis)

---

### ❌ Cron Jobs / Scheduled Tasks

| Service | Free Tier | Paid | Advies |
|---------|-----------|------|--------|
| **GitHub Actions** | 2000 min/maand | - | ✅ Genoeg voor ons |
| **Vercel Cron** | - | €20/maand | ❌ Te duur |
| **Render Cron** | ✅ Gratis | - | ✅ Als je Render gebruikt |
| **Lokale cron** | ✅ Gratis | - | ✅ Beste optie |

**Oplossing**: ✅ **GitHub Actions** of **lokale cron**

---

## ✅ Zero-Cost Architectuur

### Optie 1: Volledig Lokaal (€0/maand)

```
┌─────────────────────────────────────────┐
│  Jouw Laptop / Desktop (Lokaal)        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Backend (Node.js + Express)    │   │
│  │  - API endpoints                │   │
│  │  - Services                     │   │
│  │  - Cron jobs (node-cron)        │   │
│  └─────────────────────────────────┘   │
│              ↓                          │
│  ┌─────────────────────────────────┐   │
│  │  SQLite Database                │   │
│  │  - prisma/dev.db (lokaal file)  │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Frontend (Vercel/Netlify - GRATIS)    │
│  - Next.js static export                │
│  - Calls naar localhost:3000 (dev)     │
│  - Of calls naar Fly.io (prod)         │
└─────────────────────────────────────────┘
```

**Voordelen**:
- ✅ €0/maand
- ✅ Volledige controle
- ✅ Geen rate limits van hosting
- ✅ Privacy (data blijft lokaal)

**Nadelen**:
- ⚠️ Moet altijd draaien voor cron jobs
- ⚠️ Alleen toegankelijk op lokaal netwerk (of port forwarding)

**Geschikt voor**: Development + persoonlijk gebruik

---

### Optie 2: Hybrid (€0/maand met publieke frontend)

```
┌─────────────────────────────────────────┐
│  Lokaal (Backend + Database)            │
│  - Node.js server                       │
│  - SQLite database                      │
│  - Cron jobs                            │
│                                         │
│  ┌──────────────────┐                  │
│  │ Cloudflare Tunnel│  (GRATIS)        │
│  │ cloudflared      │                  │
│  └──────────────────┘                  │
└──────────────┬──────────────────────────┘
               │ (veilige tunnel)
               ↓
┌─────────────────────────────────────────┐
│  Internet (Publiek toegankelijk)       │
│  https://your-app.trycloudflare.com    │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Frontend (Vercel - GRATIS)            │
│  - Next.js app                          │
│  - Calls naar Cloudflare Tunnel URL    │
└─────────────────────────────────────────┘
```

**Voordelen**:
- ✅ €0/maand
- ✅ Publiek toegankelijk
- ✅ Data blijft lokaal
- ✅ Cloudflare Tunnel = gratis + veilig

**Nadelen**:
- ⚠️ Laptop moet online blijven
- ⚠️ Cloudflare Tunnel moet draaien

**Geschikt voor**: Delen met teamleden zonder hosting kosten

---

### Optie 3: Fly.io Free Tier (€0/maand)

```
┌─────────────────────────────────────────┐
│  Fly.io (GRATIS tot 3 VMs)             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  VM 1: Node.js Backend          │   │
│  │  - 256MB RAM (gratis)           │   │
│  │  - SQLite persistent volume     │   │
│  │  - Cron via node-cron            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  https://your-app.fly.dev              │
└─────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│  Frontend (Vercel - GRATIS)            │
│  - Next.js                              │
│  - Calls naar Fly.io backend           │
└─────────────────────────────────────────┘
```

**Voordelen**:
- ✅ €0/maand (free tier: 3 VMs, 160GB bandwidth)
- ✅ 24/7 beschikbaar
- ✅ SQLite persistent volume (gratis 1GB)
- ✅ Automatische SSL

**Nadelen**:
- ⚠️ 256MB RAM limiet (genoeg voor ons)
- ⚠️ Free tier kan worden aangepast door Fly.io

**Geschikt voor**: Production zonder kosten

---

### Optie 4: GitHub Actions Cron (€0/maand)

Voor **alleen data sync** zonder 24/7 server:

```yaml
# .github/workflows/sync-data.yml
name: Sync ZwiftRacing Data

on:
  schedule:
    # Elke dag 04:00 UTC
    - cron: '0 4 * * *'
  workflow_dispatch:  # Handmatig triggeren

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Download database
        run: |
          # Download SQLite van GitHub artifact/release
          gh release download latest -p dev.db || echo "No DB yet"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Run forward scan
        run: npm run sync:forward
        env:
          ZWIFT_API_KEY: ${{ secrets.ZWIFT_API_KEY }}
      
      - name: Upload database
        run: |
          gh release create data-$(date +%Y%m%d) dev.db --notes "Auto sync"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Voordelen**:
- ✅ €0/maand (2000 min/maand = ~67 syncs)
- ✅ Geen server nodig
- ✅ Automatisch scheduled
- ✅ Database in GitHub Releases (gratis storage)

**Nadelen**:
- ⚠️ Geen real-time API endpoints
- ⚠️ Data alleen via releases beschikbaar
- ⚠️ 2000 min/maand = ~30 min per dag max

**Geschikt voor**: Alleen data verzameling, frontend toont static data

---

## 🎯 Aanbevolen Strategie (€0/maand)

### Development (Nu)
```
Lokaal:
- Backend: localhost:3000
- Database: prisma/dev.db (lokaal)
- Cron: node-cron (lokaal)
- Frontend: localhost:3001 (dev server)

Kosten: €0
```

### Staging (Voor testen)
```
Fly.io Free Tier:
- Backend: https://teamnl-staging.fly.dev
- Database: SQLite persistent volume (1GB gratis)
- Cron: node-cron in Fly.io VM
- Frontend: Vercel preview (gratis)

Kosten: €0
```

### Production (Publiek)
```
Optie A - Volledig Gratis (Fly.io):
- Backend: https://teamnl.fly.dev (Fly.io free tier)
- Database: SQLite persistent volume
- Cron: node-cron
- Frontend: Vercel production (gratis)

Kosten: €0/maand

Optie B - Hybrid (Meer controle):
- Backend: Lokaal + Cloudflare Tunnel
- Database: Lokaal SQLite
- Cron: Lokaal node-cron
- Frontend: Vercel production (gratis)

Kosten: €0/maand
```

---

## 📊 Workflow Kosten Impact

### Jouw Workflow (5 Steps)

**Step 1: Subteam Upload** (GUI)
- Kosten: €0 (frontend only)

**Step 2: Rider Stats Sync**
```
15 favorites × 1 API call = 15 calls/dag
Rate limit: 5/min
Tijd: 3 minuten
API kosten: €0 (gratis API)
```

**Step 3: Club Extraction**
```
~3 clubs × 0 API calls = 0 calls
(Data al in Step 2)
Kosten: €0
```

**Step 4: Club Roster Sync**
```
3 clubs × 1 call/60min = 3 calls/dag
Tijd: 3 minuten (spread over uur)
API kosten: €0
```

**Step 5: Forward Event Scan**
```
1000 events × 1 call/min = 1000 calls/dag
Tijd: ~17 uur/dag
API kosten: €0
```

**Totale dagelijkse API tijd**: ~17 uur
- ✅ Past binnen 1 dag (24 uur)
- ✅ Geen API kosten
- ✅ Geen rate limit overschrijding

---

## 🔧 Zero-Cost Implementation Details

### SQLite Optimalisatie (Blijf Gratis)

```typescript
// prisma/schema.prisma - blijf bij SQLite
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
  // ✅ NIET overstappen naar PostgreSQL (dat kost geld)
}
```

**SQLite limieten**:
- ✅ Database size: Onbeperkt (bestandssysteem limiet)
- ✅ Concurrent reads: Onbeperkt
- ⚠️ Concurrent writes: 1 tegelijk (geen probleem voor ons)
- ✅ Performance: Tot ~100k records/sec (meer dan genoeg)

**Geschatte data groei**:
```
15 favorites × 365 dagen × 25 events = ~137k results/jaar
SQLite max: ~281 TB database size

Conclusie: SQLite is prima voor jaren data
```

---

### Fly.io Free Tier Setup (Als je 24/7 wilt)

```bash
# 1. Install Fly.io CLI
curl -L https://fly.io/install.sh | sh

# 2. Signup (gratis, geen creditcard!)
fly auth signup

# 3. Launch app
fly launch --name teamnl-cloud9

# 4. Add persistent volume (GRATIS 1GB)
fly volumes create teamnl_data --size 1 --region ams

# 5. Update fly.toml
[mounts]
  source = "teamnl_data"
  destination = "/data"

# 6. Deploy
fly deploy
```

**fly.toml configuratie**:
```toml
app = "teamnl-cloud9"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  NODE_ENV = "production"
  DATABASE_URL = "file:/data/dev.db"

[[services]]
  http_checks = []
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

# ✅ Blijf binnen free tier
[vm]
  memory = '256mb'  # Gratis
  cpus = 1          # Gratis
```

**Kosten check**:
```bash
fly status --all
# Free tier: 3 VMs × 256MB = gratis
# Volume: 1GB = gratis
# Bandwidth: 160GB/maand = gratis
```

---

### GitHub Actions Alternative (Zero Server Cost)

Als je **geen 24/7 server** wilt:

```yaml
# .github/workflows/daily-sync.yml
name: Daily Data Sync

on:
  schedule:
    # 04:00 UTC = 06:00 CET
    - cron: '0 4 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      # Download laatste database
      - name: Restore database
        uses: actions/cache@v3
        with:
          path: prisma/dev.db
          key: db-${{ github.run_number }}
          restore-keys: db-
      
      # Run sync
      - name: Sync favorites
        run: npm run sync:subteam
        env:
          ZWIFT_API_KEY: ${{ secrets.ZWIFT_API_KEY }}
      
      - name: Forward scan
        run: npm run sync:forward
        env:
          ZWIFT_API_KEY: ${{ secrets.ZWIFT_API_KEY }}
      
      # Upload database
      - name: Save database
        uses: actions/cache/save@v3
        with:
          path: prisma/dev.db
          key: db-${{ github.run_number }}
      
      # Export data voor frontend
      - name: Export JSON
        run: |
          npm run export:json
          # Genereert: public/data.json
      
      # Deploy naar Vercel
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Kosten breakdown**:
- GitHub Actions: 2000 min/maand (gratis)
- Daily sync: ~20 min/dag × 30 dagen = 600 min/maand ✅
- Database cache: Gratis (10GB limit)
- Vercel deploys: Onbeperkt (gratis)

**Totaal**: €0/maand

---

## 💡 Cost Optimization Tips

### 1. Batch API Calls
```typescript
// ❌ Duur (veel tijd)
for (const zwiftId of favorites) {
  await syncRider(zwiftId);
  await sleep(12000);  // 5/min limit
}

// ✅ Efficient (1x per dag voldoende)
cron.schedule('0 4 * * *', async () => {
  await syncAllFavorites();  // 1x per dag = genoeg
});
```

### 2. Incremental Updates
```typescript
// ❌ Sync alles elke keer
await syncLast90Days();  // 61k events!

// ✅ Forward scan (alleen nieuwe)
await forwardScan({ maxEvents: 1000 });  // Alleen nieuwe
```

### 3. Smart Caching
```typescript
// Cache rider stats (wijzigt niet vaak)
const CACHE_DURATION = 24 * 60 * 60 * 1000;  // 24 uur

async function getRiderCached(zwiftId: number) {
  const cached = await prisma.rider.findUnique({
    where: { zwiftId }
  });
  
  if (cached && Date.now() - cached.lastSync.getTime() < CACHE_DURATION) {
    return cached;  // Gebruik cache
  }
  
  return await syncRider(zwiftId);  // Fresh data
}
```

### 4. Selective Syncing
```typescript
// Alleen actieve riders syncen
const activeRiders = await prisma.rider.findMany({
  where: {
    OR: [
      { lastRaceDate: { gte: thirtyDaysAgo } },  // Recent actief
      { isFavorite: true }                        // Of favorite
    ]
  }
});
```

---

## 📈 Schaling (Toekomst, Nog Steeds Gratis)

### Als je groeit naar 50 favorites + 10 clubs

**Daily API Usage**:
```
50 riders × 1 call = 50 calls (10 min)
10 clubs × 1 call = 10 calls (10 min, spread)
1000 events scan = 1000 calls (17 uur)

Totaal: ~18 uur/dag
✅ Past nog steeds in 24 uur
✅ Nog steeds €0
```

**Database Size**:
```
50 riders × 365 dagen × 25 events = ~450k results/jaar
SQLite: Makkelijk 10M+ records
✅ Nog jaren geen probleem
```

**Fly.io Free Tier Check**:
```
256MB RAM:
- Node.js: ~100MB
- Prisma: ~50MB
- SQLite: ~50MB
- Overhead: ~56MB
✅ Past nog steeds
```

### Als je écht moet schalen (100+ users)

Dan pas overwegen:
- PostgreSQL (Supabase €25/maand)
- Dedicated server (€10/maand)

Maar voor jouw use case: **niet nodig**

---

## ✅ Conclusie & Actieplan

### Aanbevolen: Fly.io Free Tier

**Waarom**:
- ✅ €0/maand (echt gratis, geen creditcard nodig)
- ✅ 24/7 beschikbaar
- ✅ Cron jobs werken
- ✅ SQLite persistent storage
- ✅ Automatische SSL
- ✅ Eenvoudig deployen

**Setup tijd**: 30 minuten

### Implementatie (Zero Cost)

```bash
# Development (lokaal)
npm run dev              # Backend localhost:3000
npm run db:studio        # Database GUI

# Staging (Fly.io free)
fly launch --name teamnl-staging
fly volumes create data --size 1
fly deploy

# Production (Fly.io free)
fly launch --name teamnl
fly volumes create data --size 1
fly deploy

# Frontend (Vercel free)
vercel --prod
```

### Maandelijkse Kosten

| Component | Service | Kosten |
|-----------|---------|--------|
| Backend | Fly.io free tier | €0 |
| Database | SQLite (Fly volume) | €0 |
| Frontend | Vercel | €0 |
| API | ZwiftRacing.app | €0 |
| SSL | Fly.io/Vercel | €0 |
| **TOTAAL** | | **€0/maand** |

### Geen Extra Kosten, Gegarandeerd

- ✅ Geen creditcard vereist (Fly.io free tier)
- ✅ Geen surprise bills
- ✅ Geen auto-upgrade naar paid tier
- ✅ Email alerts als je free tier overschrijdt (spoiler: gebeurt niet)

**Ready to build? Zero euro's nodig!** 🚀

