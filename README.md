# TeamNL Cloud9 Racing Team Dashboard

**Versie**: 4.0.0-fresh-start  
**Status**: Minimal Viable Product

## 🎯 Doel

Lightweight dashboard applicatie voor TeamNL Cloud9 racing team met 3 core dashboards:
- **Racing Matrix**: vELO tiers, power intervals, phenotype analyse
- **Events**: 48h lookforward, team signups, route details  
- **Results**: Race resultaten, power curves, persoonlijke records

## 🏗️ Architectuur

**Dual-source data model:**
- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Supabase (PostgreSQL database + Auth)
- Data Sources:
  - **ZwiftRacing.app**: Racing metrics, power data, vELO
  - **Zwift Official API**: Competition racing score, avatars, social stats
- Deployment: Railway (Dockerfile)

## 📁 Structuur

```
/
├── frontend/          # React applicatie
│   ├── src/
│   │   ├── pages/    # 3 dashboard templates
│   │   ├── contexts/ # Auth context
│   │   └── App.tsx   # Routing
│   └── dist/         # Build output
├── backend/           # Express server
│   └── src/
│       └── server.ts # Health + static serving
└── docs/              # Architectuur documentatie
```

## 🚀 Quick Start

### Development

```bash
# Frontend
cd frontend
npm install
npm run dev      # http://localhost:5173

# Backend
cd backend
npm install
npm run dev      # http://localhost:8080
```

### Production Build

```bash
# Build frontend
cd frontend
npm install
npm run build    # Output: frontend/dist/

# Start backend
cd backend
npm install
npm start
```

### Railway Deployment

1. Connect GitHub repository
2. Auto-detect Dockerfile
3. Environment variabelen:
   - `PORT=8080` (auto)
   - `NODE_ENV=production`
4. Deploy!

## 🔑 Discord OAuth Setup

Supabase project: `bktbeefdmrpxhsyyalvc`

Frontend ENV vars (.env):
```bash
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3Mzk0NTIsImV4cCI6MjA0NjMxNTQ1Mn0.6hHXDxq_OOMM89GrSfN1CRd0XgGMqU72gBHG9CYmUE4
```

## 📊 Dashboards

### Racing Matrix
- vELO tiers (A/B/C/D)
- Power intervals (1min, 5min, 20min)
- Phenotype categorisatie (Sprinter/Allrounder/Climber)

### Events Dashboard  
- 48h event lookforward
- Team signup tracking
- Route details & elevation

### Results Dashboard
- Race resultaten met plaatsingen
- Power curve analyse
- Persoonlijke records tracking

## 🎨 Design

- Mobile-first responsive design
- Dark mode native
- Tailwind CSS utility classes
- Gradient accents (orange/blue theme)

## 📝 Status

- ✅ Frontend: 3 empty dashboard templates
- ✅ Auth: Discord OAuth geïntegreerd
- ✅ Backend: Minimal server (health + static)
- ⏳ Data: API integratie volgt later
- ⏳ Database: SQLite/Postgres indien nodig

## 🔗 Links

- **Backup**: `.backups/frontend-clean-20251208/`
- **Auth Config**: `.backups/discord-auth-backup.md`
- **Architecture**: `docs/`
