# ✅ Robuuste Data Architectuur - Implementatie Status

**Datum:** 2 december 2025  
**Status:** POC Backend Compleet, Frontend Integratie Pending

---

## 🎯 Wat is Bereikt

### 1. ✅ Complete Data Architectuur Ontwerp

**Document:** `ROBUUSTE_DATA_ARCHITECTUUR.md` (66KB)

**Highlights:**
- **3 Dashboard Data Groepen** volledig gespecificeerd:
  - `rider_stats_unified` - Racing Matrix (50+ velden)
  - `events_enriched` - Events Dashboard (30+ velden)
  - `race_results_enriched` - Results Dashboard (40+ velden)

- **Multi-Source Integratie** gedocumenteerd:
  - ZwiftRacing.app: vELO, power profile, race stats
  - Zwift.com: Avatar, activities, social
  - ZwiftPower: FTP/weight (event-specific), category enforcement

- **Out-of-the-Box Metrics** gedefinieerd:
  - Power Profile Match Score
  - Tier Promotion Tracking
  - Team Power Curve Composite
  - Consistency Score (Variability Index)
  - Age Group Dominance
  - Route Handicap Predictions
  - DNF Pattern Analysis
  - Social Engagement Score

### 2. ✅ POC Sync Service Werkend

**Status:** Phase 1 COMPLEET ✅

**Wat werkt:**
```bash
# POC Sync voor Rider 150437
- ZwiftRacing.app: vELO 1398, race count 24, power profile
- Zwift.com: 10 activities met watts/distance/elevation
- ZwiftPower: FTP 234W, weight 74kg (van event 5229579)
- Sync tijd: 1.85 seconden
- Database: riders_unified gevuld, 10 activities opgeslagen
```

**Bewezen Technologie:**
- ✅ Multi-source parallel fetching (Promise.allSettled)
- ✅ Event-specific data (accurate weight van specifiek event)
- ✅ Authentication: Alle 3 APIs werkend
- ✅ Data merging: Explicit field mapping
- ✅ Foreign key integrity: Rider eerst, dan activities

### 3. ✅ Unified Dashboard API Endpoints

**Nieuwe V2 Endpoints:**

#### GET /api/v2/riders/:id/detailed
**POC Test:** Rider 150437  
**Response:**
```json
{
  "success": true,
  "rider": {
    "rider_id": 150437,
    "name": "JRøne CloudRacer-9 @YT (TeamNL)",
    "velo_current": 1398,
    "velo_tier": "Amethyst",
    "ftp": 234,
    "weight_kg": 74,
    "watts_per_kg": "3.16",
    "zp_category": "C",
    "race_finishes": 24,
    "race_wins": 0,
    "race_podiums": 4,
    "rides_last_30d": 10,
    "distance_last_30d_km": "452.1",
    "avg_power_last_30d": 210,
    "data_completeness": 89
  },
  "velo_history": [...],
  "recent_activities": [...],
  "recent_results": [...]
}
```

#### GET /api/v2/riders/matrix
**Doel:** Alle team riders voor Racing Matrix table  
**Output:** Compact stats (vELO, FTP, W/kg, races, power intervals)

**Features:**
- Automatic vELO tier calculation (Diamond/Ruby/Emerald/etc)
- Country flag emoji conversion
- Race stats aggregation (last 90 days)
- Activity stats aggregation (last 30 days)
- Data completeness scoring (0-100%)

### 4. ✅ Database Schema Updates Gepland

**Nieuwe Tabellen:**
```sql
-- vELO tracking voor graphs
rider_velo_history (id, rider_id, rating, tier, recorded_at)

-- Events enrichment
events_enriched (event_id, title, route_details, team_participation, status)

-- Results enrichment
race_results_enriched (result_id, event_id, rider_id, performance, velo_changes, zp_enrichment)
```

**Views:**
```sql
-- Unified rider stats view (combines multiple tables)
CREATE VIEW rider_stats_unified AS ...
```

---

## 📊 Actuele Data Mapping

### ZwiftRacing.app API Response (Rider 150437)

```json
{
  "riderId": 150437,
  "name": "JRøne  CloudRacer-9 @YT (TeamNL)",
  "gender": "M",
  "country": "nl",
  "age": "Vet",
  "height": 183,
  "weight": 74,
  "zpCategory": "C",
  "zpFTP": 234,
  "power": {
    "wkg5": 13.027, "w5": 964,
    "wkg15": 12.027, "w15": 890,
    "wkg30": 9.135, "w30": 676,
    "wkg60": 5.946, "w60": 440,
    "wkg120": 5.014, "w120": 371,
    "wkg300": 4.054, "w300": 300,
    "wkg1200": 3.486, "w1200": 258,
    "CP": 242.297,
    "AWC": 19391.534,
    "compoundScore": 1152.391
  },
  "race": {
    "current": {
      "rating": 1398.783,
      "date": 1764513000,
      "mixed": {
        "category": "Amethyst",
        "number": 5
      }
    },
    "max30": {
      "rating": 1398.783,
      "expires": 1767105000
    },
    "max90": {
      "rating": 1461.015,
      "mixed": {
        "category": "Sapphire",
        "number": 4
      }
    },
    "finishes": 24,
    "dnfs": 1,
    "wins": 0,
    "podiums": 4
  },
  "phenotype": {
    "scores": {
      "sprinter": 97.2,
      "puncheur": 85.1,
      "pursuiter": 72.7
    }
  },
  "handicaps": {
    "profile": {
      "flat": 104.349,
      "rolling": 12.388,
      "hilly": -47.536,
      "mountainous": -130.163
    }
  }
}
```

**Conclusie:** ZwiftRacing.app heeft **ALLES** wat we nodig hebben:
- ✅ vELO rating + history (current, max30, max90)
- ✅ Power profile (5s t/m 20m, watts én W/kg)
- ✅ Advanced metrics (CP, AWC, compound score)
- ✅ Phenotype scores (sprinter/puncheur/pursuiter)
- ✅ Route handicaps (flat/rolling/hilly/mountainous)
- ✅ Race performance (finishes, dnfs, wins, podiums)
- ✅ Physical stats (weight, height, FTP, category)

**Enige gap:** ZwiftPower heeft **accuratere** FTP/weight van specifieke recente events

---

## 🚀 Volgende Stappen (Prioriteit Volgorde)

### STAP 1: Sync ZwiftRacing Power Profile Data ⚡ HIGH PRIORITY

**Waarom:** ZwiftRacing heeft alle power intervals (w5-w1200) die Racing Matrix nodig heeft

**Actie:**
```typescript
// Update POC sync service om power data op te slaan
private async syncFromZwiftRacing() {
  const rider = await this.zwiftRacing.getRider(this.POC_RIDER_ID);
  
  return {
    // ... existing fields
    
    // ADD: Power intervals
    power_5s_w: rider.power.w5,
    power_15s_w: rider.power.w15,
    power_30s_w: rider.power.w30,
    power_1m_w: rider.power.w60,
    power_2m_w: rider.power.w120,
    power_5m_w: rider.power.w300,
    power_20m_w: rider.power.w1200,
    
    power_5s_wkg: rider.power.wkg5,
    power_15s_wkg: rider.power.wkg15,
    // ... etc
    
    // ADD: Advanced metrics
    critical_power: rider.power.CP,
    anaerobic_capacity: rider.power.AWC,
    compound_score: rider.power.compoundScore,
    
    // ADD: Phenotype
    phenotype_sprinter: rider.phenotype.scores.sprinter,
    phenotype_puncheur: rider.phenotype.scores.puncheur,
    phenotype_pursuiter: rider.phenotype.scores.pursuiter,
    
    // ADD: Route handicaps
    handicap_flat: rider.handicaps.profile.flat,
    handicap_rolling: rider.handicaps.profile.rolling,
    handicap_hilly: rider.handicaps.profile.hilly,
    handicap_mountainous: rider.handicaps.profile.mountainous,
    
    // ADD: Metadata
    age_category: rider.age,  // "Vet"
    gender: rider.gender      // "M"
  };
}
```

**Database Update:**
```sql
-- Voeg kolommen toe aan riders_unified
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_15s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_30s_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_1m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_2m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5m_w INT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_20m_w INT;

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS power_5s_wkg DECIMAL(5,3);
-- ... etc voor alle wkg velden

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS critical_power DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS anaerobic_capacity DECIMAL(10,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS compound_score DECIMAL(10,3);

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_sprinter DECIMAL(4,1);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_puncheur DECIMAL(4,1);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS phenotype_pursuiter DECIMAL(4,1);

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_flat DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_rolling DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_hilly DECIMAL(7,3);
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS handicap_mountainous DECIMAL(7,3);

ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS age_category TEXT;
ALTER TABLE riders_unified ADD COLUMN IF NOT EXISTS gender TEXT;
```

**ETA:** 1-2 uur

### STAP 2: Update Unified API met Power Data

**Actie:** Voeg power fields toe aan `/api/v2/riders/:id/detailed` response

**Test:** 
```bash
# Na update moet dit werkend zijn:
curl http://localhost:3000/api/v2/riders/150437/detailed | jq '.rider.power_5s_w'
# Expected: 964
```

**ETA:** 30 minuten

### STAP 3: Frontend Integration - Racing Matrix

**Actie:** Update `RacingDataMatrixModern.tsx` om `/api/v2/riders/matrix` te gebruiken

**Voordelen:**
- ✅ Power intervals direct beschikbaar (geen null values meer)
- ✅ vELO tier calculation server-side (consistent)
- ✅ Data completeness score visible
- ✅ Multi-source sync timestamps visible

**ETA:** 2 uur

### STAP 4: vELO History Tracking

**Actie:** Maak `rider_velo_history` table en vul bij elke sync

```typescript
// In POC sync service
await this.saveVeloHistory(riderId, currentVelo, tier);

async saveVeloHistory(riderId: number, rating: number, tier: string) {
  await this.supabase.from('rider_velo_history').upsert({
    rider_id: riderId,
    rating,
    tier,
    recorded_at: new Date().toISOString(),
    source: 'api_sync'
  });
}
```

**Frontend:** Racing Matrix toont vELO trend graph (laatste 90 dagen)

**ETA:** 2 uur

### STAP 5: Events Dashboard Integration

**Actie:** Sync upcoming events van ZwiftRacing

```typescript
class UnifiedDashboardSyncService {
  async syncUpcomingEvents(hoursAhead: number = 48) {
    const events = await this.zwiftRacing.getUpcomingEvents();
    
    // Filter team events
    const teamEvents = events.filter(e => 
      e.signups.some(s => TEAM_RIDER_IDS.includes(s.riderId))
    );
    
    // Enrich met rider details
    const enriched = await this.enrichEventsWithTeamData(teamEvents);
    
    // Save to events_enriched table
    await this.supabase.from('events_enriched').upsert(enriched);
  }
}
```

**Frontend:** EventsModern gebruikt `/api/v2/events/upcoming`

**ETA:** 4 uur

### STAP 6: Results Dashboard Integration

**Actie:** Sync race results + ZwiftPower enrichment

```typescript
class UnifiedDashboardSyncService {
  async syncRaceResults(daysBack: number = 30) {
    const events = await this.getFinishedEvents(daysBack);
    
    for (const event of events) {
      // Fetch results from ZwiftRacing
      const results = await this.zwiftRacing.getResults(event.id);
      
      // Enrich met ZwiftPower (CE/DQ flags)
      const enriched = await this.enrichWithZwiftPower(results);
      
      // Save to race_results_enriched
      await this.supabase.from('race_results_enriched').upsert(enriched);
    }
  }
}
```

**Frontend:** ResultsModern gebruikt `/api/v2/results/recent`

**ETA:** 6 uur

---

## 📈 Data Completeness Status

### POC Rider 150437

**Current Status (na bestaande POC sync):**
```
✅ Name: JRøne CloudRacer-9 @YT (TeamNL)
✅ vELO: 1398 (Amethyst)
✅ FTP: 234W
✅ Weight: 74kg
✅ ZP Category: C
✅ Activities: 10 rides (last 30 days)
⏳ Power Intervals: NULL (needs Step 1)
⏳ Phenotype: NULL (needs Step 1)
⏳ Handicaps: NULL (needs Step 1)
⏳ vELO History: Empty (needs Step 4)

Data Completeness: 67% → Target: 95%
```

**After Step 1 (Power Profile Sync):**
```
✅ Power Intervals: 964W/890W/676W/440W/371W/300W/258W
✅ Phenotype: SPRINTER (97.2)
✅ Handicaps: Flat +104, Rolling +12, Hilly -48, Mountainous -130
✅ Age/Gender: Vet / M

Data Completeness: 95% ✅
```

---

## 🎯 Success Metrics

**Phase 1 (Backend POC) - COMPLEET ✅**
- ✅ Multi-source sync werkend (3 APIs)
- ✅ Data accuracy (74kg van event 5229579)
- ✅ Sync performance (<2s)
- ✅ Unified API endpoints beschikbaar

**Phase 2 (Power Profile) - IN PROGRESS ⏳**
- ⏳ Power intervals in database
- ⏳ Phenotype/handicaps tracked
- ⏳ Data completeness >90%

**Phase 3 (Full Dashboards) - PENDING 🔄**
- 🔄 Racing Matrix met power data
- 🔄 Events Dashboard met team signups
- 🔄 Results Dashboard met ZP enrichment
- 🔄 vELO history graphs
- 🔄 Out-of-the-box metrics

---

## 💡 Key Insights

### 1. ZwiftRacing.app is Gold Mine
**Bevinding:** Single endpoint `/public/riders/:id` geeft 90% van wat we nodig hebben:
- vELO (current + max30 + max90)
- Power profile (all intervals, watts + W/kg)
- Phenotype scores
- Route handicaps
- Race stats
- Physical attributes

**Impact:** Dramatische simplificatie - minder API calls nodig dan gedacht

### 2. ZwiftPower: Event-Specific Data is Kritiek
**Bevinding:** Profile cache geeft oude data, event-specific endpoint geeft accurate recente data

**Implementatie:** `getRiderFromEvent(eventId, riderId)` method werkend

**Impact:** 74kg vs 76kg accuraatheid - significant voor W/kg calculations

### 3. Database Schema is Future-Proof
**Bevinding:** `riders_unified` table kan alle nieuwe velden accommoderen zonder breaking changes

**Strategy:** Add columns incrementally, maintain backwards compatibility

---

## 📝 Documentation Created

1. **ROBUUSTE_DATA_ARCHITECTUUR.md** (66KB)
   - Complete data mapping per dashboard
   - Multi-source integration strategy
   - Out-of-the-box metrics definities
   - Sync architecture
   - Implementation plan

2. **unified-dashboard.ts** (API endpoint)
   - GET /api/v2/riders/:id/detailed
   - GET /api/v2/riders/matrix
   - Helper functions (vELO tier, country flags, stats aggregation)

3. **Dit document** (IMPLEMENTATIE_STATUS.md)
   - Current state overview
   - Next steps prioritization
   - Data completeness tracking

---

## 🚀 Ready to Continue

**Status:** Backend foundation solid, data architecture defined, API endpoints operational

**Next Action:** Implementeer Step 1 (Power Profile Sync) voor POC rider 150437

**Command to start:**
```bash
cd backend
npm run dev  # Start server
npx tsx test-unified-api.ts  # Test current state
# Then implement power profile sync
```

**Expected Time to Full POC:** 8-12 uur werk (Steps 1-4)

**Expected Time to Full Dashboards:** 16-20 uur werk (Steps 1-6)
