# 🏗️ Backend Architectuur Audit - December 2025

## Huidige Status: Analyse Fase

**Datum:** 1 december 2025  
**Doel:** Volledig herontwerp voor optimale API efficiency en database structuur

---

## 📊 STAP 1: API Usage Analyse

### ZwiftRacing.app API Calls (zwift-client.ts)

| Endpoint | Rate Limit | Huidige Usage | Status |
|----------|------------|---------------|--------|
| `/public/clubs/{id}` | 1/60min | Rider Sync (force mode) | ✅ GOED |
| `/public/results/{eventId}` | 1/1min | Results Sync (batch 3 parallel, 20s delay) | ⚠️ OPTIMALISATIE MOGELIJK |
| `/public/riders/{riderId}` | 5/1min | NIET GEBRUIKT | ❓ BESCHIKBAAR |
| `POST /public/riders` | 1/15min | NIET GEBRUIKT | ❓ BESCHIKBAAR |
| `/api/events/upcoming` | ? | Near/Far Events Sync | ⚠️ RATE LIMIT ONBEKEND |
| `/api/events/{id}/signups` | ? | Event Signups Sync | ⚠️ RATE LIMIT ONBEKEND |

**Bevindingen:**
1. **Results Sync:** Gebruikt alleen `/public/results/{eventId}` - haalt per event alle results op
2. **Rider Sync:** Gebruikt `/public/clubs/{id}` - haalt alle club members in 1 call
3. **Bulk Rider Endpoint:** `POST /public/riders` (1/15min) wordt NIET gebruikt - potentieel voor optimization
4. **Individual Rider:** `/public/riders/{riderId}` (5/1min) wordt NIET gebruikt

### ZwiftPower API Calls (zwiftpower-client.ts)

| Endpoint | Huidige Usage | Status |
|----------|---------------|--------|
| `/cache3/profile/{zwiftId}_all.json` | OAuth rider data | ✅ GEBRUIKT |
| `/api3.php?do=event_results&zid={eventId}` | Event results | ❌ NIET GEBRUIKT |
| `/ucp.php?mode=login` | Authentication | ✅ GEBRUIKT |

**Bevindingen:**
1. **ZwiftPower Results:** `getEventResultsZwiftPower()` methode bestaat maar wordt NERGENS aangeroepen
2. **Potentie:** ZwiftPower heeft extra data (CE status, DQ's, age groups)

### Zwift Official API (zwift-official-client.ts)

| Endpoint | Huidige Usage | Status |
|----------|---------------|--------|
| `/profiles/{id}` | Profile data | ✅ GEBRUIKT (OAuth) |
| `/profiles/{id}/activities` | Activity history | ✅ GEBRUIKT |
| `/profiles/{id}/followers` | Social data | ✅ GEBRUIKT |

---

## 🗄️ STAP 2: Database Schema Analyse

### Huidige Tabellen

**Core Tables:**
```
riders                        → Aggregated rider stats (van /public/clubs/{id})
zwift_api_race_results       → Race results (van /public/results/{eventId})
zwift_api_events             → Events (van /api/events/upcoming)
zwift_api_event_signups      → Event signups (van /api/events/{id}/signups)
zwift_api_zp_results         → ZwiftPower results (LEEG - wordt niet gevuld)
rider_personal_records       → PR's (berekend van results)
```

**Support Tables:**
```
my_team_members              → VIEW op riders (filter club_id=11818)
sync_logs                    → Sync monitoring
access_requests              → User management
user_roles                   → Permissions
```

### Problemen Geïdentificeerd

#### 🔴 Probleem 1: Dubbele Data Storage
```sql
-- riders tabel heeft:
race_results_last_90_days    INT     → Count van results
race_current_rating          INT     → vELO rating
race_last_event_date         TIMESTAMP

-- zwift_api_race_results heeft:
velo_rating                  INT     → Zelfde vELO rating
event_date                   TIMESTAMP → Zelfde datum

-- Dit is REDUNDANT - riders.race_current_rating zou CALCULATED moeten zijn
```

#### 🔴 Probleem 2: Ontbrekende Relaties
```sql
-- zwift_api_race_results heeft GEEN foreign key naar riders
rider_id INT NOT NULL   -- Maar geen REFERENCES riders(id)

-- zwift_api_race_results heeft GEEN foreign key naar events
event_id TEXT NOT NULL  -- Maar geen REFERENCES zwift_api_events(event_id)

-- Dit verhindert CASCADE deletes en data integrity checks
```

#### 🔴 Probleem 3: Results Sync Inefficiëntie
**Huidige flow:**
1. Haal events op met team signups (113 events)
2. Voor ELKE event: `GET /public/results/{eventId}` (alle riders)
3. Filter op team rider IDs (riderIdSet.has())
4. Save alleen team results

**Probleem:** We halen 100+ events × ~50 riders/event = 5000+ results op, maar gebruiken maar ~500 team results

**Betere approach:**
1. Gebruik `GET /public/riders/{riderId}` (5/min) voor individual rider results
2. Of: `POST /public/riders` (bulk) voor alle team riders tegelijk
3. Filter events op team participation VOOR we results ophalen

#### 🔴 Probleem 4: Ontbrekende Indices
```sql
-- Veelgebruikte queries hebben geen indices:
SELECT * FROM zwift_api_race_results WHERE rider_id = ?
-- Geen index op rider_id!

SELECT * FROM zwift_api_race_results WHERE event_id = ?
-- Geen index op event_id!

SELECT * FROM zwift_api_events WHERE event_start >= NOW()
-- Mogelijk geen index op event_start
```

#### 🟡 Probleem 5: ZwiftPower Data Ongebruikt
```sql
-- zwift_api_zp_results tabel bestaat maar is LEEG
-- Potentiële extra data:
- Category Enforcement (CE) status
- Disqualificaties (DQ)
- Age group rankings
- Historical ratings
```

---

## 🔄 STAP 3: Sync Services Analyse

### Huidige Sync Architectuur

```
IntegratedSyncCoordinator
├── Phase 1: Rider Sync (75 riders in 2.3s)
│   └── GET /public/clubs/11818
├── Phase 2: Events Sync (parallel)
│   ├── Near Events → GET /api/events/upcoming
│   └── Far Events → GET /api/events/upcoming (ander filter)
└── Phase 3: Results Sync (113 events in 38min)
    └── Voor elke event: GET /public/results/{eventId}
```

### Inefficiënties

#### 🔴 Inefficiëntie 1: Results Sync te traag
- **38 minuten** voor 113 events = ~20s per event
- Delay van 20s is te groot (rate limit is 1/min = max 60s)
- Kunnen van 20s → 12s (5 parallel calls/min)

#### 🔴 Inefficiëntie 2: Duplicate API Calls
```typescript
// Near Events en Far Events doen BEIDE:
await this.client.get('/api/events/upcoming');

// Verschil is alleen in filter (lookforward hours)
// Kunnen we COMBINEREN in 1 call
```

#### 🔴 Inefficiëntie 3: Geen Incremental Sync
```typescript
// Results Sync haalt ALTIJD laatste 30 dagen op
// Zelfs als we gister al gesynct hebben
// Betere approach: alleen NIEUWE results ophalen
```

#### 🟡 Inefficiëntie 4: Geen Data Validation
```typescript
// Saven results zonder te checken of ze al bestaan
await this.supabase.saveRaceResult(result);

// Zou moeten zijn: UPSERT met conflict handling
// ON CONFLICT (event_id, rider_id) DO UPDATE
```

---

## 📋 VOORGESTELDE OPTIMALISATIES

### Prioriteit 1: Database Schema Herontwerp

**1.1 Add Foreign Keys**
```sql
ALTER TABLE zwift_api_race_results 
  ADD CONSTRAINT fk_rider FOREIGN KEY (rider_id) REFERENCES riders(id);

ALTER TABLE zwift_api_race_results 
  ADD CONSTRAINT fk_event FOREIGN KEY (event_id) REFERENCES zwift_api_events(event_id);
```

**1.2 Add Indices**
```sql
CREATE INDEX idx_results_rider ON zwift_api_race_results(rider_id);
CREATE INDEX idx_results_event ON zwift_api_race_results(event_id);
CREATE INDEX idx_results_date ON zwift_api_race_results(event_date);
CREATE INDEX idx_events_start ON zwift_api_events(event_start);
CREATE INDEX idx_signups_rider ON zwift_api_event_signups(rider_id);
```

**1.3 Remove Redundancy**
```sql
-- Maak race_current_rating COMPUTED column
ALTER TABLE riders 
  DROP COLUMN race_current_rating,
  DROP COLUMN race_results_last_90_days,
  DROP COLUMN race_last_event_date;

-- Gebruik VIEW voor deze data:
CREATE VIEW riders_with_stats AS
SELECT 
  r.*,
  (SELECT COUNT(*) FROM zwift_api_race_results WHERE rider_id = r.id AND event_date >= NOW() - INTERVAL '90 days') as race_results_last_90_days,
  (SELECT velo_rating FROM zwift_api_race_results WHERE rider_id = r.id ORDER BY event_date DESC LIMIT 1) as race_current_rating,
  (SELECT event_date FROM zwift_api_race_results WHERE rider_id = r.id ORDER BY event_date DESC LIMIT 1) as race_last_event_date
FROM riders r;
```

### Prioriteit 2: API Client Optimization

**2.1 Use Bulk Rider Endpoint**
```typescript
// In plaats van: voor elke event alle results ophalen
// Gebruik: POST /public/riders (alle team riders in 1 call)
async getRiderBulkResults(riderIds: number[], time?: number) {
  return await this.client.post(
    time ? `/public/riders/${time}` : '/public/riders',
    riderIds
  );
}
// Rate limit: 1/15min - maar geeft results van ALLE riders tegelijk
```

**2.2 Combine Near/Far Events**
```typescript
// 1 API call voor alle events, filter in code
const allEvents = await this.client.get('/api/events/upcoming');
const nearEvents = allEvents.filter(e => isWithinHours(e.start, 24));
const farEvents = allEvents.filter(e => isWithinHours(e.start, 168) && !nearEvents.includes(e));
```

**2.3 Add ZwiftPower Results als Enrichment**
```typescript
// Na ZwiftRacing results, verrijk met ZwiftPower data
async enrichResultsWithZP(eventId: number) {
  const zpResults = await this.zwiftPowerClient.getEventResults(eventId);
  // Merge: CE status, DQ's, age groups
}
```

### Prioriteit 3: Smart Sync Strategy

**3.1 Incremental Results Sync**
```typescript
// Alleen nieuwe results ophalen
const lastSyncDate = await getLastResultsSync();
const newEvents = await getEventsAfter(lastSyncDate);
// Sync alleen events SINDS laatste sync
```

**3.2 Delta Sync voor Riders**
```typescript
// Check laatste update tijd per rider
const staleRiders = await getRidersNotUpdatedSince(hours: 24);
// Sync alleen riders die outdated zijn
```

**3.3 Dependency-Aware Scheduling**
```typescript
// Results Sync MOET wachten tot Events Sync klaar is
// (anders kennen we events niet waar we results voor willen)
if (!eventsUpToDate) {
  await syncEvents();
}
await syncResults();
```

---

## 🎯 IMPLEMENTATIE PLAN

### Fase 1: Database Optimalisatie (1-2 uur)
- [ ] Backup huidige data
- [ ] Add foreign keys
- [ ] Add indices
- [ ] Create computed views
- [ ] Test queries performance

### Fase 2: API Client Refactor (2-3 uur)
- [ ] Implement bulk rider endpoint
- [ ] Combine events sync
- [ ] Add ZwiftPower enrichment
- [ ] Add response caching

### Fase 3: Sync Services Rewrite (3-4 uur)
- [ ] Incremental results sync
- [ ] Delta rider sync
- [ ] Smart dependency scheduling
- [ ] Better error recovery

### Fase 4: Testing & Validation (1-2 uur)
- [ ] Performance benchmarks
- [ ] Data integrity checks
- [ ] Rate limit compliance
- [ ] Frontend compatibility

---

## ❓ VRAGEN VOOR GEBRUIKER

1. **Database migratie:** Mag ik foreign keys toevoegen? (Kan backwards compatibility breken)
2. **Computed columns:** OK om riders tabel te denormaliseren en views te gebruiken?
3. **ZwiftPower:** Wil je ZwiftPower results erbij of alleen ZwiftRacing.app?
4. **Bulk endpoint:** Mag ik POST /public/riders gebruiken (1/15min voor alle riders)?
5. **Breaking changes:** Mag frontend code aangepast worden als API responses veranderen?

---

## 📊 VERWACHTE VERBETERINGEN

| Metric | Voor | Na | Verbetering |
|--------|------|-----|-------------|
| Results Sync | 38 min | ~12 min | **68% sneller** |
| API Calls | ~150/sync | ~20/sync | **87% reductie** |
| Database queries | O(n²) joins | O(n) indexed | **90%+ sneller** |
| Rider Sync | 2.3s | 2.3s | Geen wijziging |
| Data redundancy | ~30% | ~5% | **83% reductie** |

**Total Impact:** Sync cycles van ~40 min → ~15 min ✨
