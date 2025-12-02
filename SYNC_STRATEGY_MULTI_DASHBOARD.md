# 🎯 Sync Strategie - Multi-Dashboard Architectuur

**Datum:** 2 december 2025  
**Doel:** Eén sync service die 3 dashboards efficiënt voedt

---

## 📊 Dashboard Inventory & Data Needs

### 1. Racing Matrix (Team Dashboard) ✅ BEHOUDEN
**Route:** `/`  
**Component:** `RacingDataMatrixModern.tsx`  
**API:** `GET /api/riders/team`  
**Refresh:** 60 seconden

**Data Velden (NIET WIJZIGEN):**
```typescript
interface MatrixRider {
  rider_id: number
  name: string
  zp_category: string | null
  zp_ftp: number | null
  weight: number | null
  race_last_rating: number | null    // vELO current
  race_max30_rating: number | null   // vELO 30-day max
  race_wins: number
  race_podiums: number | null
  race_finishes: number
  race_dnfs: number | null
  watts_per_kg: number | null
  power_w5/w15/w30/w60/w120/w300/w1200: number | null
}
```

**Sourcing Verbetering:**
- ✅ Huidige source: `view_my_team` (database view)
- 🎯 Nieuwe source: **Unified sync** → `riders_unified` table met ZwiftRacing power data
- ⚡ Voordeel: Power intervals zijn **niet NULL** meer (nu wel beschikbaar via ZwiftRacing API)

### 2. Rider Stats Detail Page 🆕 NIEUW
**Route:** `/rider/:id`  
**Component:** `RiderStatsPage.tsx` (nieuw)  
**API:** `GET /api/v2/riders/:id/detailed`  
**Refresh:** On-demand

**Inspiratie:** https://www.zwiftracing.app/riders/150437

**Secties:**
- **Hero Section:** Avatar, naam, vELO badge, country flag
- **Physical Stats:** FTP, weight, W/kg, height
- **Power Profile:** 5s→20m power curve (chart + table)
- **Phenotype:** Sprinter/Puncheur/Pursuiter scores met radar chart
- **Route Preferences:** Handicaps (flat/rolling/hilly/mountainous) met bar chart
- **Race Performance:** Wins/podiums/finishes, DNF rate
- **vELO History:** Interactive line chart (90 dagen)
- **Recent Activities:** Last 10 rides from Zwift.com
- **Recent Results:** Last 5 races met vELO changes

### 3. Events Dashboard ✅ BESTAAND
**Route:** `/events`  
**Component:** `EventsModern.tsx`  
**API:** `GET /api/events/upcoming`  
**Refresh:** 30 seconden (real-time countdown)

**Data Needs:**
- Events met team participation
- Route details
- Signup counts per category

### 4. Results Dashboard ✅ BESTAAND
**Route:** `/results`  
**Component:** `ResultsModern.tsx`  
**API:** `GET /api/results/recent`  
**Refresh:** 60 seconden

**Data Needs:**
- Race results per event
- vELO changes
- Power intervals per race
- ZwiftPower enrichment (CE/DQ)

---

## 🔄 Unified Sync Architecture

### Centrale Sync Service: `UnifiedMultiDashboardSync`

**Filosofie:** 
- **1 Sync Run = Alle Dashboards Gevoed**
- **Smart Scheduling:** Verschillende frequenties per data type
- **Source Optimization:** Bulk endpoints waar mogelijk
- **Data Reuse:** Eén fetch, meerdere consumers

```
┌─────────────────────────────────────────────────────────┐
│         UNIFIED SYNC SERVICE (Centraal)                 │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   RIDERS     │  │    EVENTS    │  │   RESULTS    │ │
│  │   Module     │  │    Module    │  │   Module     │ │
│  │              │  │              │  │              │ │
│  │ • vELO       │  │ • Upcoming   │  │ • Recent     │ │
│  │ • Power      │  │ • Signups    │  │ • Historical │ │
│  │ • Physical   │  │ • Routes     │  │ • ZP Enrich  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │          │
│         └─────────────────┴─────────────────┘          │
│                           │                            │
└───────────────────────────┼────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
     ┌────────▼────────┐        ┌────────▼────────┐
     │  ZwiftRacing    │        │  ZwiftPower     │
     │  (Bulk + Single)│        │  (Event-spec)   │
     └────────┬────────┘        └────────┬────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │      Database Tables       │
              │                           │
              │  • riders_unified         │
              │  • rider_velo_history     │
              │  • rider_activities       │
              │  • events_enriched        │
              │  • race_results_enriched  │
              └───────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
     ┌────────▼────────┐        ┌────────▼────────┐
     │  Racing Matrix  │        │  Rider Stats    │
     │  (Table View)   │        │  (Detail Page)  │
     └─────────────────┘        └─────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   Events + Results        │
              │      Dashboards           │
              └───────────────────────────┘
```

---

## 🎯 Sync Modules - Frequentie & Prioriteit

### Module 1: Riders Sync (HIGH PRIORITY)
**Frequentie:** Elke 2 uur (actieve riders), 6 uur (inactieve)  
**Source:** ZwiftRacing.app `/public/riders` (bulk of individual)  
**Feeds:**
- ✅ Racing Matrix (`/api/riders/team`)
- ✅ Rider Stats Page (`/api/v2/riders/:id/detailed`)

**Data:**
```typescript
{
  // Core identity
  rider_id, name, gender, country, age,
  
  // vELO tracking
  velo_current, velo_max30, velo_max90, velo_tier,
  
  // Power profile (⚡ KEY FOR RACING MATRIX)
  power_w5, power_w15, power_w30, power_w60, 
  power_w120, power_w300, power_w1200,
  power_wkg5, power_wkg15, ... power_wkg1200,
  critical_power, anaerobic_capacity, compound_score,
  
  // Phenotype
  phenotype_sprinter, phenotype_puncheur, phenotype_pursuiter,
  
  // Route handicaps
  handicap_flat, handicap_rolling, handicap_hilly, handicap_mountainous,
  
  // Race stats
  race_finishes, race_dnfs, race_wins, race_podiums,
  
  // Physical (ZwiftRacing fallback, ZwiftPower preferred)
  ftp, weight_kg, height_cm, zp_category
}
```

**Strategy:**
```typescript
async syncRiders(riderIds: number[]) {
  // 1. Fetch from ZwiftRacing (has 90% of data!)
  const riders = await this.zwiftRacing.getBulkRiders(riderIds);
  
  // 2. For active riders (<7d since last race), enrich with ZwiftPower
  const activeRiders = riders.filter(r => isRecentlyActive(r));
  const zpData = await this.enrichWithZwiftPower(activeRiders);
  
  // 3. Merge into riders_unified
  await this.mergeIntoRidersUnified(riders, zpData);
  
  // 4. Track vELO changes in history table
  await this.updateVeloHistory(riders);
}
```

### Module 2: Activities Sync (MEDIUM PRIORITY)
**Frequentie:** Elke 6 uur  
**Source:** Zwift.com `/profiles/:id/activities`  
**Feeds:**
- ✅ Rider Stats Page (recent activities section)

**Data:**
```typescript
{
  activity_id, name, sport, start_date,
  distance_meters, duration_seconds, elevation_meters,
  avg_watts, calories, avg_heart_rate
}
```

**Strategy:**
```typescript
async syncActivities(riderIds: number[]) {
  // Fetch last 30 days only (API limit)
  for (const riderId of riderIds) {
    const activities = await this.zwiftOfficial.getActivities(riderId, 30);
    await this.saveActivities(riderId, activities);
  }
}
```

### Module 3: Events Sync (DYNAMIC PRIORITY)
**Frequentie:** 
- Events >48h: Elke 6 uur
- Events 24-48h: Elke 2 uur
- Events <24h: Elke 30 min
- Events <1h: Elke 5 min

**Source:** ZwiftRacing.app `/api/events/upcoming`  
**Feeds:**
- ✅ Events Dashboard

**Strategy:**
```typescript
async syncEvents(hoursAhead: number = 48) {
  const events = await this.zwiftRacing.getUpcomingEvents();
  
  // Filter for team participation
  const teamEvents = events.filter(e => hasTeamParticipation(e));
  
  // Smart scheduling: more frequent sync for imminent events
  for (const event of teamEvents) {
    const hoursUntil = getHoursUntil(event.time_unix);
    event.next_sync_at = calculateNextSync(hoursUntil);
  }
  
  await this.saveEvents(teamEvents);
}
```

### Module 4: Results Sync (MEDIUM PRIORITY)
**Frequentie:** 
- Active racing hours (16:00-23:00 UTC): Elke uur
- Off-peak: Elke 6 uur

**Source:** 
- ZwiftRacing.app `/public/results/:eventId`
- ZwiftPower `/cache3/results/:eventId_view.json` (enrichment)

**Feeds:**
- ✅ Results Dashboard
- ✅ Rider Stats Page (recent results)

**Strategy:**
```typescript
async syncResults(daysBack: number = 7) {
  // Get finished events
  const finishedEvents = await this.getFinishedEvents(daysBack);
  
  // Fetch results
  for (const event of finishedEvents) {
    const results = await this.zwiftRacing.getResults(event.id);
    
    // Enrich with ZwiftPower (CE/DQ flags)
    const enriched = await this.zwiftPower.enrichResults(event.id, results);
    
    await this.saveResults(enriched);
    
    // Update rider vELO history from results
    await this.updateVeloFromResults(results);
  }
}
```

---

## 🚀 Implementation Plan

### FASE 1: Herstel Racing Matrix (HIGH PRIORITY) ⚡

**Probleem:** Power intervals zijn NULL in database  
**Oplossing:** Sync ZwiftRacing power profile data

**Stappen:**

#### 1.1 Database Schema Update (5 min)
```sql
-- Add power profile columns to riders_unified
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_15s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_30s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_1m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_2m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_20m_w INT;

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5s_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_15s_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_30s_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_1m_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_2m_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5m_wkg DECIMAL(5,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_20m_wkg DECIMAL(5,3);

-- Add phenotype, handicaps, metadata
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_sprinter DECIMAL(4,1);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_puncheur DECIMAL(4,1);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_pursuiter DECIMAL(4,1);

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_flat DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_rolling DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_hilly DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_mountainous DECIMAL(7,3);

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS age_category TEXT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS velo_rank TEXT; -- "Amethyst", "Sapphire", etc
```

#### 1.2 Enhanced POC Sync (30 min)
**Update:** `backend/src/services/poc-unified-sync.service.ts`

```typescript
private async syncFromZwiftRacing() {
  const rider = await this.zwiftRacing.getRider(this.POC_RIDER_ID);
  
  return {
    // Existing fields...
    rider_id: rider.riderId,
    name: rider.name,
    
    // ADD: Power intervals
    power_5s_w: rider.power?.w5 || null,
    power_15s_w: rider.power?.w15 || null,
    power_30s_w: rider.power?.w30 || null,
    power_1m_w: rider.power?.w60 || null,
    power_2m_w: rider.power?.w120 || null,
    power_5m_w: rider.power?.w300 || null,
    power_20m_w: rider.power?.w1200 || null,
    
    power_5s_wkg: rider.power?.wkg5 || null,
    power_15s_wkg: rider.power?.wkg15 || null,
    power_30s_wkg: rider.power?.wkg30 || null,
    power_1m_wkg: rider.power?.wkg60 || null,
    power_2m_wkg: rider.power?.wkg120 || null,
    power_5m_wkg: rider.power?.wkg300 || null,
    power_20m_wkg: rider.power?.wkg1200 || null,
    
    // ADD: Phenotype
    phenotype_sprinter: rider.phenotype?.scores?.sprinter || null,
    phenotype_puncheur: rider.phenotype?.scores?.puncheur || null,
    phenotype_pursuiter: rider.phenotype?.scores?.pursuiter || null,
    
    // ADD: Handicaps
    handicap_flat: rider.handicaps?.profile?.flat || null,
    handicap_rolling: rider.handicaps?.profile?.rolling || null,
    handicap_hilly: rider.handicaps?.profile?.hilly || null,
    handicap_mountainous: rider.handicaps?.profile?.mountainous || null,
    
    // ADD: Metadata
    age_category: rider.age || null,
    gender: rider.gender || null,
    
    // ADD: vELO tier tracking
    velo_rank: rider.race?.current?.mixed?.category || null,
    velo_current: rider.race?.current?.rating || null,
    velo_max_30d: rider.race?.max30?.rating || null,
    velo_max_90d: rider.race?.max90?.rating || null,
    
    // Race stats
    race_count_90d: rider.race?.finishes || 0,
    race_wins: rider.race?.wins || 0,
    race_podiums: rider.race?.podiums || 0,
    race_dnfs: rider.race?.dnfs || 0
  };
}
```

#### 1.3 Update view_my_team View (10 min)
**File:** Create migration `020_enhanced_my_team_view.sql`

```sql
DROP VIEW IF EXISTS view_my_team;

CREATE VIEW view_my_team AS
SELECT 
  r.rider_id,
  r.name,
  r.zp_category,
  r.ftp as zp_ftp,
  r.weight_kg as weight,
  
  -- vELO ratings
  r.velo_rating as race_last_rating,
  r.velo_max_30d as race_max30_rating,
  
  -- Race stats
  r.race_wins,
  r.race_podiums,
  r.race_count_90d as race_finishes,
  r.race_dnfs,
  
  -- W/kg calculation
  CASE 
    WHEN r.ftp IS NOT NULL AND r.weight_kg IS NOT NULL AND r.weight_kg > 0 
    THEN ROUND(r.ftp::numeric / r.weight_kg, 2)
    ELSE NULL
  END as watts_per_kg,
  
  -- Power intervals (NOW POPULATED!)
  r.power_5s_w as power_w5,
  r.power_15s_w as power_w15,
  r.power_30s_w as power_w30,
  r.power_1m_w as power_w60,
  r.power_2m_w as power_w120,
  r.power_5m_w as power_w300,
  r.power_20m_w as power_w1200

FROM riders_unified r
WHERE r.is_team_member = true
ORDER BY r.velo_rating DESC NULLS LAST;
```

#### 1.4 Test POC Sync (5 min)
```bash
cd backend
npx tsx test-poc-sync.ts
# Should see power intervals populated now!
```

#### 1.5 Verify Racing Matrix (2 min)
```bash
# Frontend should now show power data (no more NULL values)
curl http://localhost:3000/api/riders/team | jq '.[0].power_w5'
# Expected: 964 (not null!)
```

**ETA:** 1 uur total

---

### FASE 2: Rider Stats Detail Page (MEDIUM PRIORITY) 🆕

**Doel:** ZwiftRacing-style detail page in eigen stijl

**Stappen:**

#### 2.1 Create Rider Stats Component (2 uur)
**File:** `backend/frontend/src/pages/RiderStatsPage.tsx`

**Features:**
- Hero section met avatar, vELO badge, country flag
- Power curve chart (interactive)
- Phenotype radar chart
- Route handicaps bar chart
- vELO history line chart
- Recent activities table
- Recent results table
- Responsive design (mobile-friendly)

#### 2.2 Add Routing (5 min)
**File:** `backend/frontend/src/App.tsx`

```typescript
<Route path="/rider/:id" element={<RiderStatsPage />} />
```

#### 2.3 Add Click Handler in Racing Matrix (10 min)
**File:** `RacingDataMatrixModern.tsx`

```tsx
// Make rider name clickable
<button
  onClick={() => navigate(`/rider/${rider.rider_id}`)}
  className="text-indigo-600 hover:text-indigo-800 font-medium"
>
  {rider.name}
</button>
```

**ETA:** 2.5 uur

---

### FASE 3: Full Team Sync (SCALE TO 75 RIDERS)

**Stappen:**

#### 3.1 Create Team Bulk Sync Service (1 uur)
**File:** `backend/src/services/team-bulk-sync.service.ts`

```typescript
class TeamBulkSyncService {
  private readonly TEAM_CLUB_ID = 11818;
  
  async syncFullTeam() {
    // 1. Get all team member IDs from club
    const clubMembers = await this.zwiftRacing.getClubMembers(this.TEAM_CLUB_ID);
    const riderIds = clubMembers.map(m => m.riderId);
    
    // 2. Sync in batches of 50
    const batches = chunk(riderIds, 50);
    
    for (const batch of batches) {
      await this.syncRiderBatch(batch);
      await sleep(2000); // Rate limit respect
    }
  }
  
  async syncRiderBatch(riderIds: number[]) {
    // Parallel fetch from ZwiftRacing
    const riders = await Promise.all(
      riderIds.map(id => this.zwiftRacing.getRider(id))
    );
    
    // Merge into database
    await this.bulkUpsert(riders);
  }
}
```

#### 3.2 Schedule Automatic Sync (30 min)
**File:** `backend/src/server.ts`

```typescript
import cron from 'node-cron';

// Sync team every 2 hours
cron.schedule('0 */2 * * *', async () => {
  console.log('[Cron] Starting team sync...');
  await teamBulkSync.syncFullTeam();
});
```

**ETA:** 1.5 uur

---

## 📈 Expected Results

### After FASE 1 (Racing Matrix Fix):
- ✅ Power intervals visible (no more NULL)
- ✅ Racing Matrix fully functional
- ✅ Phenotype/handicaps data available
- ✅ Sync time: <2s voor POC rider

### After FASE 2 (Rider Stats Page):
- ✅ Click rider name → detailed stats page
- ✅ ZwiftRacing-style layout in custom design
- ✅ Interactive charts (power curve, vELO history)
- ✅ Complete rider profile view

### After FASE 3 (Full Team):
- ✅ All 75 riders synced
- ✅ Automatic sync every 2 hours
- ✅ Racing Matrix complete voor hele team
- ✅ Total sync time: <15 minuten

---

## 🎯 Success Metrics

**Racing Matrix:**
- Power data completeness: >95% (was 0%)
- Load time: <2s
- API response time: <500ms

**Rider Stats Page:**
- Data completeness: >90%
- Page load time: <1.5s
- Chart rendering: <300ms

**Full Team Sync:**
- Sync time: <15 min (75 riders)
- Success rate: >98%
- Data freshness: <2 hours

---

## 💡 Key Insights

### 1. ZwiftRacing API is Complete
**90% van data komt van 1 endpoint:** `/public/riders/:id`
- Power profile, phenotype, handicaps, vELO, race stats

**Impact:** Minimale API calls nodig, maximale data

### 2. View-based Architecture Werkt
**Racing Matrix gebruikt view:** `view_my_team`
- Frontend blijft ongewijzigd
- Backend sync vult onderliggende table
- View expose gewenste structuur

**Impact:** Zero frontend changes voor data verbetering

### 3. Progressive Enhancement
**Start met POC, scale daarna:**
1. Rider 150437 werkend → Validate approach
2. Extend to full team → Production ready
3. Add real-time features → Enhance UX

---

**NEXT ACTION:** Implementeer FASE 1 (Racing Matrix fix) - 1 uur werk
