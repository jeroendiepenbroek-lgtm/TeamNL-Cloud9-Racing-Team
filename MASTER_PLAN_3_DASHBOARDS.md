# 🎯 MASTER PLAN - 3 DASHBOARDS SOURCING STRATEGY

**Project**: TeamNL Cloud9 Racing Team Dashboard  
**Datum**: 4 december 2025  
**Status**: Architecture Definitief  
**Versie**: 2.0 (Unified Multi-Source)

---

## 📋 USER STORIES - ABSOLUTE BASIS

### US1: Team Management ✅
**Feature**: Via Teammanagement Feature kan ik ZwiftIDs aan mijn team toevoegen en/of verwijderen

**Database**:
```sql
-- Tabel: my_team_members
CREATE TABLE my_team_members (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL UNIQUE,  -- ZwiftID
  nickname TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Endpoints**:
```typescript
POST   /api/team/members          // Voeg rider toe aan team
DELETE /api/team/members/:riderId // Verwijder rider van team
GET    /api/team/members          // Haal team roster op
PATCH  /api/team/members/:riderId // Update nickname/notes/favorite
```

**Frontend**:
- Team Management pagina met lijst van riders
- "Add Rider" knop → input ZwiftID → POST naar API
- "Remove" knop per rider → DELETE naar API
- Edit functionaliteit voor nickname/notes

**Huidige Status**: ✅ Tabel bestaat (75 riders), endpoints TODO

---

### US2: Rider Details & Stats uit ZwiftRacing.app ✅
**Feature**: Op basis van ZwiftID worden alle Rider details en stats opgehaald uit ZwiftRacing.app

**API Source**: ZwiftRacing.app `/public/riders/{riderId}`

**Data opgehaald**:
```typescript
{
  riderId: number,
  name: string,
  club: { id, name },
  country: string,
  age: string,           // "Vet", "Junior", etc
  weight: number,        // kg
  height: number,        // cm
  gender: string,
  zpCategory: string,    // ZwiftPower category
  zpFTP: number,
  phenotype: object,     // Sprinter, Climber, etc
  power: {               // Power curve
    fiveSecond, fifteenSecond, thirtySecond,
    oneMinute, twoMinute, fiveMinute, 
    tenMinute, twentyMinute, thirtyMinute
  },
  race: {
    finishes: number,
    wins: number,
    last: { date, rating },
    current: { rating, category }
  },
  handicaps: object      // Race handicaps
}
```

**Database Target**: `riders_unified` tabel

**Rate Limit**: 5 requests / 60 seconden

**Sync Strategie**:
- On-demand: Bij toevoegen aan team (POST /api/team/members)
- Scheduled: Dagelijks voor alle team members (cron)
- Manual: Via sync endpoint (POST /api/riders/sync)

**Kritieke Beperking**: ⚠️ **GEEN history field!** Rider endpoint bevat GEEN race history.

**Huidige Status**: ✅ API client werkend, unified tabel gefixt (commit 139d64c)

---

### US3: Data Aanvulling uit Zwift.com + ZwiftPower.com ✅
**Feature**: Details worden aangevuld met data uit Zwift.com en ZwiftPower.com op basis van dezelfde ZwiftID

**Multi-Source Strategie**:

#### Bron 1: ZwiftRacing.app (PRIMARY) ✅
- **Wat**: Rider profile, current stats, race history access
- **When**: Altijd eerst
- **Fields**: name, club, weight, power curve, velo rating

#### Bron 2: Zwift.com Official API (ENRICHMENT) ⏳
- **Wat**: Profile photo, activity history, achievements
- **When**: After ZwiftRacing data
- **Fields**: 566 fields beschikbaar via OAuth
- **Status**: Client exists, needs OAuth setup

#### Bron 3: ZwiftPower.com (VERIFICATION) ⚠️
- **Wat**: Category verification, race results cross-check
- **When**: Optional fallback
- **Fields**: Race results, rankings, category
- **Limitation**: ❌ Rider 150437 heeft GEEN ZwiftPower profiel!
- **Decision**: SKIP voor riders zonder ZP profile

**Unified Table Schema**:
```sql
CREATE TABLE riders_unified (
  rider_id INTEGER PRIMARY KEY,
  name TEXT,
  club_id INTEGER,
  club_name TEXT,
  
  -- Core stats
  velo_rating NUMERIC,
  velo_rating_updated_at TIMESTAMPTZ,
  category TEXT,
  race_count_90d INTEGER,
  
  -- Physical
  ftp INTEGER,
  weight_kg NUMERIC,
  height_cm INTEGER,
  age_group TEXT,
  gender TEXT,
  
  -- Power curve (14 columns)
  power_5s_w INTEGER, power_15s_w INTEGER, power_30s_w INTEGER,
  power_1m_w INTEGER, power_2m_w INTEGER, power_5m_w INTEGER, power_20m_w INTEGER,
  power_5s_wkg NUMERIC, power_15s_wkg NUMERIC, power_30s_wkg NUMERIC,
  power_1m_wkg NUMERIC, power_2m_wkg NUMERIC, power_5m_wkg NUMERIC, power_20m_wkg NUMERIC,
  
  -- Phenotype
  phenotype_sprinter NUMERIC,
  phenotype_climber NUMERIC,
  phenotype_tt NUMERIC,
  phenotype_endurance NUMERIC,
  
  -- ZwiftPower
  zp_category TEXT,
  zp_ftp INTEGER,
  zp_profile_url TEXT,
  
  -- Zwift Official
  zwift_profile_photo_url TEXT,
  zwift_total_distance_km NUMERIC,
  zwift_achievements_count INTEGER,
  
  -- Sync tracking
  last_synced_zwift_racing TIMESTAMPTZ,
  last_synced_zwift_official TIMESTAMPTZ,
  last_synced_zwiftpower TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Sync Flow**:
```typescript
async function syncRider(riderId: number) {
  // 1. ZwiftRacing.app (ALWAYS)
  const zwiftRacingData = await zwiftClient.getRider(riderId);
  
  // 2. Zwift.com Official (if OAuth available)
  let zwiftOfficialData = null;
  if (hasOAuth) {
    zwiftOfficialData = await zwiftOfficialClient.getProfile(riderId);
  }
  
  // 3. ZwiftPower (if profile exists)
  let zwiftPowerData = null;
  try {
    zwiftPowerData = await zwiftPowerClient.getRider(riderId);
  } catch (e) {
    // Skip if no profile (zoals rider 150437)
  }
  
  // 4. Merge into unified
  const unified = {
    ...zwiftRacingData,
    ...zwiftOfficialData,
    ...zwiftPowerData,
    last_synced_zwift_racing: new Date(),
    last_synced_zwift_official: zwiftOfficialData ? new Date() : null,
    last_synced_zwiftpower: zwiftPowerData ? new Date() : null,
  };
  
  // 5. Upsert to riders_unified
  await supabase.client
    .from('riders_unified')
    .upsert(unified, { onConflict: 'rider_id' });
}
```

**Huidige Status**: 
- ✅ ZwiftRacing.app werkend
- ⏳ Zwift.com OAuth setup TODO
- ⚠️ ZwiftPower skip voor riders zonder profile

---

### US4: Results uit ZwiftRacing.app op basis van EventID ⚠️
**Feature**: Op basis van ZwiftID worden Results op basis van EventID uit ZwiftRacing.app gehaald, welke in Rider history te vinden zijn

**KRITIEKE CORRECTIE**: ❌ Rider endpoint heeft **GEEN history field**!

**Bewezen Feit** (4 dec 2025):
```typescript
const rider = await zwiftClient.getRider(150437);
console.log(rider.history); // → undefined ❌

// Available fields:
// age, club, country, gender, handicaps, height, name, 
// phenotype, power, race, riderId, weight, zpCategory, zpFTP

// race.last.date exists, maar geen volledige history!
```

**Correcte Strategie**:

#### Option A: Event-based Sync (HUIDIG)
```typescript
// Haal results per event op
const eventIds = [5229579, 5206710, 5178019]; // Handmatig verzamelen

for (const eventId of eventIds) {
  const results = await zwiftClient.getEventResults(eventId);
  const riderResult = results.find(r => r.riderId === riderId);
  
  if (riderResult) {
    await saveToDatabase(riderResult);
  }
  
  await sleep(65000); // Rate limit: 1/min
}
```

**Rate Limit**: 1 request / 60 seconden (STRIKT!)

#### Option B: Club Events Sync (ALTERNATIEF)
```typescript
// Haal alle club events op
const clubId = 11818; // TeamNL Cloud9
const clubEvents = await zwiftClient.getClubEvents(clubId);

// Sync results voor elk event
for (const event of clubEvents) {
  const results = await zwiftClient.getEventResults(event.eventId);
  // Save all results
  await saveResults(results);
  await sleep(65000);
}
```

#### Option C: Scrape van ZwiftPower (FALLBACK)
- Voor riders MET ZwiftPower profile
- Pagination mogelijk
- Geen rate limits
- Maar: niet alle riders hebben profile!

**Gekozen Strategie**: **Option A + Option B Combined**
1. Sync club events (weekly)
2. Find team member participations
3. Sync individual event results
4. Rate limit: 1 event per 65 seconden

**Database**: `zwift_api_race_results` (45 kolommen)

**Huidige Status**: ✅ 30 results voor rider 150437 (28 aug - 30 nov 2025)

---

### US5: Aanvullende Details uit ZwiftPower.com ⚠️
**Feature**: Op basis van gevonden EventID worden aanvullende details uit ZwiftPower.com gehaald

**ZwiftPower Event Data**:
```typescript
{
  eventId: string,
  eventName: string,
  eventDate: Date,
  route: string,
  distance: number,
  categoryResults: {
    A: [...riders],
    B: [...riders],
    C: [...riders],
    D: [...riders],
  },
  // Per rider:
  position: number,
  name: string,
  flag: string,
  power: { avg, max, wkg },
  heartRate: { avg, max },
  time: string,
  gap: string,
  penalties: string[],
}
```

**Strategie**:
```typescript
// After syncing from ZwiftRacing.app
const zwiftRacingResult = await zwiftClient.getEventResults(eventId);

// Enrich with ZwiftPower data
const zwiftPowerResults = await zwiftPowerClient.getEventResults(eventId);

// Merge fields
const enriched = {
  ...zwiftRacingResult,
  zp_penalties: zwiftPowerResults.penalties,
  zp_avg_hr: zwiftPowerResults.heartRate.avg,
  zp_distance: zwiftPowerResults.distance,
};

await saveToDatabase(enriched);
```

**Limitation**: Niet alle events staan op ZwiftPower (vooral kleinere events)

**Decision**: 
- Probeer ZwiftPower data op te halen
- Als niet beschikbaar: gebruik alleen ZwiftRacing data
- Mark source in database (`data_source: 'zwift_racing' | 'zwift_power' | 'both'`)

**Huidige Status**: ⏳ TODO - Currently only ZwiftRacing.app data

---

### US6: Events voor komende 36 uur uit Zwift_API_events ❌
**Feature**: Uit de Zwift_API_events worden alle events voor de komende 36 uur gehaald

**PROBLEEM GEÏDENTIFICEERD** (4 dec 2025):
```
Current time:    2025-12-04 16:18 UTC
Latest event:    2025-12-04 09:24 UTC
Future events:   0 ❌

→ Database bevat GEEN toekomstige events!
```

**Root Cause**: Events niet gesynchroniseerd sinds gisteren

**Correcte Sync Strategie**:

#### Daily Event Feed Sync
```typescript
// Script: sync-future-events.ts
const now = Math.floor(Date.now() / 1000);
const hoursAhead = 36;
const futureTimestamp = now + (hoursAhead * 60 * 60);

// Get event feed from ZwiftRacing.app
const eventFeed = await zwiftClient.getEventFeed();

// Filter next 36 hours
const upcomingEvents = eventFeed.filter(e => 
  e.time >= now && e.time <= futureTimestamp
);

// Upsert to database
await supabase.client
  .from('zwift_api_events')
  .upsert(upcomingEvents, { onConflict: 'event_id' });

console.log(`Synced ${upcomingEvents.length} events for next 36 hours`);
```

**Scheduling**:
```typescript
// In server.ts
import cron from 'node-cron';

// Run every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Running event feed sync...');
  await syncFutureEvents();
});
```

**API Endpoints**:
```typescript
GET /api/events?future=true&hours=36  // Get upcoming events
GET /api/events/:eventId              // Get event details
```

**Frontend Query**:
```typescript
const { data: events } = await supabase.client
  .from('zwift_api_events')
  .select('*')
  .gt('time_unix', Math.floor(Date.now() / 1000))
  .lte('time_unix', Math.floor(Date.now() / 1000) + (36 * 60 * 60))
  .order('time_unix', { ascending: true });
```

**Huidige Status**: ❌ KRITIEK - Geen toekomstige events, sync vereist!

---

### US7: Sign-Ups Logging op basis van ZwiftID + EventID ❌
**Feature**: Op basis van ZwiftID en EventID worden de Sign-Ups voor mijn team rijders gelogd

**PROBLEEM GEÏDENTIFICEERD** (4 dec 2025):
```sql
ERROR: Could not find the table 'public.event_signups' in the schema cache
```

**Database Schema** (VEREIST):
```sql
CREATE TABLE event_signups (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  
  -- Signup details
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  category TEXT,                    -- A, B, C, D, E
  status TEXT DEFAULT 'confirmed',  -- confirmed, cancelled, waitlist
  
  -- Metadata
  signup_source TEXT,               -- 'manual', 'import', 'api'
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rider_id)
);

-- Indexes voor performance
CREATE INDEX idx_event_signups_rider ON event_signups(rider_id);
CREATE INDEX idx_event_signups_event ON event_signups(event_id);
CREATE INDEX idx_event_signups_status ON event_signups(status);
```

**API Endpoints**:
```typescript
POST   /api/events/:eventId/signup           // Sign up for event
DELETE /api/events/:eventId/signup/:riderId  // Cancel signup
GET    /api/riders/:riderId/signups          // Get rider's signups
GET    /api/events/:eventId/signups          // Get event signups
```

**Frontend Use Cases**:

#### 1. Inschrijven voor Event
```typescript
// Events Dashboard - "Sign Up" button
async function signUpForEvent(eventId: string, riderId: number, category: string) {
  const { error } = await supabase.client
    .from('event_signups')
    .insert({
      event_id: eventId,
      rider_id: riderId,
      category: category,
      status: 'confirmed',
      signup_source: 'manual'
    });
    
  if (error) throw error;
  toast.success('Signed up for event!');
}
```

#### 2. Mijn Inschrijvingen
```typescript
// Get rider's upcoming signups
const { data: signups } = await supabase.client
  .from('event_signups')
  .select(`
    *,
    event:zwift_api_events!inner(*)
  `)
  .eq('rider_id', riderId)
  .eq('status', 'confirmed')
  .gt('event.time_unix', Math.floor(Date.now() / 1000));
```

#### 3. Events Zonder Inschrijving
```typescript
// Filter events waar rider NIET voor ingeschreven is
const { data: allEvents } = await supabase.client
  .from('zwift_api_events')
  .select('*')
  .gt('time_unix', now);

const { data: signedUpEvents } = await supabase.client
  .from('event_signups')
  .select('event_id')
  .eq('rider_id', riderId);

const signedUpIds = new Set(signedUpEvents.map(s => s.event_id));
const availableEvents = allEvents.filter(e => !signedUpIds.has(e.event_id));
```

**Data Sources voor Signups**:

1. **Manual Entry** (Primary)
   - Via dashboard sign up button
   - Direct insert in database

2. **Zwift Companion Export** (Optional)
   - User exports CSV van ingeschreven events
   - Import via upload functionaliteit

3. **API Sync** (Future)
   - Als Zwift API signup endpoint beschikbaar komt
   - Automated sync

**Huidige Status**: ❌ KRITIEK - Tabel bestaat niet, signup flow geblokkeerd!

---

### US8: Frontend Dashboards met Nieuwe Sourcing ✅
**Feature**: Frontend voor Racing Matrix, Event Dashboard en Results Dashboard blijven gelijk, maar worden middels nieuwe sourcing strategy gevoed

**3 Dashboards**:

#### 1. Racing Matrix Dashboard ✅
**Data Source**: `view_my_team` (JOIN my_team_members + riders_unified)

**Query**:
```sql
CREATE VIEW view_my_team AS
SELECT 
  tm.*,
  r.*
FROM my_team_members tm
LEFT JOIN riders_unified r ON tm.rider_id = r.rider_id;
```

**Frontend Component**: `RacingMatrix.tsx`
```typescript
const { data: teamRiders } = await supabase.client
  .from('view_my_team')
  .select('*')
  .order('velo_rating', { ascending: false });
```

**Displayed Data**:
- Rider name + nickname
- Velo rating + trend
- Category
- FTP + w/kg
- Power curve (5s, 1m, 5m, 20m)
- Recent race count
- Win rate

**Status**: ✅ Werkend (getest 4 dec 2025, 1 rider vanwege unified issue)

---

#### 2. Results Dashboard ✅
**Data Source**: `zwift_api_race_results`

**Query**:
```typescript
const { data: results } = await supabase.client
  .from('zwift_api_race_results')
  .select('*')
  .eq('rider_id', riderId)
  .order('event_date', { ascending: false })
  .limit(50);
```

**Frontend Component**: `ResultsDashboard.tsx`

**Displayed Data**:
- Event name + date
- Position (overall + in category)
- Time + gap to winner
- Power metrics (avg w/kg, peak powers)
- Velo rating change
- Penalties (if any)

**Filters**:
- Date range (7d, 30d, 90d, all)
- Event type (race, group ride, workout)
- Category

**Status**: ✅ Werkend (30 results voor rider 150437)

---

#### 3. Events Dashboard ⚠️
**Data Sources**: 
- `zwift_api_events` (all events)
- `event_signups` (rider signups)

**Query**:
```typescript
// All upcoming events
const { data: allEvents } = await supabase.client
  .from('zwift_api_events')
  .select('*')
  .gt('time_unix', now)
  .order('time_unix', { ascending: true });

// Rider's signups
const { data: signups } = await supabase.client
  .from('event_signups')
  .select('event_id')
  .eq('rider_id', riderId);

// Merge: mark events as signed_up
const eventsWithSignupStatus = allEvents.map(event => ({
  ...event,
  isSignedUp: signups.some(s => s.event_id === event.event_id)
}));
```

**Frontend Component**: `EventsDashboard.tsx`

**Views**:
1. **Upcoming Events** (next 36 hours)
   - Event name, time, route
   - Sign up button (if not signed up)
   - "Signed up ✅" badge (if signed up)

2. **My Signups** (filter: isSignedUp = true)
   - Only events rider is registered for
   - Cancel button

3. **All Events** (extended view)
   - All available events
   - Filter by date, type, category

**Status**: ⚠️ Partially working (events query OK, maar geen toekomstige data + signups tabel missing)

---

### US9: Racing Matrix Verificatie ✅
**Feature**: Racing Matrix lijkt al volledig klaar, maar andere sourcing ook, dus dit is voor verificatie en bevestiging van werking

**Test Uitgevoerd** (4 dec 2025):
```bash
npx tsx test-3-dashboards.ts

Results:
1. Racing Matrix: ✅ WORKING (1 rider shown)
2. Results Dashboard: ✅ WORKING (28 results)
3. Events Dashboard: ✅ WORKING (1821 events, maar geen toekomstige)
```

**Racing Matrix Specifiek**:
- ✅ View `view_my_team` exists and works
- ✅ Data from `riders_unified` correct
- ⚠️ Only 1 rider (should be 75 after full sync)

**Verificatie Checklist**:
- [x] Database view exists
- [x] Query returns data
- [x] Multi-source fields populated (ZwiftRacing)
- [ ] Zwift.com fields (TODO: OAuth)
- [ ] ZwiftPower fields (Skip for riders without profile)
- [ ] All 75 team members synced

**Action Required**: Run `POST /api/riders/sync` to populate 74 missing riders

---

## 🏗️ ARCHITECTUUR KEUZES

### 1. Database Design

**Beslissing**: Unified Table + View Pattern

**Rationale**:
- `riders_unified`: Single source of truth voor rider data
- `my_team_members`: Team roster (lightweight)
- `view_my_team`: JOIN voor frontend queries
- `zwift_api_race_results`: Results met full details
- `zwift_api_events`: Event catalog
- `event_signups`: M:N relationship riders ↔ events

**Voordelen**:
- ✅ No data duplication
- ✅ Single update point
- ✅ Easy to add new sources (new columns)
- ✅ Frontend queries blijven simpel (view abstraction)

---

### 2. API Sourcing Priority

**Beslissing**: ZwiftRacing.app = Primary, others = Enrichment

**Priority Order**:
1. **ZwiftRacing.app** (MUST HAVE)
   - Most reliable
   - Most complete race data
   - Velo ratings
   - Rate limits acceptable

2. **Zwift.com Official** (NICE TO HAVE)
   - Profile enrichment
   - OAuth required
   - 566 fields available
   - Use for photos, achievements

3. **ZwiftPower.com** (OPTIONAL)
   - Verification only
   - Not all riders have profile
   - Use where available

**Rationale**:
- ZwiftRacing.app heeft beste coverage
- ZwiftPower unreliable (rider 150437 = 0 results)
- Zwift.com requires extra setup (OAuth)

---

### 3. Rate Limiting Strategy

**Beslissing**: Conservative Limits + Queueing

**Limits**:
```typescript
const RATE_LIMITS = {
  getRider: { calls: 5, per: '1min' },
  getEventResults: { calls: 1, per: '1min' },  // STRICTEST!
  getClubMembers: { calls: 1, per: '60min' },
};
```

**Implementation**:
```typescript
// axios-rate-limit wrapper
import rateLimit from 'axios-rate-limit';

const http = rateLimit(axios.create(), {
  maxRequests: 1,
  perMilliseconds: 60000, // 1 min
});
```

**Queueing**:
- Sync jobs in queue
- Process sequentially
- Wait between calls
- Retry on 429

---

### 4. Sync Scheduling

**Beslissing**: Multiple Frequencies Based on Data Type

**Schedules**:
```typescript
// Rider profiles (stable data)
cron.schedule('0 2 * * *', syncAllRiders);     // Daily 02:00

// Event feed (volatile)
cron.schedule('0 */6 * * *', syncFutureEvents); // Every 6 hours

// Club members (rare changes)
cron.schedule('0 3 * * 0', syncClubMembers);   // Weekly Sunday 03:00

// Results (after races)
// → Manual trigger per event (rate limited)
```

**Rationale**:
- Rider data changes slowly (update daily OK)
- Events need frequent updates (6 hours)
- Results sync on-demand (after race)

---

### 5. Error Handling

**Beslissing**: Graceful Degradation

**Strategy**:
```typescript
async function syncRider(riderId) {
  const errors = [];
  
  // Try ZwiftRacing (required)
  try {
    const data = await zwiftClient.getRider(riderId);
    await saveToUnified(data);
  } catch (e) {
    errors.push({ source: 'zwift_racing', error: e });
    throw e; // Fatal - cannot continue
  }
  
  // Try Zwift Official (optional)
  try {
    const data = await zwiftOfficialClient.getProfile(riderId);
    await enrichUnified(riderId, data);
  } catch (e) {
    errors.push({ source: 'zwift_official', error: e });
    // Continue - not fatal
  }
  
  // Try ZwiftPower (optional)
  try {
    const data = await zwiftPowerClient.getRider(riderId);
    await enrichUnified(riderId, data);
  } catch (e) {
    errors.push({ source: 'zwiftpower', error: e });
    // Continue - not fatal (many riders don't have profile)
  }
  
  return { success: true, errors };
}
```

**Rationale**:
- Primary source failure = abort
- Secondary source failure = continue
- Log all errors for debugging

---

## 🚨 KRITIEKE BEPERKINGEN

### 1. ZwiftRacing.app: Geen Rider History ❌
**Feit**: `/public/riders/{id}` bevat **GEEN** history field

**Impact**:
- Kunnen niet alle races van rider ophalen in 1 call
- Moeten per event synchroniseren
- Rate limit maakt bulk sync traag

**Workaround**: 
- Sync club events → find team participation
- Or: Handmatig event IDs verzamelen

**Documentatie**: CRITICAL_LESSONS_LEARNED.md Fout #2

---

### 2. Rate Limit Event Results: 1/min ⚠️
**Feit**: Event results endpoint = 1 call per 60 seconden

**Impact**:
- 100 events syncen = 100+ minuten
- Bulk sync niet praktisch
- Moet selectief syncen

**Workaround**:
- Sync alleen events met team participation
- Prioritize recent events
- Background job voor historical data

**Documentatie**: CRITICAL_LESSONS_LEARNED.md Fout #3

---

### 3. ZwiftPower: Niet Alle Riders Hebben Profiel ⚠️
**Feit**: Rider 150437 en anderen hebben geen ZP profile

**Impact**:
- ZwiftPower niet betrouwbaar als primaire bron
- Moet ZwiftRacing.app als primary gebruiken
- ZP = verification only

**Workaround**:
- Try ZP, fallback to ZwiftRacing
- Mark data source in database
- Don't fail on ZP errors

**Documentatie**: CRITICAL_LESSONS_LEARNED.md Fout #1

---

### 4. Event Signups: Geen Automatische Tracking ❌
**Feit**: Geen API om signups te detecteren

**Impact**:
- Moeten handmatig bijhouden
- Geen automated sync mogelijk
- User moet zelf invoeren

**Workaround**:
- Manual sign up button in dashboard
- Optional: Import from Zwift Companion export
- Database tracks signups locally

**Documentatie**: BASIS_FUNCTIONALITEIT_STATUS.md

---

## ✅ IMPLEMENTATIE STATUS

### Completed ✅
1. Database schema riders_unified (45 kolommen)
2. Table my_team_members (75 riders)
3. View view_my_team (JOIN)
4. ZwiftRacing.app client met rate limiting
5. Supabase service met unified table refs (commit 139d64c)
6. Results sync voor rider 150437 (30 races)
7. Multi-source architecture documented
8. Critical lessons documented

### In Progress 🔄
1. Zwift.com Official OAuth setup
2. Event feed sync (36 uur)
3. Club sync endpoint testing

### TODO ⏳
1. **URGENT**: Maak event_signups tabel
2. **URGENT**: Sync toekomstige events (36h)
3. Signup endpoints (POST/DELETE)
4. Full team sync (74 riders → unified)
5. ZwiftPower enrichment (waar beschikbaar)
6. Cron jobs voor scheduled syncs
7. Frontend integratie testen

---

## 📚 DOCUMENTATIE REFERENTIES

### Master Documents
- **Dit document**: `MASTER_PLAN_3_DASHBOARDS.md` ← Single Source of Truth
- **API Details**: `CLEAN_SOURCING_STRATEGY_V2.md`
- **Kritieke Fouten**: `CRITICAL_LESSONS_LEARNED.md`
- **Basis Status**: `BASIS_FUNCTIONALITEIT_STATUS.md`
- **Sync Results**: `SYNC_RESULTS_RIDER_150437.md`

### Technical Specs
- **Database Schema**: `supabase/migrations/*.sql`
- **API Client**: `backend/src/api/zwift-client.ts`
- **Services**: `backend/src/services/supabase.service.ts`
- **Types**: `backend/src/types/api.types.ts`

### Copilot Instructions
- **Project Guide**: `.github/copilot-instructions.md`
- **Reference**: Verwijst naar CRITICAL_LESSONS_LEARNED.md

---

## 🎯 VOLGENDE SESSIE CHECKLIST

Wanneer je terugkomt, **LEES EERST**:
1. Dit document (MASTER_PLAN_3_DASHBOARDS.md)
2. CRITICAL_LESSONS_LEARNED.md
3. BASIS_FUNCTIONALITEIT_STATUS.md

**Onthoud ALTIJD**:
- ❌ Rider endpoint heeft GEEN history
- ❌ Rate limit event results = 1/min
- ❌ ZwiftPower werkt niet voor alle riders
- ❌ event_signups tabel bestaat niet (moet aangemaakt)
- ❌ Geen toekomstige events (moet gesynchroniseerd)

**Commit Messages Refereren**:
- Unified table fix: `139d64c`
- Club sync docs: `ea67df2`

---

## 🔐 BESLISSINGEN VASTGELEGD

### Database
✅ **Unified table pattern** (riders_unified + views)
✅ **Multi-source columns** (last_synced_* per bron)
✅ **Event signups tracking** (event_signups tabel vereist)

### API Sourcing
✅ **ZwiftRacing.app = Primary** (most reliable)
✅ **Zwift.com = Enrichment** (OAuth, nice-to-have)
✅ **ZwiftPower = Verification** (optional, skip if no profile)

### Sync Strategy
✅ **Event-based results** (geen rider history endpoint)
✅ **Conservative rate limits** (1/min voor events)
✅ **Scheduled syncs** (cron jobs per data type)
✅ **Graceful degradation** (secondary failures OK)

### Frontend
✅ **3 Dashboards behouden** (Racing Matrix, Results, Events)
✅ **Same UI, new sourcing** (backend changes transparent)
✅ **View-based queries** (view_my_team abstraction)

---

**Dit document is definitief. Bij twijfel of vergeten context: LEES DIT OPNIEUW.**

**Versie**: 2.0  
**Laatste Update**: 4 december 2025, 16:30 UTC  
**Status**: ✅ Architecture Locked & Documented
