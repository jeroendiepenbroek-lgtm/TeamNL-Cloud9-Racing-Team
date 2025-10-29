# TeamNL Cloud9 Racing Team Dashboard

Dashboard voor TeamNL Cloud9 met real-time Zwift racing data integratie.

## ✨ **NIEUW: Web GUI met Queue Monitoring** (100% gratis!)

**Geen CLI meer nodig!** Beheer je favorite riders via een professionele web interface met **real-time queue status**:

```bash
npm run dev
# Open browser: http://localhost:3000
```

### Features
- ➕ **Single Add**: Voeg 1 rider toe in <1s (non-blocking!)
- 📤 **Bulk Upload**: Upload CSV/TXT met 50 IDs instant response
- 📊 **Visual Table**: Sorteer, zoek, bekijk FTP/ratings/types
- 🎯 **Priority Management**: Wijzig priority met dropdown
- 🔄 **Queue Monitoring**: Real-time status (pending/processing/completed/failed)
- ⏸️ **Worker Control**: Pause/resume verwerking
- 🔄 **Retry Logic**: Auto-retry + manual retry buttons
- ⚡ **Auto Refresh**: Queue status elke 5s, favorites elke 30s

**Zie [docs/GUI-QUICKSTART.md](docs/GUI-QUICKSTART.md) en [docs/QUEUE-MONITORING-GUIDE.md](docs/QUEUE-MONITORING-GUIDE.md) voor complete handleiding!**

### 🤖 GitHub Pro + Copilot Pro+ Geoptimaliseerd + Auto-Restart

**Enterprise-grade development workflow - 100% gratis!**

- ✅ **CI/CD Pipeline**: Automated testing op elke push
- ✅ **Security Scanning**: CodeQL weekly vulnerability checks  
- ✅ **Dependabot**: Automatic dependency updates
- ✅ **Copilot AI**: Code completion + PR reviews
- ✅ **Issue Templates**: Structured bug/feature requests
- ✅ **PR Template**: Consistent code reviews
- ✅ **Auto-Restart**: Nodemon (dev) + PM2 (prod) + keepalive monitor

**Zie [docs/GITHUB-PRO-SETUP.md](docs/GITHUB-PRO-SETUP.md) en [docs/AUTO-RESTART-GUIDE.md](docs/AUTO-RESTART-GUIDE.md)!**

---

## 🏗️ Architectuur

### Tech Stack
- **Backend**: Node.js + TypeScript + Express
- **Database**: SQLite (development) / PostgreSQL (production-ready)
- **ORM**: Prisma
- **API**: ZwiftRacing.app Public API
- **Scheduling**: node-cron voor automatische data synchronisatie

### Project Structuur

```
TeamNL-Cloud9-Racing-Team/
├── public/                       # 🆕 Static files (HTML GUI)
│   └── favorites-manager.html    # Web GUI voor favorites
├── src/
│   ├── api/
│   │   ├── zwift-client.ts      # Modulaire API client met rate limiting
│   │   └── routes.ts             # Express REST API endpoints
│   ├── database/
│   │   ├── client.ts             # Prisma client singleton
│   │   └── repositories.ts       # Repository pattern voor data access
│   ├── services/
│   │   └── sync.ts               # Data synchronisatie service
│   ├── types/
│   │   ├── api.types.ts          # Type definities en Zod schemas
│   │   └── errors.ts             # Custom error classes
│   ├── utils/
│   │   ├── config.ts             # Environment configuratie
│   │   └── logger.ts             # Gestructureerde logging
│   └── server.ts                 # Express server + cron scheduling
├── prisma/
│   └── schema.prisma             # Database schema
├── docs/
│   ├── API.md                    # API documentatie
│   ├── GUI-QUICKSTART.md         # 🆕 GUI handleiding
│   └── FAVORITES-GUIDE.md        # Favorites feature docs
└── package.json
```

## 🚀 Quick Start

### 1. Installatie

```bash
# Clone repository
git clone <repository-url>
cd TeamNL-Cloud9-Racing-Team

# Installeer dependencies
npm install

# Kopieer environment variabelen
cp .env.example .env

# Update .env met je API key (al ingevuld)
```

### 2. Database Setup

```bash
# Genereer Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optioneel) Open Prisma Studio voor database inzicht
npm run db:studio
```

### 3. Eerste Data Sync

```bash
# Run handmatige sync om data op te halen
npm run sync
```

### 4. Start Development Server

```bash
# Start server met hot reload
npm run dev
```

Server draait op `http://localhost:3000`

## 📡 API Endpoints

### 🆕 Favorites (Queue-Based, Non-Blocking)
- `GET /api/favorites` - Haal alle favorites op
- `POST /api/favorites` - Voeg favorite toe (instant response): `{zwiftId, priority, addedBy}`
- `DELETE /api/favorites/:zwiftId` - Verwijder favorite (soft delete)
- `PATCH /api/favorites/:zwiftId` - Update priority
- `POST /api/sync/favorites` - Trigger handmatige favorites sync (bulk queue)

### 🆕 Queue Management (Real-Time Monitoring)
- `GET /api/queue/status` - Haal queue status op (pending/processing/completed/failed)
- `GET /api/queue/job/:jobId` - Job details
- `POST /api/queue/pause` - Pauzeer worker
- `POST /api/queue/resume` - Hervat worker
- `POST /api/queue/cancel/:jobId` - Annuleer pending job
- `POST /api/queue/retry/:jobId` - Retry gefaalde job
- `POST /api/queue/retry-all` - Retry alle gefaalde jobs
- `POST /api/queue/clear-completed` - Verwijder voltooide jobs

**Web GUI**: http://localhost:3000/favorites-manager.html  
**Queue Monitoring**: Real-time status updates elke 5s

### Club
- `GET /api/club` - Haal club data op met members
- `GET /api/club/members` - Haal alle club members op
- `GET /api/club/results` - Haal recente race resultaten op

### Riders
- `GET /api/riders/:zwiftId` - Haal specifieke rider op
- `GET /api/riders/:zwiftId/history` - Haal rider geschiedenis op (trends)
- `GET /api/riders/:zwiftId/results` - Haal rider race resultaten op

### Results
- `GET /api/results/:eventId` - Haal event resultaten op

### Sync
- `POST /api/sync/club` - Trigger handmatige club sync
- `POST /api/sync/event/:eventId` - Trigger event results sync
- `GET /api/sync/stats` - Haal sync statistieken op
- `GET /api/sync/logs` - Haal sync logs op

### Dashboard
- `GET /api/dashboard/club-results/:riderId` - Recente club resultaten
- `GET /api/dashboard/favorites/:userId` - Favoriete riders
- `POST /api/dashboard/favorites/:userId/:favoriteId` - Voeg favoriet toe
- `DELETE /api/dashboard/favorites/:userId/:favoriteId` - Verwijder favoriet
- `GET /api/dashboard/rider-events/:riderId?days=90` - Rider events (90 dagen)

### Team Management
- `POST /api/team` - Maak nieuw team
- `GET /api/team` - Lijst alle teams
- `GET /api/team/:teamId` - Team details met members
- `GET /api/team/:teamId/stats` - Team statistieken
- `POST /api/team/:teamId/members/:zwiftId` - Voeg member toe (single)
- `POST /api/team/:teamId/members` - Voeg members toe (bulk)
- `DELETE /api/team/:teamId/members/:zwiftId` - Verwijder member
- `POST /api/team/:teamId/sync` - Trigger team sync
- `DELETE /api/team/:teamId` - Verwijder team

### Health
- `GET /api/health` - Health check

Zie [docs/API.md](docs/API.md) en [docs/TEAM_API.md](docs/TEAM_API.md) voor gedetailleerde documentatie.

## 🔄 Data Synchronisatie

De applicatie heeft automatische data synchronisatie:

- **Automatisch**: Elke 60 minuten (configureerbaar via `SYNC_INTERVAL_MINUTES`)
- **Handmatig**: Via API endpoints of `npm run sync`
- **Rate Limiting**: Respecteert ZwiftRacing.app API limits
- **Logging**: Alle sync operaties worden gelogd voor monitoring

### Rate Limits (Standard Tier)
- Club members: 1 call / 60 minuten
- Individual riders: 5 calls / minuut
- Bulk riders: 1 call / 15 minuten
- Results: 1 call / minuut

## 🛠️ Development

### Available Scripts

```bash
npm run dev              # Start development server + GUI (nodemon auto-restart)
npm run dev:watch        # Alternative: tsx watch (legacy)
npm run dev:keepalive    # Development met custom health monitor
npm run build            # Build voor production
npm run start            # Start production server
npm run sync             # Run handmatige data sync
npm run import           # Bulk import team members (CLI)
npm run test:team        # Test team management API

# 🆕 PM2 Process Management (Production)
npm run pm2:start        # Start met PM2 (auto-restart, log rotation)
npm run pm2:stop         # Stop PM2 process
npm run pm2:restart      # Restart PM2 process
npm run pm2:logs         # View logs (live)
npm run pm2:status       # Check process status
npm run pm2:delete       # Remove from PM2

# 🆕 Favorites CLI tools
npm run favorites:add <ids>      # Voeg favorites toe
npm run favorites:list           # Lijst alle favorites
npm run favorites:remove <ids>   # Verwijder favorites
npm run favorites:sync           # Sync favorites data
npm run favorites:test           # Run E2E test flow

npm run db:generate  # Genereer Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
npm run lint         # Run ESLint
npm run format       # Format code met Prettier
npm test             # Run tests
```

### Database Migraties

Bij schema wijzigingen:

```bash
# Maak nieuwe migratie
npm run db:migrate

# Reset database (development only)
npx prisma migrate reset
```

## 🗄️ Database Schema

Belangrijkste entiteiten:

- **Club**: Club gegevens en member count
- **ClubMember**: Lightweight club roster (407 members)
- **Rider**: 🆕 **Favorites tracking** met priority, sync scheduling
- **RiderRaceRating**: 🆕 Race form tracking (current/max30/max90)
- **RiderPhenotype**: 🆕 Rider type classification (sprinter/climber/etc)
- **RaceResult**: Race resultaten per event
- **Event**: Event/race informatie
- **RiderHistory**: Historische snapshots voor trend analyse
- **RiderStatistics**: Geaggregeerde statistieken per rider
- **Team**: Team management (groepen riders)
- **TeamMember**: Team lidmaatschap met sync status
- **UserFavorite**: Favoriete riders per user
- **SyncLog**: Sync operatie logging

Zie `prisma/schema.prisma` voor volledige schema.

## � Team Management

De applicatie ondersteunt team management met automatische data sync:

### Quick Start

```bash
# Maak een team
curl -X POST http://localhost:3000/api/team \
  -H "Content-Type: application/json" \
  -d '{"name":"TeamNL Cloud9","description":"Nederlands top racing team"}'

# Voeg riders toe (single)
curl -X POST http://localhost:3000/api/team/1/members/150437 \
  -H "Content-Type: application/json" \
  -d '{"role":"captain","notes":"Team leader"}'

# Bulk import via CLI (CSV)
npm run import -- --team 1 --csv examples/riders-example.csv

# Bulk import via CLI (JSON)
npm run import -- --team 1 --json examples/riders-example.json

# Bulk import via CLI (command line)
npm run import -- --team 1 --ids "150437 123456 789012"

# Check team status
curl http://localhost:3000/api/team/1/stats
```

### Features

- ✅ **Single & Bulk Add**: Voeg riders individueel of in bulk toe
- ✅ **Auto-sync**: Automatisch rider data, club en 90-dagen race history
- ✅ **Rate Limiting**: Respecteert API limits met batch processing
- ✅ **Progress Tracking**: Real-time import status en error handling
- ✅ **CSV/JSON Import**: Bulk import vanuit bestanden
- ✅ **Sync Status**: Track pending/syncing/synced/error per member
- ✅ **Team Statistics**: Geaggregeerde team stats (avg FTP, W/kg, races, wins)

Zie [docs/TEAM_API.md](docs/TEAM_API.md) voor volledige team management documentatie.

## 🗄️ Database Schema

```
ZwiftRacing API → API Client (rate limited) → Sync Service → 
Repository Layer → Prisma ORM → SQLite/PostgreSQL →
API Endpoints → Frontend Dashboard
```

## 🔒 Environment Variabelen

Zie `.env.example` voor alle configuratie opties:

- `ZWIFT_API_KEY`: Je ZwiftRacing.app API key
- `ZWIFT_CLUB_ID`: TeamNL Cloud9 club ID (11818)
- `DATABASE_URL`: Database connection string
- `SYNC_INTERVAL_MINUTES`: Auto-sync interval
- `ENABLE_AUTO_SYNC`: Schakel automatische sync in/uit

## 🚢 Deployment

### SQLite (Simpel, geschikt voor small-scale)
Geen extra setup, database is file-based.

### PostgreSQL (Aanbevolen voor production)

1. Update `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/teamnl_cloud9"
```

2. Run migrations:
```bash
npm run db:migrate
```

### Docker (Optioneel)

```bash
# Build image
docker build -t teamnl-cloud9-dashboard .

# Run container
docker run -p 3000:3000 --env-file .env teamnl-cloud9-dashboard
```

## 📝 Volgende Stappen

- [x] Backend API met Prisma ORM
- [x] Data synchronisatie met rate limiting
- [x] Dashboard endpoints (club results, favorites, rider events)
- [x] Team management API (create, add members, bulk import)
- [x] CLI tool voor bulk imports
- [x] 🆕 **Web GUI voor favorites management** (100% gratis)
- [x] 🆕 **Favorites tracking met priority scheduling**
- [x] 🆕 **Race ratings + phenotype classification**
- [x] 🆕 **SyncQueue** (Producer-Consumer, non-blocking, background processing)
- [x] 🆕 **Queue monitoring GUI** (real-time status, worker control, retry logic)
- [x] 🆕 **Auto-restart solutions** (nodemon, PM2, keepalive)
- [x] 🆕 **Production deployment** (Railway.app, Docker, CI/CD)
- [x] 🆕 **Authentication** (Basic Auth voor API beveiliging)
- [ ] SmartScheduler (auto-sync op basis van priority)
- [ ] API mocks voor snellere tests (83% speedup)
- [ ] Analytics dashboard (sync metrics, trends)
- [ ] Frontend dashboard met Next.js
- [ ] Real-time updates met WebSockets
- [ ] Geavanceerde analytics en visualisaties
- [ ] User authentication
- [ ] Team performance vergelijkingen
- [ ] Race strategie tools

**Roadmap details**: Zie [docs/IMPLEMENTATION-PLAN-ANALYTICS.md](docs/IMPLEMENTATION-PLAN-ANALYTICS.md)

## 🚀 Production Deployment

**Zero-cost deployment naar Railway.app:**

```bash
# Quick start
./scripts/deploy-railway.sh

# Of manueel
npm run build
docker-compose up -d
```

**Zie [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) voor complete deployment guide!**

**Features:**
- ✅ 24/7 uptime met automatic syncs
- ✅ PostgreSQL database (persistent)
- ✅ HTTPS + Authentication
- ✅ Monitoring & logs
- ✅ Zero cost binnen GitHub benefits

## 🤝 Contributing

1. Fork het project
2. Maak feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push naar branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## 📄 Licentie

MIT License - zie LICENSE bestand voor details.

## 👥 Team

TeamNL Cloud9 Racing Team

---

Built with ❤️ for cycling enthusiasts 🚴‍♂️
``` 
