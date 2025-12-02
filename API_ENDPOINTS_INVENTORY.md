# 📡 Complete API Endpoints Overzicht - TeamNL Cloud9

**Datum:** 1 december 2025  
**Doel:** Inventarisatie van alle beschikbare endpoints per API voor dashboard integratie

---

## 🎯 API Bronnen

1. **ZwiftRacing.app** (`https://zwift-ranking.herokuapp.com`)
2. **Zwift.com Official API** (`https://us-or-rly101.zwift.com/api`)
3. **ZwiftPower.com** (`https://zwiftpower.com`)

---

## 1️⃣ ZwiftRacing.app API

**Base URL:** `https://zwift-ranking.herokuapp.com`  
**Auth:** API Key in Authorization header  
**Rate Limits:** Standard tier (zie per endpoint)

### 📊 CLUBS

| Endpoint | Method | Rate Limit | Gebruikt | Data |
|----------|--------|------------|----------|------|
| `/public/clubs/{id}` | GET | 1/60min | ✅ JA | Alle club members (max 1000) |
| `/public/clubs/{id}/{afterRiderId}` | GET | 1/60min | ❌ NEE | Paginatie voor >1000 members |

**Response Fields:**
```typescript
{
  riderId: number,
  name: string,
  rating: number,              // vELO rating
  category: 'A'|'B'|'C'|'D',
  raceResults90Days: number,
  raceCurrentRating: number,
  raceLastEventDate: string,
  // ... meer fields
}
```

**Dashboard Use:**
- ✅ Rider Performance Dashboard (vELO, category)
- ✅ Team member list

---

### 🏁 RESULTS

| Endpoint | Method | Rate Limit | Gebruikt | Data |
|----------|--------|------------|----------|------|
| `/public/results/{eventId}` | GET | 1/1min | ✅ JA | Race results voor event |
| `/public/zp/{eventId}/results` | GET | 1/1min | ❌ NEE | ZwiftPower results |

**Response Fields:**
```typescript
{
  riderId: number,
  position: number,            // Overall rank
  rank: number,
  time: number,                // Seconds
  power: {
    avg: number,
    max: number,
    wkg: {
      avg: number,
      p5s: number,              // 5 second power
      p15s: number,             // 15 second power
      p30s: number,
      p1m: number,
      p5m: number,
      p20m: number              // 20 minute power
    }
  },
  heartRate: { avg: number, max: number },
  rating: number,              // vELO after race
  ratingDelta: number,         // vELO change
  category: string,
  dnf: boolean,
  effortScore: number,
  racePoints: number
}
```

**Dashboard Use:**
- ✅ Results Dashboard (rankings, power curves, vELO changes)
- ✅ Rider Performance Dashboard (power data, recent results)

---

### 👥 RIDERS (Individual)

| Endpoint | Method | Rate Limit | Gebruikt | Data |
|----------|--------|------------|----------|------|
| `/public/riders/{riderId}` | GET | 5/1min | ❌ NEE | Single rider current data |
| `/public/riders/{riderId}/{time}` | GET | 5/1min | ❌ NEE | Single rider historical data |

**Response Fields:**
```typescript
{
  riderId: number,
  name: string,
  rating: number,
  category: string,
  raceResults90Days: number,
  history: [{                  // Rating history!
    time: number,
    rating: number
  }]
}
```

**Potential Use:**
- 🔵 Rider Performance Dashboard (rating history for graphs!)
- 🔵 Individual rider deep dive

---

### 👥 RIDERS (Bulk) - **NIET GEBRUIKT, GROTE KANS!**

| Endpoint | Method | Rate Limit | Gebruikt | Data |
|----------|--------|------------|----------|------|
| `POST /public/riders` | POST | 1/15min | ❌ NEE | Bulk riders (max 1000) |
| `POST /public/riders/{time}` | POST | 1/15min | ❌ NEE | Bulk riders historical |

**Body:** `[riderId1, riderId2, ...]` (max 1000)

**Response:** Array van rider objects (zelfde als individual GET)

**💡 OPTIMALISATIE KANS:**
- **Huidige flow:** Results sync haalt per event alle results op → filter op team
- **Betere flow:** Gebruik bulk endpoint voor alle team riders tegelijk
- **Voordeel:** 1 call/15min voor alle 75 riders vs 75 calls × 5/min = 15+ minuten
- **Trade-off:** Bulk geeft geen event-specific results, alleen current stats

---

### 📅 EVENTS

| Endpoint | Method | Rate Limit | Gebruikt | Data |
|----------|--------|------------|----------|------|
| `/api/events/upcoming` | GET | Unknown | ✅ JA | 800+ upcoming events |
| `/api/events/{eventId}` | GET | Unknown | ❌ NEE | Event details + participants |
| `/api/events/{eventId}/signups` | GET | Unknown | ✅ JA | Signups per category (pen) |

**Response `/api/events/upcoming`:**
```typescript
[{
  eventId: string,
  time: number,                // Unix timestamp
  title: string,
  routeId: number,
  distance: number,
  type: string,                // 'RACE', 'GROUP_RIDE', etc
  subType: string,
  categories: string,          // Comma-separated: 'A,B,C,D'
  signups: string              // Comma-separated rider counts
}]
```

**Response `/api/events/{eventId}/signups`:**
```typescript
[{
  pen: 'A' | 'B' | 'C' | 'D' | 'E',
  riders: [{
    riderId: number,
    name: string,
    weight: number,
    height: number,
    club: { id: number, name: string },
    power: {
      wkg5s: number,
      wkg1m: number,
      wkg5m: number,
      wkg20m: number,
      cp: number,               // Critical Power
      awc: number               // Anaerobic Work Capacity
    },
    rating: number,             // vELO
    wins: number,
    podiums: number,
    phenotype: string           // 'SPRINTER', 'ALLROUNDER', 'CLIMBER', etc
  }]
}]
```

**Dashboard Use:**
- ✅ Events Dashboard (upcoming events)
- ✅ Events Dashboard (team signups per event)
- 🔵 Rider Performance Dashboard (phenotype, power profiles)

---

### 🗺️ ROUTES

| Endpoint | Method | Rate Limit | Gebruikt | Data |
|----------|--------|------------|----------|------|
| `/api/routes` | GET | Unknown | ✅ JA | All Zwift routes |

**Response:**
```typescript
[{
  routeId: number,
  name: string,
  world: string,               // 'Watopia', 'London', etc
  profile: string,             // 'Flat', 'Rolling', 'Hilly', 'Mountainous'
  distance: number,            // km
  elevation: number            // meters
}]
```

**Dashboard Use:**
- ✅ Events Dashboard (route profiles, elevation)
- ✅ Results Dashboard (race route info)

---

## 2️⃣ Zwift.com Official API

**Base URL:** `https://us-or-rly101.zwift.com/api`  
**Auth:** OAuth Bearer token (password grant flow)  
**Rate Limits:** Unknown (gebruik conservatief)

### 👤 PROFILE

| Endpoint | Method | Gebruikt | Data |
|----------|--------|----------|------|
| `/profiles/{profileId}` | GET | ✅ JA | Complete profile (566 fields!) |

**Response Fields (selection):**
```typescript
{
  id: number,
  firstName: string,
  lastName: string,
  male: boolean,
  imageSrc: string,            // Avatar URL
  imageSrcLarge: string,
  countryAlpha3: string,       // 'NLD'
  useMetric: boolean,
  riding: boolean,             // Currently riding?
  privacy: {
    displayWeight: boolean,
    displayAge: boolean
  },
  socialFacts: {
    followersCount: number,
    followeesCount: number
  },
  worldId: number,             // Current world if riding
  currentActivityId: number    // Current activity if riding
}
```

**⚠️ MISSING:** FTP, weight, height niet in profile response!
**📝 NOTE:** Deze data zit waarschijnlijk in activities of is private

**Dashboard Use:**
- ✅ Rider Performance Dashboard (avatar, country, social stats)
- 🔵 Live riding status ("currently riding")

---

### 🚴 ACTIVITIES

| Endpoint | Method | Gebruikt | Data |
|----------|--------|----------|------|
| `/profiles/{id}/activities` | GET | ✅ JA | Recent activities |

**Params:** `start`, `limit` (paginatie)

**Response:**
```typescript
[{
  id: number,
  profileId: number,
  worldId: number,
  name: string,
  description: string,
  privateActivity: boolean,
  sport: string,               // 'CYCLING', 'RUNNING'
  startDate: string,
  endDate: string,
  distanceInMeters: number,
  durationInSeconds: number,
  totalElevation: number,
  avgWatts: number,            // ⭐ Average power
  calories: number,
  avgHeartRate: number,
  maxHeartRate: number,
  avgSpeedInMetersPerSecond: number
}]
```

**Dashboard Use:**
- ✅ Rider Performance Dashboard (recent training activities)
- 🔵 Training volume analysis
- 🔵 Average power trends

---

### 👥 SOCIAL

| Endpoint | Method | Gebruikt | Data |
|----------|--------|----------|------|
| `/profiles/{id}/followers` | GET | ✅ JA | Followers list |
| `/profiles/{id}/followees` | GET | ✅ JA | Following list |
| `/profiles/{id}/goals` | GET | ✅ JA | Rider goals |

**Dashboard Use:**
- 🔵 Social features (mogelijk later)
- 🔵 Goals tracking

---

## 3️⃣ ZwiftPower.com API

**Base URL:** `https://zwiftpower.com`  
**Auth:** Username/password login (cookie-based session)  
**Rate Limits:** Unknown (gebruik zeer conservatief)

### 👤 RIDER PROFILE

| Endpoint | Method | Gebruikt | Data |
|----------|--------|----------|------|
| `/cache3/profile/{zwiftId}_all.json` | GET | ✅ JA | Rider profile with FTP! |

**Response:**
```typescript
{
  zwid: number,
  name: string,
  ftp: number,                 // ⭐ FTP (key data!)
  weight: number,              // ⭐ Weight (key data!)
  category: string,            // 'A', 'B', 'C', 'D', 'E'
  flag: string,                // Country code
  // ... meer fields
}
```

**💡 KRITIEKE DATA:**
- **FTP** - Niet beschikbaar in ZwiftRacing of Zwift.com API!
- **Weight** - Actueel gewicht
- **Category** - ZwiftPower category (kan verschillen van ZwiftRacing)

**Dashboard Use:**
- ✅ Rider Performance Dashboard (FTP, W/kg calculation)
- ✅ Category verification

---

### 🏁 RIDER RESULTS

| Endpoint | Method | Gebruikt | Data |
|----------|--------|----------|------|
| `/api3.php?do=rider_results&zwift_id={id}` | GET | ❌ NEE | Recent race results |

**Response:**
```typescript
{
  data: [{
    event_id: number,
    event_title: string,
    date: string,
    position: number,
    category: string,
    ftp: number,               // FTP at time of race
    weight: number,            // Weight at time of race
    power_avg: number,
    power_max: number,
    hr_avg: number,
    zp_points: number,         // ZwiftPower points
    flag: string               // DQ, CE, etc
  }]
}
```

**Potential Use:**
- 🔵 Results enrichment (DQ flags, ZP points)
- 🔵 Historical FTP tracking

---

### 🏁 EVENT RESULTS (via ZwiftRacing proxy)

| Endpoint | Method | Gebruikt | Data |
|----------|--------|----------|------|
| ZwiftRacing: `/public/zp/{eventId}/results` | GET | ❌ NEE | ZwiftPower results via proxy |

**Response:** ZwiftPower result data met extra fields:
```typescript
[{
  zwid: number,
  name: string,
  position: number,
  category: string,
  category_enforcement: boolean,  // ⭐ CE applied?
  flag: string,                   // 'DQ', 'CE', etc
  flag_description: string,       // Reason for flag
  age_group_pos: number,          // Age group position
  zp_points: number,
  ftp: number,
  weight: number
}]
```

**💡 ENRICHMENT DATA:**
- **Category Enforcement** - Was CE applied?
- **Disqualifications** - DQ flags with reason
- **Age Group Rankings** - Additional rankings
- **ZP Points** - ZwiftPower scoring

**Dashboard Use:**
- 🔵 Results Dashboard (DQ indicators, CE status)
- 🔵 Fair play monitoring

---

## 📊 Data Coverage Matrix

### Rider Performance Dashboard

| Data Field | ZwiftRacing | Zwift.com | ZwiftPower | Best Source |
|------------|-------------|-----------|------------|-------------|
| Name | ✅ | ✅ | ✅ | ZwiftRacing |
| vELO Rating | ✅ | ❌ | ❌ | ZwiftRacing |
| vELO History | ✅ (`history`) | ❌ | ❌ | ZwiftRacing |
| Category | ✅ | ❌ | ✅ | ZwiftRacing |
| FTP | ❌ | ❌ | ✅ | **ZwiftPower** ⭐ |
| Weight | ❌ | ❌ | ✅ | **ZwiftPower** ⭐ |
| Height | ❌ | ❌ | ❌ | Signups data |
| Avatar | ❌ | ✅ | ❌ | **Zwift.com** |
| Country | ❌ | ✅ | ✅ | Zwift.com |
| Power Curves | ✅ (results) | ❌ | ❌ | ZwiftRacing |
| Race Count 90d | ✅ | ❌ | ❌ | ZwiftRacing |
| Recent Activities | ❌ | ✅ | ❌ | **Zwift.com** |
| Social (followers) | ❌ | ✅ | ❌ | Zwift.com |

**Conclusie:** **3 sources nodig voor compleet profiel**

---

### Events Dashboard

| Data Field | ZwiftRacing | Zwift.com | ZwiftPower | Best Source |
|------------|-------------|-----------|------------|-------------|
| Event List | ✅ | ❌ | ❌ | ZwiftRacing |
| Event Details | ✅ | ❌ | ❌ | ZwiftRacing |
| Signups | ✅ | ❌ | ❌ | ZwiftRacing |
| Team Signups | ✅ | ❌ | ❌ | ZwiftRacing |
| Route Info | ✅ | ❌ | ❌ | ZwiftRacing |
| Route Profile | ✅ (`/api/routes`) | ❌ | ❌ | ZwiftRacing |

**Conclusie:** **1 source voldoende (ZwiftRacing)**

---

### Results Dashboard

| Data Field | ZwiftRacing | Zwift.com | ZwiftPower | Best Source |
|------------|-------------|-----------|------------|-------------|
| Rankings | ✅ | ❌ | ✅ | ZwiftRacing |
| Time/Speed | ✅ | ❌ | ✅ | ZwiftRacing |
| Power Data | ✅ | ❌ | ✅ | ZwiftRacing |
| Power Curves | ✅ | ❌ | ❌ | ZwiftRacing |
| Heart Rate | ✅ | ❌ | ✅ | ZwiftRacing |
| vELO Changes | ✅ | ❌ | ❌ | ZwiftRacing |
| DNF Status | ✅ | ❌ | ❌ | ZwiftRacing |
| Category Enforcement | ❌ | ❌ | ✅ | **ZwiftPower** ⭐ |
| DQ Flags | ❌ | ❌ | ✅ | **ZwiftPower** ⭐ |
| ZP Points | ❌ | ❌ | ✅ | ZwiftPower |
| Age Group Rank | ❌ | ❌ | ✅ | ZwiftPower |

**Conclusie:** **2 sources voor enriched results (ZwiftRacing + ZwiftPower)**

---

## 🎯 Stappenplan: Implementatie Strategie

### FASE 1: Database Schema Design ✅ DONE
**Status:** Unified schema ontworpen in `UNIFIED_DASHBOARD_ARCHITECTURE.md`

Tabellen:
- `riders_unified` - Multi-source rider data
- `events_unified` - Events van ZwiftRacing
- `event_signups_unified` - Signups tracking
- `race_results_unified` - Results + ZP enrichment
- `rider_rating_history` - vELO over tijd

---

### FASE 2: API Client Optimization (1-2 uur)

**Prioriteit 1: Ontbrekende endpoints implementeren**
```typescript
// In zwift-client.ts - ADD MISSING METHODS

// 1. Individual rider (voor rating history!)
async getRider(riderId: number): Promise<ZwiftRider> {
  // GET /public/riders/{riderId}
  // Response heeft 'history' array met vELO over tijd!
}

// 2. Bulk riders (voor efficiency)
async getBulkRiders(riderIds: number[]): Promise<ZwiftRider[]> {
  // POST /public/riders
  // Max 1000 riders, rate limit 1/15min
}
```

**Prioriteit 2: ZwiftPower event results**
```typescript
// In zwift-client.ts - ENABLE EXISTING METHOD

async getEventResultsZwiftPower(eventId: number): Promise<any[]> {
  // GET /public/zp/{eventId}/results
  // Enrich results met CE, DQ, ZP points
}
```

**Prioriteit 3: Zwift.com profile optimization**
```typescript
// In zwift-official-client.ts - OPTIMIZE

async getProfileBatch(profileIds: number[]): Promise<ZwiftProfile[]> {
  // Parallel fetch met rate limiting
  // Max 5 concurrent requests
}
```

---

### FASE 3: Unified Sync Orchestrator (3-4 uur)

**File:** `backend/src/services/unified-sync-orchestrator.service.ts`

```typescript
class UnifiedSyncOrchestrator {
  
  // PHASE 1: Riders (3 sources parallel)
  async syncRiders(riderIds: number[]) {
    await Promise.allSettled([
      this.syncRidersFromZwiftRacing(riderIds),    // vELO, category
      this.syncRidersFromZwiftOfficial(riderIds),  // Avatar, activities
      this.syncRidersFromZwiftPower(riderIds)      // FTP, weight
    ]);
  }
  
  // PHASE 2: Events + Signups (sequential)
  async syncEventsWithSignups() {
    const events = await zwiftRacingClient.getUpcomingEvents();
    // Save to events_unified
    
    for (const event of events) {
      const signups = await zwiftRacingClient.getEventSignups(event.id);
      // Save to event_signups_unified (filter team)
    }
  }
  
  // PHASE 3: Results + Enrichment (sequential)
  async syncResultsWithEnrichment(daysBack: number) {
    // 1. Get team events
    const teamEvents = await getEventsWithTeamSignups(daysBack);
    
    // 2. For each event: ZwiftRacing results
    for (const event of teamEvents) {
      const results = await zwiftRacingClient.getEventResults(event.id);
      // Save to race_results_unified
      
      // 3. ENRICH: ZwiftPower data
      const zpResults = await zwiftRacingClient.getEventResultsZwiftPower(event.id);
      // UPDATE race_results_unified with CE, DQ, ZP points
    }
  }
  
  // ORCHESTRATE: Full sync
  async executeFullSync() {
    await this.syncRiders(teamMemberIds);           // 3 sources
    await this.syncEventsWithSignups();             // 1 source
    await this.syncResultsWithEnrichment(30);       // 2 sources
  }
}
```

---

### FASE 4: Database Migrations (1 uur)

**File:** `supabase/migrations/XXX_unified_schema.sql`

1. Create `riders_unified` table
2. Create `events_unified` table
3. Create `event_signups_unified` table
4. Create `race_results_unified` table
5. Create `rider_rating_history` table
6. Add indices (rider_id, event_id, dates)
7. Add foreign keys (cascade deletes)

---

### FASE 5: Dashboard API Endpoints (2-3 uur)

**File:** `backend/src/api/endpoints/unified-dashboard.ts`

```typescript
// 1. Rider Performance Dashboard
GET /api/dashboard/rider/:riderId
  → riders_unified + rating_history + recent results
  → 1 unified response

// 2. Events Dashboard
GET /api/dashboard/events/upcoming?hours=168
  → events_unified + team signups
  → 1 unified response

// 3. Results Dashboard
GET /api/dashboard/results/team?days=30
  → race_results_unified (team only)
  → Group by event
  → 1 unified response
```

---

### FASE 6: Data Migration (1-2 uur)

**Strategy: Zero Downtime**

1. Run unified sync orchestrator (populate nieuwe tabellen)
2. Verify data integrity (row counts, foreign keys)
3. Update frontend endpoints (feature flag)
4. Monitor for 24h
5. Deprecate old tables

---

### FASE 7: Frontend Updates (2-3 uur)

**Update existing dashboards:**

1. `RidersModern.tsx`
   - Change endpoint: `/api/riders/team` → `/api/dashboard/rider/:id`
   - Add: vELO history graph
   - Add: Recent activities from Zwift.com
   - Add: FTP/W/kg display

2. `EventsModern.tsx`
   - Change endpoint: `/api/events/upcoming` → `/api/dashboard/events/upcoming`
   - Add: Route profile badges
   - Add: Team signup indicators
   - Add: Signup power profiles

3. `ResultsModern.tsx`
   - Change endpoint: `/api/results/team/recent` → `/api/dashboard/results/team`
   - Add: ZP enrichment badges (CE, DQ)
   - Add: Age group rankings
   - Add: Power curve comparisons

---

## ⏱️ Geschatte Tijdlijn

| Fase | Geschatte Tijd | Prioriteit |
|------|---------------|------------|
| 1. Database Schema | ✅ DONE | - |
| 2. API Client Optimization | 1-2 uur | 🔴 HIGH |
| 3. Unified Sync Orchestrator | 3-4 uur | 🔴 HIGH |
| 4. Database Migrations | 1 uur | 🔴 HIGH |
| 5. Dashboard API Endpoints | 2-3 uur | 🟡 MEDIUM |
| 6. Data Migration | 1-2 uur | 🟡 MEDIUM |
| 7. Frontend Updates | 2-3 uur | 🟢 LOW |
| **TOTAAL** | **10-15 uur** | |

---

## 🚀 Aanbevolen Volgorde

### Dag 1 (4-6 uur): Backend Foundation
1. ✅ API clients optimization (ontbrekende endpoints)
2. ✅ Database migrations (unified schema)
3. ✅ Unified sync orchestrator (basis implementatie)
4. ✅ Test sync (verify data in nieuwe tabellen)

### Dag 2 (3-4 uur): API Layer
1. ✅ Dashboard API endpoints (3 dashboards)
2. ✅ Test endpoints (Postman/curl)
3. ✅ Run full sync (populate alle data)

### Dag 3 (3-5 uur): Frontend + Deploy
1. ✅ Frontend updates (3 dashboards)
2. ✅ Test in dev environment
3. ✅ Deploy to Railway
4. ✅ Monitor + verify

---

## 💡 Quick Wins (Low Hanging Fruit)

### 1. Add Rating History Graph (30 min)
**Endpoint al beschikbaar:** `GET /public/riders/{riderId}` heeft `history` array!
```typescript
// Response.data.history = [{ time: number, rating: number }]
// Direct bruikbaar voor vELO trend graph
```

### 2. Enable ZwiftPower Enrichment (1 uur)
**Methode bestaat al:** `getEventResultsZwiftPower(eventId)`
```typescript
// Alleen aanroepen in results sync:
const zpResults = await zwiftClient.getEventResultsZwiftPower(eventId);
// Merge CE/DQ flags in race_results_unified
```

### 3. Add Route Profiles (30 min)
**Data beschikbaar:** `/api/routes` al geïmplementeerd
```typescript
// In events display: show route.profile badge
// 'Flat' → 🟢 | 'Rolling' → 🟡 | 'Hilly' → 🟠 | 'Mountainous' → 🔴
```

---

## ❓ Vragen voor Gebruiker

1. **Wil je ALLE fasen?** Of eerst foundation (Dag 1) en dan evalueren?

2. **ZwiftPower priority?** Essentieel voor FTP/weight data en CE/DQ flags

3. **Bulk rider endpoint?** Willen we deze gebruiken voor efficiency? (1/15min voor alle 75 riders)

4. **Breaking changes OK?** Database migratie betekent tijdelijk beide schemas parallel

5. **Frontend updates samen?** Of eerst backend + API klaar, dan frontend later?

**Waar wil je beginnen?** 🚀
