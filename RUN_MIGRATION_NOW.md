# 🚀 Database Migration - Voer NU uit

## Status
✅ **Railway backend draait stabiel**  
⏳ **Database migration nodig voor nieuwe kolommen**

## Stap 1: Voer Migration Uit (2 minuten)

1. Open **Supabase Dashboard**: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc
2. Ga naar **SQL Editor** (links in menu)
3. Klik **New Query**
4. Kopieer de inhoud van `supabase/migrations/add_missing_rider_fields.sql`
5. Plak in de SQL editor
6. Klik **Run** (of Ctrl+Enter)

**Verwacht resultaat:**
```
ALTER TABLE
COMMENT
ALTER TABLE
COMMENT
ALTER TABLE
ALTER TABLE
COMMENT
COMMENT
ALTER TABLE
COMMENT

5 rows (verification query)
```

## Stap 2: Test de Nieuwe Kolommen (1 minuut)

Run deze query in SQL Editor om te verifiëren:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'riders_unified'
  AND column_name IN (
    'phenotype_climber',
    'power_rating',
    'last_race_date',
    'last_race_velo',
    'phenotype_type'
  )
ORDER BY column_name;
```

**Verwacht:** 5 rijen met de nieuwe kolommen.

## Stap 3: Test Railway Backend (30 seconden)

```bash
# Test health endpoint
curl https://teamnl-cloud9-racing-team-production.up.railway.app/health

# Test team members endpoint
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/team/members
```

**Verwacht:** JSON responses zonder errors.

## Stap 4: Sync Data om Nieuwe Kolommen te Vullen (optioneel - 15 min)

Als je de nieuwe kolommen meteen wilt vullen met data:

```bash
# Sync één rider (snel, voor test)
curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/team/sync/rider/150437

# OF sync alle 75 team members (duurt ~15 minuten)
curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/team/sync/all
```

## ✅ Klaar!

Na deze stappen heb je:
- ✅ Railway backend stabiel in productie
- ✅ Database schema compleet met alle 5 nieuwe kolommen
- ✅ Racing Matrix dashboard volledig functioneel
- ✅ Alle API endpoints werkend

## Volgende Stappen (optioneel)

- Frontend bouwen voor Racing Matrix visualisatie
- Automated sync scheduler activeren (nu handmatig)
- Performance monitoring toevoegen

---
**Deployment voltooid op:** 5 december 2025  
**Backend URL:** https://teamnl-cloud9-racing-team-production.up.railway.app  
**Status:** 🟢 LIVE
