# Sync V2 Fixes - Actie Vereist

## ✅ Opgelost (Automatisch)

### 1. Power Intervals Nu Volledig Gemapped
**Was**: Alleen weight, height, FTP, vELO werden gesynchroniseerd  
**Nu**: Alle 17 power velden worden gesynchroniseerd:

**W/kg intervals** (5s, 15s, 30s, 1m, 2m, 5m, 20m):
- power_wkg5, power_wkg15, power_wkg30, power_wkg60, power_wkg120, power_wkg300, power_wkg1200

**Absolute Watts intervals**:
- power_w5, power_w15, power_w30, power_w60, power_w120, power_w300, power_w1200

**Critical Power**:
- power_cp (Critical Power)
- power_awc (Anaerobic Work Capacity)

**Effect**: Volgende rider sync (binnen 60 min) vult alle power data voor je 75 team members.

---

### 2. Sync Timing Gecorrigeerd
**Was**: Rider sync draaide om de **90 minuten** (16x per dag)  
**Nu**: Rider sync draait **elk uur** (24x per dag)

**Cron expressie**: `'0 * * * *'` = elke hele uur (00:00, 01:00, 02:00, etc.)

**Rate limit veiligheid**:
- API limit: 1 call per 15 min
- Ons interval: 60 min
- Safety margin: 4x ✅

**Effect**: Data is nu maximaal 60 minuten oud (was 90 min).

---

## ⚠️ Handmatige Actie Vereist

### 3. Riders Tabel Opschonen (455 → 75 riders)

**Probleem**: 
- Je `riders` tabel bevat 455+ riders (legacy club sync)
- Je `my_team_members` bevat slechts 75 riders
- Sync V2 werkt correct (alleen jouw 75 riders), maar oude data blijft staan

**Oplossing - Run in Supabase SQL Editor**:

```sql
-- STAP 1: Check huidige situatie
SELECT 
  'my_team_members' as table_name,
  COUNT(*) as rider_count
FROM my_team_members
UNION ALL
SELECT 
  'riders' as table_name,
  COUNT(*) as rider_count
FROM riders;

-- STAP 2: Verwijder alle riders die NIET in my_team_members staan
DELETE FROM riders 
WHERE rider_id NOT IN (
  SELECT rider_id FROM my_team_members
);

-- STAP 3: Verificatie (zou 75 moeten zijn)
SELECT COUNT(*) as rider_count FROM riders;
SELECT COUNT(*) as team_count FROM my_team_members;
SELECT COUNT(*) as view_count FROM view_my_team;
```

**Complete script**: `supabase/CLEANUP_ORPHANED_RIDERS.sql`

**Na cleanup**:
- ✅ `riders` tabel: 75 riders (alleen jouw team)
- ✅ `my_team_members`: 75 riders
- ✅ `view_my_team`: 75 riders

---

## 📊 Verificatie Na Volgende Sync

### Check Power Data (Na ~60 min)
```sql
-- Check rider 150437 power intervals
SELECT 
  rider_id,
  name,
  -- W/kg
  power_wkg5 as "5s w/kg",
  power_wkg15 as "15s w/kg",
  power_wkg30 as "30s w/kg",
  power_wkg60 as "1m w/kg",
  power_wkg120 as "2m w/kg",
  power_wkg300 as "5m w/kg",
  power_wkg1200 as "20m w/kg",
  -- Watts
  power_w5 as "5s W",
  power_w15 as "15s W",
  power_w30 as "30s W",
  power_w60 as "1m W",
  power_w120 as "2m W",
  power_w300 as "5m W",
  power_w1200 as "20m W",
  -- Critical Power
  power_cp as "CP",
  power_awc as "AWC",
  last_synced
FROM riders
WHERE rider_id = 150437;
```

Alle power velden moeten nu gevuld zijn (niet NULL).

### Check Sync Logs
```sql
-- Check laatste rider syncs
SELECT 
  endpoint,
  status,
  records_processed,
  created_at,
  error_message
FROM sync_logs
WHERE endpoint = 'RIDER_SYNC'
ORDER BY created_at DESC
LIMIT 5;
```

Je zou elke 60 minuten een nieuwe sync moeten zien.

---

## 📈 Impact Op Dashboards

### Results Dashboard
- ✅ Complete power curves zichtbaar (7 intervals)
- ✅ Accurate W/kg berekeningen
- ✅ Alleen jouw 75 team members (na cleanup)

### Team Dashboard
- ✅ Power profiles per rider
- ✅ Sprint vs Climber analyse mogelijk
- ✅ Critical Power metrics

### Rider Profiles
- ✅ Volledige power curve grafieken
- ✅ Historical power tracking
- ✅ 5s, 15s, 30s, 1m, 2m, 5m, 20m intervals

---

## 🔄 Volgende Sync

**Verwacht**: Binnen 60 minuten
- Sync draait elk heel uur (xx:00)
- Als het nu 14:23 is, volgende sync = 15:00
- Check logs: `[CRON] Rider Sync (PRIORITY 1) triggered at [time]`

**Wat gebeurt er**:
1. Haalt 75 rider IDs uit `my_team_members`
2. Bulk API call naar ZwiftRacing voor rider data
3. Mapt ALLE 17 power velden + physical attributes
4. Upsert naar `riders` tabel
5. Log naar `sync_logs`

---

## ✅ Checklist

- [x] Power intervals mapping toegevoegd (17 velden)
- [x] Sync timing gecorrigeerd (60 min)
- [ ] **TODO**: Run cleanup script in Supabase (orphaned riders verwijderen)
- [ ] Wacht op volgende sync (max 60 min)
- [ ] Verificeer power data in database
- [ ] Test Results Dashboard met complete power curves

---

## 📝 Files

- ✅ `backend/src/services/sync-v2.service.ts` - Power mapping
- ✅ `backend/src/server.ts` - Timing fix (60 min)
- ⏳ `supabase/CLEANUP_ORPHANED_RIDERS.sql` - **RUN THIS!**
- 📖 `docs/SYNC_V2_ISSUES_ANALYSIS.md` - Volledige analyse

**Commit**: `6ef0d73` - fix(sync-v2): Add power intervals mapping + fix timing to 60min
