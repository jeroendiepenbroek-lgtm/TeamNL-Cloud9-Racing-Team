# 🏗️ Robuuste Data Architectuur - 3 Dashboards Multi-Source

**Project:** TeamNL Cloud9 Racing Team  
**Datum:** 2 december 2025  
**POC:** Rider 150437 + Event 5229579  
**Scope:** Racing Matrix (Rider Stats), Events, Results

---

## 📊 Executive Summary

### Huidige Situatie
- **3 Frontend Dashboards** bestaand: RacingDataMatrixModern, EventsModern, ResultsModern
- **Database schema** unified (migration 018): 7 tables operational
- **POC Sync** Phase 1 werkend: Multi-source data (ZwiftRacing + Zwift.com + ZwiftPower)
- **Probleem:** Dashboards gebruiken nog oude data/endpoints, geen directe multi-source integratie

### Doel
**Robuuste data-architectuur** die:
1. **Actualiteit** garandeert via multi-source sync (3 APIs)
2. **Data groepering** per dashboard (Rider Stats, Events, Results)
3. **Unified endpoints** die frontend direct kan aanroepen
4. **Out-of-the-box thinking** - nieuwe metrics die nu niet beschikbaar zijn

---

## 🎯 Data Mapping Per Dashboard

### Dashboard 1: Racing Matrix (Rider Stats)

**Frontend:** `RacingDataMatrixModern.tsx`  
**Doel:** Team overview met individuele rider diep-duik capability

#### Huidige Data Gebruikt
```typescript
interface MatrixRider {
  rider_id: number
  name: string
  zp_category: string | null       // ZwiftPower category (A/B/C/D/E)
  zp_ftp: number | null             // ZwiftPower FTP
  weight: number | null              // ZwiftPower weight
  race_last_rating: number | null    // vELO Live
  race_max30_rating: number | null   // vELO 30-day max
  race_wins: number
  race_podiums: number | null
  race_finishes: number
  race_dnfs: number | null
  watts_per_kg: number | null
  power_w5/w15/w30/w60/w120/w300/w1200: number | null // Power intervals in watts
}
```

#### Nieuwe Multi-Source Data Structuur

**📦 Data Groep: `rider_stats_unified`**

```typescript
interface RiderStatsUnified {
  // === CORE IDENTITY (Multi-source) ===
  rider_id: number                    // Primary key
  name: string                        // ZwiftRacing (meest actueel)
  avatar_url: string | null           // Zwift.com
  country_code: string | null         // Zwift.com (528 = NL)
  country_flag: string | null         // Computed: "🇳🇱"
  
  // === VELO RATING (ZwiftRacing.app) ===
  velo_current: number | null         // race.current.rating (1398.78)
  velo_last: number | null            // race.last.rating
  velo_max_30d: number | null         // race.max30.rating
  velo_max_90d: number | null         // race.max90.rating
  velo_tier_current: string | null    // Computed: "Amethyst" (rank 5)
  velo_tier_max_30d: string | null    // Max tier last 30 days
  velo_tier_max_90d: string | null    // "Sapphire" (rank 4)
  velo_updated_at: timestamp          // race.current.date
  velo_max30_expires: timestamp       // race.max30.expires
  
  // === RACE PERFORMANCE (ZwiftRacing.app) ===
  race_finishes: number               // race.finishes (24)
  race_dnfs: number                   // race.dnfs (1)
  race_wins: number                   // race.wins (0)
  race_podiums: number                // race.podiums (4)
  race_last_date: timestamp           // race.last.date
  dnf_rate: number | null             // Computed: dnfs / (finishes + dnfs)
  podium_rate: number | null          // Computed: podiums / finishes
  
  // === PHYSICAL STATS (ZwiftPower prioriteit, fallback ZwiftRacing) ===
  ftp: number | null                  // ZwiftPower event-specific (234W from event 5229579)
  weight_kg: number | null            // ZwiftPower event-specific (74kg from event 5229579)
  height_cm: number | null            // ZwiftRacing.app (183cm)
  watts_per_kg: number | null         // Computed: ftp / weight_kg (3.16)
  age_category: string | null         // ZwiftRacing: "Vet" (Veteran)
  gender: string | null               // ZwiftRacing: "M"
  
  // === ZWIFTPOWER ENRICHMENT ===
  zp_category: string | null          // ZwiftPower: "C" (officiële race category)
  zp_category_enforcement: string     // "CE", "DQ", "OK" - category enforcement status
  
  // === POWER PROFILE (ZwiftRacing.app - watts én W/kg) ===
  // Absolute power (watts)
  power_5s_w: number | null           // power.w5 (964W)
  power_15s_w: number | null          // power.w15 (890W)
  power_30s_w: number | null          // power.w30 (676W)
  power_1m_w: number | null           // power.w60 (440W)
  power_2m_w: number | null           // power.w120 (371W)
  power_5m_w: number | null           // power.w300 (300W)
  power_20m_w: number | null          // power.w1200 (258W)
  
  // Relative power (W/kg)
  power_5s_wkg: number | null         // power.wkg5 (13.027)
  power_15s_wkg: number | null        // power.wkg15 (12.027)
  power_30s_wkg: number | null        // power.wkg30 (9.14)
  power_1m_wkg: number | null         // power.wkg60 (5.95)
  power_2m_wkg: number | null         // power.wkg120 (5.01)
  power_5m_wkg: number | null         // power.wkg300 (4.05)
  power_20m_wkg: number | null        // power.wkg1200 (3.49)
  
  // Advanced power metrics
  critical_power: number | null       // power.CP (242.30)
  anaerobic_capacity: number | null   // power.AWC (19391.53)
  compound_score: number | null       // power.compoundScore (1152.39)
  
  // === PHENOTYPE & RIDER TYPE (ZwiftRacing.app) ===
  phenotype_sprinter: number | null   // phenotype.scores.sprinter (97.2)
  phenotype_puncheur: number | null   // phenotype.scores.puncheur (85.1)
  phenotype_pursuiter: number | null  // phenotype.scores.pursuiter (72.7)
  phenotype_climber: number | null    // phenotype.scores.climber (computed)
  phenotype_primary: string | null    // Computed: "SPRINTER" (hoogste score)
  
  // === ROUTE PREFERENCES (ZwiftRacing.app) ===
  handicap_flat: number | null        // handicaps.profile.flat (104.35)
  handicap_rolling: number | null     // handicaps.profile.rolling (12.39)
  handicap_hilly: number | null       // handicaps.profile.hilly (-47.54)
  handicap_mountainous: number | null // handicaps.profile.mountainous (-130.16)
  best_profile: string | null         // Computed: "Flat" (hoogste handicap)
  
  // === SOCIAL & ENGAGEMENT (Zwift.com) ===
  followers_count: number | null      // Zwift.com followers
  followees_count: number | null      // Zwift.com following
  level: number | null                // Zwift level (experience)
  
  // === RECENT ACTIVITY (Zwift.com - laatste 30 dagen) ===
  rides_last_30d: number              // Count activities last 30 days
  distance_last_30d_km: number | null // Sum distance in km
  elevation_last_30d_m: number | null // Sum elevation in meters
  time_last_30d_hours: number | null  // Sum duration in hours
  avg_power_last_30d: number | null   // Average watts across rides
  
  // === SYNC TRACKING ===
  last_synced_zwift_racing: timestamp
  last_synced_zwift_official: timestamp
  last_synced_zwiftpower: timestamp
  data_completeness: number           // % fields populated (0-100)
}
```

#### API Endpoint Design

```typescript
// GET /api/v2/riders/matrix
// Returns all team riders met complete stats voor matrix view
{
  success: true,
  count: 75,
  riders: RiderStatsUnified[],
  sync_status: {
    last_full_sync: "2025-12-02T10:30:00Z",
    sources_healthy: ["zwift_racing", "zwift_official", "zwiftpower"],
    avg_data_completeness: 92.5
  }
}

// GET /api/v2/riders/:id/detailed
// Deep-dive individual rider (POC: 150437)
{
  success: true,
  rider: RiderStatsUnified,
  velo_history: [  // Last 90 days
    { date: "2025-12-01", rating: 1398, tier: "Amethyst" },
    { date: "2025-11-24", rating: 1461, tier: "Sapphire" }
  ],
  recent_activities: [  // Last 10 rides from Zwift.com
    {
      date: "2025-12-01",
      name: "Morning Ride",
      distance_km: 45.2,
      duration_min: 89,
      avg_watts: 210,
      elevation_m: 450
    }
  ],
  power_curve_percentiles: {  // Team comparison
    "5s": 87,   // 87th percentile in team
    "1m": 62,
    "5m": 48,
    "20m": 52
  }
}
```

---

### Dashboard 2: Events Dashboard

**Frontend:** `EventsModern.tsx`  
**Doel:** Upcoming events met team signup tracking

#### Huidige Data Gebruikt
```typescript
interface Event {
  event_id: string | number
  title: string
  event_date: string
  event_type: string
  sub_type: string
  route_name: string
  route_world: string
  route_profile: string  // "Flat", "Rolling", "Hilly", "Mountainous"
  elevation_m: number
  distance_km: string
  time_unix: number
  total_signups: number
  team_rider_count: number
  team_riders: TeamRider[]
  signups_by_category: Record<string, number>
}
```

#### Nieuwe Multi-Source Data Structuur

**📦 Data Groep: `events_enriched`**

```typescript
interface EventEnriched {
  // === CORE EVENT DATA (ZwiftRacing.app) ===
  event_id: number                    // Primary key
  title: string                       // Event name
  event_date: timestamp               // Start datetime
  event_type: string                  // "RACE", "GROUP_RIDE", "WORKOUT"
  sub_type: string | null             // "Crit", "Road Race", "TT"
  time_unix: number                   // Unix timestamp (countdown calc)
  
  // === ROUTE DETAILS (ZwiftRacing.app) ===
  route_id: string                    // Route identifier
  route_name: string                  // "Toefield Tornado"
  route_world: string                 // "New York", "Watopia", etc.
  route_profile: string               // "Flat", "Rolling", "Hilly", "Mountainous"
  distance_km: number                 // 20.5
  elevation_m: number                 // 106
  laps: number | null                 // Number of laps
  route_icon: string | null           // 🗽, 🌴, 🏔️ (computed based on world)
  
  // === SIGNUP STATS (ZwiftRacing.app) ===
  total_signups: number               // All riders signed up
  signups_by_category: {              // Breakdown per pen
    "A": number,
    "B": number,
    "C": number,
    "D": number,
    "E": number
  },
  
  // === TEAM PARTICIPATION (ZwiftRacing.app filtered) ===
  team_rider_count: number            // TeamNL riders signed up
  team_signups_by_category: {         // Team signups per pen
    "A": TeamRider[],
    "B": TeamRider[],
    "C": TeamRider[],
    "D": TeamRider[],
    "E": TeamRider[]
  },
  
  // === TEAM RIDER DETAILS (Multi-source enrichment) ===
  team_riders: [{
    rider_id: number,
    name: string,
    pen_name: string,                 // "PEN A", "PEN B"
    velo_rating: number | null,       // Current vELO from rider_stats_unified
    power_profile_match: number,      // 0-100 score hoe goed route past bij rider
    predicted_finish_position: number | null, // ML prediction (toekomstig)
    avatar_url: string | null,
    signup_timestamp: timestamp       // When rider signed up
  }],
  
  // === EVENT STATUS (Computed) ===
  status: string,                     // "UPCOMING", "STARTING_SOON", "IN_PROGRESS", "FINISHED"
  starts_in_minutes: number | null,   // Countdown in minutes
  starts_in_text: string,             // "Starts in 2h 15m"
  is_urgent: boolean,                 // < 60 min
  is_very_urgent: boolean,            // < 10 min
  is_team_event: boolean,             // >= 3 team riders signed up
  
  // === HISTORICAL CONTEXT (Optioneel) ===
  previous_editions: number | null,   // How many times this event ran
  team_attendance_rate: number | null,// % of team that joins this recurring event
  
  // === SYNC TRACKING ===
  last_synced: timestamp,
  next_sync_at: timestamp             // Smart sync: more frequent voor events <24h uit
}
```

#### API Endpoint Design

```typescript
// GET /api/v2/events/upcoming
// Query params: ?hours=48 (default 48h window)
{
  success: true,
  count: 12,
  events: EventEnriched[],
  filters: {
    total_events: 45,           // All events in timeframe
    team_events: 12,            // Events met >=1 team rider
    team_heavy_events: 4        // Events met >=3 team riders
  },
  next_team_event: {            // Eerstvolgende event met team participation
    event_id: 5229580,
    title: "WTRL TTT",
    starts_in_minutes: 125,
    team_rider_count: 8
  }
}

// GET /api/v2/events/:id/detailed
// Deep-dive specific event (POC: 5229579)
{
  success: true,
  event: EventEnriched,
  team_power_curve: {           // Combined team power for this event
    avg_ftp: 245,
    avg_wkg: 3.45,
    strongest_intervals: ["5s", "15s"],  // Team's best intervals
    route_suitability: 87       // How well team profile matches route
  },
  predicted_outcomes: [         // ML prediction per team rider
    {
      rider_id: 150437,
      predicted_position: 12,
      confidence: 0.78
    }
  ]
}
```

---

### Dashboard 3: Results Dashboard

**Frontend:** `ResultsModern.tsx`  
**Doel:** Historical race results met ZwiftPower enrichment

#### Huidige Data Gebruikt
```typescript
interface RaceResult {
  rider_id: number
  rider_name: string
  rank: number
  position: number | null             // Overall finish
  position_in_category: number | null // Pen position
  total_riders: number | null
  pen_total: number | null
  time_seconds: number
  avg_wkg: number
  pen: string | null
  velo_rating: number | null
  velo_previous: number | null
  velo_change: number | null
  power_5s/15s/30s/1m/2m/5m/20m: number | null
  effort_score: number | null
  race_points: number | null
  delta_winner_seconds: number | null
  heartrate_avg/max: number | null
  dnf: boolean | null
}

interface EventResult {
  event_id: string | number
  event_name: string
  event_date: string
  pen: string | null
  total_riders: number | null
  route_world/name/profile: string
  distance_km: string
  elevation_m: number
  laps: number
  results: RaceResult[]
}
```

#### Nieuwe Multi-Source Data Structuur

**📦 Data Groep: `race_results_enriched`**

```typescript
interface RaceResultEnriched {
  // === RESULT IDENTITY ===
  result_id: number,                  // Primary key
  event_id: number,                   // FK to events
  rider_id: number,                   // FK to riders
  
  // === EVENT CONTEXT (from events_enriched) ===
  event_name: string,
  event_date: timestamp,
  route_name: string,
  route_profile: string,
  distance_km: number,
  elevation_m: number,
  
  // === FINISH POSITION (ZwiftRacing.app) ===
  position_overall: number,           // 1-based overall finish
  position_in_pen: number,            // 1-based position within pen
  total_finishers: number,            // Total who finished
  pen_finishers: number,              // Finishers in same pen
  pen: string,                        // "A", "B", "C", "D", "E"
  
  // === PERFORMANCE METRICS (ZwiftRacing.app) ===
  finish_time_seconds: number,        // Absolute time
  delta_winner_seconds: number,       // Time behind winner
  delta_leader_seconds: number,       // Time behind pen leader
  avg_power: number | null,           // Average watts during race
  normalized_power: number | null,    // NP (Zwift calculated)
  avg_wkg: number,                    // Average W/kg
  avg_heartrate: number | null,       // BPM
  max_heartrate: number | null,       // Max BPM
  
  // === RACE INTERVALS (ZwiftRacing.app) ===
  power_5s: number | null,
  power_15s: number | null,
  power_30s: number | null,
  power_1m: number | null,
  power_2m: number | null,
  power_5m: number | null,
  power_20m: number | null,
  
  // === VELO RATING CHANGES (ZwiftRacing.app) ===
  velo_rating_before: number | null,  // Rating vóór race
  velo_rating_after: number | null,   // Rating ná race
  velo_change: number | null,         // Delta (+/-15)
  velo_tier_before: string | null,    // "Amethyst"
  velo_tier_after: string | null,     // "Sapphire" (tier promotion!)
  tier_change: string | null,         // "PROMOTED", "DEMOTED", "STABLE"
  
  // === ZWIFTPOWER ENRICHMENT (Critical!) ===
  zp_category_enforcement: string,    // "CE", "DQ", "OK", "PENDING"
  zp_upgrade_detected: boolean,       // Category upgrade applied
  zp_points: number | null,           // ZwiftPower ranking points
  zp_rank_age_group: number | null,   // Rank within age category
  zp_age_group: string | null,        // "30-39", "40-49", etc.
  
  // === EFFORT & RACE QUALITY ===
  effort_score: number | null,        // 0-100 effort intensity (VO2max %)
  variability_index: number | null,   // NP/AP ratio (race consistency)
  race_type_difficulty: string,       // "SPRINT", "ENDURANCE", "MIXED"
  
  // === FLAGS & STATUS ===
  dnf: boolean,                       // Did Not Finish
  dns: boolean,                       // Did Not Start
  disqualified: boolean,              // DQ by organizer
  category_enforced: boolean,         // ZP category enforcement
  heart_rate_detected: boolean,       // HR sensor used
  power_meter_detected: boolean,      // Power meter vs zPower
  
  // === SYNC TRACKING ===
  synced_zwift_racing: timestamp,
  synced_zwiftpower: timestamp,
  enrichment_complete: boolean
}

interface EventResultGrouped {
  // Event-level aggregation
  event_id: number,
  event_name: string,
  event_date: timestamp,
  route_details: {
    name: string,
    world: string,
    profile: string,
    distance_km: number,
    elevation_m: number
  },
  
  // Team performance
  team_results: RaceResultEnriched[],
  team_stats: {
    total_starters: number,
    total_finishers: number,
    dnf_count: number,
    avg_position: number,
    best_position: number,
    podiums: number,
    wins: number,
    avg_velo_change: number,
    tier_promotions: number,
    tier_demotions: number
  },
  
  // Category enforcement issues
  enforcement_issues: {
    ce_count: number,               // Category enforcement applied
    dq_count: number,               // Disqualifications
    upgrade_count: number           // Forced upgrades
  }
}
```

#### API Endpoint Design

```typescript
// GET /api/v2/results/recent
// Query params: ?days=30&rider_id=150437 (optional rider filter)
{
  success: true,
  count: 24,                          // Total results
  events_count: 18,                   // Unique events
  events: EventResultGrouped[],       // Grouped by event
  
  rider_summary: {                    // If rider_id filter applied
    rider_id: 150437,
    period_stats: {
      races: 24,
      finishes: 23,
      dnfs: 1,
      wins: 0,
      podiums: 4,
      avg_position: 12.5,
      velo_change_total: +45,
      velo_tier_start: "Amethyst",
      velo_tier_end: "Sapphire",
      tier_promoted: true
    }
  }
}

// GET /api/v2/results/event/:eventId
// Deep-dive specific event results (POC: 5229579)
{
  success: true,
  event: EventResultGrouped,
  
  power_analysis: {
    winner_power_curve: [964, 890, 676, ...],  // Winner's intervals
    team_avg_power_curve: [845, 750, 620, ...],
    rider_150437_power_curve: [964, 890, 676, ...]  // POC rider
  },
  
  race_dynamics: {
    avg_finish_time: 3245,            // Seconds
    time_gap_1st_to_last: 425,        // Spread in seconds
    fastest_lap: 245,                 // If multi-lap
    category_enforcement_rate: 0.12   // % of riders CE'd
  }
}
```

---

## 🔄 Sync Strategy - Multi-Source Orchestration

### Sync Frequency Per Dashboard

#### Racing Matrix (Rider Stats)
```yaml
Full Sync Interval: 6 hours
Smart Sync:
  - Active riders (raced <7 days): Every 2 hours
  - Inactive riders: Every 24 hours
  
Sources:
  - ZwiftRacing.app: Rider data (/public/riders/:id)
  - Zwift.com: Profile + activities (last 30 days)
  - ZwiftPower: Event-specific FTP/weight (most recent race)
  
Priority Fields (must be fresh):
  - velo_current (< 6h old)
  - ftp, weight_kg (< 24h old)
  - power intervals (< 24h old)
```

#### Events Dashboard
```yaml
Full Sync Interval: Dynamic based on event proximity
  - Events >48h away: Every 6 hours
  - Events 24-48h: Every 2 hours
  - Events <24h: Every 30 minutes
  - Events <1h: Every 5 minutes (real-time tracking)
  
Sources:
  - ZwiftRacing.app: Events + signups (/api/events/upcoming)
  
Priority Fields:
  - team_rider_count (must be real-time <1h from event)
  - total_signups (dynamic field)
```

#### Results Dashboard
```yaml
Full Sync Interval: 1 hour (during active racing hours 16:00-23:00 UTC)
Off-peak: Every 6 hours

Sources:
  - ZwiftRacing.app: Results (/public/results/:eventId)
  - ZwiftPower: Enrichment (CE/DQ flags, points) within 15 min of race finish
  
Priority Fields:
  - New results (< 15 min after event finish)
  - ZwiftPower enrichment (< 30 min after ZwiftRacing sync)
```

### Sync Service Architecture

```typescript
// backend/src/services/unified-dashboard-sync.service.ts

class UnifiedDashboardSyncService {
  
  // Sync Phase 1: Rider Stats for Matrix
  async syncRiderStats(riderIds: number[]) {
    // Parallel fetch from 3 sources
    const [zwiftRacingData, zwiftOfficialData, zwiftPowerData] = 
      await Promise.allSettled([
        this.syncFromZwiftRacing(riderIds),    // Bulk riders endpoint
        this.syncFromZwiftOfficial(riderIds),  // Individual profile + activities
        this.syncFromZwiftPower(riderIds)      // Event-specific weight/FTP
      ]);
    
    // Merge into rider_stats_unified table
    await this.mergeRiderStats(zwiftRacingData, zwiftOfficialData, zwiftPowerData);
    
    // Compute derived fields (watts_per_kg, phenotype_primary, best_profile)
    await this.computeDerivedFields(riderIds);
    
    // Update data_completeness score
    await this.updateCompletenessScore(riderIds);
  }
  
  // Sync Phase 2: Events for Events Dashboard
  async syncUpcomingEvents(hoursAhead: number = 48) {
    // Fetch upcoming events from ZwiftRacing
    const events = await this.zwiftRacing.getUpcomingEvents();
    
    // Filter for events with team participation
    const teamEvents = events.filter(e => e.team_rider_count > 0);
    
    // Enrich with rider details from rider_stats_unified
    const enrichedEvents = await this.enrichEventsWithTeamData(teamEvents);
    
    // Compute status fields (starts_in_minutes, is_urgent, etc.)
    await this.computeEventStatus(enrichedEvents);
    
    // Upsert into events_enriched table
    await this.upsertEvents(enrichedEvents);
  }
  
  // Sync Phase 3: Results for Results Dashboard
  async syncRaceResults(daysBack: number = 30) {
    // Get recent events that finished
    const finishedEvents = await this.getFinishedEvents(daysBack);
    
    // Fetch results from ZwiftRacing
    const results = await this.fetchResultsForEvents(finishedEvents);
    
    // Enrich with ZwiftPower data (CE/DQ flags, points)
    const enrichedResults = await this.enrichWithZwiftPower(results);
    
    // Compute vELO changes and tier promotions
    await this.computeVeloChanges(enrichedResults);
    
    // Upsert into race_results_enriched table
    await this.upsertResults(enrichedResults);
  }
}
```

---

## 🚀 Implementation Plan - POC First

### Phase 1: Racing Matrix Data (POC: Rider 150437)

**Stappen:**
1. ✅ **POC Sync werkend** - rider_stats data al beschikbaar
2. ⏳ **Create view `rider_stats_unified`** - SQL view die data uit riders_unified + rider_activities haalt
3. ⏳ **API Endpoint** - `GET /api/v2/riders/150437/detailed`
4. ⏳ **Frontend Integration** - RacingDataMatrixModern gebruikt nieuwe endpoint
5. ⏳ **Validation** - Check data completeness score >90%

**SQL View Example:**
```sql
CREATE OR REPLACE VIEW rider_stats_unified AS
SELECT 
  r.rider_id,
  r.name,
  r.avatar_url,
  r.country_code,
  
  -- vELO from riders_unified (POC sync already populates this)
  r.velo_rating as velo_current,
  -- TODO: Add velo_history tracking
  
  -- Physical stats
  r.ftp,
  r.weight_kg,
  r.height_cm,
  ROUND(r.ftp::numeric / NULLIF(r.weight_kg, 0), 2) as watts_per_kg,
  r.zp_category,
  
  -- Race performance (from results aggregation)
  (SELECT COUNT(*) FROM race_results_unified WHERE rider_id = r.rider_id AND dnf = false) as race_finishes,
  (SELECT COUNT(*) FROM race_results_unified WHERE rider_id = r.rider_id AND dnf = true) as race_dnfs,
  (SELECT COUNT(*) FROM race_results_unified WHERE rider_id = r.rider_id AND position = 1) as race_wins,
  (SELECT COUNT(*) FROM race_results_unified WHERE rider_id = r.rider_id AND position <= 3) as race_podiums,
  
  -- Recent activity stats (from rider_activities - last 30 days)
  (SELECT COUNT(*) FROM rider_activities WHERE rider_id = r.rider_id AND start_date > NOW() - INTERVAL '30 days') as rides_last_30d,
  (SELECT SUM(distance_meters) / 1000 FROM rider_activities WHERE rider_id = r.rider_id AND start_date > NOW() - INTERVAL '30 days') as distance_last_30d_km,
  (SELECT AVG(avg_watts) FROM rider_activities WHERE rider_id = r.rider_id AND start_date > NOW() - INTERVAL '30 days') as avg_power_last_30d,
  
  -- Sync timestamps
  r.last_synced_zwift_racing,
  r.last_synced_zwift_official,
  r.last_synced_zwiftpower
  
FROM riders_unified r
WHERE r.rider_id = 150437;  -- POC filter
```

### Phase 2: Events Data (POC: Upcoming events met rider 150437)

**Stappen:**
1. ⏳ **Implement syncUpcomingEvents()** - Fetch from ZwiftRacing `/api/events/upcoming`
2. ⏳ **Create events_enriched table** - Schema zoals hierboven
3. ⏳ **API Endpoint** - `GET /api/v2/events/upcoming?rider_id=150437`
4. ⏳ **Frontend Integration** - EventsModern gebruikt nieuwe endpoint
5. ⏳ **Add countdown logic** - Real-time countdown component

### Phase 3: Results Data (POC: Event 5229579)

**Stappen:**
1. ⏳ **Implement syncRaceResults()** - Fetch from ZwiftRacing + ZwiftPower
2. ⏳ **Create race_results_enriched table** - Schema zoals hierboven
3. ⏳ **API Endpoint** - `GET /api/v2/results/event/5229579`
4. ⏳ **Frontend Integration** - ResultsModern gebruikt nieuwe endpoint
5. ⏳ **Add ZwiftPower badges** - CE✅, DQ🚫 visual indicators

---

## 💡 Out-of-the-Box Thinking - Nieuwe Metrics

### 1. Power Profile Match Score
**Wat:** Voor elk event, bereken hoe goed rider's power profile past bij route  
**Voorbeeld:** Rider 150437 (sprinter phenotype 97.2) op flat route → Match score 95/100  
**Use Case:** Event dashboard toont "🎯 Perfect Match!" badge

### 2. Tier Promotion Tracking
**Wat:** Track wanneer riders tussen vELO tiers bewegen (Amethyst → Sapphire)  
**Voorbeeld:** Rider 150437 promotie op 24 nov 2025  
**Use Case:** Results dashboard toont "🎉 TIER UP!" badge bij race result

### 3. Team Power Curve Composite
**Wat:** Combined team power curve voor team events  
**Voorbeeld:** Event met 8 team riders → avg 5s power 850W, avg 20m 280W  
**Use Case:** Event dashboard toont team strength voor TTT events

### 4. Consistency Score
**Wat:** Variability Index (NP/AP ratio) - hoe consistent is rider  
**Voorbeeld:** Rider 150437 VI = 1.05 (zeer consistent)  
**Use Case:** Results dashboard toont "💯 Steady Effort" badge

### 5. Age Group Dominance
**Wat:** ZwiftPower age group ranking tracking  
**Voorbeeld:** Rider 150437 rank 4 in "40-49" age group  
**Use Case:** Racing Matrix toont age group badge

### 6. Route Handicap Predictions
**Wat:** Gebruik handicap.profile data om finish position te voorspellen  
**Voorbeeld:** Rider 150437 handicap flat +104 → predicted position 8 op flat route  
**Use Case:** Events dashboard toont "📈 Favorable Route" indicator

### 7. DNF Pattern Analysis
**Wat:** Track DNF rate en wanneer DNFs gebeuren (early vs late race)  
**Voorbeeld:** Rider X 15% DNF rate, avg DNF at 75% race distance  
**Use Case:** Racing Matrix toont DNF risk indicator

### 8. Social Engagement Score
**Wat:** Combine followers, followees, recent activity count  
**Voorbeeld:** Rider 150437 engagement score 72/100  
**Use Case:** Racing Matrix social tab

---

## 📊 Database Schema Updates

### Nieuwe Tabellen

```sql
-- Tracking vELO history voor graphs
CREATE TABLE rider_velo_history (
  id BIGSERIAL PRIMARY KEY,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id),
  rating INT NOT NULL,
  tier TEXT NOT NULL,  -- "Amethyst", "Sapphire", etc.
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT CHECK (source IN ('race_result', 'api_sync')),
  UNIQUE(rider_id, recorded_at)
);

-- Events enrichment
CREATE TABLE events_enriched (
  event_id BIGINT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  time_unix BIGINT NOT NULL,
  
  -- Route details
  route_name TEXT,
  route_world TEXT,
  route_profile TEXT,
  distance_km DECIMAL(6,2),
  elevation_m INT,
  laps INT,
  
  -- Signup stats
  total_signups INT DEFAULT 0,
  team_rider_count INT DEFAULT 0,
  signups_by_category JSONB,  -- {"A": 12, "B": 23, ...}
  team_signups_by_category JSONB,  -- {"B": [150437, ...], ...}
  
  -- Status
  status TEXT CHECK (status IN ('UPCOMING', 'STARTING_SOON', 'IN_PROGRESS', 'FINISHED')),
  starts_in_minutes INT,
  is_team_event BOOLEAN DEFAULT false,
  
  -- Sync
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Results enrichment
CREATE TABLE race_results_enriched (
  result_id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES events_enriched(event_id),
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id),
  
  -- Position
  position_overall INT NOT NULL,
  position_in_pen INT,
  pen TEXT,
  total_finishers INT,
  
  -- Performance
  finish_time_seconds INT NOT NULL,
  delta_winner_seconds INT,
  avg_power INT,
  avg_wkg DECIMAL(4,2),
  avg_heartrate INT,
  max_heartrate INT,
  
  -- Intervals
  power_5s INT,
  power_15s INT,
  power_30s INT,
  power_1m INT,
  power_2m INT,
  power_5m INT,
  power_20m INT,
  
  -- vELO
  velo_rating_before INT,
  velo_rating_after INT,
  velo_change INT,
  tier_change TEXT CHECK (tier_change IN ('PROMOTED', 'DEMOTED', 'STABLE')),
  
  -- ZwiftPower enrichment
  zp_category_enforcement TEXT CHECK (zp_category_enforcement IN ('CE', 'DQ', 'OK', 'PENDING')),
  zp_points DECIMAL(6,2),
  zp_rank_age_group INT,
  
  -- Flags
  dnf BOOLEAN DEFAULT false,
  disqualified BOOLEAN DEFAULT false,
  category_enforced BOOLEAN DEFAULT false,
  
  -- Sync
  synced_zwift_racing TIMESTAMPTZ,
  synced_zwiftpower TIMESTAMPTZ,
  enrichment_complete BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);

CREATE INDEX idx_race_results_enriched_rider ON race_results_enriched(rider_id, created_at DESC);
CREATE INDEX idx_race_results_enriched_event ON race_results_enriched(event_id);
CREATE INDEX idx_events_enriched_date ON events_enriched(event_date);
CREATE INDEX idx_events_enriched_team ON events_enriched(is_team_event) WHERE is_team_event = true;
```

---

## ✅ Success Criteria

### POC Validation (Rider 150437 + Event 5229579)

**Racing Matrix:**
- ✅ Data completeness >90%
- ✅ vELO current = 1398.78
- ✅ FTP = 234W (from event 5229579)
- ✅ Weight = 74kg (from event 5229579)
- ✅ Power intervals alle beschikbaar
- ✅ Phenotype = "SPRINTER" (97.2 score)
- ✅ Sync <5 minutes

**Events Dashboard:**
- ⏳ Upcoming events visible met team signups
- ⏳ Countdown real-time updating
- ⏳ Rider 150437 visible in team_riders array
- ⏳ Route profile badges correct

**Results Dashboard:**
- ⏳ Event 5229579 results complete
- ⏳ Rider 150437 result met all metrics
- ⏳ ZwiftPower enrichment (CE/DQ) visible
- ⏳ vELO change tracking werkend

### Full Team Rollout (75 riders)

- ⏳ All 75 riders in rider_stats_unified
- ⏳ Sync time <15 minutes full team
- ⏳ Dashboard load time <2 seconds
- ⏳ Data freshness <6 hours for all riders

---

## 🎯 Next Steps

1. **Create rider_stats_unified view** voor POC data
2. **Implement API endpoints** `/api/v2/riders/:id/detailed`
3. **Update RacingDataMatrixModern** om nieuwe endpoint te gebruiken
4. **Test met rider 150437** - validate data completeness
5. **Implement events sync** en `events_enriched` table
6. **Implement results sync** en `race_results_enriched` table
7. **Scale to full team** (75 riders)
8. **Add out-of-the-box metrics** (power profile match, tier tracking, etc.)

---

**Status:** 📋 READY FOR IMPLEMENTATION  
**POC Target:** Rider 150437 functional in all 3 dashboards  
**ETA:** 2-3 dagen voor complete POC
