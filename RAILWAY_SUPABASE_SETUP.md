# 🚀 Railway + Supabase Complete Setup

## Doel
Railway project **1af6fad4-ab12-41a6-a6c3-97a532905f8c** moet dashboard **https://teamnl-cloud9-racing-team-production.up.railway.app/** voeden vanuit Supabase view `v_rider_complete`.

---

## Huidige Status ✅

### Railway Project
- **Project ID**: `1af6fad4-ab12-41a6-a6c3-97a532905f8c`
- **Service**: TeamNL-Cloud9-Racing-Team
- **Environment**: production
- **URL**: https://teamnl-cloud9-racing-team-production.up.railway.app/

### Supabase Project
- **Project**: `bktbeefdmrpxhsyyalvc`
- **URL**: https://bktbeefdmrpxhsyyalvc.supabase.co
- **Status**: ⚠️ **View v_rider_complete bestaat nog niet**

### Railway Environment Variables ✅
```
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend Code ✅
- Gebruikt `import.meta.env.VITE_SUPABASE_URL` (geen hardcoded URL)
- Fallback naar `bktbeefdmrpxhsyyalvc.supabase.co`
- Alle veldnamen gemigreerd naar v_rider_complete schema

---

## Setup Stappenplan

### Stap 0: Valideer SQL Bestand ⏱️ 10 sec ⚠️ BELANGRIJK!

**ALTIJD eerst draaien voordat je naar Supabase gaat!**

```bash
./validate-sql.sh
```

Dit script checkt:
- ✅ Geen niet-bestaande kolommen (racing_score, velo)
- ✅ Geen NULL constraint violations
- ✅ Indices op correcte kolommen
- ✅ View definities correct
- ✅ Tabel structuur compleet

**Alleen verder gaan als je ziet:**
```
✅ ✅ ✅  ALLE CHECKS GESLAAGD! ✅ ✅ ✅
```

### Stap 1: Draai Migrations in Supabase ⏱️ 2 min

1. **Open SQL Editor**:
   ```
   https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new
   ```

2. **Kopieer volledige SQL**:
   - Open bestand: `SETUP_SUPABASE_COMPLETE.sql` (78KB)
   - Kopieer alles (Ctrl+A, Ctrl+C)
   - Plak in Supabase SQL Editor
   - Klik "Run"

3. **Verify**:
   ```sql
   -- Check of view bestaat
   SELECT COUNT(*) FROM v_rider_complete;
   -- Verwacht: 0 rows (nog geen data)
   
   -- Check welke tabellen er zijn
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

### Stap 2: Sync Test Rider Data ⏱️ 1 min

```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team

# Update env vars voor sync scripts
export SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
export SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDczOTQ1MiwiZXhwIjoyMDQ2MzE1NDUyfQ.GXxGUBxnPh3u5Q-7PLy_dT9uc-FcqMVNqWj5hl9rAXM

# Sync test rider (Jeroen / JRøne CloudRacer-9)
node fetch-zwiftracing-rider.js 150437
```

**Verwacht output**:
```
✅ Rider 150437 synced successfully
   vELO: 1413.91
   Name: JRøne CloudRacer-9 @YT
   Category: B
```

### Stap 3: Verify Data in Supabase

```sql
-- Check dat rider is toegevoegd
SELECT 
  rider_id,
  full_name,
  velo_live,
  velo_30day,
  racing_ftp,
  zwiftracing_category
FROM v_rider_complete
WHERE rider_id = 150437;
```

**Verwacht resultaat**:
| rider_id | full_name | velo_live | velo_30day | racing_ftp | zwiftracing_category |
|----------|-----------|-----------|------------|------------|---------------------|
| 150437 | Jeroen Diepenbroek | 1413.91 | 1413.91 | 248 | B |

### Stap 4: Deploy Frontend (al gedaan ✅)

Frontend code is al gecommit en gebruikt Railway environment variables.

```bash
# Optioneel: Force redeploy als Railway nog oude build heeft
railway up --detach
```

### Stap 5: Test Live Dashboard ⏱️ 30 sec

1. **Open dashboard**:
   ```
   https://teamnl-cloud9-racing-team-production.up.railway.app/
   ```

2. **Verify data verschijnt**:
   - ✅ Rider 150437 zichtbaar
   - ✅ vELO badge: 1413.91 (Ruby tier 💍)
   - ✅ Category: B
   - ✅ Power intervals (W/kg)
   - ✅ Geen "No data" message

### Stap 6: Sync Volledige Team

```bash
# Voeg alle team riders toe
TEAM_RIDERS=(
  150437  # Jeroen / JRøne CloudRacer-9
  # Voeg hier andere rider IDs toe
)

for RIDER_ID in "${TEAM_RIDERS[@]}"; do
  echo "Syncing rider $RIDER_ID..."
  node fetch-zwiftracing-rider.js $RIDER_ID
  sleep 2  # Rate limiting
done
```

---

## Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────┐
│                    RAILWAY PROJECT                          │
│            1af6fad4-ab12-41a6-a6c3-97a532905f8c            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Frontend (Vite + React + TailwindCSS)              │  │
│  │  - RacingMatrix.tsx                                  │  │
│  │  - Gebruikt: VITE_SUPABASE_URL                       │  │
│  │  - Query: v_rider_complete view                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▼ REST API                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE PROJECT                               │
│              bktbeefdmrpxhsyyalvc                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  v_rider_complete VIEW (FULL OUTER JOIN)            │  │
│  │  ┌────────────────────┐  ┌─────────────────────┐    │  │
│  │  │ api_zwift_api_     │  │ api_zwiftracing_    │    │  │
│  │  │ profiles           │  │ riders              │    │  │
│  │  │ (Official API)     │  │ (ZwiftRacing.app)   │    │  │
│  │  │                    │  │                     │    │  │
│  │  │ - Avatar           │  │ - vELO scores       │    │  │
│  │  │ - Weight           │  │ - Power curves      │    │  │
│  │  │ - Height           │  │ - Race count        │    │  │
│  │  │ - Racing score     │  │ - Category          │    │  │
│  │  └────────────────────┘  └─────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ▲                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ Sync Scripts
                           │
┌──────────────────────────┼──────────────────────────────────┐
│  EXTERNAL APIs           │                                  │
│                          │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ZwiftRacing.app API                                │   │
│  │  https://zwift-ranking.herokuapp.com/api/riders/:id │   │
│  │  - vELO data                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Zwift Official API                                 │   │
│  │  https://api.zwift.com/api/profiles/:id             │   │
│  │  - Profile data                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Data Sync (Manual of Scheduled)
```bash
node fetch-zwiftracing-rider.js <rider_id>
```
↓
```
1. Fetch van ZwiftRacing.app API
2. Fetch van Zwift Official API  
3. Insert/Update in api_zwiftracing_riders
4. Insert/Update in api_zwift_api_profiles
```

### 2. Database View (Auto Update)
```sql
v_rider_complete = 
  api_zwift_api_profiles (LEFT) 
  FULL OUTER JOIN 
  api_zwiftracing_riders (RIGHT)
```

### 3. Frontend Query (Real-time)
```typescript
fetch(`${VITE_SUPABASE_URL}/rest/v1/v_rider_complete?select=*`)
```
↓
```
Racing Matrix toont:
- vELO badges (Diamond → Copper)
- Power curves (5s → 20min)
- Team rankings
- Category badges
```

---

## Troubleshooting

### Issue: "No data" op dashboard

**Check 1**: View bestaat?
```sql
SELECT COUNT(*) FROM v_rider_complete;
```
- Als error → Draai `SETUP_SUPABASE_COMPLETE.sql`
- Als 0 rows → Draai `node fetch-zwiftracing-rider.js 150437`

**Check 2**: Railway environment variables correct?
```bash
railway variables | grep VITE_SUPABASE
```
- Moet wijzen naar: `bktbeefdmrpxhsyyalvc.supabase.co`

**Check 3**: Frontend build succesvol?
```bash
railway logs --tail 50
```
- Check op TypeScript errors
- Check op fetch errors

**Check 4**: API key valid?
```bash
curl "https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/v_rider_complete?select=count" \
  -H "apikey: $(railway variables 2>&1 | grep VITE_SUPABASE_ANON_KEY -A 5 | tail -1 | awk '{print $2}')"
```

### Issue: Migrations falen

**Symptom**: Error tijdens SQL execution

**Oplossing**: Draai migrations één voor één:
1. `migrations/001_multi_source_architecture.sql`
2. `migrations/002_api_source_tables.sql`
3. `migrations/002b_add_competition_metrics.sql`
4. `migrations/003_hybrid_views.sql`
5. `migrations/005_zwiftracing_riders_table.sql`
6. `migrations/006_updated_views.sql` ← **BELANGRIJK voor v_rider_complete**

### Issue: Rider sync faalt

**Check API endpoints**:
```bash
# Test ZwiftRacing.app
curl "https://zwift-ranking.herokuapp.com/api/riders/150437"

# Test Zwift Official
curl "https://us-or-rly101.zwift.com/api/profiles/150437"
```

**Check Supabase credentials**:
```bash
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY
```

---

## Maintenance

### Daily Sync (Optioneel)

Voeg cron job toe aan Railway:
```yaml
# railway.toml
[[crons]]
schedule = "0 2 * * *"  # Elke nacht om 2:00
command = "node sync-all-riders.js"
```

### Monitor Data Freshness

```sql
-- Check laatste updates
SELECT 
  rider_id,
  full_name,
  velo_live,
  updated_at
FROM v_rider_complete
ORDER BY updated_at DESC
LIMIT 10;
```

---

## ✅ Success Criteria

1. ✅ `v_rider_complete` view bestaat in Supabase
2. ✅ Test rider (150437) heeft data
3. ✅ Dashboard toont vELO badges en power data
4. ✅ Geen TypeScript errors in Railway logs
5. ✅ Frontend gebruikt Railway environment variables
6. ✅ Geen hardcoded URLs in code

---

## Next Steps

1. **Nu**: Draai `SETUP_SUPABASE_COMPLETE.sql` in Supabase
2. **Daarna**: Sync test rider met `node fetch-zwiftracing-rider.js 150437`
3. **Verify**: Check dashboard op https://teamnl-cloud9-racing-team-production.up.railway.app/
4. **Expand**: Voeg alle team riders toe
5. **Automate**: Setup daily sync cron job

---

## Resources

- **Railway Dashboard**: https://railway.com/project/1af6fad4-ab12-41a6-a6c3-97a532905f8c
- **Supabase Dashboard**: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc
- **Live Dashboard**: https://teamnl-cloud9-racing-team-production.up.railway.app/
- **SQL Script**: `SETUP_SUPABASE_COMPLETE.sql` (78KB, all migrations)
- **Sync Script**: `fetch-zwiftracing-rider.js`
