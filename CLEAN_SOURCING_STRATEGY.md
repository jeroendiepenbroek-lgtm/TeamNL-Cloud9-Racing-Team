# 🎯 CLEAN SOURCING STRATEGIE - TeamNL Cloud9 Dashboard

**Datum:** 2 December 2025  
**Doel:** Schone, werkende data sourcing voor 4 dashboards  
**Status:** ✅ Racing Matrix werkt, 3 dashboards hebben issues

---

## 📊 HUIDIGE SITUATIE (Audit Resultaten)

### ✅ Werkend (1/4)

**1. Racing Matrix** - `riders_unified` tabel
- **Endpoint:** `GET /api/riders/team`
- **Data:** 1 rider (150437) met 19 velden
- **Status:** ✅ Volledig werkend
- **Velden:** rider_id, name, zp_category, zp_ftp, weight, race ratings, power curves

### ⚠️ Issues (3/4)

**2. Rider Dashboard** - Race results per rider
- **Endpoint:** `GET /api/results/rider/:id?days=30`
- **Status:** ❌ Error (zwift_api_race_results table leeg?)

**3. Results Dashboard** - Team results
- **Endpoint:** `GET /api/results/team/recent?days=90`
- **Status:** ⚠️ Werkt deels (5 events), maar weinig data

**4. Events Dashboard** - Upcoming events
- **Endpoint:** `GET /api/events/upcoming?hours=168`
- **Status:** ✅ Werkt (153 events)

---

## 🗂️ HUIDIGE DATABASE SCHEMA

### Core Tabellen (BEHOUDEN)

| Tabel | Doel | Status | Gebruikt door |
|-------|------|--------|---------------|
| **riders** (UI: riders_unified) | Volledige rider profiles | ✅ ACTIEF | Racing Matrix |
| **my_team_members** | Team selectie (IDs) | ✅ ACTIEF | Team Management |
| **zwift_api_events** | Events | ✅ ACTIEF | Events Dashboard |
| **zwift_api_race_results** | Race results | ⚠️ LEEG | Results/Rider Dashboard |
| **view_my_team** | JOIN riders + my_team_members | ✅ ACTIEF | Racing Matrix |

### Support Tabellen (BEHOUDEN)

- `sync_logs` - Logging
- `clubs` - Club metadata  
- `rider_history` - Historical snapshots
- `rider_personal_records` - Power PR's
- `rider_snapshots` - Daily evolution

### Legacy Tabellen (TE VERWIJDEREN)

- `event_signups_unified` → vervangen door `zwift_api_event_signups`
- `events_unified` → vervangen door `zwift_api_events`
- `race_results_unified` → vervangen door `zwift_api_race_results`
- `sync_status_unified` → vervangen door `sync_logs`
- `rider_activities` → nooit geïmplementeerd
- `rider_rating_history` → vervangen door `rider_history`
- `riders_backup_20251106` → backup (kan weg)
- `riders_backup_20251107` → backup (kan weg)

---

## 🎯 SOURCING STRATEGIE - 3 API BRONNEN

### 1️⃣ ZwiftRacing.app API (PRIMARY)

**Base URL:** `https://zwift-ranking.herokuapp.com/api`

#### Riders
- **Endpoint:** `/public/rider/<id>`
- **Rate Limit:** 5 requests/min
- **Data:** 61 velden (power, race, phenotype, handicaps)
- **Doel:** Vul `riders` tabel

#### Club Members  
- **Endpoint:** `/public/club/11818/members`
- **Rate Limit:** 1 request/60min
- **Data:** List van rider IDs
- **Doel:** Discover team members

#### Events
- **Endpoint:** `/public/events`
- **Rate Limit:** 1 request/min
- **Data:** Upcoming events
- **Doel:** Vul `zwift_api_events` tabel

#### Results
- **Endpoint:** `/public/results/<eventId>`
- **Rate Limit:** 1 request/min
- **Data:** Race results per event
- **Doel:** Vul `zwift_api_race_results` tabel

### 2️⃣ ZwiftPower.com API (SUPPLEMENTAL)

**Via ZwiftRacing proxy:** `/public/zp/<id>/...`

#### Profile
- **Endpoint:** `/public/zp/<riderId>/profile`
- **Data:** Aanvullende rider info, historical results
- **Gebruik:** Backup/verrijking

#### Event Results
- **Endpoint:** `/public/zp/<eventId>/results`
- **Data:** Gedetailleerde results met power curves
- **Gebruik:** Aanvulling op /public/results

### 3️⃣ Zwift.com API (BEPERKT)

- **Status:** Niet publiek beschikbaar zonder authenticatie
- **Gebruik:** NIET implementeren (te complex)

---

## 🔄 CLEAN SYNC FLOW

### Doel
Minimale, werkende sync die 4 dashboards voedt zonder legacy code.

### Sync Services (SIMPEL)

```typescript
// simple-sync.service.ts (BEHOUDEN - 200 regels)

1. syncRiders(clubId: 11818)
   ↓
   Fetch /public/club/11818/members → list van rider IDs
   ↓
   Voor elk rider: Fetch /public/rider/<id> (batch 50, rate limited)
   ↓
   Upsert riders tabel (61 velden pure API mapping)

2. syncEvents(hoursAhead: 168)
   ↓
   Fetch /public/events
   ↓
   Filter events binnen timeframe
   ↓
   Upsert zwift_api_events tabel

3. syncEventResults(eventIds: string[])
   ↓
   Voor elk event: Fetch /public/results/<eventId>
   ↓
   Upsert zwift_api_race_results tabel
   
4. syncRiderHistory(riderId: number)
   ↓
   Save snapshot naar rider_history tabel
```

### Manual Triggers (BEHOUDEN)

```typescript
// unified-scheduler.service.ts (BEHOUDEN - 180 regels)

POST /api/scheduler/trigger-rider   → syncRiders(11818)
POST /api/scheduler/trigger-event   → syncEvents(168)
POST /api/scheduler/trigger-results → syncEventResults([...])
GET  /api/scheduler/status           → timestamps
```

---

## 📋 DASHBOARD → DATA MAPPING

### 1. Racing Matrix

**Endpoint:** `GET /api/riders/team`  
**Data Source:** `view_my_team` (JOIN my_team_members + riders)  
**Velden:**
- Rider info: rider_id, name, weight, zp_category, zp_ftp
- vELO: race_last_rating, race_max30_rating
- Stats: race_wins, race_podiums, race_finishes
- Power: power_w5, power_w15, power_w30, power_w60, power_w120, power_w300, power_w1200

**Status:** ✅ Werkt perfect

### 2. Rider Dashboard

**Endpoint:** `GET /api/results/rider/:id?days=30`  
**Data Source:** `zwift_api_race_results` tabel  
**Probleem:** ❌ Tabel is leeg - geen results gesynchroniseerd

**Fix nodig:**
1. Trigger results sync voor events waar rider in heeft geraced
2. Of: Haal historical results op via ZwiftPower `/public/zp/<riderId>/profile`

### 3. Results Dashboard

**Endpoint:** `GET /api/results/team/recent?days=90`  
**Data Source:** `zwift_api_race_results` (JOIN riders)  
**Status:** ⚠️ Weinig data (5 events)

**Fix nodig:**
1. Sync meer historical results
2. Run sync voor events uit zwift_api_events tabel

### 4. Events Dashboard

**Endpoint:** `GET /api/events/upcoming?hours=168`  
**Data Source:** `zwift_api_events` tabel  
**Status:** ✅ Werkt (153 events)

---

## 🧹 CLEANUP PLAN

### Stap 1: Verwijder Legacy Tabellen (SAFE)

```sql
-- Legacy unified tables (vervangen door zwift_api_*)
DROP TABLE IF EXISTS event_signups_unified CASCADE;
DROP TABLE IF EXISTS events_unified CASCADE;
DROP TABLE IF EXISTS race_results_unified CASCADE;
DROP TABLE IF EXISTS sync_status_unified CASCADE;

-- Niet-geïmplementeerde features
DROP TABLE IF EXISTS rider_activities CASCADE;

-- Deprecated
DROP TABLE IF EXISTS rider_rating_history CASCADE;

-- Backups
DROP TABLE IF EXISTS riders_backup_20251106 CASCADE;
DROP TABLE IF EXISTS riders_backup_20251107 CASCADE;
```

**Impact:** ZERO - Geen code gebruikt deze

### Stap 2: Cleanup Code (Backend)

**Verwijder oude sync services:**
- `sync-coordinator.service.ts` - stub (3 methods)
- `sync-config.service.ts` - stub (config only)

**Behoud:**
- `simple-sync.service.ts` - Core sync logic ✅
- `unified-scheduler.service.ts` - Manual triggers ✅
- `supabase.service.ts` - Database access ✅

### Stap 3: Fix Missing Data

**Priority 1:** Sync results voor dashboard 2 & 3
```typescript
// Get events waar team members in hebben geraced
const teamEvents = await getEventsWithTeamMembers();

// Sync results voor deze events
await syncEventResults(teamEvents.map(e => e.event_id));
```

---

## ✅ ACTIEPLAN

### Fase 1: Cleanup (30 min)
1. [ ] Drop 8 legacy tabellen via migration
2. [ ] Verwijder sync-coordinator.service.ts
3. [ ] Verwijder sync-config.service.ts
4. [ ] Test: Racing Matrix blijft werken

### Fase 2: Fix Data (1 uur)
1. [ ] Sync historical results voor rider 150437
2. [ ] Sync results voor laatste 10 team events
3. [ ] Test: Alle 4 dashboards tonen data

### Fase 3: Documentatie (30 min)
1. [ ] Update API docs met clean endpoints
2. [ ] Document sourcing flow
3. [ ] Cleanup oude MD files

---

## 🎯 EINDRESULTAAT

**Voor Cleanup:**
- 17 tabellen (8 legacy)
- 3 sync services (2 stubs)
- 4/4 dashboards (1 werkt perfect, 3 issues)

**Na Cleanup:**
- 9 tabellen (alleen actieve)
- 2 sync services (beide functioneel)
- 4/4 dashboards (allemaal werkend)

**Voordeel:**
- Simpeler codebase
- Minder verwarring
- Alle dashboards voeden

---

## 📊 API RATE LIMITS (SAMENVATTING)

| Endpoint | Rate Limit | Sync Frequentie |
|----------|-----------|-----------------|
| /public/rider/<id> | 5/min | On-demand + daily |
| /public/club/<id>/members | 1/60min | Daily |
| /public/events | 1/min | Hourly |
| /public/results/<eventId> | 1/min | After event |

**Aanbeveling:** 
- Riders: On-demand sync bij add to team + nightly refresh
- Events: Hourly sync (nieuwe events detecteren)
- Results: Sync na event completion (event_date < now)
