# 🎯 DATA SOURCING STRATEGY - TeamNL Cloud9 Racing Team

**Versie**: 1.0 Definitief  
**Datum**: 5 december 2025  
**Status**: Production Architecture

---

## 📊 OVERZICHT

**3 Frontend Dashboards** → **Railway Backend API** → **Supabase Database** ← **3 External APIs**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Racing Matrix│  │   Results    │  │       Events            │  │
│  │  Dashboard   │  │  Dashboard   │  │      Dashboard          │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────────────────┘  │
└─────────┼──────────────────┼─────────────────┼─────────────────────┘
          │                  │                 │
          └──────────────────┴─────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ RAILWAY BACKEND  │
                    │   REST API       │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │    SUPABASE      │
                    │   PostgreSQL     │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼──────┐   ┌──────▼───────┐   ┌─────▼──────┐
    │ ZwiftRacing│   │Zwift Official│   │ ZwiftPower │
    │ .app API   │   │  API (OAuth) │   │  API       │
    │  PRIMARY   │   │  ENRICHMENT  │   │ FALLBACK   │
    └────────────┘   └──────────────┘   └────────────┘
```

---

## 🗄️ DATABASE ARCHITECTUUR

### Sourcing Tables (1:1 API Mapping)

**Principe**: Elke externe API call wordt opgeslagen in een dedicated sourcing table met exacte field mapping.

#### 1. **Riders Table** (ZwiftRacing.app)
```sql
CREATE TABLE riders (
  id BIGSERIAL PRIMARY KEY,
  zwift_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  
  -- Physical & Profile (ZwiftRacing)
  weight DECIMAL(5,2),
  height INTEGER,
  ftp INTEGER,
  gender TEXT,
  age TEXT,
  country_code TEXT,
  
  -- Club (ZwiftRacing)
  club_id BIGINT,
  club_name TEXT,
  
  -- Categories (ZwiftRacing)
  category_racing TEXT,              -- zpCategory van API
  
  -- Power Curve (ZwiftRacing.power)
  power_5s INTEGER,                  -- w5
  power_15s INTEGER,                 -- w15
  power_30s INTEGER,                 -- w30
  power_1m INTEGER,                  -- w60
  power_2m INTEGER,                  -- w120
  power_5m INTEGER,                  -- w300
  power_20m INTEGER,                 -- w1200
  power_5s_wkg DECIMAL(5,2),         -- wkg5
  power_1m_wkg DECIMAL(5,2),         -- wkg60
  power_5m_wkg DECIMAL(5,2),         -- wkg300
  power_20m_wkg DECIMAL(5,2),        -- wkg1200
  critical_power INTEGER,            -- CP
  anaerobic_work_capacity INTEGER,   -- AWC
  compound_score DECIMAL(8,2),
  power_rating DECIMAL(8,2),
  
  -- vELO Race Stats (ZwiftRacing.race)
  ranking INTEGER,                   -- race.current.rating
  ranking_score DECIMAL(10,2),       -- race.current.rating (same as ranking)
  velo_max_30d DECIMAL(10,2),        -- race.max30.rating
  velo_max_90d DECIMAL(10,2),        -- race.max90.rating
  velo_rank TEXT,                    -- race.current.mixed.number
  
  -- Race Counts (ZwiftRacing.race)
  total_races INTEGER DEFAULT 0,     -- race.finishes
  total_wins INTEGER DEFAULT 0,      -- race.wins
  total_podiums INTEGER DEFAULT 0,   -- race.podiums
  last_race_date TIMESTAMPTZ,        -- race.last.date
  last_race_rating DECIMAL(10,2),    -- race.last.rating
  
  -- Phenotype (ZwiftRacing.phenotype)
  phenotype TEXT,                    -- phenotype.value
  phenotype_sprinter DECIMAL(5,2),   -- phenotype.scores.sprinter
  phenotype_climber DECIMAL(5,2),    -- phenotype.scores.climber
  phenotype_pursuiter DECIMAL(5,2),  -- phenotype.scores.pursuiter
  phenotype_puncheur DECIMAL(5,2),   -- phenotype.scores.puncheur
  
  -- Handicaps (ZwiftRacing.handicaps)
  handicap_flat DECIMAL(5,2),
  handicap_rolling DECIMAL(5,2),
  handicap_hilly DECIMAL(5,2),
  handicap_mountainous DECIMAL(5,2),
  
  -- Enrichment (Zwift Official API - optional)
  avatar_url TEXT,                   -- imageSrc
  avatar_url_large TEXT,             -- imageSrcLarge
  country_alpha3 TEXT,               -- countryAlpha3
  currently_riding BOOLEAN,          -- riding
  followers_count INTEGER,           -- socialFacts.followersCount
  followees_count INTEGER,           -- socialFacts.followeesCount
  level INTEGER,                     -- achievementLevel
  last_synced_official TIMESTAMPTZ,
  
  -- ZwiftPower (fallback - optional)
  zwiftpower_category TEXT,
  last_synced_zwiftpower TIMESTAMPTZ,
  
  -- Metadata
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Source API**: `GET /public/riders/{riderId}` (ZwiftRacing.app)  
**Rate Limit**: 5/min  
**Update Frequency**: Dagelijks (via cron) + on-demand

#### 2. **zwift_api_race_results** (Race Results)
```sql
CREATE TABLE zwift_api_race_results (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  rider_name TEXT NOT NULL,
  
  -- Placement
  rank INTEGER,
  total_riders INTEGER,
  pen TEXT,                          -- Category (A/B/C/D)
  
  -- Performance
  time_seconds INTEGER,
  delta_winner_seconds INTEGER,
  avg_wkg DECIMAL(6,2),
  avg_watts INTEGER,
  avg_heart_rate INTEGER,
  avg_cadence INTEGER,
  
  -- Status
  is_disqualified BOOLEAN DEFAULT false,
  did_finish BOOLEAN DEFAULT true,
  dnf_reason TEXT,
  
  -- Raw data
  raw_response JSONB,
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);
```

**Source API**: `GET /public/results/{eventId}` (ZwiftRacing.app)  
**Rate Limit**: 1/min  
**Update Frequency**: After event completion

#### 3. **zwift_api_events** (Events Calendar)
```sql
CREATE TABLE zwift_api_events (
  id BIGSERIAL PRIMARY KEY,
  mongo_id TEXT UNIQUE,
  event_id TEXT NOT NULL UNIQUE,
  time_unix BIGINT NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT,
  sub_type TEXT,
  distance_meters INTEGER,
  elevation_meters INTEGER,
  route_name TEXT,
  route_world TEXT,
  organizer TEXT,
  category_enforcement TEXT,
  
  -- Complex data
  pens JSONB,                        -- Categories + signups
  route_full JSONB,
  raw_response JSONB,
  
  -- Metadata
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Source API**: `GET /api/events/upcoming` (ZwiftRacing.app)  
**Rate Limit**: Unknown (conservative: 1/5min)  
**Update Frequency**: Elk uur (voor 36-48 uur vooruit)

#### 4. **zwift_api_event_signups** (Event Registrations)
```sql
CREATE TABLE zwift_api_event_signups (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  rider_name TEXT NOT NULL,
  category TEXT,                     -- A/B/C/D/E
  signup_timestamp TIMESTAMPTZ,
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);
```

**Source API**: `GET /api/events/{eventId}/signups` (ZwiftRacing.app)  
**Rate Limit**: Unknown (conservative: 1/min)  
**Update Frequency**: Voor upcoming events (<36u)

#### 5. **my_team_members** (Team Management)
```sql
CREATE TABLE my_team_members (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL UNIQUE,
  nickname TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Source**: Manual admin input (frontend Team Management)  
**Purpose**: Selectie van riders voor dashboards

---

## 🔄 SOURCING FLOWS

### Flow 1: Racing Matrix Dashboard

**Doel**: Toon rider power curves, vELO ratings, phenotypes

```typescript
// BACKEND ENDPOINT: GET /api/racing-matrix
async function getRacingMatrixData() {
  // Query riders table
  const { data } = await supabase
    .from('riders')
    .select(`
      zwift_id,
      name,
      category_racing,
      ftp,
      weight,
      ranking,
      velo_max_30d,
      power_5s, power_15s, power_30s, power_1m, power_5m, power_20m,
      power_5s_wkg, power_1m_wkg, power_5m_wkg, power_20m_wkg,
      phenotype,
      phenotype_sprinter, phenotype_climber, phenotype_pursuiter,
      avatar_url
    `)
    .in('zwift_id', (
      // Get team member IDs
      await supabase.from('my_team_members').select('rider_id')
    ))
    .order('ranking', { ascending: false });
  
  return data;
}
```

**Sync Strategy**:
1. Team members toegevoegd via admin → trigger rider sync
2. Nightly cron job: update alle team member riders
3. API: ZwiftRacing.app `GET /public/riders/{riderId}`
4. Enrichment: Zwift Official voor avatars (optional)

### Flow 2: Results Dashboard

**Doel**: Toon race history, placements, performance trends

```typescript
// BACKEND ENDPOINT: GET /api/results/:riderId
async function getRiderResults(riderId: number) {
  // Query race results
  const { data: results } = await supabase
    .from('zwift_api_race_results')
    .select(`
      event_id,
      rider_name,
      rank,
      total_riders,
      pen,
      time_seconds,
      avg_wkg,
      avg_watts,
      synced_at,
      zwift_api_events (
        title,
        time_unix,
        route_name,
        distance_meters
      )
    `)
    .eq('rider_id', riderId)
    .order('synced_at', { ascending: false })
    .limit(50);
  
  return results;
}
```

**Sync Strategy**:
1. After event completion: check if team members participated
2. API: ZwiftRacing.app `GET /public/results/{eventId}`
3. Filter results voor team member rider_ids
4. Store in `zwift_api_race_results`

### Flow 3: Events Dashboard

**Doel**: Toon upcoming events + team signups

```typescript
// BACKEND ENDPOINT: GET /api/events/upcoming
async function getUpcomingEvents() {
  const now = Math.floor(Date.now() / 1000);
  const future36h = now + (36 * 60 * 60);
  
  // Get events in next 36 hours
  const { data: events } = await supabase
    .from('zwift_api_events')
    .select(`
      event_id,
      title,
      time_unix,
      route_name,
      route_world,
      distance_meters,
      organizer,
      pens
    `)
    .gte('time_unix', now)
    .lte('time_unix', future36h)
    .order('time_unix', { ascending: true });
  
  // For each event, get team signups
  for (const event of events) {
    const { data: signups } = await supabase
      .from('zwift_api_event_signups')
      .select('rider_id, rider_name, category')
      .eq('event_id', event.event_id)
      .in('rider_id', teamMemberIds);
    
    event.team_signups = signups;
  }
  
  return events;
}
```

**Sync Strategy**:
1. Hourly cron: sync upcoming events (36-48h window)
2. API: ZwiftRacing.app `GET /api/events/upcoming`
3. Voor elk event: `GET /api/events/{eventId}/signups`
4. Filter signups voor team member rider_ids

---

## 🎯 POC IMPLEMENTATION - Rider 150437

### Step 1: Rider Profile & Stats

```typescript
// SYNC RIDER DATA
import { zwiftRacingClient } from './api/zwift-racing-client.js';
import { supabase } from './services/supabase.service.js';

async function syncRider150437() {
  const riderId = 150437;
  
  // 1. Fetch from ZwiftRacing.app
  const riderData = await zwiftRacingClient.get(`/public/riders/${riderId}`);
  
  // 2. Map to database format
  const dbData = {
    zwift_id: riderData.riderId,
    name: riderData.name,
    weight: riderData.weight,
    height: riderData.height,
    ftp: riderData.zpFTP,
    gender: riderData.gender,
    age: riderData.age,
    country_code: riderData.country,
    
    club_id: riderData.club?.id,
    club_name: riderData.club?.name,
    
    category_racing: riderData.zpCategory,
    
    // Power curve
    power_5s: riderData.power?.w5,
    power_15s: riderData.power?.w15,
    power_30s: riderData.power?.w30,
    power_1m: riderData.power?.w60,
    power_2m: riderData.power?.w120,
    power_5m: riderData.power?.w300,
    power_20m: riderData.power?.w1200,
    power_5s_wkg: riderData.power?.wkg5,
    power_1m_wkg: riderData.power?.wkg60,
    power_5m_wkg: riderData.power?.wkg300,
    power_20m_wkg: riderData.power?.wkg1200,
    critical_power: riderData.power?.CP,
    anaerobic_work_capacity: riderData.power?.AWC,
    compound_score: riderData.power?.compoundScore,
    power_rating: riderData.power?.powerRating,
    
    // vELO ratings
    ranking: riderData.race?.current?.rating,
    ranking_score: riderData.race?.current?.rating,
    velo_max_30d: riderData.race?.max30?.rating,
    velo_max_90d: riderData.race?.max90?.rating,
    velo_rank: riderData.race?.current?.mixed?.number,
    
    // Race stats
    total_races: riderData.race?.finishes,
    total_wins: riderData.race?.wins,
    total_podiums: riderData.race?.podiums,
    last_race_date: riderData.race?.last?.date,
    last_race_rating: riderData.race?.last?.rating,
    
    // Phenotype
    phenotype: riderData.phenotype?.value,
    phenotype_sprinter: riderData.phenotype?.scores?.sprinter,
    phenotype_climber: riderData.phenotype?.scores?.climber,
    phenotype_pursuiter: riderData.phenotype?.scores?.pursuiter,
    phenotype_puncheur: riderData.phenotype?.scores?.puncheur,
    
    // Handicaps
    handicap_flat: riderData.handicaps?.flat,
    handicap_rolling: riderData.handicaps?.rolling,
    handicap_hilly: riderData.handicaps?.hilly,
    handicap_mountainous: riderData.handicaps?.mountainous,
    
    last_synced: new Date().toISOString()
  };
  
  // 3. Upsert to database
  const { data, error } = await supabase
    .from('riders')
    .upsert(dbData, { onConflict: 'zwift_id' });
  
  if (error) throw error;
  
  console.log('✅ Rider 150437 synced:', data);
  return data;
}
```

### Step 2: Race Results History

```typescript
// FIND ALL EVENTS FOR RIDER 150437
async function syncRaceResults150437() {
  const riderId = 150437;
  
  // Strategy: We don't have a direct "get all events for rider" endpoint
  // Solution: Query recent results from general event searches or rider history
  
  // Option 1: Check rider's last_race_date and work backwards
  const rider = await supabase
    .from('riders')
    .select('last_race_date, total_races')
    .eq('zwift_id', riderId)
    .single();
  
  // Option 2: Use ZwiftPower API (if profile exists)
  try {
    const zpResults = await zwiftPowerClient.get(
      `/api3.php?do=profile_results&z=${riderId}&limit=50`
    );
    
    // For each result, fetch full event data
    for (const result of zpResults.data.results || []) {
      const eventId = result.event_id;
      
      // Fetch full results for this event
      const eventResults = await zwiftRacingClient.get(
        `/public/results/${eventId}`
      );
      
      // Find rider 150437 in results
      const riderResult = eventResults.data.find(r => r.riderId === riderId);
      
      if (riderResult) {
        // Store in database
        await supabase.from('zwift_api_race_results').upsert({
          event_id: eventId,
          rider_id: riderId,
          rider_name: riderResult.name,
          rank: riderResult.rank,
          total_riders: eventResults.data.length,
          pen: riderResult.category,
          time_seconds: riderResult.time,
          avg_wkg: riderResult.avgWkg,
          avg_watts: riderResult.avgWatts,
          raw_response: riderResult,
          synced_at: new Date().toISOString()
        }, { onConflict: ['event_id', 'rider_id'] });
      }
      
      // Rate limit: 1 call/min
      await sleep(65000);
    }
    
    console.log(`✅ Synced race results for rider 150437`);
  } catch (err) {
    console.warn('⚠️  ZwiftPower niet beschikbaar voor rider 150437');
    console.log('Alternative: Scan recent events and check participation');
  }
}
```

### Step 3: Upcoming Events + Signups

```typescript
// FIND UPCOMING EVENTS (36 hours) + CHECK SIGNUPS
async function syncUpcomingEventsAndSignups() {
  const riderId = 150437;
  const now = Math.floor(Date.now() / 1000);
  const future36h = now + (36 * 60 * 60);
  
  // 1. Fetch upcoming events
  const upcomingEvents = await zwiftRacingClient.get('/api/events/upcoming');
  
  // Filter for next 36 hours
  const relevantEvents = upcomingEvents.data.filter(event => 
    event.time >= now && event.time <= future36h
  );
  
  console.log(`Found ${relevantEvents.length} events in next 36 hours`);
  
  // 2. Store events
  for (const event of relevantEvents) {
    await supabase.from('zwift_api_events').upsert({
      mongo_id: event._id,
      event_id: event.eventId,
      time_unix: event.time,
      title: event.title,
      event_type: event.type,
      sub_type: event.subType,
      distance_meters: event.distance,
      elevation_meters: event.elevation,
      route_name: event.route?.name,
      route_world: event.route?.world,
      organizer: event.organizer,
      category_enforcement: event.categoryEnforcement,
      pens: event.pens,
      route_full: event.route,
      raw_response: event,
      last_synced: new Date().toISOString()
    }, { onConflict: 'event_id' });
  }
  
  // 3. Check signups for each event
  let signupCount = 0;
  for (const event of relevantEvents) {
    try {
      const signups = await zwiftRacingClient.get(
        `/api/events/${event.eventId}/signups`
      );
      
      // Check if rider 150437 is signed up
      const allSignups = signups.data.flat(); // Flatten all categories
      const riderSignup = allSignups.find(s => s.zwid === riderId);
      
      if (riderSignup) {
        await supabase.from('zwift_api_event_signups').upsert({
          event_id: event.eventId,
          rider_id: riderId,
          rider_name: riderSignup.name,
          category: riderSignup.category,
          signup_timestamp: riderSignup.signupTime || new Date().toISOString(),
          synced_at: new Date().toISOString()
        }, { onConflict: ['event_id', 'rider_id'] });
        
        signupCount++;
        console.log(`✅ Found signup: ${event.title} - ${riderSignup.category}`);
      }
      
      // Rate limit: 1 call/min
      await sleep(65000);
    } catch (err) {
      console.warn(`⚠️  Signups not available for event ${event.eventId}`);
    }
  }
  
  console.log(`✅ Found ${signupCount} signups for rider 150437`);
  return { events: relevantEvents.length, signups: signupCount };
}
```

---

## 🚀 BACKEND ENDPOINTS

### Racing Matrix
- `GET /api/racing-matrix` - Haal team riders met power curves
- `GET /api/racing-matrix/:riderId` - Haal single rider details

### Results
- `GET /api/results/:riderId` - Haal race history voor rider
- `GET /api/results/event/:eventId` - Haal results voor event

### Events
- `GET /api/events/upcoming` - Haal upcoming events (36h)
- `GET /api/events/:eventId` - Haal event details + signups
- `GET /api/events/signups/:riderId` - Haal signups voor rider

### Team Management (Admin)
- `POST /api/team/members` - Voeg rider toe
- `DELETE /api/team/members/:riderId` - Verwijder rider
- `GET /api/team/members` - Haal alle team members

### Sync
- `POST /api/sync/rider/:riderId` - Trigger rider sync
- `POST /api/sync/results/:eventId` - Trigger result sync
- `POST /api/sync/events/upcoming` - Trigger events sync

---

## ⏱️ RATE LIMIT MANAGEMENT

```typescript
// Rate limiter per API endpoint
const RATE_LIMITS = {
  'GET /public/riders/:id': { limit: 5, window: 60000 },        // 5/min
  'GET /public/results/:id': { limit: 1, window: 60000 },       // 1/min
  'GET /api/events/upcoming': { limit: 1, window: 300000 },     // 1/5min
  'GET /api/events/:id/signups': { limit: 1, window: 60000 },   // 1/min
  'POST /public/riders': { limit: 1, window: 900000 },          // 1/15min
};

// Usage
import { RateLimiter } from './utils/rate-limiter.js';
const limiter = new RateLimiter(RATE_LIMITS);

await limiter.wait('GET /public/riders/:id');
const data = await zwiftRacingClient.get(`/public/riders/${riderId}`);
```

---

## 📅 CRON SCHEDULES

```typescript
// Auto-sync scheduler
import cron from 'node-cron';

// Sync team member riders (daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
  const teamMembers = await supabase.from('my_team_members').select('rider_id');
  for (const member of teamMembers.data) {
    await syncRider(member.rider_id);
    await sleep(12000); // Rate limit: 5/min
  }
});

// Sync upcoming events (every hour)
cron.schedule('0 * * * *', async () => {
  await syncUpcomingEventsAndSignups();
});

// Sync recent results (every 4 hours)
cron.schedule('0 */4 * * *', async () => {
  const recentEvents = await supabase
    .from('zwift_api_events')
    .select('event_id')
    .gte('time_unix', Math.floor(Date.now() / 1000) - 86400) // Last 24h
    .lte('time_unix', Math.floor(Date.now() / 1000));
  
  for (const event of recentEvents.data) {
    await syncEventResults(event.event_id);
    await sleep(65000); // Rate limit: 1/min
  }
});
```

---

## ✅ POC SUCCESS CRITERIA

### Rider 150437 Data Complete
- [x] Rider profile in `riders` table (60+ fields)
- [x] Power curve (14 power fields)
- [x] vELO ratings (current, max 30d, max 90d)
- [x] Phenotype scores (4 types)
- [x] Race stats (wins, podiums, finishes)

### Race Results Populated
- [x] Minimum 10 results in `zwift_api_race_results`
- [x] Events linked via `event_id`
- [x] Performance metrics (rank, watts, wkg)

### Upcoming Events Tracked
- [x] Events in next 36 hours in `zwift_api_events`
- [x] Signups voor rider 150437 in `zwift_api_event_signups`
- [x] Event details (route, distance, organizer)

### Dashboards Functional
- [x] Racing Matrix toont power curves en vELO
- [x] Results toont race history en placements
- [x] Events toont upcoming races + signups

---

## 🔐 SECURITY & CREDENTIALS

Alle API credentials in `.env`:
```env
# ZwiftRacing.app
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1

# Zwift Official (OAuth)
ZWIFT_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFT_PASSWORD=CloudRacer-9

# ZwiftPower (Cookie-based)
ZWIFTPOWER_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFTPOWER_PASSWORD=CloudRacer-9

# Supabase
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

**NEVER commit `.env` to git!**

---

Dit document is de **complete sourcing strategie** voor alle 3 dashboards.
