# 🏁 TeamNL Cloud9 Racing Team - Complete Setup Guide

**Railway Project → Supabase Database → Live Dashboard**

---

## 🎯 Doel

Railway project `1af6fad4-ab12-41a6-a6c3-97a532905f8c` voedt het live dashboard op `https://teamnl-cloud9-racing-team-production.up.railway.app/` met data uit Supabase view `v_rider_complete`.

---

## ⚡ Quick Start (5 minuten)

```bash
./quick-setup.sh
```

Dit script:
1. ✅ Valideert SQL bestand
2. 📋 Geeft instructies voor Supabase
3. 🔍 Verifieert database setup
4. 🔄 Synct test rider data
5. 🚀 Deploy optioneel naar Railway
6. ✅ Toont verificatie URLs

---

## 📋 Handmatige Setup

### Stap 1: Valideer SQL (VERPLICHT!)

```bash
./validate-sql.sh
```

**Alleen verder gaan als je ziet:**
```
✅ ✅ ✅  ALLE CHECKS GESLAAGD! ✅ ✅ ✅
```

### Stap 2: Draai SQL in Supabase

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new
   ```

2. **Kopieer SQL:**
   - Open `SETUP_SUPABASE_COMPLETE.sql`
   - Selecteer alles (Ctrl+A)
   - Kopieer (Ctrl+C)

3. **Plak en draai:**
   - Plak in SQL Editor (Ctrl+V)
   - Klik "RUN"
   - Wacht op "Success"

### Stap 3: Sync Test Data

```bash
export SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGci...your-key"

node fetch-zwiftracing-rider.js 150437
```

### Stap 4: Check Dashboard

Open: https://teamnl-cloud9-racing-team-production.up.railway.app/

Verwacht:
- ✅ Rider 150437 (JRøne CloudRacer-9)
- ✅ vELO badge (1413.91)
- ✅ Power intervals met W/kg
- ✅ Category B badge

---

## 🗂️ Belangrijke Bestanden

| Bestand | Doel |
|---------|------|
| `quick-setup.sh` | 🚀 **START HIER** - Complete geautomatiseerde setup |
| `validate-sql.sh` | 🛡️ Valideer SQL voordat je draait |
| `SETUP_SUPABASE_COMPLETE.sql` | 📄 Volledige database schema (2296 regels) |
| `sync-team-to-supabase.sh` | 👥 Sync volledige team |
| `fetch-zwiftracing-rider.js` | 🔄 Sync individuele rider |
| `RAILWAY_SUPABASE_SETUP.md` | 📖 Volledige documentatie |

---

## 🏗️ Architectuur

```
┌─────────────────────────────────────────┐
│  Railway Project                        │
│  1af6fad4-ab12-41a6-a6c3-97a532905f8c  │
│                                         │
│  Frontend: React + Vite + Tailwind     │
│  ├─ RacingMatrix.tsx (967 lines)       │
│  └─ Uses: VITE_SUPABASE_URL            │
└─────────────────┬───────────────────────┘
                  │ REST API
                  ▼
┌─────────────────────────────────────────┐
│  Supabase Project                       │
│  bktbeefdmrpxhsyyalvc                  │
│                                         │
│  v_rider_complete VIEW                 │
│  ├─ api_zwift_api_profiles             │
│  │  (Official API: avatars, weight)    │
│  └─ api_zwiftracing_riders             │
│     (ZwiftRacing.app: vELO, power)     │
└─────────────────┬───────────────────────┘
                  │ Sync Scripts
                  ▼
┌─────────────────────────────────────────┐
│  External APIs                          │
│  ├─ ZwiftRacing.app /riders/{id}        │
│  └─ Zwift Official /profiles/{id}       │
└─────────────────────────────────────────┘
```

---

## 📊 Data Schema

### v_rider_complete View Fields

```sql
-- Identity
rider_id, full_name, racing_name, first_name, last_name

-- Racing Metrics  
velo_live, velo_30day, velo_90day
zwift_official_racing_score, zwift_official_category
phenotype, zwiftracing_category, race_count

-- Power Curve (Absolute Watts)
racing_ftp, power_5s, power_15s, power_30s, power_60s,
power_120s, power_300s, power_1200s

-- Power Curve (Relative W/kg)
power_5s_wkg, power_15s_wkg, power_30s_wkg, power_60s_wkg,
power_120s_wkg, power_300s_wkg, power_1200s_wkg

-- Physical
weight_kg, height_cm, ftp_watts

-- Profile
avatar_url, avatar_url_large

-- Meta
data_completeness, fetched_at
```

---

## 🔧 Troubleshooting

### Issue: "No data" op dashboard

**Check 1:** View bestaat?
```bash
# Via script
./validate-sql.sh

# Of manual check in Supabase SQL Editor:
SELECT COUNT(*) FROM v_rider_complete;
```

**Check 2:** Data gesynchroniseerd?
```bash
node fetch-zwiftracing-rider.js 150437
```

**Check 3:** Railway environment variables?
```bash
railway variables | grep VITE_SUPABASE
```

Moet tonen:
```
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
```

### Issue: SQL fouten tijdens setup

**Oplossing:** Draai validatie eerst!
```bash
./validate-sql.sh
```

Dit voorkomt:
- ❌ Column does not exist errors
- ❌ NULL constraint violations
- ❌ Wrong table references

### Issue: Rider sync faalt

**Check APIs:**
```bash
# Test ZwiftRacing.app
curl "https://zwift-ranking.herokuapp.com/api/riders/150437"

# Test Zwift Official
curl "https://us-or-rly101.zwift.com/api/profiles/150437"
```

**Check credentials:**
```bash
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY
```

---

## 📝 Railway Environment Variables

Reeds geconfigureerd ✅:

```env
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 🔄 Data Sync Opties

### Optie 1: Individuele Rider
```bash
node fetch-zwiftracing-rider.js <rider_id>
```

### Optie 2: Meerdere Riders
```bash
for RIDER_ID in 150437 123456 789012; do
  node fetch-zwiftracing-rider.js $RIDER_ID
  sleep 2  # Rate limiting
done
```

### Optie 3: Team Script
```bash
# Edit rider IDs in sync-team-to-supabase.sh
./sync-team-to-supabase.sh
```

---

## ✅ Success Checklist

- [ ] `./validate-sql.sh` geeft alle ✅
- [ ] SQL gedraaid in Supabase zonder errors
- [ ] `v_rider_complete` view bestaat
- [ ] Test rider (150437) gesynchroniseerd
- [ ] Dashboard toont data op https://teamnl-cloud9-racing-team-production.up.railway.app/
- [ ] vELO badges zichtbaar
- [ ] Power intervals tonen W/kg
- [ ] Geen TypeScript errors in Railway logs

---

## 🚀 Deploy Commands

```bash
# Local test
cd frontend && npm run dev

# Deploy naar Railway
railway up

# Check logs
railway logs --tail 50

# Check environment
railway variables
```

---

## 📚 Documentatie

- **Complete Setup:** `RAILWAY_SUPABASE_SETUP.md`
- **API Documentation:** `API_DOCUMENTATION.md`
- **Troubleshooting:** `FIX_LIVE_DATA.md`

---

## 🎯 Links

- **Live Dashboard:** https://teamnl-cloud9-racing-team-production.up.railway.app/
- **Railway Project:** https://railway.com/project/1af6fad4-ab12-41a6-a6c3-97a532905f8c
- **Supabase Dashboard:** https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc
- **Supabase SQL Editor:** https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new

---

## 🏁 Quick Commands Samenvatting

```bash
# COMPLETE SETUP (recommended)
./quick-setup.sh

# OF STAP VOOR STAP:

# 1. Valideer
./validate-sql.sh

# 2. Draai SQL in Supabase (manual copy-paste)
# Open SETUP_SUPABASE_COMPLETE.sql → Copy → Paste in Supabase

# 3. Sync data
node fetch-zwiftracing-rider.js 150437

# 4. Check dashboard
open https://teamnl-cloud9-racing-team-production.up.railway.app/
```

---

**Status:** ✅ Ready to Deploy | **Last Updated:** December 10, 2025
