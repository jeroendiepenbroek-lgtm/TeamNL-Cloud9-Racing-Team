# Dashboard Data Sourcing Strategie

**Voor**: Frontend Dashboards - Matrix, Results, Events  
**Datum**: 26 November 2025  
**Status**: Complete Data Sourcing Matrix

---

## 📊 Dashboard Overzicht

De applicatie heeft 3 primaire dashboards:

1. **Matrix Dashboard** - Rider overview, team stats, rankings
2. **Results Dashboard** - Race history, performance analysis
3. **Events Dashboard** - Upcoming/recent events, signups

---

## 1️⃣ Matrix Dashboard

### Doel
Overzicht van alle club riders met actuele stats, rankings en snelle inzichten.

### Weergave Velden (Tabel)

| Kolom | Data Source | Prioriteit | Fallback | Refresh | Type |
|-------|-------------|------------|----------|---------|------|
| **Rider ID** | Alle APIs | Required | - | - | Number |
| **Naam** | Zwift.com → ZwiftRacing | Required | lastName | 1x/dag | String |
| **Foto** | Zwift.com | Optional | Default avatar | 1x/week | Image URL |
| **Team** | ZwiftRacing | Required | - | 1x/dag | String |
| **Land** | Zwift.com → ZwiftRacing | Required | - | 1x/week | Flag |
| **FTP** | **Zwift.com** ✅ | **Required** | ZwiftRacing → ZwiftPower | **1x/uur** | Number |
| **Weight** | **Zwift.com** ✅ | **Required** | ZwiftRacing → ZwiftPower | **1x/uur** | Number |
| **W/kg** | Calculated (FTP/Weight) | Required | - | Live | Number |
| **Category** | **Zwift.com** ✅ | **Required** | Calculated from W/kg | **1x/uur** | String |
| **Racing Score (ZRS)** | **Zwift.com** ✅ | Important | vELO from ZwiftRacing | **1x/uur** | Number |
| **vELO Rating** | ZwiftRacing | Important | - | 4x/dag | Number |
| **Total Races** | ZwiftRacing | Important | - | 4x/dag | Number |
| **Last Race** | ZwiftRacing | Important | - | 4x/dag | Date |
| **Last Race Position** | ZwiftRacing | Optional | - | 4x/dag | String |
| **Last Race Rating Δ** | ZwiftRacing | Optional | - | 4x/dag | Number |
| **Current Streak** | **Zwift.com** ✅ | Important | - | **1x/uur** | Number |
| **Followers** | Zwift.com | Nice-to-have | - | 1x/dag | Number |
| **Overall Rank** | ZwiftRacing | Optional | - | 1x/dag | String |
| **Category Rank** | ZwiftRacing | Optional | - | 1x/dag | String |
| **Data Freshness** | Calculated | Required | - | Live | String |

### Data Fetching Strategy

```typescript
// Matrix Dashboard Data Service
async getMatrixData(clubId: number) {
  // 1. Get all club riders from database
  const riders = await db.getRiders({ clubId });
  
  // 2. For each rider, fetch latest data
  const enrichedRiders = await Promise.all(
    riders.map(async (rider) => {
      // Parallel fetch from all APIs
      const [zwiftCom, zwiftRacing, zwiftPower] = await Promise.allSettled([
        this.zwiftComApi.getProfile(rider.zwift_id), // Priority 1
        this.zwiftRacingApi.getRider(rider.zwift_id), // Priority 2
        this.zwiftPowerApi.getRider(rider.zwift_id)   // Priority 3 (fallback)
      ]);
      
      return {
        // Prioriteit: Zwift.com > ZwiftRacing > ZwiftPower
        ftp: zwiftCom?.ftp ?? zwiftRacing?.ftp ?? zwiftPower?.ftp,
        weight: zwiftCom?.weight / 1000 ?? zwiftRacing?.weight ?? zwiftPower?.weight_kg,
        category: zwiftCom?.competitionMetrics?.category ?? calculateCategory(...),
        racingScore: zwiftCom?.competitionMetrics?.racingScore,
        vELO: zwiftRacing?.rating,
        totalRaces: zwiftRacing?.totalRaces,
        lastRace: zwiftRacing?.latestResult,
        streak: zwiftCom?.streaksCurrentLength,
        // ...
      };
    })
  );
  
  return enrichedRiders;
}
```

### Filter & Sort Opties

**Filters**:
- Team (dropdown)
- Category (A+, A, B, C, D, E)
- Min/Max FTP range
- Min/Max W/kg range
- Active riders only (raced in last 30 days)

**Sort**:
- Racing Score (ZRS) - hoogste eerst
- vELO Rating - hoogste eerst
- Total Races - meeste eerst
- Last Race - meest recent eerst
- Category Rank - beste eerst
- Alphabetical - A-Z

### Card View (Alternative Layout)

Voor grotere details per rider:

```typescript
interface MatrixCard {
  // Header
  avatar: string; // Zwift.com imageSrc
  name: string; // Zwift.com firstName + lastName
  team: string; // ZwiftRacing teamName
  flag: string; // Zwift.com countryAlpha3
  
  // Stats Row 1
  ftp: number; // Zwift.com ftp
  weight: number; // Zwift.com weight
  wkg: number; // Calculated
  
  // Stats Row 2
  category: string; // Zwift.com category
  racingScore: number; // Zwift.com racingScore
  vELO: number; // ZwiftRacing rating
  
  // Recent Activity
  lastRace: {
    date: Date; // ZwiftRacing latestResult.event.time
    position: number; // ZwiftRacing latestResult.position
    ratingDelta: number; // ZwiftRacing latestResult.ratingDelta
  };
  
  // Lifetime Stats
  totalRaces: number; // ZwiftRacing totalRaces
  totalDistance: number; // Zwift.com totalDistance / 1000
  streak: number; // Zwift.com streaksCurrentLength
  
  // Power Curve (ZwiftPower) - expandable
  powerCurve: {
    w5: number,
    w15: number,
    w30: number,
    w60: number,
    w120: number,
    w300: number,
    w1200: number
  };
  
  // Actions
  actions: ['View Profile', 'Compare', 'Message'];
}
```

---

## 2️⃣ Results Dashboard

### Doel
Gedetailleerd overzicht van alle race resultaten met analytics en filters.

### Weergave Velden (Tabel)

| Kolom | Data Source | Prioriteit | Refresh | Type |
|-------|-------------|------------|---------|------|
| **Event ID** | ZwiftRacing | Required | 4x/dag | String |
| **Datum** | ZwiftRacing | Required | 4x/dag | Date |
| **Event Naam** | ZwiftRacing | Required | 4x/dag | String |
| **Route** | ZwiftRacing | Required | 4x/dag | String |
| **World** | ZwiftRacing | Optional | 4x/dag | String |
| **Type** | ZwiftRacing | Required | 4x/dag | Badge |
| **Subtype** | ZwiftRacing | Optional | 4x/dag | Badge |
| **Distance** | ZwiftRacing | Required | 4x/dag | Number |
| **Elevation** | ZwiftRacing | Optional | 4x/dag | Number |
| **Profile** | ZwiftRacing | Optional | 4x/dag | Badge |
| **Rider Naam** | ZwiftRacing | Required | 4x/dag | String |
| **Positie** | ZwiftRacing | Required | 4x/dag | String |
| **Category Positie** | ZwiftRacing | Optional | 4x/dag | String |
| **Tijd** | ZwiftRacing | Required | 4x/dag | Time |
| **Gap** | ZwiftRacing | Optional | 4x/dag | Time |
| **Avg Speed** | ZwiftRacing | Optional | 4x/dag | Number |
| **Avg W/kg** | ZwiftRacing | Required | 4x/dag | Number |
| **Max 5s W/kg** | ZwiftRacing | Optional | 4x/dag | Number |
| **Max 1min W/kg** | ZwiftRacing | Optional | 4x/dag | Number |
| **Max 5min W/kg** | ZwiftRacing | Optional | 4x/dag | Number |
| **NP** | ZwiftRacing | Optional | 4x/dag | Number |
| **FTP** | ZwiftRacing | Optional | 4x/dag | Number |
| **ZP Category** | ZwiftRacing | Optional | 4x/dag | String |
| **Training Load** | ZwiftRacing | Optional | 4x/dag | Number |
| **Avg HR** | ZwiftRacing | Optional | 4x/dag | Number |
| **Max HR** | ZwiftRacing | Optional | 4x/dag | Number |
| **Rating** | ZwiftRacing | Required | 4x/dag | Number |
| **Rating Δ** | ZwiftRacing | Required | 4x/dag | Number |
| **Rank Points** | ZwiftRacing | Optional | 4x/dag | Number |
| **Penalty** | ZwiftRacing | Optional | 4x/dag | Number |

### Data Fetching Strategy

```typescript
// Results Dashboard Data Service
async getResultsData(filters: ResultsFilters) {
  // Option 1: Filter rider first
  if (filters.riderId) {
    const results = await zwiftRacingApi.getRiderResults(filters.riderId, {
      limit: filters.limit ?? 100,
      skip: filters.skip ?? 0
    });
    return results;
  }
  
  // Option 2: Get all club results (requires custom endpoint)
  const clubRiders = await db.getRiders({ clubId: filters.clubId });
  const allResults = await Promise.all(
    clubRiders.map(rider => 
      zwiftRacingApi.getRiderResults(rider.zwift_id, { limit: 50 })
    )
  );
  
  // Merge, sort, filter
  const merged = allResults.flat().sort((a, b) => 
    b.event.time - a.event.time // Nieuwste eerst
  );
  
  // Apply filters
  return applyFilters(merged, filters);
}
```

### Filter & Analytics Opties

**Filters**:
- Date range (last 7/30/90 days, custom)
- Rider (dropdown of club members)
- Event type (Race/Workout/Group Ride)
- Race subtype (Scratch/Points/TT/TTT)
- Route profile (Flat/Rolling/Hilly/Mountain)
- World (Watopia/Makuri Islands/etc)
- Min/Max position
- Category (A+/A/B/C/D/E)

**Analytics Views**:
1. **Performance Trends**
   - Rating progression chart (ZwiftRacing vELO)
   - Average W/kg per race
   - Average position per race
   
2. **Power Analysis**
   - Power curve comparison (race vs all-time best from ZwiftPower)
   - Normalized Power trends
   - Training load accumulation

3. **Category Analysis**
   - % races per category
   - Win rate per category
   - Average position per category

### Detail View (Expandable Row)

Wanneer een result row wordt geklikt:

```typescript
interface ResultDetail {
  // Event Info (van ZwiftRacing)
  event: {
    id: string,
    title: string,
    time: Date,
    route: {
      name: string,
      world: string,
      profile: string,
      distance: number,
      elevation: number
    },
    totalFinishers: number
  },
  
  // Rider Performance (van ZwiftRacing)
  performance: {
    position: number,
    positionInCategory: number,
    time: number,
    gap: number,
    avgSpeed: number,
    avgWkg: number,
    powerCurve: {
      wkg5: number,
      wkg15: number,
      wkg30: number,
      wkg60: number,
      wkg120: number,
      wkg300: number,
      wkg1200: number
    },
    np: number,
    ftp: number,
    heartRate: { avg: number, max: number }
  },
  
  // Rating Impact (van ZwiftRacing)
  rating: {
    eventRating: number,
    ratingBefore: number,
    ratingAfter: number,
    ratingDelta: number,
    rankPoints: number
  },
  
  // Comparison with PB (van ZwiftPower)
  comparison: {
    w5: { race: number, pb: number, diff: number },
    w15: { race: number, pb: number, diff: number },
    w30: { race: number, pb: number, diff: number },
    w60: { race: number, pb: number, diff: number },
    w120: { race: number, pb: number, diff: number },
    w300: { race: number, pb: number, diff: number },
    w1200: { race: number, pb: number, diff: number }
  },
  
  // Links
  links: {
    zwiftPower: string,
    zwiftRacing: string,
    strava?: string // Als beschikbaar
  }
}
```

---

## 3️⃣ Events Dashboard

### Doel
Overzicht van upcoming en recent events met signup tracking.

### Weergave Velden (Tabel)

| Kolom | Data Source | Prioriteit | Refresh | Type | Notes |
|-------|-------------|------------|---------|------|-------|
| **Event ID** | ZwiftRacing | Required | 4x/dag | String | - |
| **Status** | Calculated | Required | Live | Badge | Upcoming/Live/Finished |
| **Datum** | ZwiftRacing | Required | 4x/dag | Date | - |
| **Tijd** | ZwiftRacing | Required | 4x/dag | Time | - |
| **Event Naam** | ZwiftRacing | Required | 4x/dag | String | - |
| **Organizer** | ZwiftRacing | Optional | 4x/dag | String | Uit event title? |
| **Route** | ZwiftRacing | Required | 4x/dag | String | - |
| **World** | ZwiftRacing | Required | 4x/dag | String | - |
| **Distance** | ZwiftRacing | Required | 4x/dag | Number | - |
| **Elevation** | ZwiftRacing | Optional | 4x/dag | Number | - |
| **Profile** | ZwiftRacing | Required | 4x/dag | Badge | Flat/Rolling/Hilly/Mountain |
| **Type** | ZwiftRacing | Required | 4x/dag | Badge | Race/Workout/etc |
| **Subtype** | ZwiftRacing | Optional | 4x/dag | Badge | Scratch/Points/TT/TTT |
| **Signups** | ❌ **NIET BESCHIKBAAR** | Nice-to-have | - | Number | Zou handmatig moeten |
| **Club Members Signed Up** | ❌ **NIET BESCHIKBAAR** | Important | - | String | Zou handmatig moeten |
| **Results Available** | ZwiftRacing | Optional | 4x/dag | Boolean | resultsFinalized flag |
| **Total Finishers** | ZwiftRacing | Optional | Na race | Number | Uit results halen |
| **Winning Time** | ZwiftRacing | Optional | Na race | Time | Uit results halen |
| **Club Best Position** | Calculated | Optional | Na race | String | Beste positie van club member |

### Data Fetching Strategy

```typescript
// Events Dashboard Data Service
async getEventsData(filters: EventsFilters) {
  // PROBLEEM: ZwiftRacing API heeft geen dedicated events endpoint
  // We moeten events extraheren uit rider results
  
  // Workaround 1: Recente events uit club rider results
  const clubRiders = await db.getRiders({ clubId: filters.clubId });
  const recentResults = await Promise.all(
    clubRiders.map(rider => 
      zwiftRacingApi.getRiderResults(rider.zwift_id, { limit: 10 })
    )
  );
  
  // Extract unique events
  const events = new Map();
  recentResults.flat().forEach(result => {
    const eventId = result.event.id;
    if (!events.has(eventId)) {
      events.set(eventId, {
        ...result.event,
        clubParticipants: [],
        clubBestPosition: null
      });
    }
    
    // Track club participants
    events.get(eventId).clubParticipants.push({
      riderId: result.riderId,
      name: result.name,
      position: result.position,
      time: result.time
    });
    
    // Track best position
    if (!events.get(eventId).clubBestPosition || 
        result.position < events.get(eventId).clubBestPosition.position) {
      events.get(eventId).clubBestPosition = {
        riderId: result.riderId,
        name: result.name,
        position: result.position
      };
    }
  });
  
  // Sort by date (newest first)
  return Array.from(events.values())
    .sort((a, b) => b.time - a.time)
    .filter(event => {
      // Filter based on time window
      const eventDate = new Date(event.time * 1000);
      if (filters.upcoming) {
        return eventDate > new Date(); // Future events
      }
      if (filters.recent) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return eventDate > weekAgo && eventDate <= new Date();
      }
      return true;
    });
}
```

**⚠️ LIMITATIONS**:
- Geen dedicated events API endpoint
- Geen signup tracking beschikbaar
- Kunnen alleen events zien waar club members aan deelnamen
- Kunnen geen upcoming events zien (tenzij handmatig toegevoegd)

### Mogelijke Oplossingen

#### Oplossing 1: Manual Event Management
```typescript
// Create manual events table in database
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  zwift_event_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  route_name VARCHAR(255),
  world VARCHAR(100),
  distance DECIMAL(6,2),
  elevation INTEGER,
  profile VARCHAR(50),
  type VARCHAR(50),
  subtype VARCHAR(50),
  organizer VARCHAR(255),
  signup_link VARCHAR(500),
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

// Track signups manually
CREATE TABLE event_signups (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  rider_id INTEGER REFERENCES riders(zwift_id),
  signed_up_at TIMESTAMP DEFAULT NOW(),
  confirmed BOOLEAN DEFAULT false
);
```

#### Oplossing 2: Zwift Companion App Integration
- Zou theoretisch mogelijk zijn via unofficial API
- Zeer complex, mogelijk instabiel
- **Niet aanbevolen voor MVP**

#### Oplossing 3: Community Calendar Scraping
- Scrape Zwift community calendar
- Kan instabiel zijn
- Rechten onduidelijk

**Aanbeveling**: Start met **Oplossing 1** (Manual Event Management) voor MVP.

### Filter & Sort Opties

**Filters**:
- Time window (Upcoming/This Week/Last Week/This Month)
- Route profile (Flat/Rolling/Hilly/Mountain)
- World (Watopia/Makuri Islands/etc)
- Event type (Race/Workout)
- Race subtype (Scratch/Points/TT/TTT)
- Club participation (events with club members only)

**Sort**:
- Date (newest/oldest first)
- Distance (shortest/longest first)
- Elevation (least/most first)
- Club participation (most/least riders)

### Detail View (Expandable Row)

```typescript
interface EventDetail {
  // Event Info
  event: {
    id: string,
    title: string,
    date: Date,
    route: {
      name: string,
      world: string,
      profile: string,
      distance: number,
      elevation: number,
      map?: string // Route map image
    },
    type: string,
    subtype: string,
    organizer?: string
  },
  
  // Results (if available)
  results: {
    finalized: boolean,
    totalFinishers: number,
    winningTime: number,
    clubResults: [
      {
        riderId: number,
        name: string,
        position: number,
        time: number,
        gap: number,
        ratingDelta: number
      }
    ]
  },
  
  // Signups (if manual tracking enabled)
  signups: {
    total: number,
    clubMembers: [
      {
        riderId: number,
        name: string,
        confirmed: boolean,
        signedUpAt: Date
      }
    ]
  },
  
  // Links
  links: {
    zwiftCompanion?: string,
    zwiftPower?: string,
    zwiftRacing?: string
  }
}
```

---

## 🎯 Data Sourcing Matrix Samenvatting

### Matrix Dashboard

| Veld | Source 1 (Primary) | Source 2 (Fallback) | Source 3 (Fallback) | Refresh |
|------|-------------------|---------------------|---------------------|---------|
| FTP | **Zwift.com** ✅ | ZwiftRacing | ZwiftPower | 1x/uur |
| Weight | **Zwift.com** ✅ | ZwiftRacing | ZwiftPower | 1x/uur |
| Category | **Zwift.com** ✅ | Calculated | ZwiftPower | 1x/uur |
| Racing Score | **Zwift.com** ✅ | - | - | 1x/uur |
| vELO | **ZwiftRacing** ✅ | - | - | 4x/dag |
| Total Races | **ZwiftRacing** ✅ | - | - | 4x/dag |
| Power Curve | **ZwiftPower** ✅ | ZwiftRacing (per race) | - | 1x/dag |
| Streak | **Zwift.com** ✅ | - | - | 1x/uur |
| Followers | **Zwift.com** ✅ | - | - | 1x/dag |

### Results Dashboard

| Veld | Source | Refresh |
|------|--------|---------|
| **ALL RACE DATA** | **ZwiftRacing** ✅ | 4x/dag |
| Power Curve Comparison | ZwiftPower (all-time best) | 1x/dag |

### Events Dashboard

| Veld | Source | Refresh | Notes |
|------|--------|---------|-------|
| Event List (Recent) | **ZwiftRacing** ✅ | 4x/dag | Via rider results |
| Event List (Upcoming) | **Manual Database** ⚠️ | On-demand | Must be added manually |
| Results | **ZwiftRacing** ✅ | After race | - |
| Signups | **Manual Database** ⚠️ | On-demand | Must be tracked manually |

---

## 🔧 Implementation Recommendations

### 1. API Service Layer Architecture

```typescript
// backend/src/services/unified-data.service.ts

class UnifiedDataService {
  constructor(
    private zwiftComService: ZwiftComService,
    private zwiftRacingService: ZwiftRacingService,
    private zwiftPowerService: ZwiftPowerService,
    private cacheService: CacheService
  ) {}
  
  // Matrix Dashboard
  async getMatrixData(clubId: number): Promise<MatrixDashboardData> {
    const cacheKey = `matrix:${clubId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached && !this.isStale(cached, '1 hour')) {
      return cached;
    }
    
    const riders = await this.getRidersWithAllData(clubId);
    const result = this.formatForMatrix(riders);
    
    await this.cacheService.set(cacheKey, result, '1 hour');
    return result;
  }
  
  // Results Dashboard
  async getResultsData(filters: ResultsFilters): Promise<ResultsDashboardData> {
    // Always fresh from ZwiftRacing
    const results = await this.zwiftRacingService.getResults(filters);
    
    // Enrich with power curve comparison
    const enriched = await this.enrichWithPowerCurve(results);
    
    return enriched;
  }
  
  // Events Dashboard
  async getEventsData(filters: EventsFilters): Promise<EventsDashboardData> {
    // Get recent events from ZwiftRacing
    const recentEvents = await this.extractEventsFromResults(filters.clubId);
    
    // Get upcoming events from manual database
    const upcomingEvents = await this.db.getUpcomingEvents(filters);
    
    // Merge and sort
    return [...upcomingEvents, ...recentEvents].sort(...);
  }
  
  // Helper: Get rider with data from all APIs
  private async getRidersWithAllData(clubId: number) {
    const riders = await this.db.getRiders({ clubId });
    
    return Promise.all(riders.map(async (rider) => {
      const [zwiftCom, zwiftRacing, zwiftPower] = await Promise.allSettled([
        this.zwiftComService.getProfile(rider.zwift_id),
        this.zwiftRacingService.getRider(rider.zwift_id),
        this.zwiftPowerService.getRiderData(rider.zwift_id)
      ]);
      
      return this.mergeRiderData(rider, zwiftCom, zwiftRacing, zwiftPower);
    }));
  }
  
  // Helper: Merge data with priority
  private mergeRiderData(
    dbRider: Rider,
    zwiftCom: PromiseSettledResult<any>,
    zwiftRacing: PromiseSettledResult<any>,
    zwiftPower: PromiseSettledResult<any>
  ) {
    const zc = zwiftCom.status === 'fulfilled' ? zwiftCom.value : null;
    const zr = zwiftRacing.status === 'fulfilled' ? zwiftRacing.value : null;
    const zp = zwiftPower.status === 'fulfilled' ? zwiftPower.value : null;
    
    return {
      riderId: dbRider.zwift_id,
      name: zc?.firstName + ' ' + zc?.lastName ?? zr?.name ?? dbRider.name,
      
      // Priority: Zwift.com > ZwiftRacing > ZwiftPower > Database
      ftp: zc?.ftp ?? zr?.ftp ?? zp?.ftp ?? dbRider.ftp,
      weight: zc?.weight / 1000 ?? zr?.weight ?? zp?.weight_kg ?? dbRider.weight,
      category: zc?.competitionMetrics?.category ?? this.calculateCategory(...) ?? dbRider.category,
      racingScore: zc?.competitionMetrics?.racingScore ?? null,
      
      // ZwiftRacing specific
      vELO: zr?.rating ?? dbRider.velo_rating,
      totalRaces: zr?.totalRaces ?? 0,
      lastRace: zr?.latestResult ?? null,
      
      // ZwiftPower specific
      powerCurve: zp?.power_curve ?? null,
      
      // Zwift.com specific
      streak: zc?.streaksCurrentLength ?? null,
      followers: zc?.socialFacts?.followersCount ?? null,
      totalDistance: zc?.totalDistance / 1000 ?? null,
      
      // Meta
      dataFreshness: this.calculateFreshness([zc, zr, zp])
    };
  }
}
```

### 2. Caching Strategy

```typescript
// Cache durations per data type
const CACHE_DURATIONS = {
  // Zwift.com data - 1 hour (actueel, vaak wijziging)
  'zwift-com-profile': 3600,
  
  // ZwiftRacing data - 6 hours (updates 4x/dag)
  'zwift-racing-rider': 21600,
  'zwift-racing-results': 21600,
  
  // ZwiftPower data - 24 hours (power curve wijzigt langzaam)
  'zwift-power-rider': 86400,
  
  // Dashboard aggregaties - 1 hour
  'matrix-dashboard': 3600,
  'results-dashboard': 3600,
  'events-dashboard': 3600
};

// Redis cache keys
const CACHE_KEYS = {
  zwiftComProfile: (riderId: number) => `zc:profile:${riderId}`,
  zwiftRacingRider: (riderId: number) => `zr:rider:${riderId}`,
  zwiftRacingResults: (riderId: number) => `zr:results:${riderId}`,
  zwiftPowerRider: (riderId: number) => `zp:rider:${riderId}`,
  matrixDashboard: (clubId: number) => `dash:matrix:${clubId}`,
  resultsDashboard: (filters: string) => `dash:results:${filters}`,
  eventsDashboard: (filters: string) => `dash:events:${filters}`
};
```

### 3. Database Schema Updates

```sql
-- Add Zwift.com specific fields to riders table
ALTER TABLE riders ADD COLUMN IF NOT EXISTS zwift_racing_score DECIMAL(10,2);
ALTER TABLE riders ADD COLUMN IF NOT EXISTS zwift_category VARCHAR(2);
ALTER TABLE riders ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS total_distance_meters BIGINT DEFAULT 0;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS total_time_minutes INTEGER DEFAULT 0;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS last_ride_timestamp TIMESTAMP;

-- Create power curve table
CREATE TABLE IF NOT EXISTS rider_power_curve (
  rider_id INTEGER PRIMARY KEY REFERENCES riders(zwift_id),
  w5 INTEGER,
  w15 INTEGER,
  w30 INTEGER,
  w60 INTEGER,
  w120 INTEGER,
  w300 INTEGER,
  w1200 INTEGER,
  source VARCHAR(50) DEFAULT 'zwiftpower',
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (rider_id) REFERENCES riders(zwift_id) ON DELETE CASCADE
);

-- Create manual events table
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  zwift_event_id VARCHAR(50) UNIQUE,
  title VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  route_name VARCHAR(255),
  route_world VARCHAR(100),
  distance DECIMAL(6,2),
  elevation INTEGER,
  profile VARCHAR(50) CHECK (profile IN ('Flat', 'Rolling', 'Hilly', 'Mountain')),
  type VARCHAR(50) DEFAULT 'Race',
  subtype VARCHAR(50) CHECK (subtype IN ('Scratch', 'Points', 'TT', 'TTT')),
  organizer VARCHAR(255),
  signup_link VARCHAR(500),
  notes TEXT,
  results_available BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create event signups table
CREATE TABLE IF NOT EXISTS event_signups (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  rider_id INTEGER REFERENCES riders(zwift_id) ON DELETE CASCADE,
  signed_up_at TIMESTAMP DEFAULT NOW(),
  confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  UNIQUE(event_id, rider_id)
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS rider_achievements (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER REFERENCES riders(zwift_id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(255) NOT NULL,
  achievement_category VARCHAR(50),
  achievement_description TEXT,
  achievement_value INTEGER DEFAULT 0,
  event_id VARCHAR(50),
  earned_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(rider_id, achievement_id)
);

-- Create data freshness tracking table
CREATE TABLE IF NOT EXISTS api_sync_log (
  id SERIAL PRIMARY KEY,
  api_source VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  sync_started_at TIMESTAMP NOT NULL,
  sync_completed_at TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed')),
  error_message TEXT,
  records_synced INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_riders_zwift_racing_score ON riders(zwift_racing_score DESC);
CREATE INDEX IF NOT EXISTS idx_riders_category ON riders(zwift_category);
CREATE INDEX IF NOT EXISTS idx_riders_streak ON riders(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date DESC);
CREATE INDEX IF NOT EXISTS idx_event_signups_event ON event_signups(event_id);
CREATE INDEX IF NOT EXISTS idx_event_signups_rider ON event_signups(rider_id);
CREATE INDEX IF NOT EXISTS idx_achievements_rider ON rider_achievements(rider_id);
CREATE INDEX IF NOT EXISTS idx_achievements_earned ON rider_achievements(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_sync_log_source ON api_sync_log(api_source, entity_type, entity_id);
```

---

## 📈 Monitoring & Alerts

### Data Freshness Monitoring

```typescript
// Check data freshness voor elk dashboard
interface DataFreshness {
  dashboard: 'matrix' | 'results' | 'events';
  lastUpdate: Date;
  apiSources: {
    zwiftCom: { lastSync: Date; status: 'ok' | 'stale' | 'error' };
    zwiftRacing: { lastSync: Date; status: 'ok' | 'stale' | 'error' };
    zwiftPower: { lastSync: Date; status: 'ok' | 'stale' | 'error' };
  };
  warnings: string[];
}

// Alert wanneer data te oud is
async checkDataFreshness() {
  const freshness = await this.calculateFreshness();
  
  if (freshness.apiSources.zwiftCom.status === 'stale') {
    await this.alertAdmin('Zwift.com data is stale - FTP/category may be outdated');
  }
  
  if (freshness.apiSources.zwiftRacing.status === 'error') {
    await this.alertAdmin('ZwiftRacing API error - race results unavailable');
  }
}
```

---

**Einde Data Sourcing Strategie**
