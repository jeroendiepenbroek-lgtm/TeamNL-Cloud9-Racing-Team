# 🎯 Unified Dashboard Architecture - 3 Core Dashboards

**Datum:** 1 december 2025  
**Focus:** Rider Performance, Events, Results - Multi-source integratie

---

## 🎨 Dashboard Requirements

### 1. Rider Performance Dashboard
**Doel:** Complete rider profiel met stats, trends, en PR's

**Data Nodig:**
- **Van ZwiftRacing.app:**
  - vELO rating (current + history)
  - Race results count (90 dagen)
  - Category (A/B/C/D)
  - Power curve (5s, 15s, 30s, 1m, 5m, 20m)
  
- **Van Zwift.com API:**
  - Profile info (name, avatar, level)
  - FTP, weight, height
  - Recent activities
  - Followers/following count
  
- **Van ZwiftPower:**
  - Category Enforcement (CE) status
  - ZP ranking position
  - Age group ranking
  - Historical ratings graph

**Unified Output:**
```typescript
interface RiderPerformance {
  // Core identity (alle sources)
  rider_id: number;
  name: string;
  avatar_url: string;
  
  // Racing stats (ZwiftRacing)
  velo_rating: number;
  velo_history: {date: string, rating: number}[];
  category: 'A' | 'B' | 'C' | 'D';
  race_count_90d: number;
  
  // Power/Physical (Zwift.com + results)
  ftp: number;
  weight_kg: number;
  power_curve: {
    s5: number, s15: number, s30: number,
    m1: number, m5: number, m20: number
  };
  
  // ZwiftPower (ZP)
  zp_category_enforcement: boolean;
  zp_ranking_position: number;
  zp_age_group: string;
  
  // Computed
  w_kg_ftp: number;
  recent_form: 'improving' | 'stable' | 'declining';
}
```

---

### 2. Events Dashboard (met Signups)
**Doel:** Upcoming events + welke team members signed up

**Data Nodig:**
- **Van ZwiftRacing.app:**
  - Event details (name, date, route, distance, elevation)
  - Event signups (per event, list van rider IDs)
  - Event type (race, group ride, workout)
  
- **Van Zwift.com API:**
  - Real-time event start times
  - Route details (world, profile)
  - Event organizer info

**Unified Output:**
```typescript
interface EventWithSignups {
  // Event core (ZwiftRacing)
  event_id: string;
  event_name: string;
  event_date: string;
  event_type: 'Race' | 'Group Ride' | 'Workout';
  
  // Route info (ZwiftRacing + Zwift.com)
  route_name: string;
  route_world: string;
  distance_km: number;
  elevation_m: number;
  route_profile: 'Flat' | 'Rolling' | 'Hilly' | 'Mountain';
  
  // Team participation (computed)
  team_signups: {
    rider_id: number;
    rider_name: string;
    velo_rating: number;
    category: string;
  }[];
  team_signup_count: number;
  total_signups: number;
  
  // Status
  hours_until_start: number;
  is_team_event: boolean;
}
```

---

### 3. Results Dashboard (Team Members Only)
**Doel:** Recent race results met rankings, power data, vELO changes

**Data Nodig:**
- **Van ZwiftRacing.app:**
  - Race results (rank, time, power curves)
  - vELO rating + delta
  - Event details
  
- **Van ZwiftPower:**
  - Category Enforcement applied?
  - Disqualifications (DQ)
  - Age group position
  - ZP points earned

**Unified Output:**
```typescript
interface TeamRaceResult {
  // Result core (ZwiftRacing)
  result_id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  
  // Rider (team member)
  rider_id: number;
  rider_name: string;
  
  // Performance (ZwiftRacing)
  rank: number;
  total_riders: number;
  time_seconds: number;
  avg_wkg: number;
  power_curve: {...};
  
  // Rating (ZwiftRacing)
  velo_rating: number;
  velo_change: number;
  velo_previous: number;
  
  // ZwiftPower enrichment (ZP)
  zp_category_enforcement: boolean;
  zp_disqualified: boolean;
  zp_age_group_position: number;
  zp_points: number;
  
  // Route
  route_name: string;
  distance_km: number;
  elevation_m: number;
  
  // Status
  dnf: boolean;
  position_in_category: number;
}
```

---

## 🗄️ Unified Database Schema

### Core Principle: **Single Source of Truth per Data Type**

```sql
-- ============================================================================
-- RIDERS: Aggregated van alle sources
-- ============================================================================
CREATE TABLE riders_unified (
  rider_id INT PRIMARY KEY,
  name TEXT NOT NULL,
  
  -- ZwiftRacing.app data
  velo_rating INT,
  velo_rating_updated_at TIMESTAMPTZ,
  category TEXT,
  race_count_90d INT,
  
  -- Zwift.com API data
  zwift_profile_id TEXT UNIQUE,
  ftp INT,
  weight_kg DECIMAL,
  height_cm INT,
  avatar_url TEXT,
  level INT,
  
  -- ZwiftPower data
  zp_profile_url TEXT,
  zp_category_enforcement BOOLEAN DEFAULT false,
  zp_ranking_position INT,
  zp_age_group TEXT,
  
  -- Metadata
  is_team_member BOOLEAN DEFAULT false,
  last_synced_zwift_racing TIMESTAMPTZ,
  last_synced_zwift_official TIMESTAMPTZ,
  last_synced_zwiftpower TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices voor performance
CREATE INDEX idx_riders_team ON riders_unified(is_team_member) WHERE is_team_member = true;
CREATE INDEX idx_riders_rating ON riders_unified(velo_rating DESC);
CREATE INDEX idx_riders_updated ON riders_unified(updated_at);

-- ============================================================================
-- EVENTS: Van ZwiftRacing + Zwift.com
-- ============================================================================
CREATE TABLE events_unified (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT, -- 'Race', 'Group Ride', 'Workout'
  
  -- Route info
  route_name TEXT,
  route_world TEXT,
  route_profile TEXT,
  distance_km DECIMAL,
  elevation_m INT,
  laps INT,
  
  -- Organizer
  organizer_name TEXT,
  organizer_club_id INT,
  
  -- Stats
  total_signups INT DEFAULT 0,
  team_signups_count INT DEFAULT 0,
  
  -- Source tracking
  source TEXT, -- 'zwift_racing' or 'zwift_official'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events_unified(event_date);
CREATE INDEX idx_events_upcoming ON events_unified(event_date) WHERE event_date > NOW();
CREATE INDEX idx_events_team ON events_unified(team_signups_count) WHERE team_signups_count > 0;

-- ============================================================================
-- EVENT SIGNUPS: Welke riders signed up voor welke events
-- ============================================================================
CREATE TABLE event_signups_unified (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events_unified(event_id) ON DELETE CASCADE,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  
  -- Signup info
  signed_up_at TIMESTAMPTZ,
  category TEXT,
  
  -- Status
  is_team_member BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rider_id)
);

CREATE INDEX idx_signups_event ON event_signups_unified(event_id);
CREATE INDEX idx_signups_rider ON event_signups_unified(rider_id);
CREATE INDEX idx_signups_team ON event_signups_unified(is_team_member) WHERE is_team_member = true;

-- ============================================================================
-- RACE RESULTS: Van ZwiftRacing + ZwiftPower enrichment
-- ============================================================================
CREATE TABLE race_results_unified (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events_unified(event_id) ON DELETE CASCADE,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  
  -- Result basics (ZwiftRacing)
  rank INT NOT NULL,
  time_seconds INT,
  avg_wkg DECIMAL,
  category TEXT,
  
  -- Power data (ZwiftRacing)
  power_5s DECIMAL,
  power_15s DECIMAL,
  power_30s DECIMAL,
  power_1m DECIMAL,
  power_2m DECIMAL,
  power_5m DECIMAL,
  power_20m DECIMAL,
  
  -- Ratings (ZwiftRacing)
  velo_rating INT,
  velo_previous INT,
  velo_change INT,
  
  -- Heart rate (ZwiftRacing)
  heartrate_avg INT,
  heartrate_max INT,
  
  -- Effort (ZwiftRacing)
  effort_score INT,
  race_points DECIMAL,
  
  -- ZwiftPower enrichment
  zp_category_enforcement BOOLEAN,
  zp_disqualified BOOLEAN DEFAULT false,
  zp_disqualified_reason TEXT,
  zp_age_group_position INT,
  zp_points INT,
  
  -- Status
  dnf BOOLEAN DEFAULT false,
  position_in_category INT,
  
  -- Metadata
  source TEXT DEFAULT 'zwift_racing', -- 'zwift_racing' or 'zwiftpower'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rider_id)
);

CREATE INDEX idx_results_event ON race_results_unified(event_id);
CREATE INDEX idx_results_rider ON race_results_unified(rider_id);
CREATE INDEX idx_results_rating ON race_results_unified(velo_rating DESC);
CREATE INDEX idx_results_date ON race_results_unified(created_at DESC);

-- ============================================================================
-- RIDER HISTORY: vELO rating over tijd (voor graphs)
-- ============================================================================
CREATE TABLE rider_rating_history (
  id BIGSERIAL PRIMARY KEY,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  rating INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT, -- 'race_result', 'manual_sync', 'zwiftpower'
  
  UNIQUE(rider_id, recorded_at)
);

CREATE INDEX idx_history_rider_date ON rider_rating_history(rider_id, recorded_at DESC);

-- ============================================================================
-- SYNC STATUS: Track per source, per entity
-- ============================================================================
CREATE TABLE sync_status_unified (
  id BIGSERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'riders', 'events', 'signups', 'results'
  source TEXT NOT NULL, -- 'zwift_racing', 'zwift_official', 'zwiftpower'
  
  status TEXT NOT NULL, -- 'success', 'partial', 'failed'
  records_processed INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_created INT DEFAULT 0,
  
  duration_ms INT,
  error_message TEXT,
  
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_type_source ON sync_status_unified(sync_type, source);
CREATE INDEX idx_sync_started ON sync_status_unified(started_at DESC);
```

---

## 🔄 Unified Sync Orchestrator

### Strategy: **Multi-Source Merge met Dependency Tracking**

```typescript
// ============================================================================
// UNIFIED SYNC ORCHESTRATOR
// ============================================================================

class UnifiedSyncOrchestrator {
  
  // ========================================================================
  // PHASE 1: RIDERS (Parallel multi-source)
  // ========================================================================
  async syncRiders(riderIds: number[]): Promise<void> {
    console.log('🚀 [Unified Sync] Phase 1: Riders (3 sources parallel)');
    
    const results = await Promise.allSettled([
      // Source 1: ZwiftRacing.app (vELO, category, race count)
      this.syncRidersFromZwiftRacing(riderIds),
      
      // Source 2: Zwift.com API (FTP, weight, profile)
      this.syncRidersFromZwiftOfficial(riderIds),
      
      // Source 3: ZwiftPower (CE status, rankings)
      this.syncRidersFromZwiftPower(riderIds)
    ]);
    
    // Merge results into riders_unified table
    await this.mergeRiderData(results);
  }
  
  private async syncRidersFromZwiftRacing(riderIds: number[]) {
    // GET /public/clubs/11818 → alle team members
    const clubData = await zwiftRacingClient.getClubMembers(11818);
    
    return clubData.map(rider => ({
      rider_id: rider.riderId,
      name: rider.name,
      velo_rating: rider.rating,
      category: rider.category,
      race_count_90d: rider.raceResults90Days,
      source: 'zwift_racing'
    }));
  }
  
  private async syncRidersFromZwiftOfficial(riderIds: number[]) {
    // Parallel fetch profiles (max 5 concurrent voor rate limit)
    const profiles = await Promise.all(
      chunk(riderIds, 5).map(batch => 
        Promise.all(batch.map(id => 
          zwiftOfficialClient.getProfile(id).catch(() => null)
        ))
      )
    );
    
    return profiles.flat().filter(Boolean).map(profile => ({
      rider_id: profile.id,
      zwift_profile_id: profile.profileId,
      ftp: profile.ftp,
      weight_kg: profile.weight,
      height_cm: profile.height,
      avatar_url: profile.imageSrc,
      level: profile.level,
      source: 'zwift_official'
    }));
  }
  
  private async syncRidersFromZwiftPower(riderIds: number[]) {
    // ZwiftPower profile data (met authentication)
    const zpData = await Promise.all(
      riderIds.map(id => 
        zwiftPowerClient.getRiderProfile(id).catch(() => null)
      )
    );
    
    return zpData.filter(Boolean).map(zp => ({
      rider_id: zp.zwid,
      zp_profile_url: `https://zwiftpower.com/profile.php?z=${zp.zwid}`,
      zp_category_enforcement: zp.category_enforcement,
      zp_ranking_position: zp.position,
      zp_age_group: zp.age_group,
      source: 'zwiftpower'
    }));
  }
  
  private async mergeRiderData(sources: PromiseSettledResult<any[]>[]) {
    // Merge alle sources in riders_unified met UPSERT
    for (const result of sources) {
      if (result.status === 'fulfilled') {
        for (const riderData of result.value) {
          await supabase
            .from('riders_unified')
            .upsert(riderData, {
              onConflict: 'rider_id',
              ignoreDuplicates: false
            });
        }
      }
    }
  }
  
  // ========================================================================
  // PHASE 2: EVENTS + SIGNUPS (Sequential: events eerst, dan signups)
  // ========================================================================
  async syncEventsWithSignups(): Promise<void> {
    console.log('🚀 [Unified Sync] Phase 2: Events + Signups');
    
    // Step 1: Sync events van ZwiftRacing
    const events = await zwiftRacingClient.getUpcomingEvents();
    
    await supabase
      .from('events_unified')
      .upsert(
        events.map(e => ({
          event_id: e.id,
          event_name: e.name,
          event_date: e.eventStart,
          event_type: e.type,
          route_name: e.route,
          route_world: e.world,
          distance_km: e.distanceInKilometers,
          elevation_m: e.elevationGainInMeters,
          source: 'zwift_racing'
        })),
        { onConflict: 'event_id' }
      );
    
    // Step 2: Voor elke event, sync signups
    const teamMemberIds = await this.getTeamMemberIds();
    
    for (const event of events) {
      const signups = await zwiftRacingClient.getEventSignups(event.id);
      
      // Filter: alleen team members
      const teamSignups = signups.filter(s => 
        teamMemberIds.includes(s.riderId)
      );
      
      // Save signups
      await supabase
        .from('event_signups_unified')
        .upsert(
          teamSignups.map(s => ({
            event_id: event.id,
            rider_id: s.riderId,
            category: s.category,
            is_team_member: true
          })),
          { onConflict: 'event_id,rider_id' }
        );
      
      // Update event team_signups_count
      await supabase
        .from('events_unified')
        .update({ 
          team_signups_count: teamSignups.length,
          total_signups: signups.length
        })
        .eq('event_id', event.id);
    }
  }
  
  // ========================================================================
  // PHASE 3: RESULTS (ZwiftRacing + ZwiftPower enrichment)
  // ========================================================================
  async syncResultsWithEnrichment(daysBack: number = 30): Promise<void> {
    console.log('🚀 [Unified Sync] Phase 3: Results (2 sources)');
    
    // Step 1: Get events waar team members geraced hebben
    const teamEvents = await supabase
      .from('event_signups_unified')
      .select('event_id, event_date')
      .eq('is_team_member', true)
      .gte('event_date', new Date(Date.now() - daysBack * 24*60*60*1000));
    
    const teamMemberIds = await this.getTeamMemberIds();
    
    // Step 2: Voor elke event, haal results op (ZwiftRacing)
    for (const { event_id } of teamEvents.data || []) {
      // ZwiftRacing results
      const results = await zwiftRacingClient.getEventResults(event_id);
      const teamResults = results.filter(r => teamMemberIds.includes(r.riderId));
      
      // Save base results
      await supabase
        .from('race_results_unified')
        .upsert(
          teamResults.map(r => ({
            event_id,
            rider_id: r.riderId,
            rank: r.rank,
            time_seconds: r.time,
            avg_wkg: r.power?.wkg?.avg,
            power_5s: r.power?.wkg?.p5s,
            power_1m: r.power?.wkg?.p1m,
            // ... alle power fields
            velo_rating: r.rating,
            velo_change: r.ratingDelta,
            velo_previous: r.rating - r.ratingDelta,
            source: 'zwift_racing'
          })),
          { onConflict: 'event_id,rider_id' }
        );
      
      // Step 3: ENRICHMENT - ZwiftPower data
      try {
        const zpResults = await zwiftPowerClient.getEventResults(event_id);
        
        for (const zpResult of zpResults) {
          if (teamMemberIds.includes(zpResult.zwid)) {
            await supabase
              .from('race_results_unified')
              .update({
                zp_category_enforcement: zpResult.category_enforcement,
                zp_disqualified: zpResult.flag === 'DQ',
                zp_disqualified_reason: zpResult.flag_description,
                zp_age_group_position: zpResult.age_group_pos,
                zp_points: zpResult.zp_points
              })
              .eq('event_id', event_id)
              .eq('rider_id', zpResult.zwid);
          }
        }
      } catch (error) {
        console.warn(`⚠️  ZwiftPower enrichment failed for event ${event_id}`);
      }
      
      // Step 4: Update rider rating history
      for (const result of teamResults) {
        await supabase
          .from('rider_rating_history')
          .upsert({
            rider_id: result.riderId,
            rating: result.rating,
            recorded_at: new Date(),
            source: 'race_result'
          });
      }
    }
  }
  
  // ========================================================================
  // ORCHESTRATION: Full sync met dependency tracking
  // ========================================================================
  async executeFullSync(): Promise<void> {
    console.log('🎯 [Unified Sync] Starting full multi-source sync...');
    
    const startTime = Date.now();
    
    try {
      // Phase 1: Riders (parallel sources)
      const teamMemberIds = await this.getTeamMemberIds();
      await this.syncRiders(teamMemberIds);
      console.log('✅ Phase 1 complete: Riders synced from 3 sources');
      
      // Phase 2: Events + Signups (sequential binnen phase)
      await this.syncEventsWithSignups();
      console.log('✅ Phase 2 complete: Events + Signups synced');
      
      // Phase 3: Results + Enrichment (sequential)
      await this.syncResultsWithEnrichment(30);
      console.log('✅ Phase 3 complete: Results synced + enriched');
      
      const duration = Date.now() - startTime;
      console.log(`🎉 Full sync complete in ${(duration/1000/60).toFixed(1)} minutes`);
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }
}
```

---

## 📊 Dashboard API Endpoints

### 1. Rider Performance Dashboard

```typescript
// GET /api/dashboard/rider/:riderId
router.get('/dashboard/rider/:riderId', async (req, res) => {
  const { riderId } = req.params;
  
  // Unified query: 1 rider met alle data
  const rider = await supabase
    .from('riders_unified')
    .select('*')
    .eq('rider_id', riderId)
    .single();
  
  // Rating history voor graph
  const ratingHistory = await supabase
    .from('rider_rating_history')
    .select('rating, recorded_at')
    .eq('rider_id', riderId)
    .order('recorded_at', { ascending: true })
    .limit(50);
  
  // Recent results (laatste 10)
  const recentResults = await supabase
    .from('race_results_unified')
    .select('*, events_unified(*)')
    .eq('rider_id', riderId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  res.json({
    rider: rider.data,
    rating_history: ratingHistory.data,
    recent_results: recentResults.data,
    computed: {
      w_kg_ftp: rider.data.ftp / rider.data.weight_kg,
      recent_form: calculateForm(ratingHistory.data)
    }
  });
});
```

### 2. Events Dashboard (met Signups)

```typescript
// GET /api/dashboard/events/upcoming
router.get('/dashboard/events/upcoming', async (req, res) => {
  const { hours = 168 } = req.query; // 7 dagen default
  
  const cutoff = new Date(Date.now() + hours * 60 * 60 * 1000);
  
  // Events met team signups
  const events = await supabase
    .from('events_unified')
    .select(`
      *,
      signups:event_signups_unified(
        rider:riders_unified(rider_id, name, velo_rating, category)
      )
    `)
    .gte('event_date', new Date())
    .lte('event_date', cutoff)
    .order('event_date', { ascending: true });
  
  res.json({
    events: events.data.map(e => ({
      ...e,
      team_signups: e.signups.filter(s => s.rider),
      hours_until_start: (new Date(e.event_date) - Date.now()) / (1000*60*60),
      is_team_event: e.team_signups_count > 0
    }))
  });
});
```

### 3. Results Dashboard (Team Only)

```typescript
// GET /api/dashboard/results/team
router.get('/dashboard/results/team', async (req, res) => {
  const { days = 30 } = req.query;
  
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Alleen team results
  const results = await supabase
    .from('race_results_unified')
    .select(`
      *,
      event:events_unified(*),
      rider:riders_unified(rider_id, name, avatar_url)
    `)
    .gte('created_at', cutoff)
    .eq('riders_unified.is_team_member', true)
    .order('created_at', { ascending: false });
  
  // Group by event
  const grouped = groupBy(results.data, 'event_id');
  
  res.json({
    results: Object.values(grouped).map(eventResults => ({
      event: eventResults[0].event,
      results: eventResults.map(r => ({
        ...r,
        rider: r.rider,
        enriched_with_zp: r.zp_category_enforcement !== null
      }))
    }))
  });
});
```

---

## ⚡ Performance Optimizations

### 1. Database Indices (al gedaan in schema hierboven)
- Composite indices op veel-gebruikte filters
- Partial indices voor team members only

### 2. Caching Strategy
```typescript
// Redis cache voor veelgevraagde data
const cacheConfig = {
  'riders_unified': 60 * 60,        // 1 hour
  'events_upcoming': 5 * 60,        // 5 min
  'race_results_recent': 15 * 60   // 15 min
};
```

### 3. Batch Processing
```typescript
// Riders sync: chunk(riderIds, 50) voor bulk processing
// Events sync: parallel batch van 5 events/min (rate limit safe)
// Results sync: 3 parallel calls met 20s delay
```

### 4. Incremental Updates
```typescript
// Alleen sync riders die >24h niet geupdate zijn
const staleRiders = await supabase
  .from('riders_unified')
  .select('rider_id')
  .lt('updated_at', new Date(Date.now() - 24*60*60*1000));
```

---

## 🚀 Expected Performance

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Rider Dashboard load | 3-5 API calls | 1 unified query | **80% sneller** |
| Events Dashboard load | 2-3 API calls | 1 unified query | **70% sneller** |
| Results Dashboard load | Multiple queries | 1 unified query | **75% sneller** |
| Full sync time | 40 min | 15 min | **62% sneller** |
| Database queries | O(n²) | O(log n) | **90%+ sneller** |

---

## ✅ Volgende Stappen

1. **Create migrations** voor nieuwe unified schema
2. **Implement UnifiedSyncOrchestrator** class
3. **Update dashboard endpoints** om unified tables te gebruiken
4. **Test multi-source sync** met real data
5. **Migrate production** data naar unified schema

**Ready to start implementing?** 🚀
