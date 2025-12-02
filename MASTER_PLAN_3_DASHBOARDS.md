# 🎯 Master Plan: 3 Unified Dashboards met Multi-Source Integratie

**Project:** TeamNL Cloud9 Racing Team Dashboard  
**Start datum:** 1 december 2025  
**Proof of Concept:** RiderID 150437 (JRøne CloudRacer-9)  
**Rollout:** Full team (75 riders) na succesvolle POC

---

## 📋 Executive Summary

### Doel
3 volledig geïntegreerde dashboards met data van **3 API bronnen**:
1. **Rider Performance Dashboard** - Complete rider profiel + stats
2. **Events Dashboard** - Upcoming events + team signups
3. **Results Dashboard** - Race results met power data + enrichment

### Strategie
**Phase-based rollout met POC validatie:**
- ✅ **POC Phase (Dag 1-2):** RiderID 150437 alleen
- 🚀 **Rollout Phase (Dag 3-4):** Full team (75 riders)
- 📊 **Optimize Phase (Dag 5):** Performance tuning

### Verwachte Resultaten
- **Data completeness:** 95%+ (3 sources gecombineerd)
- **Dashboard load time:** <2s (unified queries)
- **Sync time:** 15 min full sync (vs 40 min huidig)
- **API efficiency:** 87% reductie in calls

---

## 🎯 Dashboard Requirements - Detailed Specs

### Dashboard 1: Rider Performance Dashboard

**Voor:** Individuele rider deep-dive (focus: RiderID 150437)

**Data te tonen:**

**Section A: Core Identity**
- Name: "JRøne CloudRacer-9 @YT (TeamNL)"
- Avatar image (Zwift.com)
- Country flag: 🇳🇱 (Zwift.com)
- Team badge: TeamNL Cloud9

**Section B: Racing Stats**
- vELO Rating: 1395 (current)
- vELO Category: B
- vELO History Graph (laatste 30 dagen)
- Race Count (90d): 25 races
- Last Race: 24 nov 2025

**Section C: Physical Stats**
- FTP: 295W (ZwiftPower) ⭐
- Weight: 76.5kg (ZwiftPower) ⭐
- W/kg: 3.86 (computed)
- Height: 183cm (from signups)

**Section D: Power Profile**
- 5s: 10.91 W/kg
- 15s: 9.01 W/kg
- 30s: 7.92 W/kg
- 1m: 5.15 W/kg
- 5m: 3.66 W/kg
- 20m: 3.28 W/kg
- Phenotype: "ALLROUNDER" (from signups)

**Section E: Recent Performance**
- Last 5 races (table):
  - Date, Event, Rank, vELO change, Power avg
- Recent Activities (laatste 10 rides van Zwift.com):
  - Date, Distance, Duration, Avg Power, Calories

**Section F: Social Stats**
- Followers: 245 (Zwift.com)
- Following: 189 (Zwift.com)
- Club: TeamNL Cloud9 Racing Team

**Data Sources:**
- ZwiftRacing.app: vELO, category, race count, power curves
- Zwift.com: Avatar, country, activities, social
- ZwiftPower: FTP, weight (KRITIEK!)

---

### Dashboard 2: Events Dashboard

**Voor:** Upcoming events met team participation tracking

**Data te tonen:**

**Filters:**
- Time range: Next 24h / 48h / 7 days / 30 days
- Event type: All / Races / Group Rides
- Team filter: Show only events met ≥1 team signup

**Event Card (per event):**

**Header:**
- Event name: "Zwift Crit Racing Club - Toefield Tornado"
- Date/Time: "24 nov 2025, 10:40 UTC"
- Countdown: "Starts in 2h 15m" (real-time)

**Route Info:**
- Route: "Toefield Tornado"
- World: "New York" 🗽
- Profile: "Rolling" 🟡
- Distance: 20.5 km
- Elevation: 106m
- Laps: 1

**Event Stats:**
- Total signups: 45 riders
- Categories: A (12) | B (23) | C (8) | D (2)

**Team Participation:**
- Team signups: 3 riders 👥
- Riders list:
  - JRøne CloudRacer-9 (B, vELO 1395)
  - [Other team member] (C, vELO 980)
  - [Other team member] (B, vELO 1450)

**Actions:**
- View full event details
- See all signups per category

**Data Sources:**
- ZwiftRacing.app: Events, signups, route info

---

### Dashboard 3: Results Dashboard

**Voor:** Historical race results (team members only)

**Data te tonen:**

**Filters:**
- Date range: Last 7d / 30d / 90d / All time
- Rider: All team / Individual rider (RiderID 150437)
- Event type: All / Only team events (≥2 team members)

**Results grouped by Event:**

**Event Header:**
- Event name: "Zwift Crit Racing Club - Toefield Tornado"
- Date: "24 nov 2025"
- Route: "Toefield Tornado (New York) - 20.5km, 106m ⬆️"
- Profile: Rolling 🟡
- Total finishers: 42 riders

**Team Results Table (per event):**

| Rider | Rank | Cat | Time | Avg W/kg | vELO | Δ | Power Curve | HR | Status |
|-------|------|-----|------|----------|------|---|-------------|----|----|
| JRøne CR-9 | 3/42 | B | 29:42 | 3.2 | 1395 | +25 | 📊 | 151 | ✅ |

**Expandable Row Details:**
- Full power curve (5s, 15s, 30s, 1m, 2m, 5m, 20m)
- Heart rate: Avg 151, Max 180
- Effort score: 50
- Race points: 120.94
- **ZwiftPower enrichment:**
  - Category Enforcement: ✅ Applied
  - DQ Status: - (none)
  - Age Group Position: 2nd in 35-44
  - ZP Points: 85

**Badges/Indicators:**
- 🥉 Podium (top 3)
- ⭐ PR (personal record power)
- 📈 vELO gain (+25)
- 🚫 DNF (did not finish) - if applicable
- ⚠️ DQ (disqualified) - ZwiftPower flag
- ✅ CE (category enforcement applied)

**Data Sources:**
- ZwiftRacing.app: Results, power data, vELO changes
- ZwiftPower: CE status, DQ flags, age group, ZP points

---

## 🗄️ Database Architecture - Unified Schema

### New Tables (Unified Multi-Source)

```sql
-- ============================================================================
-- TABLE 1: riders_unified (Multi-source rider data)
-- ============================================================================
CREATE TABLE riders_unified (
  rider_id INT PRIMARY KEY,
  name TEXT NOT NULL,
  
  -- ZwiftRacing.app data
  velo_rating INT,
  velo_rating_updated_at TIMESTAMPTZ,
  category TEXT CHECK (category IN ('A', 'B', 'C', 'D', 'E')),
  race_count_90d INT DEFAULT 0,
  
  -- Zwift.com API data
  zwift_profile_id TEXT UNIQUE,
  avatar_url TEXT,
  avatar_url_large TEXT,
  country_code TEXT,
  country_alpha3 TEXT,
  level INT,
  followers_count INT DEFAULT 0,
  followees_count INT DEFAULT 0,
  currently_riding BOOLEAN DEFAULT false,
  
  -- ZwiftPower data (KRITIEK voor FTP/weight!)
  ftp INT,
  weight_kg DECIMAL(5,2),
  height_cm INT,
  zp_category TEXT,
  zp_ranking_position INT,
  
  -- Metadata
  is_team_member BOOLEAN DEFAULT false,
  club_id INT,
  club_name TEXT,
  
  -- Sync tracking
  last_synced_zwift_racing TIMESTAMPTZ,
  last_synced_zwift_official TIMESTAMPTZ,
  last_synced_zwiftpower TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_riders_unified_team ON riders_unified(is_team_member) WHERE is_team_member = true;
CREATE INDEX idx_riders_unified_rating ON riders_unified(velo_rating DESC);
CREATE INDEX idx_riders_unified_category ON riders_unified(category);

-- ============================================================================
-- TABLE 2: rider_rating_history (vELO over tijd voor graphs)
-- ============================================================================
CREATE TABLE rider_rating_history (
  id BIGSERIAL PRIMARY KEY,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  rating INT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT CHECK (source IN ('race_result', 'api_sync', 'zwiftpower')),
  
  UNIQUE(rider_id, recorded_at)
);

CREATE INDEX idx_rating_history_rider ON rider_rating_history(rider_id, recorded_at DESC);

-- ============================================================================
-- TABLE 3: rider_activities (Recent training van Zwift.com)
-- ============================================================================
CREATE TABLE rider_activities (
  id BIGSERIAL PRIMARY KEY,
  activity_id BIGINT UNIQUE NOT NULL,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  
  name TEXT,
  sport TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  
  distance_meters INT,
  duration_seconds INT,
  elevation_meters INT,
  
  avg_watts INT,
  calories INT,
  avg_heart_rate INT,
  max_heart_rate INT,
  
  world_id INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_rider ON rider_activities(rider_id, start_date DESC);

-- ============================================================================
-- TABLE 4: events_unified (Upcoming events)
-- ============================================================================
CREATE TABLE events_unified (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT,
  sub_type TEXT,
  
  -- Route info
  route_id INT,
  route_name TEXT,
  route_world TEXT,
  route_profile TEXT CHECK (route_profile IN ('Flat', 'Rolling', 'Hilly', 'Mountainous')),
  distance_km DECIMAL(5,2),
  elevation_m INT,
  laps INT,
  
  -- Stats
  total_signups INT DEFAULT 0,
  team_signups_count INT DEFAULT 0,
  categories_available TEXT, -- 'A,B,C,D'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_date ON events_unified(event_date);
CREATE INDEX idx_events_upcoming ON events_unified(event_date) WHERE event_date > NOW();
CREATE INDEX idx_events_team ON events_unified(team_signups_count) WHERE team_signups_count > 0;

-- ============================================================================
-- TABLE 5: event_signups_unified (Who signed up for what)
-- ============================================================================
CREATE TABLE event_signups_unified (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events_unified(event_id) ON DELETE CASCADE,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  
  category TEXT,
  weight_kg DECIMAL(5,2),
  height_cm INT,
  
  -- Power profile (from signups data)
  power_wkg_5s DECIMAL(5,2),
  power_wkg_1m DECIMAL(5,2),
  power_wkg_5m DECIMAL(5,2),
  power_wkg_20m DECIMAL(5,2),
  critical_power INT,
  anaerobic_work_capacity INT,
  
  -- Racing stats
  wins INT DEFAULT 0,
  podiums INT DEFAULT 0,
  phenotype TEXT, -- 'SPRINTER', 'ALLROUNDER', 'CLIMBER', etc
  
  is_team_member BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rider_id)
);

CREATE INDEX idx_signups_event ON event_signups_unified(event_id);
CREATE INDEX idx_signups_rider ON event_signups_unified(rider_id);
CREATE INDEX idx_signups_team ON event_signups_unified(is_team_member) WHERE is_team_member = true;

-- ============================================================================
-- TABLE 6: race_results_unified (Results + ZP enrichment)
-- ============================================================================
CREATE TABLE race_results_unified (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events_unified(event_id) ON DELETE CASCADE,
  rider_id INT NOT NULL REFERENCES riders_unified(rider_id) ON DELETE CASCADE,
  
  -- Result basics
  rank INT NOT NULL,
  time_seconds INT,
  avg_wkg DECIMAL(5,2),
  category TEXT,
  position_in_category INT,
  
  -- Power curve (ZwiftRacing)
  power_5s DECIMAL(5,2),
  power_15s DECIMAL(5,2),
  power_30s DECIMAL(5,2),
  power_1m DECIMAL(5,2),
  power_2m DECIMAL(5,2),
  power_5m DECIMAL(5,2),
  power_20m DECIMAL(5,2),
  power_avg INT,
  power_max INT,
  
  -- Heart rate
  heartrate_avg INT,
  heartrate_max INT,
  
  -- vELO ratings
  velo_rating INT,
  velo_previous INT,
  velo_change INT,
  
  -- Effort
  effort_score INT,
  race_points DECIMAL(6,2),
  
  -- Status
  dnf BOOLEAN DEFAULT false,
  
  -- ZwiftPower enrichment (nullable until enriched)
  zp_category_enforcement BOOLEAN,
  zp_disqualified BOOLEAN DEFAULT false,
  zp_disqualified_reason TEXT,
  zp_age_group_position INT,
  zp_points INT,
  
  -- Metadata
  source TEXT DEFAULT 'zwift_racing',
  enriched_with_zp BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, rider_id)
);

CREATE INDEX idx_results_event ON race_results_unified(event_id);
CREATE INDEX idx_results_rider ON race_results_unified(rider_id);
CREATE INDEX idx_results_rating ON race_results_unified(velo_rating DESC);
CREATE INDEX idx_results_created ON race_results_unified(created_at DESC);

-- ============================================================================
-- TABLE 7: sync_status_unified (Track syncs per source)
-- ============================================================================
CREATE TABLE sync_status_unified (
  id BIGSERIAL PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'riders', 'events', 'signups', 'results', 'activities'
  source TEXT NOT NULL, -- 'zwift_racing', 'zwift_official', 'zwiftpower'
  entity_id TEXT, -- Optional: specific entity (rider_id, event_id)
  
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  records_processed INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_created INT DEFAULT 0,
  
  duration_ms INT,
  error_message TEXT,
  
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_status_type_source ON sync_status_unified(sync_type, source);
CREATE INDEX idx_sync_status_entity ON sync_status_unified(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_sync_status_started ON sync_status_unified(started_at DESC);
```

---

## 🔄 Implementation Plan - Phase by Phase

---

## 📅 PHASE 1: POC - Single Rider (RiderID 150437)

**Doel:** Valideer complete data flow voor 1 rider  
**Duur:** 6-8 uur (Dag 1-2)  
**Success criteria:** Dashboard toont complete data van rider 150437

### Step 1.1: Database Setup (1 uur)

**File:** `supabase/migrations/030_unified_schema_poc.sql`

```sql
-- Create alle 7 nieuwe tabellen (zie schema hierboven)
-- Run migration: supabase db push
```

**Test:**
```bash
# Verify tables exist
psql $DATABASE_URL -c "\dt riders_unified"
psql $DATABASE_URL -c "\dt race_results_unified"
```

---

### Step 1.2: API Client Enhancement (1-2 uur)

**File:** `backend/src/api/zwift-client.ts`

**Add missing methods:**

```typescript
// Already exists but enable it:
async getRider(riderId: number): Promise<ZwiftRider> {
  return await rateLimiter.executeWithLimit('rider_individual', async () => {
    const response = await this.client.get(`/public/riders/${riderId}`);
    console.log(`[ZwiftAPI] Rider ${riderId} - history items: ${response.data.history?.length || 0}`);
    return response.data;
  });
}

// Enable ZP results enrichment:
async getEventResultsZwiftPower(eventId: number): Promise<any[]> {
  return await rateLimiter.executeWithLimit('event_results_zp', async () => {
    const response = await this.client.get(`/public/zp/${eventId}/results`);
    return response.data;
  });
}
```

**Test:**
```bash
cd backend
npx tsx -e "
import { ZwiftApiClient } from './src/api/zwift-client.js';
const client = new ZwiftApiClient();
const rider = await client.getRider(150437);
console.log('Rider:', rider.name);
console.log('History items:', rider.history?.length);
console.log('Latest rating:', rider.rating);
"
```

---

### Step 1.3: POC Sync Service (2-3 uur)

**File:** `backend/src/services/poc-unified-sync.service.ts`

```typescript
/**
 * POC Unified Sync - Single Rider (150437)
 * Tests complete data flow from 3 sources
 */

import { ZwiftApiClient } from '../api/zwift-client.js';
import { ZwiftOfficialClient } from '../api/zwift-official-client.js';
import { ZwiftPowerClient } from '../api/zwiftpower-client.js';
import { SupabaseService } from './supabase.service.js';

export class POCUnifiedSyncService {
  private zwiftRacing: ZwiftApiClient;
  private zwiftOfficial: ZwiftOfficialClient;
  private zwiftPower: ZwiftPowerClient;
  private supabase: SupabaseService;
  
  private readonly POC_RIDER_ID = 150437;
  
  constructor() {
    this.zwiftRacing = new ZwiftApiClient();
    this.zwiftOfficial = new ZwiftOfficialClient();
    this.zwiftPower = new ZwiftPowerClient();
    this.supabase = new SupabaseService();
  }
  
  /**
   * FULL POC SYNC - All 3 dashboards for rider 150437
   */
  async executeFullPOC(): Promise<void> {
    console.log('🎯 [POC] Starting full unified sync for rider 150437...\n');
    
    const startTime = Date.now();
    
    try {
      // Phase 1: Rider Data (3 sources parallel)
      await this.syncRiderData();
      
      // Phase 2: Events + Signups (where rider 150437 signed up)
      await this.syncEventsAndSignups();
      
      // Phase 3: Results + Enrichment (races where rider 150437 participated)
      await this.syncResultsWithEnrichment();
      
      const duration = Date.now() - startTime;
      console.log(`\n✅ [POC] Complete in ${(duration/1000).toFixed(1)}s`);
      
      // Summary
      await this.printSummary();
      
    } catch (error) {
      console.error('❌ [POC] Failed:', error);
      throw error;
    }
  }
  
  /**
   * PHASE 1: Sync rider 150437 from 3 sources
   */
  private async syncRiderData(): Promise<void> {
    console.log('📊 [POC Phase 1] Syncing rider data (3 sources)...');
    
    const results = await Promise.allSettled([
      this.syncFromZwiftRacing(),
      this.syncFromZwiftOfficial(),
      this.syncFromZwiftPower()
    ]);
    
    // Merge results
    const merged: any = { rider_id: this.POC_RIDER_ID };
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        Object.assign(merged, result.value);
      } else {
        console.warn('⚠️  Source failed:', result.reason);
      }
    }
    
    // Upsert to riders_unified
    await this.supabase.client
      .from('riders_unified')
      .upsert(merged, { onConflict: 'rider_id' });
    
    console.log('✅ Phase 1 complete: Rider data synced\n');
  }
  
  private async syncFromZwiftRacing(): Promise<any> {
    console.log('  📡 ZwiftRacing.app...');
    const rider = await this.zwiftRacing.getRider(this.POC_RIDER_ID);
    
    // Save rating history
    if (rider.history && rider.history.length > 0) {
      for (const point of rider.history) {
        await this.supabase.client
          .from('rider_rating_history')
          .upsert({
            rider_id: this.POC_RIDER_ID,
            rating: point.rating,
            recorded_at: new Date(point.time * 1000),
            source: 'api_sync'
          }, { onConflict: 'rider_id,recorded_at', ignoreDuplicates: true });
      }
      console.log(`     ✅ Saved ${rider.history.length} history points`);
    }
    
    return {
      name: rider.name,
      velo_rating: rider.rating,
      category: rider.category,
      race_count_90d: rider.raceResults90Days,
      last_synced_zwift_racing: new Date(),
      is_team_member: true,
      club_id: 11818,
      club_name: 'TeamNL Cloud9 Racing Team'
    };
  }
  
  private async syncFromZwiftOfficial(): Promise<any> {
    console.log('  📡 Zwift.com Official API...');
    
    try {
      const profile = await this.zwiftOfficial.getProfile(this.POC_RIDER_ID);
      
      // Get recent activities
      const activities = await this.zwiftOfficial.getActivities(this.POC_RIDER_ID, 0, 10);
      
      // Save activities
      for (const activity of activities) {
        await this.supabase.client
          .from('rider_activities')
          .upsert({
            activity_id: activity.id,
            rider_id: this.POC_RIDER_ID,
            name: activity.name,
            sport: activity.sport,
            start_date: activity.startDate,
            end_date: activity.endDate,
            distance_meters: activity.distanceInMeters,
            duration_seconds: activity.durationInSeconds,
            elevation_meters: activity.totalElevation,
            avg_watts: activity.avgWatts,
            calories: activity.calories,
            avg_heart_rate: activity.avgHeartRate,
            max_heart_rate: activity.maxHeartRate,
            world_id: activity.worldId
          }, { onConflict: 'activity_id', ignoreDuplicates: true });
      }
      
      console.log(`     ✅ Profile + ${activities.length} activities`);
      
      return {
        zwift_profile_id: profile.id.toString(),
        avatar_url: profile.imageSrc,
        avatar_url_large: profile.imageSrcLarge,
        country_alpha3: profile.countryAlpha3,
        level: profile.level,
        followers_count: profile.socialFacts?.followersCount || 0,
        followees_count: profile.socialFacts?.followeesCount || 0,
        currently_riding: profile.riding,
        last_synced_zwift_official: new Date()
      };
    } catch (error) {
      console.warn('     ⚠️  Zwift.com failed:', error.message);
      return { last_synced_zwift_official: new Date() };
    }
  }
  
  private async syncFromZwiftPower(): Promise<any> {
    console.log('  📡 ZwiftPower.com...');
    
    try {
      await this.zwiftPower.authenticate();
      const zpData = await this.zwiftPower.getRider(this.POC_RIDER_ID);
      
      if (zpData) {
        console.log(`     ✅ FTP: ${zpData.ftp}W, Weight: ${zpData.weight}kg`);
        
        return {
          ftp: zpData.ftp,
          weight_kg: zpData.weight,
          zp_category: zpData.category,
          last_synced_zwiftpower: new Date()
        };
      }
      
      console.warn('     ⚠️  No ZwiftPower data');
      return { last_synced_zwiftpower: new Date() };
      
    } catch (error) {
      console.warn('     ⚠️  ZwiftPower failed:', error.message);
      return { last_synced_zwiftpower: new Date() };
    }
  }
  
  /**
   * PHASE 2: Sync events where rider 150437 signed up
   */
  private async syncEventsAndSignups(): Promise<void> {
    console.log('📅 [POC Phase 2] Syncing events + signups...');
    
    // Get all upcoming events
    const allEvents = await this.zwiftRacing.getUpcomingEvents();
    console.log(`  Found ${allEvents.length} upcoming events`);
    
    let eventsWithRider = 0;
    
    // Check each event for rider 150437
    for (const event of allEvents.slice(0, 50)) { // Limit to first 50 for POC
      try {
        const signups = await this.zwiftRacing.getEventSignups(event.eventId);
        
        // Flatten all pens
        const allRiders: any[] = [];
        for (const pen of signups) {
          if (pen.riders) {
            allRiders.push(...pen.riders.map((r: any) => ({ ...r, category: pen.pen })));
          }
        }
        
        // Check if our rider is in there
        const riderSignup = allRiders.find(r => r.riderId === this.POC_RIDER_ID);
        
        if (riderSignup) {
          eventsWithRider++;
          
          // Save event
          await this.supabase.client
            .from('events_unified')
            .upsert({
              event_id: event.eventId,
              event_name: event.title,
              event_date: new Date(event.time * 1000),
              event_type: event.type,
              sub_type: event.subType,
              route_name: event.route,
              distance_km: event.distance,
              total_signups: allRiders.length,
              team_signups_count: 1 // Just our POC rider for now
            }, { onConflict: 'event_id' });
          
          // Save signup
          await this.supabase.client
            .from('event_signups_unified')
            .upsert({
              event_id: event.eventId,
              rider_id: this.POC_RIDER_ID,
              category: riderSignup.category,
              weight_kg: riderSignup.weight,
              height_cm: riderSignup.height,
              power_wkg_5s: riderSignup.power?.wkg5s,
              power_wkg_1m: riderSignup.power?.wkg1m,
              power_wkg_5m: riderSignup.power?.wkg5m,
              power_wkg_20m: riderSignup.power?.wkg20m,
              critical_power: riderSignup.power?.cp,
              anaerobic_work_capacity: riderSignup.power?.awc,
              wins: riderSignup.wins,
              podiums: riderSignup.podiums,
              phenotype: riderSignup.phenotype,
              is_team_member: true
            }, { onConflict: 'event_id,rider_id', ignoreDuplicates: true });
          
          console.log(`  ✅ ${event.title.substring(0, 50)}...`);
        }
        
        // Rate limit: signups endpoint
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        // Skip on error
      }
    }
    
    console.log(`✅ Phase 2 complete: ${eventsWithRider} events with rider signups\n`);
  }
  
  /**
   * PHASE 3: Sync results for rider 150437 (last 30 days)
   */
  private async syncResultsWithEnrichment(): Promise<void> {
    console.log('🏁 [POC Phase 3] Syncing results + ZP enrichment...');
    
    // Get events from signups table (we know rider participated)
    const { data: signups } = await this.supabase.client
      .from('event_signups_unified')
      .select('event_id, event:events_unified(event_name, event_date)')
      .eq('rider_id', this.POC_RIDER_ID);
    
    console.log(`  Found ${signups?.length || 0} events to check for results`);
    
    let resultsFound = 0;
    
    for (const signup of signups || []) {
      try {
        const results = await this.zwiftRacing.getEventResults(parseInt(signup.event_id));
        
        // Find our rider's result
        const riderResult = results.find((r: any) => r.riderId === this.POC_RIDER_ID);
        
        if (riderResult) {
          resultsFound++;
          
          // Save result
          const saved = await this.supabase.client
            .from('race_results_unified')
            .upsert({
              event_id: signup.event_id,
              rider_id: this.POC_RIDER_ID,
              rank: riderResult.position || riderResult.rank,
              time_seconds: riderResult.time,
              avg_wkg: riderResult.power?.wkg?.avg,
              category: riderResult.category,
              power_5s: riderResult.power?.wkg?.p5s,
              power_15s: riderResult.power?.wkg?.p15s,
              power_30s: riderResult.power?.wkg?.p30s,
              power_1m: riderResult.power?.wkg?.p1m,
              power_2m: riderResult.power?.wkg?.p2m,
              power_5m: riderResult.power?.wkg?.p5m,
              power_20m: riderResult.power?.wkg?.p20m,
              power_avg: riderResult.power?.avg,
              power_max: riderResult.power?.max,
              heartrate_avg: riderResult.heartRate?.avg,
              heartrate_max: riderResult.heartRate?.max,
              velo_rating: riderResult.rating,
              velo_previous: riderResult.rating - (riderResult.ratingDelta || 0),
              velo_change: riderResult.ratingDelta,
              effort_score: riderResult.effortScore,
              race_points: riderResult.racePoints,
              dnf: riderResult.dnf || false,
              source: 'zwift_racing'
            }, { onConflict: 'event_id,rider_id' });
          
          // ENRICHMENT: Try ZwiftPower data
          try {
            const zpResults = await this.zwiftRacing.getEventResultsZwiftPower(parseInt(signup.event_id));
            const zpResult = zpResults.find((r: any) => r.zwid === this.POC_RIDER_ID);
            
            if (zpResult) {
              await this.supabase.client
                .from('race_results_unified')
                .update({
                  zp_category_enforcement: zpResult.category_enforcement,
                  zp_disqualified: zpResult.flag === 'DQ',
                  zp_disqualified_reason: zpResult.flag_description,
                  zp_age_group_position: zpResult.age_group_pos,
                  zp_points: zpResult.zp_points,
                  enriched_with_zp: true
                })
                .eq('event_id', signup.event_id)
                .eq('rider_id', this.POC_RIDER_ID);
              
              console.log(`  ✅ ${signup.event.event_name.substring(0, 40)}... (+ ZP enrichment)`);
            } else {
              console.log(`  ✅ ${signup.event.event_name.substring(0, 40)}...`);
            }
          } catch {
            console.log(`  ✅ ${signup.event.event_name.substring(0, 40)}... (no ZP data)`);
          }
        }
        
        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        // Skip on error
      }
    }
    
    console.log(`✅ Phase 3 complete: ${resultsFound} results saved\n`);
  }
  
  /**
   * Print summary of synced data
   */
  private async printSummary(): Promise<void> {
    console.log('📊 [POC] Data Summary for Rider 150437:\n');
    
    // Rider data
    const { data: rider } = await this.supabase.client
      .from('riders_unified')
      .select('*')
      .eq('rider_id', this.POC_RIDER_ID)
      .single();
    
    console.log('👤 Rider Profile:');
    console.log(`   Name: ${rider?.name}`);
    console.log(`   vELO: ${rider?.velo_rating} (${rider?.category})`);
    console.log(`   FTP: ${rider?.ftp}W | Weight: ${rider?.weight_kg}kg | W/kg: ${(rider?.ftp / rider?.weight_kg).toFixed(2)}`);
    console.log(`   Followers: ${rider?.followers_count}`);
    
    // Rating history
    const { count: historyCount } = await this.supabase.client
      .from('rider_rating_history')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', this.POC_RIDER_ID);
    
    console.log(`\n📈 Rating History: ${historyCount} data points`);
    
    // Activities
    const { count: activitiesCount } = await this.supabase.client
      .from('rider_activities')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', this.POC_RIDER_ID);
    
    console.log(`🚴 Recent Activities: ${activitiesCount} rides`);
    
    // Events
    const { count: eventsCount } = await this.supabase.client
      .from('event_signups_unified')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', this.POC_RIDER_ID);
    
    console.log(`📅 Upcoming Events: ${eventsCount} signups`);
    
    // Results
    const { count: resultsCount } = await this.supabase.client
      .from('race_results_unified')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', this.POC_RIDER_ID);
    
    const { count: enrichedCount } = await this.supabase.client
      .from('race_results_unified')
      .select('*', { count: 'exact', head: true })
      .eq('rider_id', this.POC_RIDER_ID)
      .eq('enriched_with_zp', true);
    
    console.log(`🏁 Race Results: ${resultsCount} races (${enrichedCount} with ZP enrichment)`);
    
    console.log('\n✨ POC database ready for dashboard queries!');
  }
}

// Export singleton
export const pocUnifiedSync = new POCUnifiedSyncService();
```

**Test script:** `backend/test-poc-sync.ts`
```typescript
import { pocUnifiedSync } from './src/services/poc-unified-sync.service.js';

console.log('🚀 Starting POC Unified Sync for Rider 150437...\n');

await pocUnifiedSync.executeFullPOC();

console.log('\n✅ POC Sync complete! Check database for rider 150437 data.');
```

**Run:**
```bash
cd backend
npx tsx test-poc-sync.ts
```

---

### Step 1.4: Dashboard API Endpoints (1-2 uur)

**File:** `backend/src/api/endpoints/poc-dashboard.ts`

```typescript
import { Router } from 'express';
import { SupabaseService } from '../../services/supabase.service.js';

const router = Router();
const supabase = new SupabaseService();

const POC_RIDER_ID = 150437;

/**
 * GET /api/poc/rider-performance
 * Complete rider performance data for rider 150437
 */
router.get('/rider-performance', async (req, res) => {
  try {
    // Get rider
    const { data: rider } = await supabase.client
      .from('riders_unified')
      .select('*')
      .eq('rider_id', POC_RIDER_ID)
      .single();
    
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }
    
    // Get rating history
    const { data: ratingHistory } = await supabase.client
      .from('rider_rating_history')
      .select('rating, recorded_at')
      .eq('rider_id', POC_RIDER_ID)
      .order('recorded_at', { ascending: true });
    
    // Get recent activities
    const { data: activities } = await supabase.client
      .from('rider_activities')
      .select('*')
      .eq('rider_id', POC_RIDER_ID)
      .order('start_date', { ascending: false })
      .limit(10);
    
    // Get recent results (last 5)
    const { data: recentResults } = await supabase.client
      .from('race_results_unified')
      .select(`
        *,
        event:events_unified(event_name, event_date, route_name)
      `)
      .eq('rider_id', POC_RIDER_ID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Compute W/kg
    const wKg = rider.ftp && rider.weight_kg ? 
      (rider.ftp / rider.weight_kg).toFixed(2) : null;
    
    res.json({
      rider,
      computed: {
        w_kg_ftp: wKg,
        recent_form: ratingHistory?.length >= 2 ? 
          (ratingHistory[ratingHistory.length - 1].rating > ratingHistory[0].rating ? 'improving' : 'declining') 
          : 'stable'
      },
      rating_history: ratingHistory || [],
      recent_activities: activities || [],
      recent_results: recentResults || []
    });
    
  } catch (error) {
    console.error('Error fetching rider performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/poc/events
 * Upcoming events where rider 150437 signed up
 */
router.get('/events', async (req, res) => {
  try {
    const { data: events } = await supabase.client
      .from('events_unified')
      .select(`
        *,
        signups:event_signups_unified(
          rider_id,
          category,
          power_wkg_20m,
          phenotype
        )
      `)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });
    
    // Filter events where rider 150437 signed up
    const eventsWithRider = events?.filter(e => 
      e.signups.some((s: any) => s.rider_id === POC_RIDER_ID)
    ) || [];
    
    res.json({
      events: eventsWithRider.map(e => ({
        ...e,
        hours_until_start: (new Date(e.event_date).getTime() - Date.now()) / (1000 * 60 * 60),
        rider_signup: e.signups.find((s: any) => s.rider_id === POC_RIDER_ID)
      }))
    });
    
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/poc/results
 * Race results for rider 150437
 */
router.get('/results', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoff = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);
    
    const { data: results } = await supabase.client
      .from('race_results_unified')
      .select(`
        *,
        event:events_unified(*)
      `)
      .eq('rider_id', POC_RIDER_ID)
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false });
    
    res.json({
      results: results || [],
      count: results?.length || 0,
      rider_id: POC_RIDER_ID
    });
    
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

**Register in server:**
```typescript
// In backend/src/server.ts
import pocDashboardRoutes from './api/endpoints/poc-dashboard.js';
app.use('/api/poc', pocDashboardRoutes);
```

**Test:**
```bash
curl http://localhost:3000/api/poc/rider-performance | jq .
curl http://localhost:3000/api/poc/events | jq .
curl http://localhost:3000/api/poc/results?days=30 | jq .
```

---

### Step 1.5: POC Validation (30 min)

**Checklist:**
- [ ] Rider data in `riders_unified` (FTP, weight, vELO)
- [ ] Rating history in `rider_rating_history` (min 10 points)
- [ ] Activities in `rider_activities` (min 5 activities)
- [ ] Events in `events_unified` (min 1 event)
- [ ] Signups in `event_signups_unified` (rider 150437)
- [ ] Results in `race_results_unified` (min 1 result)
- [ ] ZP enrichment (CE/DQ flags if available)
- [ ] API endpoints return complete data

**Success Criteria:**
```bash
# All should return > 0
psql $DATABASE_URL -c "SELECT COUNT(*) FROM riders_unified WHERE rider_id=150437"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rider_rating_history WHERE rider_id=150437"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rider_activities WHERE rider_id=150437"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM event_signups_unified WHERE rider_id=150437"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM race_results_unified WHERE rider_id=150437"
```

---

## 📅 PHASE 2: Full Team Rollout (75 riders)

**Doel:** Scale POC to all team members  
**Duur:** 4-6 uur (Dag 3)  
**Prerequisite:** POC Phase 1 succesvol

### Step 2.1: Expand Sync Service (2-3 uur)

**File:** `backend/src/services/full-unified-sync.service.ts`

Kopieer POC service, maar:
- Replace `POC_RIDER_ID` with array van alle team rider IDs
- Add bulk operations (use `POST /public/riders` endpoint!)
- Add progress tracking per rider
- Add error recovery (continue on individual rider failure)

### Step 2.2: Run Full Sync (1-2 uur)

```bash
npx tsx scripts/full-team-sync.ts
```

Monitor:
- Sync time (target: <15 min)
- Success rate (target: >95%)
- API rate limits (should not hit limits)

### Step 2.3: Update Dashboard Endpoints (1 uur)

Remove POC restrictions:
- `/api/riders/performance/:riderId` (any team rider)
- `/api/events/upcoming` (all team events)
- `/api/results/team` (all team results)

---

## 📅 PHASE 3: Frontend Integration

**Duur:** 6-8 uur (Dag 4)

### Dashboard 1: Rider Performance
- Create `RiderPerformanceModern.tsx`
- vELO history graph (Chart.js/Recharts)
- Power profile radar chart
- Recent activities table
- Recent results table

### Dashboard 2: Events
- Update `EventsModern.tsx`
- Add team signup indicators
- Add route profile badges
- Add countdown timers

### Dashboard 3: Results
- Update `ResultsModern.tsx`
- Add ZP enrichment badges (CE, DQ)
- Add expandable power curves
- Add age group rankings

---

## 📅 PHASE 4: Production Deploy

**Duur:** 2-3 uur (Dag 5)

1. Run migrations on production DB
2. Deploy backend to Railway
3. Run full team sync
4. Deploy frontend
5. Monitor for 24h
6. Verify data accuracy

---

## ✅ Success Metrics

### POC Phase
- ✅ Rider 150437 complete data (100% fields populated)
- ✅ 3 API sources integrated (ZwiftRacing + Zwift.com + ZwiftPower)
- ✅ All 3 dashboards show data
- ✅ Sync time <5 min for 1 rider

### Full Rollout
- ✅ 75 riders synced (>95% success rate)
- ✅ Sync time <15 min for full team
- ✅ Dashboard load time <2s
- ✅ ZP enrichment >80% coverage

---

## 🚀 Getting Started

```bash
# 1. Database setup
cd supabase
# Create migration file (see Step 1.1)
supabase db push

# 2. Install dependencies
cd backend
npm install

# 3. Create POC sync service (see Step 1.3)
# ... copy code ...

# 4. Run POC sync
npx tsx test-poc-sync.ts

# 5. Verify data
psql $DATABASE_URL -c "SELECT * FROM riders_unified WHERE rider_id=150437"

# 6. Start server
npm run dev

# 7. Test API endpoints
curl http://localhost:3000/api/poc/rider-performance | jq .
```

---

**Ready to start? Let's begin with Step 1.1: Database Setup!** 🚀
