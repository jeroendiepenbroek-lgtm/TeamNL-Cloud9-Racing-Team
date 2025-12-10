# 🏁 TeamNL Cloud9 Racing Team Dashboard

**Railway + Supabase + React** → Live Racing Matrix met vELO, Power Curves & Team Rankings

[![Railway](https://img.shields.io/badge/Railway-Live-success)](https://teamnl-cloud9-racing-team-production.up.railway.app/)
[![Supabase](https://img.shields.io/badge/Supabase-Connected-brightgreen)](https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc)
[![Status](https://img.shields.io/badge/Status-Production_Ready-blue)]()

---

## ⚡ Quick Start (5 minuten)

```bash
./quick-setup.sh
```

**Dat is alles!** Het script doet:
- ✅ Valideert SQL bestand
- ✅ Geeft Supabase setup instructies
- ✅ Verifieert database
- ✅ Synct test data
- ✅ Deploy optie naar Railway

**Live Dashboard:** https://teamnl-cloud9-racing-team-production.up.railway.app/

---

## 📚 Documentatie

| Guide | Gebruik voor |
|-------|-------------|
| [**SETUP_GUIDE.md**](SETUP_GUIDE.md) | 🚀 **START HIER** - Complete setup (quick + manual) |
| [validate-sql.sh](validate-sql.sh) | 🛡️ SQL validation (voorkomt errors) |
| [RAILWAY_SUPABASE_SETUP.md](RAILWAY_SUPABASE_SETUP.md) | 📖 Architectuur & troubleshooting |
| [quick-setup.sh](quick-setup.sh) | ⚡ One-command automated setup |

---

## 🎯 Features

### Modern Racing Matrix
- **10-tier vELO System** 💎 Diamond → 🟤 Copper (1750+ → 0)
- **Power Curves** 5s, 15s, 30s, 60s, 120s, 300s, 1200s (absolute + W/kg)
- **Team-Relative Highlighting** Gold/Silver/Bronze voor top performers
- **Real-time Data** Direct van Zwift Official + ZwiftRacing.app
- **Smart Filters** Category, vELO tier, MultiSelect
- **Favorites System** Markeer je favoriete riders

### Data Sources
- **Zwift Official API** → Avatars, weight, racing score
- **ZwiftRacing.app** → vELO ratings, power curves, phenotypes
- **Combined View** → `v_rider_complete` FULL OUTER JOIN

---

## 🏗️ Tech Stack

```
Frontend:  React 18 + TypeScript + Vite + TailwindCSS
Backend:   Railway (static hosting + environment vars)
Database:  Supabase PostgreSQL
APIs:      Zwift Official, ZwiftRacing.app
Deploy:    Automated via Railway + GitHub
```

---

## 🚀 Deployment

### Current Setup
- **Railway Project:** `1af6fad4-ab12-41a6-a6c3-97a532905f8c`
- **Supabase Project:** `bktbeefdmrpxhsyyalvc`
- **Branch:** `fresh-start-v4`
- **Status:** ✅ Production Ready

### Deploy Commands
```bash
# Validate first (ALWAYS!)
./validate-sql.sh

# Deploy to Railway
railway up

# Check logs
railway logs --tail 50
```

---

## 📊 Database Schema

### v_rider_complete View
```sql
SELECT 
  -- Identity
  rider_id, full_name, racing_name,
  
  -- Racing Metrics
  velo_live, velo_30day, velo_90day,
  zwift_official_racing_score,
  zwiftracing_category, phenotype,
  
  -- Power Curve (W/kg pre-calculated!)
  power_5s_wkg, power_15s_wkg, power_30s_wkg,
  power_60s_wkg, power_120s_wkg, power_300s_wkg,
  power_1200s_wkg,
  
  -- Physical
  weight_kg, height_cm, racing_ftp,
  
  -- Profile
  avatar_url, data_completeness
  
FROM api_zwift_api_profiles
FULL OUTER JOIN api_zwiftracing_riders
  ON rider_id = rider_id;
```

---

## 🔧 Development

### Local Setup
```bash
# Frontend
cd frontend
npm install
npm run dev      # http://localhost:5173

# Sync data
export SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
export SUPABASE_SERVICE_KEY="your-key"
node fetch-zwiftracing-rider.js 150437
```

### Environment Variables
```env
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 🐛 Troubleshooting

### No data on dashboard?
```bash
# Check view exists
./validate-sql.sh

# Sync test rider
node fetch-zwiftracing-rider.js 150437
```

### SQL errors?
```bash
# Validate BEFORE running in Supabase
./validate-sql.sh

# Should show:
# ✅ ✅ ✅  ALLE CHECKS GESLAAGD! ✅ ✅ ✅
```

More: See [RAILWAY_SUPABASE_SETUP.md](RAILWAY_SUPABASE_SETUP.md#troubleshooting)

---

## 📝 Data Sync

### Individual Rider
```bash
node fetch-zwiftracing-rider.js <rider_id>
```

### Team Sync
```bash
./sync-team-to-supabase.sh
```

---

## 🔗 Important Links

- **Live Dashboard:** https://teamnl-cloud9-racing-team-production.up.railway.app/
- **Railway Console:** https://railway.com/project/1af6fad4-ab12-41a6-a6c3-97a532905f8c
- **Supabase Dashboard:** https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc
- **Supabase SQL Editor:** https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new

---

## ✅ Setup Checklist

- [x] Railway project configured
- [x] Supabase environment variables set
- [x] Frontend migrated to v_rider_complete schema
- [x] SQL validation script created
- [x] Automated setup script ready
- [ ] **Run SQL in Supabase** ← JIJ DOET DIT
- [ ] **Sync rider data**
- [ ] **Verify live dashboard**

---

## 🎉 Ready to Deploy!

```bash
./quick-setup.sh
```

**Last Updated:** December 10, 2025 | **Status:** Production Ready ✅
