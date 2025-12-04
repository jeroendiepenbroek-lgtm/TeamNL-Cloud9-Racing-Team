# ⚠️ BASIS FUNCTIONALITEIT CHECK - 4 december 2025

**POC Rider**: 150437 (JRøne CloudRacer-9 - Admin)

---

## ✅ WAT WERKT

### 1. Results Ophalen ✅ **VOLLEDIG WERKEND**

**Functionaliteit**: Database query voor race results van RiderID 150437

```typescript
const { data } = await supabase.client
  .from('zwift_api_race_results')
  .eq('rider_id', 150437)
  .order('event_date', { ascending: false });
```

**Status**: ✅ **30 race results gevonden**

**Data kwaliteit**:
- Range: 28 augustus 2025 - 30 november 2025
- Laatste race: Event 5229579 (30-11-2025, positie 5)
- Velden beschikbaar: event_id, event_name, rank, time, avg_wkg, velo_rating, power curve
- ⚠️ 2 events (5229579, 5206710) hebben minimale data (geen event_name, date=null)

**API Endpoint**: `GET /api/results/rider/150437?days=90` ✅ Beschikbaar

**Conclusie**: **VOLLEDIG OPERATIONEEL** - Results kunnen opgehaald en getoond worden

---

## ❌ WAT WERKT NIET

### 2. Sign-ups Ophalen ❌ **NIET WERKEND**

**Probleem**: Tabel `event_signups` **bestaat NIET** in database

```sql
ERROR: Could not find the table 'public.event_signups' in the schema cache
```

**Impact**:
- ❌ Kan NIET zien voor welke events rider 150437 staat ingeschreven
- ❌ Dashboard "Mijn Inschrijvingen" zal leeg zijn
- ❌ Kan NIET filteren op "events waar ik al voor ingeschreven ben"

**Oplossing vereist**:
```sql
CREATE TABLE event_signups (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  category TEXT,
  status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, waitlist
  UNIQUE(event_id, rider_id)
);

-- Index for queries
CREATE INDEX idx_event_signups_rider ON event_signups(rider_id);
CREATE INDEX idx_event_signups_event ON event_signups(event_id);
```

**Alternatieven**:
1. Handmatig sign-ups bijhouden in spreadsheet
2. Import van Zwift Companion app
3. Sync via externe API (als beschikbaar)

---

### 3. Toekomstige Events ❌ **GEEN DATA**

**Probleem**: Events tabel bevat **GEEN toekomstige events**

**Bevindingen**:
```
Current date: 2025-12-04 16:18:55 UTC
Latest event:  2025-12-04 09:24:01 UTC (5229579) ← 7 uur geleden!
Future events: 0
```

**Database status**:
- Totaal events: 1821
- Alle events: **VERLEDEN** (laatste was vanochtend 9:24)
- Geen events na 4 december 2025 16:00

**Impact**:
- ❌ Events Dashboard kan GEEN toekomstige races tonen
- ❌ Gebruiker kan NIET inschrijven voor aankomende events
- ❌ Kan NIET zien wat er op de planning staat

**Oplossing vereist**:
1. Sync toekomstige events via ZwiftRacing.app API
2. Endpoint: `/public/event-feed` of `/public/events`
3. Filter op `time_unix > now()`
4. Run dagelijks/wekelijks

**Code voorbeeld**:
```typescript
// Sync future events (7 dagen vooruit)
const now = Math.floor(Date.now() / 1000);
const sevenDaysLater = now + (7 * 24 * 60 * 60);

const events = await zwiftClient.getEventFeed();
const futureEvents = events.filter(e => e.time >= now && e.time <= sevenDaysLater);

await supabase.client
  .from('zwift_api_events')
  .upsert(futureEvents);
```

---

## 📊 SAMENVATTING ABSOLUTE BASIS

### ✅ Werkend (1/3)
1. **Results ophalen voor rider** ✅ 
   - 30 races beschikbaar
   - API endpoint werkend
   - Data kwaliteit goed (behalve 2 events)

### ❌ Niet Werkend (2/3)
2. **Sign-ups ophalen** ❌
   - Tabel bestaat niet
   - Geen data beschikbaar
   - Functionaliteit geblokkeerd

3. **Toekomstige events tonen** ❌
   - Geen toekomstige data in database
   - Laatste event 7 uur geleden
   - Inschrijven niet mogelijk

---

## 🚨 KRITIEKE BLOKKADES

### Blokkade #1: Event Signups Tabel
**Prioriteit**: 🔴 HOOG

**Zonder deze tabel**:
- Geen inschrijvingen tracking
- Geen "Mijn Events" overzicht
- Geen filtering op "beschikbare events"

**Actie**: Maak tabel aan + voeg signup endpoint toe

---

### Blokkade #2: Geen Toekomstige Events
**Prioriteit**: 🔴 HOOG

**Zonder toekomstige events**:
- Events Dashboard is leeg/verouderd
- Geen inschrijven mogelijk
- Gebruiker ziet niet wat er aankomt

**Actie**: Sync event feed voor komende 7-30 dagen

---

## ✅ VEREISTEN VOOR VOLLEDIGE BASIS

### Minimaal vereist om te functioneren:

1. **event_signups tabel** (nu: MISSING)
   - Schema definitie
   - Indexes
   - API endpoints (POST/DELETE signup)

2. **Toekomstige events data** (nu: NONE)
   - Sync events voor komende 7 dagen
   - Daily/weekly refresh
   - API endpoint voor event feed

3. **Signup functionaliteit** (nu: N/A)
   - POST /api/events/:eventId/signup
   - DELETE /api/events/:eventId/signup
   - GET /api/riders/:riderId/signups

### Nice-to-have:
- Event details enrichment (route info, profiles)
- Notification bij nieuwe events
- Conflict detection (overlapping events)

---

## 🎯 AANBEVOLEN ACTIEPLAN

### Stap 1: Maak event_signups tabel (15 min)
```sql
-- Run in Supabase SQL Editor
CREATE TABLE event_signups (...);
-- Seed met test data voor rider 150437
INSERT INTO event_signups (event_id, rider_id, category)
VALUES ('5229579', 150437, 'C');
```

### Stap 2: Sync toekomstige events (30 min)
```bash
# Maak sync script
cd backend
npx tsx scripts/sync-future-events.ts

# Verify
npx tsx check-future-events.ts
# Expected: 50+ events voor komende week
```

### Stap 3: Test volledige flow (15 min)
```bash
# Re-run basis test
npx tsx test-basis-functionaliteit.ts

# Expected output:
# ✅ Results ophalen: 30 races
# ✅ Sign-ups ophalen: 1+ signups
# ✅ Toekomstige events: 50+ events
```

### Stap 4: API endpoints (60 min)
- POST /api/events/:eventId/signup
- DELETE /api/events/:eventId/signup/:riderId
- GET /api/riders/:riderId/signups (with join to events)

---

## 📝 CONCLUSIE

**Huidige status**: ⚠️ **33% WERKEND** (1 van 3 basis functies)

**Blokkerende issues**: 2 kritiek
1. event_signups tabel ontbreekt
2. Geen toekomstige events data

**Tijd nodig om volledig werkend te krijgen**: ~2 uur
- 30 min: Database setup (tabel + seed data)
- 30 min: Events sync script
- 60 min: API endpoints + testing

**Na deze fixes**: ✅ **100% WERKEND** basis functionaliteit

---

**Laatste test**: 4 december 2025, 16:18 UTC  
**Test script**: `backend/test-basis-functionaliteit.ts`
