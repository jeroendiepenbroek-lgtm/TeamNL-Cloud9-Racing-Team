# Development Setup Guide - TeamNL Cloud9 Racing Team

**Laatste update**: 2025-11-07  
**Status**: Migration 007 deployed ✅, Frontend fixes deployed ✅, Firebase assets cloned ✅

---

## 🚀 Quick Start (Nieuwe Laptop)

### 1. Prerequisites
```bash
# Check versies
node -v    # Vereist: >=18
npm -v     # Vereist: >=9
git --version

# Installeer indien nodig (Linux/Mac met fnm)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 18
fnm use 18
```

### 2. Clone Repository
```bash
git clone https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team.git
cd TeamNL-Cloud9-Racing-Team
git checkout main
git pull
```

**Laatste commits**:
- `64f65c6` - Firebase static assets cloned
- `f35a6c7` - Frontend interface updated (61 velden)
- `249f932` - Deployment success documentation
- `1e8d362` - Backend auto-sync fixed (rider_id)

### 3. Install Dependencies
```bash
# Backend (Express + TypeScript)
cd backend
npm install

# Frontend (Vite + React + Tailwind)
cd frontend
npm install
cd ../..
```

### 4. Environment Variables

**Locatie**: `backend/.env` (NIET committen!)

**Minimaal vereist**:
```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[service_role_key]
SUPABASE_ANON_KEY=[anon_key]

# JWT
JWT_SECRET=[long_random_string]

# Server
PORT=3000
NODE_ENV=development

# Sync config
SYNC_INTERVAL_MINUTES=60
```

**Waar vind je credentials?**:
- **Supabase**: Dashboard → Project Settings → API → URL + Keys
- **Railway**: Dashboard → Project → Variables
- **JWT_SECRET**: Genereer met `openssl rand -hex 32`

**⚠️ NEVER commit `.env` to repo!**

### 5. Database Setup

**Prisma Client genereren**:
```bash
cd backend
npm run db:generate
# Of: npx prisma generate
```

**Check schema status**:
```bash
npx prisma migrate status
# Migrations al toegepast in production Supabase
```

**Database schema check** (in Supabase SQL Editor):
```sql
-- Verify migration 007 is applied
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'riders' 
AND column_name IN ('rider_id', 'zp_ftp', 'race_current_rating', 'power_wkg5', 'phenotype_value')
ORDER BY column_name;
-- Should return 5 rows ✅

-- Check views exist
SELECT table_name FROM information_schema.views 
WHERE table_name IN ('riders_computed', 'view_my_team');
-- Should return 2 rows ✅
```

### 6. Start Development Servers

**Backend** (terminal 1):
```bash
cd backend
npm run dev
# Luistert op http://localhost:3000
```

**Frontend** (terminal 2):
```bash
cd backend/frontend
npm run dev
# Luistert op http://localhost:5173
```

**Check logs**:
- Backend: `[date] [level] message` in kleur
- Frontend: Vite HMR updates + React DevTools

### 7. Verify Setup

**API Health Check**:
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

**Riders API**:
```bash
curl -s http://localhost:3000/api/riders/team | jq '.[0] | {rider_id, name, zp_ftp, zp_category, race_current_rating, phenotype_value, watts_per_kg}'
# Expected: JSON met 61 velden
```

**Manual Sync**:
```bash
curl -s -X POST http://localhost:3000/api/auto-sync/trigger | jq
# Expected: {"success":true,"result":{"success":1,"errors":0}}
```

**Frontend**:
- Open http://localhost:5173
- Navigate: Dashboard, Riders, Sync, Events, Clubs
- Verify: Rider ID zichtbaar, FTP toont data, Category badge, Races count

---

## 📁 Project Structure

```
TeamNL-Cloud9-Racing-Team/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express entry point
│   │   ├── api/
│   │   │   ├── routes.ts          # API endpoints
│   │   │   └── zwift-client.ts    # External API client
│   │   ├── services/
│   │   │   ├── auto-sync.service.ts   # Scheduled sync (FIXED: rider_id)
│   │   │   └── supabase.service.ts    # Database access
│   │   ├── database/
│   │   │   └── repositories.ts    # Data layer
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript interfaces (61 velden)
│   │   └── utils/
│   │       ├── config.ts          # Env loader
│   │       └── logger.ts          # Console logger
│   ├── frontend/                  # Vite React app
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── pages/
│   │   │       ├── Dashboard.tsx
│   │   │       ├── Riders.tsx     # UPDATED: 61-field interface ✅
│   │   │       ├── Sync.tsx
│   │   │       ├── Events.tsx
│   │   │       └── Clubs.tsx
│   │   ├── public/
│   │   │   └── legacy/            # Firebase static copy ✅
│   │   │       ├── favicon.ico
│   │   │       ├── logo192.png
│   │   │       ├── manifest.json
│   │   │       └── static/
│   │   │           ├── css/main.7945c6af.css
│   │   │           └── js/main.44d797ff.js
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   ├── package.json
│   └── tsconfig.json
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/
│       └── 007_pure_api_mapping.sql   # DEPLOYED ✅
├── scripts/                       # CLI tools
├── docs/                          # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── ...
├── MIGRATION_007_LESSONS.md       # Migration mistakes & fixes
├── DEPLOYMENT_SUCCESS.md          # Deployment timeline
├── FRONTEND_GAP_ANALYSIS.md       # What's missing in UI
├── DEV_SETUP.md                   # This file
├── package.json                   # Root scripts
└── README.md
```

---

## 🔧 Common Tasks

### Run Backend Tests
```bash
cd backend
npm test
# Of: npm run test:watch
```

### Build for Production
```bash
# Backend
cd backend
npm run build
# Output: backend/dist/

# Frontend
cd backend/frontend
npm run build
# Output: backend/frontend/dist/
```

### Database Operations

**Reset local database** (⚠️ destructive):
```bash
cd backend
npx prisma migrate reset
```

**Generate new migration** (na schema.prisma wijziging):
```bash
cd backend
npm run db:migrate
# Of: npx prisma migrate dev --name descriptive_name
```

**Open Prisma Studio** (database GUI):
```bash
cd backend
npm run db:studio
# Open http://localhost:5555
```

### Manual Sync via CLI
```bash
cd backend
npm run sync
# Triggers full team sync
```

### Frontend Development

**Add new page**:
1. Create `backend/frontend/src/pages/NewPage.tsx`
2. Add route in `backend/frontend/src/App.tsx`
3. Add nav link in layout component

**Add Tailwind utility**:
1. Edit `backend/frontend/tailwind.config.js`
2. Add custom colors/fonts/spacing
3. Use in components: `className="custom-class"`

**Hot reload**:
- Vite HMR updates instantly bij file changes
- React Fast Refresh preserves component state

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>

# Of gebruik andere port
PORT=3001 npm run dev
```

### Database Connection Errors
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check Supabase status
curl -I https://[project].supabase.co
```

### Frontend Build Errors
```bash
# Clear node_modules
cd backend/frontend
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev
```

### Prisma Client Out of Sync
```bash
cd backend
npm run db:generate
# Of: npx prisma generate
```

### TypeScript Errors
```bash
# Check types
cd backend
npm run type-check
# Of: npx tsc --noEmit

cd frontend
npm run type-check
```

---

## 📊 Database Schema (Migration 007)

**Current schema**: 70+ columns na migration 007

**Key tables**:
- `riders` - 70 columns (rider_id PK, 61 API fields)
- `my_team_members` - 4 columns (rider_id FK, is_favorite, added_at)
- `riders_computed` - View met computed watts_per_kg
- `view_my_team` - JOIN my_team_members + riders_computed

**Key columns** (migration 007 changes):
- ✅ `rider_id` (was: zwift_id) - Primary key
- ✅ `zp_ftp` (was: ftp) - ZwiftPower FTP
- ✅ `zp_category` (was: category_racing) - A/B/C/D/E
- ✅ `race_current_rating` (was: ranking) - Current rating
- ✅ `race_finishes` (was: total_races_compat) - Total races
- ✅ `race_wins` (was: total_wins_compat) - Victories
- ✅ NEW: 18 power fields (wkg5, wkg15, ..., wkg1200)
- ✅ NEW: 7 phenotype fields (value, sprinter, climber, ...)
- ✅ NEW: 4 handicap fields (flat, rolling, hilly, mountainous)
- ✅ NEW: 14 race stats (last/max30/max90 ratings + dates)

**Computed fields** (riders_computed view):
- `watts_per_kg` = zp_ftp / weight

**Backup**:
- `riders_backup_20251107` - Pre-migration backup

---

## 🚀 Deployment

### Railway (Auto-deploy)

**Trigger**: Push to `main` branch → Railway auto-builds & deploys

**Build command**: `npm run build` (root package.json)
**Start command**: `npm start`

**Environment variables**: Set in Railway dashboard
- All `.env` variables MUST be configured in Railway
- Use Railway CLI: `railway variables set KEY=value`

**Check deployment**:
```bash
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/health
```

### Manual Deploy
```bash
# Via Railway CLI
railway up

# Via Git
git push origin main
# Railway detects push and deploys
```

---

## 📚 Important Documentation

**Migration & Deployment**:
- `MIGRATION_007_LESSONS.md` - Alle fouten + fixes tijdens migration
- `DEPLOYMENT_SUCCESS.md` - Complete deployment timeline
- `docs/DEPLOYMENT.md` - General deployment guide

**API & Database**:
- `docs/API.md` - REST API endpoints
- `docs/DATA_MODEL.md` - Database schema docs
- `docs/ERD.md` - Entity Relationship Diagram
- `prisma/schema.prisma` - Source of truth voor schema

**Frontend**:
- `FRONTEND_GAP_ANALYSIS.md` - Wat ontbreekt in UI
- `docs/DASHBOARD_IMPLEMENTATION.md` - Dashboard features
- `docs/GUI-QUICKSTART.md` - UI quick start

**Development**:
- `docs/TROUBLESHOOTING.md` - Common issues
- `QUICKSTART.md` - Project overview
- `.github/copilot-instructions.md` - Coding conventions

---

## 🎯 Current Status (2025-11-07)

### ✅ Completed
- Database migration 007 deployed
- Backend auto-sync fixed (rider_id variables)
- Frontend interface updated (61 velden)
- All 61 API fields mapped to database
- Sync working: success=1, errors=0
- Firebase static site cloned to `backend/frontend/public/legacy/`

### ⏳ In Progress
- Frontend deployment testing (Railway)
- Firebase site modernization (Optie A - componentize)

### 📋 Next Steps
1. Test deployed frontend op Railway
2. Modernize Firebase design in React components
3. Add power curve visualisatie (18 velden)
4. Add phenotype badge kolom (7 velden)
5. Add race history graph (14 velden)

### 🐛 Known Issues
- None blocking - all critical issues resolved

---

## 💡 Tips

**Git workflow**:
```bash
# Before starting work
git pull
git checkout -b feature/my-feature

# After changes
git add .
git commit -m "feat: beschrijving"
git push origin feature/my-feature
# Create PR on GitHub

# Merge to main → auto-deploys to Railway
```

**Code style**:
- Backend: TypeScript strict mode
- Frontend: React + TypeScript + Tailwind
- Logging: Use `logger.info/warn/error` (niet console.log)
- Errors: Custom error classes in `src/types/errors.ts`
- Comments: Nederlands voor domein logic, Engels voor tech

**Testing**:
```bash
# Quick API test
curl http://localhost:3000/api/riders/team | jq 'length'
# Expected: 2 (current team size)

# Quick sync test
curl -X POST http://localhost:3000/api/auto-sync/trigger
# Expected: success:true
```

**Performance**:
- Frontend lazy loading: `const Page = lazy(() => import('./Page'))`
- API pagination: Use `?limit=10&offset=0` params
- Database indexes: Check `prisma/schema.prisma` @@index

---

## 🆘 Help Needed?

**Errors**: Check `docs/TROUBLESHOOTING.md` first  
**Questions**: See `README.md` or `.github/copilot-instructions.md`  
**Bugs**: Open GitHub issue met reproducible steps  
**Features**: Write User Story in `docs/USER_STORIES/`

**Contact**: GitHub @jeroendiepenbroek-lgtm

---

**Happy coding! 🚀**
