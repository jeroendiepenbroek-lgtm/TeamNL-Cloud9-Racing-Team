# TeamNL Cloud9 Racing Dashboard# TeamNL Cloud9 Racing Team Dashboard



**Production Dashboard voor TeamNL Cloud9 racing team met Zwift data integratie**Dashboard voor TeamNL Cloud9 met real-time Zwift racing data integratie.



[![Production Status](https://img.shields.io/badge/production-live-brightgreen)](https://teamnl-cloud9-racing-team-production.up.railway.app)## � **PRODUCTION LIVE!**

[![Version](https://img.shields.io/badge/version-1.0.0--mvp-blue)]()

[![Cost](https://img.shields.io/badge/hosting-€0%2Fmaand-success)]()**React Dashboard**: https://teamnl-cloud9-racing-team-production.up.railway.app  

**API Health**: https://teamnl-cloud9-racing-team-production.up.railway.app/health

---

💰 **Cost Status**: Free Tier ($5/maand Railway) | [Monitoring Guide](COST-MONITORING.md)

## 🚀 Quick Links

---

- **📊 Live Dashboard**: https://teamnl-cloud9-racing-team-production.up.railway.app

- **🔧 API Health**: https://teamnl-cloud9-racing-team-production.up.railway.app/health## �🔍 **Data Bekijken? Start Hier!**

- **📖 MVP Baseline**: [MVP_BASELINE.md](MVP_BASELINE.md)

- **🗺️ API Docs**: [docs/API.md](docs/API.md)**Vraag**: Kan ik de opgehaalde data zien?



---**Antwoord**: Ja! Gebruik Prisma Studio (visuele database browser):



## ✨ Features (MVP v1.0)```bash

npm run db:studio  # Opens http://localhost:5555

### 🏠 Dashboard```

- Public view met race data

- Admin view met management tools**Of** snel overzicht in terminal:

- Real-time health monitoring```bash

npm run db:view

### 📊 Racing Data Matrix```

- Power curves (5s → 1200s) W/kg en watts

- vELO race ratings met tier badges📖 **Complete handleiding**: [docs/DATA_VIEWING_QUICKSTART.md](docs/DATA_VIEWING_QUICKSTART.md)

- Rider phenotype classificatie

- Legend met 9 rating tiers (Diamond → Onyx)---



### 👥 Rider Management (Admin)## ✨ **NIEUW: Web GUI met Queue Monitoring** (100% gratis!)

- Sorteerbare rider tabel

- Favorites systeem**Geen CLI meer nodig!** Beheer je favorite riders via een professionele web interface met **real-time queue status**:

- Search & filter functionaliteit

```bash

### 🔄 Sync Monitor (Admin)npm run dev

- Manual sync triggers# Open browser: http://localhost:3000

- Sync history logs```

- Rate limit monitoring

### Features

### 🔐 Authentication- ➕ **Single Add**: Voeg 1 rider toe in <1s (non-blocking!)

- Supabase auth integratie- 📤 **Bulk Upload**: Upload CSV/TXT met 50 IDs instant response

- Role-based access control- 📊 **Visual Table**: Sorteer, zoek, bekijk FTP/ratings/types

- Protected admin routes- 🎯 **Priority Management**: Wijzig priority met dropdown

- 🔄 **Queue Monitoring**: Real-time status (pending/processing/completed/failed)

---- ⏸️ **Worker Control**: Pause/resume verwerking

- 🔄 **Retry Logic**: Auto-retry + manual retry buttons

## 🏗️ Tech Stack- ⚡ **Auto Refresh**: Queue status elke 5s, favorites elke 30s



### Frontend**Zie [docs/GUI-QUICKSTART.md](docs/GUI-QUICKSTART.md) en [docs/QUEUE-MONITORING-GUIDE.md](docs/QUEUE-MONITORING-GUIDE.md) voor complete handleiding!**

- **React** 18.3 + TypeScript 5.6

- **Vite** 5.4 (dev + build)### 🤖 GitHub Pro + Copilot Pro+ Geoptimaliseerd + Auto-Restart

- **TailwindCSS** 3.4

- **TanStack Query** 5.59 (data fetching)**Enterprise-grade development workflow - 100% gratis!**

- **React Router** 7.0

- **Supabase JS** 2.39 (auth)- ✅ **CI/CD Pipeline**: Automated testing op elke push

- ✅ **Security Scanning**: CodeQL weekly vulnerability checks  

### Backend- ✅ **Dependabot**: Automatic dependency updates

- **Node.js** 22.17 + TypeScript- ✅ **Copilot AI**: Code completion + PR reviews

- **Express** 4.18- ✅ **Issue Templates**: Structured bug/feature requests

- **Prisma** ORM- ✅ **PR Template**: Consistent code reviews

- **Supabase** PostgreSQL database- ✅ **Auto-Restart**: Nodemon (dev) + PM2 (prod) + keepalive monitor

- **Axios** (ZwiftRacing API client)

- **TSX** runtime**Zie [docs/GITHUB-PRO-SETUP.md](docs/GITHUB-PRO-SETUP.md) en [docs/AUTO-RESTART-GUIDE.md](docs/AUTO-RESTART-GUIDE.md)!**



### Infrastructure---

- **Railway** (hosting + deployment)

- **Supabase** (database + auth)## 🏗️ Architectuur

- **GitHub Actions** (CI/CD ready)

- **Cost**: €0/maand (free tier)### Tech Stack

- **Backend**: Node.js + TypeScript + Express

---- **Database**: SQLite (development) / PostgreSQL (production-ready)

- **ORM**: Prisma

## 🚀 Development Setup- **API**: ZwiftRacing.app Public API

- **Scheduling**: node-cron voor automatische data synchronisatie

### Vereisten

- Node.js 22+### 🆕 Brondatatabellen (Source Data Architecture)

- npm of yarn

**Nieuw**: Immutable source-of-truth voor alle API data!

### Installatie

De applicatie slaat nu **ruwe API responses** op in dedicated brondatatabellen voor:

```bash- 📊 **Trend analyse**: Historische snapshots van riders, clubs, events

# Clone repository- 🐛 **Debugging**: Volledige API responses beschikbaar voor troubleshooting

git clone <repo-url>- 🔍 **Data auditing**: Traceerbaarheid van alle API calls

cd TeamNL-Cloud9-Racing-Team- ⚡ **Performance**: Parsed key fields voor snelle queries



# Install backend dependencies**9 Brondatatabellen**:

cd backend- `club_source_data` - Club snapshots (1/60min)

npm install- `club_roster_source_data` - Club member lists (paginated)

- `event_results_source_data` - Event results met ratings (1/min)

# Install frontend dependencies- `event_zp_source_data` - ZwiftPower data met power curves (1/min)

cd frontend- `rider_source_data` - Rider profiles (5/min)

npm install- `rider_history_source_data` - Historical rider snapshots (5/min)

cd ../..- `rider_bulk_source_data` - Bulk rider fetches (1/15min)

```- `rider_bulk_history_source_data` - Bulk historical snapshots

- `rate_limit_logs` - Automatic rate limit tracking

### Environment Variabelen

**Principes**:

**backend/.env**:- ✅ **Immutable**: Never update, always append

```env- ✅ **Complete**: Store full JSON responses

SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co- ✅ **Traceable**: Metadata (fetchedAt, responseTime, rateLimitRemaining)

SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>- ✅ **Indexed**: Key fields extracted voor fast queries

ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1

PORT=3000**API Endpoints**:

NODE_ENV=development- `POST /api/source-data/collect/rider/:riderId` - Verzamel rider + club data

```- `POST /api/source-data/collect/events/:riderId` - Verzamel 90-dagen event history

- `POST /api/source-data/scan/events` - Scan multiple riders op nieuwe events

**backend/frontend/.env.local**:- `GET /api/source-data/rate-limits` - Rate limit monitoring dashboard

```env

VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co**Zie [docs/SOURCE_DATA_ARCHITECTURE.md](docs/SOURCE_DATA_ARCHITECTURE.md) voor volledige architectuur documentatie!**

VITE_SUPABASE_ANON_KEY=<your-anon-key>

```### Project Structuur



### Start Development```

TeamNL-Cloud9-Racing-Team/

**Optie 1: Automatisch (root)**├── public/                       # 🆕 Static files (HTML GUI)

```bash│   └── favorites-manager.html    # Web GUI voor favorites

./start-dev.sh   # Start backend + frontend├── src/

./stop-dev.sh    # Stop alles│   ├── api/

```│   │   ├── zwift-client.ts      # Modulaire API client met rate limiting

│   │   ├── routes.ts            # Express REST API endpoints

**Optie 2: Handmatig (2 terminals)**│   │   └── source-data-routes.ts # 🆕 Brondatatabellen API (11 endpoints)

```bash│   ├── database/

# Terminal 1 - Backend│   │   ├── client.ts             # Prisma client singleton

cd backend│   │   ├── repositories.ts       # Repository pattern voor data access

npx tsx src/server.ts│   │   └── source-repositories.ts # 🆕 Repositories voor brondatatabellen (9 classes)

│   ├── services/

# Terminal 2 - Frontend  │   │   ├── sync.ts               # Data synchronisatie service

cd backend/frontend│   │   └── source-data-collector.ts # 🆕 US5-US7 data collection logic

npm run dev│   ├── types/

```│   │   ├── api.types.ts          # Type definities en Zod schemas

│   │   └── errors.ts             # Custom error classes

**URLs**:│   ├── utils/

- Frontend: http://localhost:5173│   │   ├── config.ts             # Environment configuratie

- Backend: http://localhost:3000│   │   ├── logger.ts             # Gestructureerde logging

- Health: http://localhost:3000/health│   │   └── async-handler.ts      # 🆕 Express async error handler

│   └── server.ts                 # Express server + cron scheduling

### Admin Login├── prisma/

```│   └── schema.prisma             # Database schema (+ 9 brondatatabellen)

Email:    admin@cloudracer.nl├── docs/

Password: CloudRacer2024!│   ├── API.md                    # API documentatie (+ source-data endpoints)

```│   ├── SOURCE_DATA_ARCHITECTURE.md # 🆕 Brondatatabellen architectuur docs

│   ├── GUI-QUICKSTART.md         # GUI handleiding

---│   └── FAVORITES-GUIDE.md        # Favorites feature docs

└── package.json

## 📦 Deployment```



### Automatisch (Railway)## 🚀 Quick Start

```bash

git add .### 1. Installatie

git commit -m "feat: description"

git push origin main```bash

# Railway auto-deploys# Clone repository

```git clone <repository-url>

cd TeamNL-Cloud9-Racing-Team

### Manual Build

```bash# Installeer dependencies

# Build frontendnpm install

cd backend/frontend

npm run build# Kopieer environment variabelen

cp .env.example .env

# Start server (serves static files + API)

cd ..# Update .env met je API key (al ingevuld)

npx tsx src/server.ts```

```

### 2. Database Setup

---

```bash

## 📊 Project Structure# Genereer Prisma client

npm run db:generate

```

TeamNL-Cloud9-Racing-Team/# Run database migrations

├── backend/npm run db:migrate

│   ├── src/```

│   │   ├── server.ts              # Express app

│   │   ├── api/### 3. Eerste Data Sync

│   │   │   ├── zwift-client.ts    # API wrapper

│   │   │   └── endpoints/         # Route handlers```bash

│   │   ├── database/# Run handmatige sync om data op te halen

│   │   │   ├── client.ts          # Supabase clientnpm run sync

│   │   │   └── repositories.ts    # Data layer```

│   │   ├── services/

│   │   │   └── sync.ts            # Sync logic### 4. Start Development Server

│   │   └── utils/

│   │       ├── config.ts          # Environment```bash

│   │       └── logger.ts          # Logging# Start server met hot reload

│   ├── frontend/                   # React appnpm run dev

│   │   ├── src/```

│   │   │   ├── App.tsx

│   │   │   ├── pages/Server draait op `http://localhost:3000`

│   │   │   ├── components/

│   │   │   ├── contexts/### 5. **Bekijk je Data** 🔍

│   │   │   └── lib/

│   │   └── .env.localJe hebt **3 eenvoudige manieren** om de opgehaalde data te bekijken:

│   ├── public/

│   │   └── dist/                   # Frontend build#### Optie 1: Prisma Studio (Visuele Database Browser) - **Aanbevolen!**

│   └── .env```bash

├── docs/npm run db:studio

│   ├── API.md```

│   └── ...- Opent automatisch op `http://localhost:5555`

├── MVP_BASELINE.md                 # MVP dokumentatie- Gebruiksvriendelijke interface

├── README.md                       # Dit bestand- Sorteer, filter, zoek, bewerk data

├── start-dev.sh                    # Dev startup script- Bekijk relaties tussen tabellen

└── stop-dev.sh                     # Dev stop script

```#### Optie 2: Quick View (Terminal)

```bash

---npm run db:view

```

## 🔌 API Endpoints- Snel overzicht in de terminal

- Tabel counts, recente riders, top performers

### Public- Laatste sync status

```- Recente events

GET  /health                       # Health check

GET  /api/riders                   # All riders#### Optie 3: Via API Endpoints

GET  /api/riders/team              # Team riders```bash

```# Start server (indien nog niet draait)

npm run dev

### Admin (Authentication Required)

```# Haal data op

GET  /api/clubs/:id                # Club datacurl http://localhost:3000/api/riders/150437

GET  /api/events                   # All eventscurl http://localhost:3000/api/favorites

GET  /api/results/:eventId         # Event resultscurl http://localhost:3000/api/events

GET  /api/history/:riderId         # Rider history```

GET  /api/sync-logs                # Sync logs

**📖 Volledige handleiding**: Zie [docs/DATA_VIEWING_GUIDE.md](docs/DATA_VIEWING_GUIDE.md)

POST /api/clubs/:id/sync           # Sync club

POST /api/riders/sync              # Sync riders## 📡 API Endpoints

POST /api/events/sync              # Sync events

POST /api/results/:eventId/sync    # Sync results### 🆕 Favorites (Queue-Based, Non-Blocking)

POST /api/history/:riderId/sync    # Sync history- `GET /api/favorites` - Haal alle favorites op

POST /api/sync-logs/full-sync      # Full sync- `POST /api/favorites` - Voeg favorite toe (instant response): `{zwiftId, priority, addedBy}`

```- `DELETE /api/favorites/:zwiftId` - Verwijder favorite (soft delete)

- `PATCH /api/favorites/:zwiftId` - Update priority

**Volledige docs**: [docs/API.md](docs/API.md)- `POST /api/sync/favorites` - Trigger handmatige favorites sync (bulk queue)



---### 🆕 Queue Management (Real-Time Monitoring)

- `GET /api/queue/status` - Haal queue status op (pending/processing/completed/failed)

## 📖 Documentatie- `GET /api/queue/job/:jobId` - Job details

- `POST /api/queue/pause` - Pauzeer worker

- **[MVP_BASELINE.md](MVP_BASELINE.md)** - Complete MVP status & specs- `POST /api/queue/resume` - Hervat worker

- **[docs/API.md](docs/API.md)** - API endpoint reference- `POST /api/queue/cancel/:jobId` - Annuleer pending job

- **[PRODUCTION_SUCCESS.md](PRODUCTION_SUCCESS.md)** - Deployment historie- `POST /api/queue/retry/:jobId` - Retry gefaalde job

- **[DEV_ENVIRONMENT_STATUS.md](DEV_ENVIRONMENT_STATUS.md)** - Dev setup details- `POST /api/queue/retry-all` - Retry alle gefaalde jobs

- `POST /api/queue/clear-completed` - Verwijder voltooide jobs

---

**Web GUI**: http://localhost:3000/favorites-manager.html  

## 🎯 Roadmap**Queue Monitoring**: Real-time status updates elke 5s



### ✅ Phase 1: MVP (Compleet)### 🆕 Source Data (Brondatatabellen - Immutable API Data)

- React dashboard met auth- `GET /api/source-data/rate-limits` - Rate limit monitoring (24h stats)

- Racing data matrix- `GET /api/source-data/clubs/:clubId` - Club snapshots (all)

- Rider management- `GET /api/source-data/clubs/:clubId/latest` - Latest club snapshot + raw JSON

- Supabase integratie- `GET /api/source-data/events/:eventId/results` - Event results data

- Railway deployment- `GET /api/source-data/events/:eventId/zp` - Event ZwiftPower data (power curves!)

- `GET /api/source-data/events/recent?days=90` - Recent events (beide endpoints)

### 📋 Phase 2: Data Expansion- `GET /api/source-data/riders/:riderId` - Rider snapshots (all)

- [ ] Volledige club roster sync- `GET /api/source-data/riders/:riderId/latest` - Latest rider snapshot + raw JSON

- [ ] Events calendar- `POST /api/source-data/collect/rider/:riderId` - US5: Verzamel rider + club data

- [ ] Historical race results- `POST /api/source-data/collect/events/:riderId` - US6: 90-dagen event history

- [ ] Rider trend analysis- `POST /api/source-data/scan/events` - US7: Scan nieuwe events (multiple riders)



### 🚀 Phase 3: Advanced Features**US5 Tested**: ✅ Rider 150437 data successfully saved (rider + club, 2 rate limit logs)  

- [ ] Multi-user support**Zie [docs/SOURCE_DATA_ARCHITECTURE.md](docs/SOURCE_DATA_ARCHITECTURE.md) voor architectuur en [docs/API.md](docs/API.md) voor details!**

- [ ] Team vergelijkingen

- [ ] Charts & graphs### Club

- [ ] Mobile optimization- `GET /api/club` - Haal club data op met members

- [ ] Notifications- `GET /api/club/members` - Haal alle club members op

- [ ] WebSockets real-time updates- `GET /api/club/results` - Haal recente race resultaten op



---### Riders

- `GET /api/riders/:zwiftId` - Haal specifieke rider op

## 💰 Kosten- `GET /api/riders/:zwiftId/history` - Haal rider geschiedenis op (trends)

- `GET /api/riders/:zwiftId/results` - Haal rider race resultaten op

**Huidige setup**: €0/maand (binnen free tier)

### Results

- **Railway**: $5/maand free tier- `GET /api/results/:eventId` - Haal event resultaten op

- **Supabase**: Free tier (500 MB database)

- **GitHub**: Free (public repo)### Sync

- `POST /api/sync/club` - Trigger handmatige club sync

**Expected bij schalen**: €2-3/maand- `POST /api/sync/event/:eventId` - Trigger event results sync

- `GET /api/sync/stats` - Haal sync statistieken op

---- `GET /api/sync/logs` - Haal sync logs op



## 🤝 Contributing### Dashboard

- `GET /api/dashboard/club-results/:riderId` - Recente club resultaten

1. Fork het project- `GET /api/dashboard/favorites/:userId` - Favoriete riders

2. Create feature branch (`git checkout -b feature/naam`)- `POST /api/dashboard/favorites/:userId/:favoriteId` - Voeg favoriet toe

3. Commit changes (`git commit -m 'feat: beschrijving'`)- `DELETE /api/dashboard/favorites/:userId/:favoriteId` - Verwijder favoriet

4. Push to branch (`git push origin feature/naam`)- `GET /api/dashboard/rider-events/:riderId?days=90` - Rider events (90 dagen)

5. Open Pull Request

### Team Management

---- `POST /api/team` - Maak nieuw team

- `GET /api/team` - Lijst alle teams

## 📝 License- `GET /api/team/:teamId` - Team details met members

- `GET /api/team/:teamId/stats` - Team statistieken

MIT License - zie LICENSE voor details- `POST /api/team/:teamId/members/:zwiftId` - Voeg member toe (single)

- `POST /api/team/:teamId/members` - Voeg members toe (bulk)

---- `DELETE /api/team/:teamId/members/:zwiftId` - Verwijder member

- `POST /api/team/:teamId/sync` - Trigger team sync

## 👥 Team- `DELETE /api/team/:teamId` - Verwijder team



**TeamNL Cloud9 Racing Team**### Health

- `GET /api/health` - Health check

Built with ❤️ for cycling enthusiasts 🚴‍♂️

Zie [docs/API.md](docs/API.md) en [docs/TEAM_API.md](docs/TEAM_API.md) voor gedetailleerde documentatie.

---

## 🔄 Data Synchronisatie

## 🐛 Troubleshooting

De applicatie heeft automatische data synchronisatie:

### Development Issues

- **Automatisch**: Elke 60 minuten (configureerbaar via `SYNC_INTERVAL_MINUTES`)

**Port 3000 in gebruik**:- **Handmatig**: Via API endpoints of `npm run sync`

```bash- **Rate Limiting**: Respecteert ZwiftRacing.app API limits

lsof -ti:3000 | xargs kill -9- **Logging**: Alle sync operaties worden gelogd voor monitoring

```

### Rate Limits (Standard Tier)

**Port 5173 in gebruik**:- Club members: 1 call / 60 minuten

```bash- Individual riders: 5 calls / minuut

lsof -ti:5173 | xargs kill -9- Bulk riders: 1 call / 15 minuten

```- Results: 1 call / minuut



**Database connection error**:## 🛠️ Development

- Verify Supabase URL en keys in `.env` files

- Test connection: `curl https://bktbeefdmrpxhsyyalvc.supabase.co`### Available Scripts



**Auth niet werkend**:```bash

- Check `VITE_SUPABASE_ANON_KEY` in `backend/frontend/.env.local`npm run dev              # Start development server + GUI (nodemon auto-restart)

- Verify Supabase dashboard → Authentication → Usersnpm run dev:watch        # Alternative: tsx watch (legacy)

- Open browser console voor errorsnpm run dev:keepalive    # Development met custom health monitor

npm run build            # Build voor production

### Production Issuesnpm run start            # Start production server

npm run sync             # Run handmatige data sync

**Railway deployment fails**:npm run import           # Bulk import team members (CLI)

- Check Railway dashboard → Deployments → Logsnpm run test:team        # Test team management API

- Verify environment variables in Railway dashboard

- Ensure build command succeeds: `cd backend/frontend && npm run build`# 🆕 PM2 Process Management (Production)

npm run pm2:start        # Start met PM2 (auto-restart, log rotation)

**API errors**:npm run pm2:stop         # Stop PM2 process

- Check Railway logsnpm run pm2:restart      # Restart PM2 process

- Test health endpoint: `curl <railway-url>/health`npm run pm2:logs         # View logs (live)

- Verify Supabase connectionnpm run pm2:status       # Check process status

npm run pm2:delete       # Remove from PM2

**Frontend blank screen**:

- Check if `backend/public/dist/index.html` exists# 🆕 Favorites CLI tools

- Verify build output in reponpm run favorites:add <ids>      # Voeg favorites toe

- Check browser console errorsnpm run favorites:list           # Lijst alle favorites

npm run favorites:remove <ids>   # Verwijder favorites

---npm run favorites:sync           # Sync favorites data

npm run favorites:test           # Run E2E test flow

**🎉 MVP is production-ready! Start developing!** 🚀

# 🔍 Database & Data Viewing
npm run db:generate  # Genereer Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio (visuele database browser)
npm run db:view      # Quick data overzicht in terminal
npm run db:seed      # Seed database met test data

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

🆕 **Brondatatabellen** (9 tables):
- **ClubSourceData**: Club snapshots (complete API responses)
- **ClubRosterSourceData**: Paginated club member lists
- **EventResultsSourceData**: Event results met ratings
- **EventZpSourceData**: ZwiftPower data (power curves, FTP, HR)
- **RiderSourceData**: Current rider profiles
- **RiderHistorySourceData**: Historical rider snapshots
- **RiderBulkSourceData**: Bulk rider fetches (max 1000 IDs)
- **RiderBulkHistorySourceData**: Bulk historical snapshots
- **RateLimitLog**: Automatic rate limit tracking (all API calls)

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
# Railway build trigger Wed Nov  5 21:49:51 UTC 2025
