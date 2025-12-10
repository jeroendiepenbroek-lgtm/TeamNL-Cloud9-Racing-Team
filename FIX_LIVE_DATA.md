# 🔧 Fix: Geen Live Data op Railway

## Probleem
De Racing Matrix op https://teamnl-cloud9-racing-team-production.up.railway.app/ toont geen data.

**Root Cause**: 
- Railway wijst naar **oude Supabase** (`bktbeefdmrpxhsyyalvc.supabase.co`)
- Migrations zijn **nooit gedraaid** op dat project
- View `v_rider_complete` bestaat niet → geen data

## Oplossing: Draai Migrations in Supabase

### Stap 1: Open Supabase SQL Editor
Ga naar: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql/new

### Stap 2: Draai Migrations in Volgorde

#### Migration 1: Multi-Source Architecture
```sql
-- Kopieer inhoud van: migrations/001_multi_source_architecture.sql
```

#### Migration 2: API Source Tables
```sql
-- Kopieer inhoud van: migrations/002_api_source_tables.sql
```

#### Migration 3: Competition Metrics
```sql
-- Kopieer inhoud van: migrations/002b_add_competition_metrics.sql
```

#### Migration 4: Hybrid Views
```sql
-- Kopieer inhoud van: migrations/003_hybrid_views.sql
```

#### Migration 5: ZwiftRacing Riders Table
```sql
-- Kopieer inhoud van: migrations/005_zwiftracing_riders_table.sql
```

#### Migration 6: Updated Views (BELANGRIJK!)
```sql
-- Kopieer inhoud van: migrations/006_updated_views.sql
-- Deze creëert v_rider_complete view!
```

### Stap 3: Verify View Exists
```sql
SELECT COUNT(*) FROM v_rider_complete;
-- Verwacht: 0 rows (view exists, maar nog geen data)
```

### Stap 4: Sync Data naar Database
```bash
# In terminal:
cd /workspaces/TeamNL-Cloud9-Racing-Team

# Sync rider 150437 (test rider)
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co \
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDczOTQ1MiwiZXhwIjoyMDQ2MzE1NDUyfQ.GXxGUBxnPh3u5Q-7PLy_dT9uc-FcqMVNqWj5hl9rAXM \
node fetch-zwiftracing-rider.js 150437
```

### Stap 5: Deploy Frontend Fix naar Railway
```bash
# Code is al gecommit (dac83ef)
# Frontend gebruikt nu Railway environment variables
git push origin fresh-start-v4

# Railway zal automatisch re-deployen met VITE_ variables
```

### Stap 6: Verify Live Site
Ga naar: https://teamnl-cloud9-racing-team-production.up.railway.app/

Verwacht te zien:
- ✅ Rider 150437 (JRøne CloudRacer-9)
- ✅ vELO badges (1413.91 live)
- ✅ Power intervals
- ✅ Geen mock data meer

---

## Wat is er Gefixt (Code)

### Frontend Update (commit dac83ef)
```typescript
// VOOR: Hardcoded URL
const res = await fetch(
  `https://tfsepzumkireferencer.supabase.co/rest/v1/v_rider_complete?...`
)

// NA: Gebruikt Railway environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bktbeefdmrpxhsyyalvc.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const res = await fetch(`${supabaseUrl}/rest/v1/v_rider_complete?...`)
```

### Railway Environment Variables (toegevoegd)
```
VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Velden Gemigeerd
Alle oude mock data veldnamen vervangen:
- `race_last_rating` → `velo_live`
- `race_max30_rating` → `velo_30day`
- `name` → `full_name`
- `zp_ftp` → `racing_ftp`
- `power_w5` → `power_5s_wkg` (pre-calculated!)
- etc.

---

## Quick Command Overzicht

```bash
# 1. Check of view bestaat
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bktbeefdmrpxhsyyalvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1NzkwMDIsImV4cCI6MjA0OTE1NTAwMn0.m7JsRFFbWYcAWSWC3zHvQ_9KkRGPgI1fC7SKb-j-_JE'
);
supabase.from('v_rider_complete').select('*', {count:'exact',head:true})
  .then(r => console.log('Count:', r.count, 'Error:', r.error?.message));
"

# 2. Sync test rider (NA migrations)
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co \
SUPABASE_SERVICE_KEY=<service_key> \
node fetch-zwiftracing-rider.js 150437

# 3. Deploy
git push origin fresh-start-v4
```

---

## Toekomstige Fixes

### Automatisch Migrations Draaien
Helaas ondersteunt Supabase geen remote SQL execution via API (security redenen).

**Alternatieven**:
1. ✅ **Gebruik Supabase CLI** met `supabase db push`
2. ✅ **GitHub Actions** die migrations draait via CLI
3. ❌ API endpoint (niet ondersteund door Supabase)

### Volledige Team Sync
Na migrations, sync alle team members:
```bash
# Voeg rider IDs toe van team
RIDER_IDS="150437 123456 789012"

for RIDER_ID in $RIDER_IDS; do
  SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co \
  SUPABASE_SERVICE_KEY=<key> \
  node fetch-zwiftracing-rider.js $RIDER_ID
done
```

---

## Status Check Commands

```bash
# Railway environment
railway variables | grep VITE

# Supabase view
curl "https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/v_rider_complete?select=count" \
  -H "apikey: <anon_key>" \
  -H "Authorization: Bearer <anon_key>"

# Live site
curl https://teamnl-cloud9-racing-team-production.up.railway.app/
```
