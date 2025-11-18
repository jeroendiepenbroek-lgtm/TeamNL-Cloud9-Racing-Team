# Feature Implementation Plan - TeamNL Cloud9

**Datum**: 18 november 2025  
**Status**: Ready to start

---

## 🎯 Geselecteerde Features

### Feature 1: TeamBuilder Dashboard
**Prioriteit**: HIGH  
**Complexiteit**: HIGH  
**Dependencies**: view_my_team, rider sync V2  
**Documentatie**: `TEAMBUILDER_CONTEXT.md`, `TEAMBUILDER_CLUB_LADDER_DATA.md`

### Feature 2: Results Dashboard
**Prioriteit**: MEDIUM  
**Complexiteit**: MEDIUM  
**Dependencies**: zwift_api_race_results tabel, event sync  
**Documentatie**: User stories nog uit te werken

---

## 📊 Feature 1: TeamBuilder Dashboard

### Doel
Beheer van 11 competitie teams (7 ZRL + 4 Club Ladder) met drag-drop interface voor roster management, eligibility validatie, en team performance tracking.

### Bestaande Documentatie
- ✅ **TEAMBUILDER_CONTEXT.md**: Volledige spec (766 regels)
  - 2 competities (ZRL + Club Ladder)
  - 11 teams gedocumenteerd
  - Database schema ontwerp
  - Eligibility rules
  - UI mockups

- ✅ **TEAMBUILDER_CLUB_LADDER_DATA.md**: Live data checklist
  - Dashboard URL + credentials
  - vELO rating systeem
  - Data gathering acties
  - API research vragen

### Database Schema (Nieuw)

```sql
-- 1. Competities tabel
CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,                    -- "ZRL 2025/26 Season 17"
  slug TEXT UNIQUE NOT NULL,             -- "zrl-2025-26"
  organization TEXT,                     -- "WTRL", "Club Ladder"
  website_url TEXT,
  ranking_type TEXT NOT NULL,            -- "zp_category" | "velo_rating"
  season_start DATE,
  season_end DATE,
  status TEXT DEFAULT 'active',          -- active, upcoming, completed
  rules_summary JSONB,                   -- Roster limits, race format
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teams tabel
CREATE TABLE competition_teams (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER REFERENCES competitions(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,               -- "TeamNL // Cloud9 Alpapen"
  team_short TEXT NOT NULL,              -- "Alpapen"
  category TEXT,                         -- ZRL: "A", Club Ladder: null
  velo_range TEXT,                       -- Club Ladder: "1,2,3", ZRL: null
  target_category TEXT,                  -- "ZP Category A" | "vELO 1-3"
  max_roster_size INTEGER DEFAULT 6,     -- ZRL: 6, Club Ladder: ?
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competition_id, team_short)
);

-- 3. Team members (junction table)
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES competition_teams(id) ON DELETE CASCADE,
  rider_id INTEGER NOT NULL,             -- FK naar riders tabel
  role TEXT DEFAULT 'member',            -- "captain", "member", "substitute"
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,                            -- "Backup for Thunder"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, rider_id)
);

-- 4. Event rosters (race-specific lineups)
CREATE TABLE event_rosters (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES competition_teams(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,                -- FK naar zwift_api_events.event_id
  roster_slots JSONB NOT NULL,           -- [{rider_id, pen, order}, ...]
  submitted_at TIMESTAMPTZ,
  submitted_by TEXT,                     -- User who submitted
  is_locked BOOLEAN DEFAULT false,       -- Race started
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, event_id)
);

-- 5. Rider eligibility snapshot (voor audit trail)
CREATE TABLE rider_eligibility_snapshots (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  zp_category TEXT,                      -- "A", "B", "C", "D", "E"
  velo_rating INTEGER,                   -- 1-7
  ftp INTEGER,
  weight DECIMAL,
  watts_per_kg DECIMAL,
  race_ranking INTEGER,
  data_source TEXT,                      -- "zwiftpower", "manual", "club_ladder_api"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, snapshot_date)
);
```

### API Endpoints (Nieuw)

```typescript
// Backend: src/api/endpoints/teambuilder.ts

// 1. Competities
GET    /api/competitions                    // Lijst alle competities
GET    /api/competitions/:id                // Details + teams
POST   /api/competitions                    // Create (admin only)
PUT    /api/competitions/:id                // Update (admin only)

// 2. Teams
GET    /api/teams                           // Alle teams (filter by competition)
GET    /api/teams/:id                       // Team details + members
POST   /api/teams                           // Create team (admin)
PUT    /api/teams/:id                       // Update team
DELETE /api/teams/:id                       // Delete team (admin)

// 3. Team Members
GET    /api/teams/:id/members               // Team roster
POST   /api/teams/:id/members               // Add member
DELETE /api/teams/:id/members/:riderId      // Remove member
PUT    /api/teams/:id/members/:riderId      // Update role/notes

// 4. Event Rosters
GET    /api/teams/:id/rosters               // Alle rosters voor team
GET    /api/teams/:id/rosters/:eventId      // Specifieke event roster
POST   /api/teams/:id/rosters/:eventId      // Submit roster
PUT    /api/teams/:id/rosters/:eventId      // Update roster (if not locked)

// 5. Eligibility
GET    /api/riders/:id/eligibility          // Current eligibility status
GET    /api/riders/:id/eligibility/history  // Snapshots over tijd
POST   /api/riders/:id/eligibility          // Manual override (admin)

// 6. Validatie
POST   /api/teams/:id/validate-roster       // Validate proposed roster
                                            // Body: {eventId, rosterSlots}
                                            // Returns: {valid, errors[], warnings[]}
```

### Frontend Components (Nieuw)

```
frontend/src/pages/teambuilder/
├── TeamBuilderDashboard.tsx           // Overview: alle competities + teams
├── CompetitionView.tsx                // Specifieke competitie (ZRL of Club Ladder)
├── TeamDetail.tsx                     // Team profiel + members list
├── RosterBuilder.tsx                  // Drag-drop interface voor event roster
├── EligibilityChecker.tsx             // Check rider eligibility voor team
└── TeamPerformance.tsx                // Stats: wins, podiums, avg placement

frontend/src/components/teambuilder/
├── TeamCard.tsx                       // Team preview card
├── RiderCard.tsx                      // Draggable rider card
├── RosterSlot.tsx                     // Drop target voor roster positie
├── EligibilityBadge.tsx               // Visual indicator (✅❌⚠️)
└── ValidationAlert.tsx                // Roster validation feedback
```

### Implementatie Fases

#### **Phase 1: Database + API (Week 1)**
1. Create migrations voor 5 nieuwe tabellen
2. Seed data: 2 competities + 11 teams
3. Implementeer API endpoints (basic CRUD)
4. Test met Postman/curl

**Deliverables**:
- ✅ Migrations in `backend/migrations/`
- ✅ Seed script: `scripts/seed-competitions.ts`
- ✅ API endpoint: `backend/src/api/endpoints/teambuilder.ts`
- ✅ Tests: Postman collection

#### **Phase 2: Eligibility Logic (Week 2)**
1. Implementeer ZP Category validatie
2. Implementeer vELO range validatie
3. Snapshot systeem voor audit trail
4. Roster validatie business rules

**Deliverables**:
- ✅ Service: `backend/src/services/eligibility.service.ts`
- ✅ Validation functions met unit tests
- ✅ Snapshot cron job (daily 04:00)

#### **Phase 3: Frontend Basic (Week 3)**
1. TeamBuilder dashboard met competitie tabs
2. Team detail pagina met member lijst
3. Basic roster builder (geen drag-drop nog)
4. Eligibility status badges

**Deliverables**:
- ✅ Dashboard met 2 competities visible
- ✅ CRUD operations voor team members
- ✅ List-based roster builder

#### **Phase 4: Advanced UI (Week 4)**
1. Drag-drop roster builder (react-beautiful-dnd)
2. Real-time eligibility checks
3. Roster submission + lock systeem
4. Team performance charts

**Deliverables**:
- ✅ Drag-drop interface
- ✅ Live validation feedback
- ✅ Roster history view

### Open Vragen (Te onderzoeken)

1. **Club Ladder API**: Bestaat er een API? Check dashboard network calls
2. **vELO Updates**: Hoe vaak updaten? Automatisch of manual?
3. **Multi-team Membership**: Kan rider in 2 Club Ladder teams (vELO overlap)?
4. **Roster Submission**: Waar submitten? Dashboard, email, externe tool?
5. **ZRL API**: Heeft WTRL een API voor team/roster data?

### Success Metrics

- ✅ 11 teams aangemaakt en actief
- ✅ Alle riders toegewezen aan min. 1 team
- ✅ Roster validatie 100% accurate (geen illegale lineups)
- ✅ <2 sec load time voor dashboard
- ✅ Admin kan roster indienen voor aankomend event

---

## 📊 Feature 2: Results Dashboard

### Doel
Visueel overzicht van race results met filters, sorting, en power metrics. Toon prestaties van team members over tijd met focus op recente races en individuele rider history.

**Gebaseerd op**: Screenshots van ZwiftPower/Club Ladder results interfaces

### Core Features (User Input)

#### 1. **Team Recent Results Dashboard**
> "Ik wil een algemeen dashboard waarin de resultaten van de laatste 'x' races, waarbij één of meer van mijn rijders betrokken zijn geweest."

**Referentie**: Screenshot 1 - Recent Results tab met race lijst
- Grouped by event (datum + event naam als header)
- Per event: lijst van team riders met hun results
- Kolommen: Pen, Pos, vELO, Name, Time, Avg, 5s, 15s, 30s, 1m, 2m, 5m, 20m
- vELO rating badge (gekleurde cirkel met rating + trend arrow)
- Power metrics met kleurcodering (geel = PR, oranje = near PR)
- Sorteerbaar per kolom

#### 2. **Individual Rider Results Dashboard**
> "Een dashboard waarbij je de rijder kan selecteren en de races van afgelopen 90 dagen ziet."

**Referentie**: Screenshot 2 - Individual rider results tab
- Dropdown/selector voor rider keuze
- Results tabel met kolommen: vELO, Pos, Date, Event, Effort, Avg, 5s, 15s, 30s, 1m, 2m, 5m, 20m, RP
- **Result Power Colors** legenda:
  - 🟨 Personal Best (100%+)
  - ⬜ Near Best (95%+)
  - 🟧 Good Effort (90%+)
- Effort score (percentage van PR)
- RP (Race Points) kolom
- Event icons (race type indicators)
- vELO trend arrows (↑↓→)
- Power metrics per duration (5s t/m 20m)

### User Stories (Gedetailleerd)

**US1: Team Recent Results Overview**
> Als teamlid wil ik de laatste X races met team participation zien, gegroepeerd per event.

**Acceptance Criteria**:
- [ ] Dropdown: selecteer aantal races (10, 20, 50, 100)
- [ ] Event grouping: datum + event naam als section header
- [ ] Per event: tabel met alle team riders die deelnamen
- [ ] Kolommen: Pen (A/B/C/D), Pos (rank), vELO (rating + trend), Name, Time, Avg wkg, power curves (5s-20m)
- [ ] vELO badge: gekleurde cirkel (groen=hoog, blauw=mid, paars=laag) met rating nummer
- [ ] Trend indicator: ↑ (stijging), ↓ (daling), → (stabiel)
- [ ] Power metrics color coding:
  - Geel achtergrond = Personal Best voor die duration
  - Oranje achtergrond = Near Best (binnen 5% van PB)
  - Grijs achtergrond = Good effort (binnen 10% van PB)
  - Geen achtergrond = Normale effort
- [ ] Klikbare event naam → navigeer naar Event Details
- [ ] Klikbare rider naam → navigeer naar Rider Dashboard

**US2: Individual Rider Results Dashboard**
> Als team captain wil ik alle races van een specifieke rider zien over laatste 90 dagen.

**Acceptance Criteria**:
- [ ] Rider selector: dropdown met alle team members (alfabetisch)
- [ ] Date range filter: 30d, 60d, 90d, All Time (default: 90d)
- [ ] Results tabel met kolommen:
  - vELO (rating + trend arrow)
  - Pos (rank / total riders, bijv. "9 / 20")
  - Date (Nov 17, 2025)
  - Event (klikbare link met category badge)
  - Effort score (90-100 range, color coded)
  - Avg wkg
  - Power curve: 5s, 15s, 30s, 1m, 2m, 5m, 20m
  - RP (Race Points in bordered box)
- [ ] **Result Power Colors** legenda bovenaan:
  - 4.50 = Personal Best (100%+) - Geel
  - 4.28 = Near Best (95%+) - Grijs
  - 4.05 = Good Effort (90%+) - Oranje
- [ ] Event icons: race type (TT, Crit, Road, TTT)
- [ ] vELO history: show trend over time (mini chart optioneel)
- [ ] Effort score tooltip: "86% of your best 5min power"
- [ ] RP tooltip: "Race Points earned (based on placement + field strength)"

**US3: Event Results Detail View**
> Als rider wil ik alle deelnemers van een specifieke race zien met full power data.

**Acceptance Criteria**:
- [ ] Event header: 
  - Event naam
  - Datum + tijd
  - Route + distance
  - Category (A/B/C/D/E)
  - Total starters
- [ ] Full results leaderboard:
  - Rank, Name, Time, Avg wkg, power curves
  - Highlight team members (bold + background color)
  - Show all participants (niet alleen team)
- [ ] Filter toggle: "Team Only" / "All Participants"
- [ ] Sort by: Rank, Time, Avg wkg, any power duration
- [ ] Power curve comparison: hover over rider → show overlay op chart

**US4: Power Metrics Analysis**
> Als analist wil ik power metrics vergelijken tussen riders en over tijd.

**Acceptance Criteria**:
- [ ] Power curve chart: 
  - X-axis: duration (5s, 15s, 30s, 1m, 2m, 5m, 20m)
  - Y-axis: wkg
  - Lines: meerdere riders of races
- [ ] Personal Records tabel:
  - Duration, Best wkg, Date, Event
  - Highlight recent PR's (<30 dagen)
- [ ] Power duration selector: focus op specifieke duration (bijv. alleen 5min power)
- [ ] Comparison mode: select 2-5 riders → side-by-side comparison

**US5: Export & Sharing**
> Als admin wil ik results exporteren en delen met team.

**Acceptance Criteria**:
- [ ] Export knop per view (Team Results, Rider Results)
- [ ] CSV format met alle kolommen inclusief:
  - Metadata: rider_id, rider_name, event_id, event_name, date
  - Results: rank, time_seconds, category, pen
  - Power: avg_wkg, power_5s, power_15s, power_30s, power_1m, power_2m, power_5m, power_20m
  - Derived: effort_score, race_points, velo_rating
- [ ] Filename: `teamnl_results_YYYY-MM-DD_HH-MM.csv`
- [ ] Share button: copy link naar specific result/rider view

### Bestaande Data

✅ **Tabel beschikbaar**: `zwift_api_race_results`
```sql
CREATE TABLE zwift_api_race_results (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  rider_id INTEGER NOT NULL,
  rider_name TEXT,
  rank INTEGER,
  category TEXT,
  time_seconds INTEGER,
  avg_power DECIMAL,
  avg_wkg DECIMAL,
  is_disqualified BOOLEAN DEFAULT false,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

⚠️ **Missende kolommen** (gebaseerd op screenshots):
- `pen` (A/B/C/D/E race category/pen)
- `velo_rating` (Club Ladder vELO rating 1-7)
- `total_riders` (aantal deelnemers in race)
- `power_5s`, `power_15s`, `power_30s` (peak power per duration)
- `power_1m`, `power_2m`, `power_5m`, `power_20m` (sustained power)
- `effort_score` (percentage van PR, 0-100)
- `race_points` (RP scoring)
- `event_name`, `event_date` (denormalized voor queries)

✅ **API endpoint beschikbaar**: 
- `GET /api/results` - All race results
- `GET /api/results/:eventId` - Results voor specifiek event
- `POST /api/results/:eventId/sync` - Sync event results

### Database Schema (Uitbreidingen)

**1. Extend zwift_api_race_results (Migration)**
```sql
-- Add missing columns to match screenshot functionality
ALTER TABLE zwift_api_race_results
  ADD COLUMN pen TEXT,                           -- A/B/C/D/E pen assignment
  ADD COLUMN velo_rating INTEGER,                -- Club Ladder vELO (1-7)
  ADD COLUMN total_riders INTEGER,               -- Total participants
  ADD COLUMN event_name TEXT,                    -- Denormalized for queries
  ADD COLUMN event_date TIMESTAMPTZ,             -- Denormalized for sorting
  
  -- Power curve data (peak watts/kg per duration)
  ADD COLUMN power_5s DECIMAL,                   -- 5 second peak
  ADD COLUMN power_15s DECIMAL,                  -- 15 second peak
  ADD COLUMN power_30s DECIMAL,                  -- 30 second peak
  ADD COLUMN power_1m DECIMAL,                   -- 1 minute peak
  ADD COLUMN power_2m DECIMAL,                   -- 2 minute peak
  ADD COLUMN power_5m DECIMAL,                   -- 5 minute peak
  ADD COLUMN power_20m DECIMAL,                  -- 20 minute peak (FTP proxy)
  
  -- Derived metrics
  ADD COLUMN effort_score INTEGER,               -- 0-100 (% of PR)
  ADD COLUMN race_points DECIMAL;                -- RP scoring

-- Create index for common queries
CREATE INDEX idx_results_rider_date ON zwift_api_race_results(rider_id, event_date DESC);
CREATE INDEX idx_results_event ON zwift_api_race_results(event_id, rank);
CREATE INDEX idx_results_team_recent ON zwift_api_race_results(event_date DESC) 
  WHERE rider_id IN (SELECT rider_id FROM view_my_team);
```

**2. Personal Records tracking**
```sql
CREATE TABLE rider_personal_records (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,
  duration TEXT NOT NULL,                -- "5s", "15s", "30s", "1m", "2m", "5m", "20m"
  best_wkg DECIMAL NOT NULL,
  event_id TEXT,                         -- Event waar PR behaald
  event_date TIMESTAMPTZ,
  previous_best DECIMAL,                 -- Voor progression tracking
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, duration)
);

-- Trigger: auto-update PR's na result insert
CREATE OR REPLACE FUNCTION update_personal_records()
RETURNS TRIGGER AS $$
BEGIN
  -- Check each duration for new PR
  INSERT INTO rider_personal_records (rider_id, duration, best_wkg, event_id, event_date)
  VALUES 
    (NEW.rider_id, '5s', NEW.power_5s, NEW.event_id, NEW.event_date),
    (NEW.rider_id, '15s', NEW.power_15s, NEW.event_id, NEW.event_date),
    (NEW.rider_id, '30s', NEW.power_30s, NEW.event_id, NEW.event_date),
    (NEW.rider_id, '1m', NEW.power_1m, NEW.event_id, NEW.event_date),
    (NEW.rider_id, '2m', NEW.power_2m, NEW.event_id, NEW.event_date),
    (NEW.rider_id, '5m', NEW.power_5m, NEW.event_id, NEW.event_date),
    (NEW.rider_id, '20m', NEW.power_20m, NEW.event_id, NEW.event_date)
  ON CONFLICT (rider_id, duration) DO UPDATE
    SET best_wkg = GREATEST(rider_personal_records.best_wkg, EXCLUDED.best_wkg),
        previous_best = rider_personal_records.best_wkg,
        event_id = CASE 
          WHEN EXCLUDED.best_wkg > rider_personal_records.best_wkg THEN EXCLUDED.event_id
          ELSE rider_personal_records.event_id
        END,
        event_date = EXCLUDED.event_date,
        updated_at = NOW()
    WHERE EXCLUDED.best_wkg > rider_personal_records.best_wkg;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_prs
  AFTER INSERT OR UPDATE ON zwift_api_race_results
  FOR EACH ROW
  EXECUTE FUNCTION update_personal_records();
```

**3. Aggregated stats (Performance dashboard)**
```sql
CREATE TABLE rider_performance_stats (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL,
  period TEXT NOT NULL,                  -- "30d", "60d", "90d", "all_time"
  total_races INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_podiums INTEGER DEFAULT 0,       -- Top 3
  total_top10 INTEGER DEFAULT 0,
  avg_rank DECIMAL,
  avg_wkg DECIMAL,
  avg_effort_score DECIMAL,              -- Average effort % across races
  best_wkg DECIMAL,
  total_race_points DECIMAL,             -- Sum of RP
  last_race_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rider_id, period)
);

-- Materialized view voor team recent results (snelle queries)
CREATE MATERIALIZED VIEW view_team_recent_results AS
SELECT 
  r.event_id,
  e.title AS event_name,
  e.time_unix AS event_date,
  e.event_type,
  r.rider_id,
  rid.name AS rider_name,
  r.pen,
  r.rank,
  r.total_riders,
  r.velo_rating,
  r.time_seconds,
  r.avg_wkg,
  r.power_5s, r.power_15s, r.power_30s,
  r.power_1m, r.power_2m, r.power_5m, r.power_20m,
  r.effort_score,
  r.race_points
FROM zwift_api_race_results r
JOIN zwift_api_events e ON r.event_id = e.event_id
JOIN riders rid ON r.rider_id = rid.rider_id
WHERE r.rider_id IN (SELECT rider_id FROM view_my_team)
  AND e.time_unix > EXTRACT(EPOCH FROM NOW() - INTERVAL '90 days')
ORDER BY e.time_unix DESC;

-- Refresh materialized view (cron job 1x per uur)
CREATE INDEX idx_view_team_recent_event_date ON view_team_recent_results(event_date DESC);
```

### API Endpoints (Uitbreidingen)

```typescript
// Backend: src/api/endpoints/results.ts (extend existing)

// Analytics endpoints
GET    /api/results/recent                  // Last 20 results (all riders)
                                            // Query: ?days=7&limit=20
GET    /api/results/rider/:riderId          // All results voor rider
                                            // Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
GET    /api/results/rider/:riderId/stats    // Aggregated stats
                                            // Query: ?period=7d|30d|90d|all
GET    /api/results/team-comparison         // Compare team stats
                                            // Query: ?teamIds=1,2,3&period=30d
GET    /api/results/trends                  // Time series data
                                            // Query: ?riderIds=123,456&metric=avg_wkg
GET    /api/results/export                  // CSV export
                                            // Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD

// Event-specific
GET    /api/events/:eventId/results         // Results voor event (existing)
                                            // Query: ?teamOnly=true (filter team members)
```

### Frontend Components (Nieuw)

```
frontend/src/pages/results/
├── ResultsDashboard.tsx                // Main dashboard met tabs
├── RecentResults.tsx                   // Tabel met laatste 20 races
├── RiderPerformance.tsx                // Rider detail met charts
├── TeamComparison.tsx                  // Side-by-side team stats
├── EventResults.tsx                    // Specifieke event leaderboard
└── TrendsAnalysis.tsx                  // Time series charts

frontend/src/components/results/
├── ResultsTable.tsx                    // Sortable/filterable tabel
├── PerformanceChart.tsx                // Line/bar charts (recharts)
├── StatCard.tsx                        // Quick stat display (wins, avg rank)
├── RankBadge.tsx                       // Visual rank indicator (🥇🥈🥉)
├── CategoryBadge.tsx                   // A/B/C/D badge
└── ExportButton.tsx                    // CSV export trigger
```

### Implementatie Fases

#### **Phase 1: API Enhancement (Week 1)**
1. Extend `/api/results` endpoints met filters
2. Implement aggregation logic (stats service)
3. CSV export functionality
4. Caching voor performance (Redis optioneel)

**Deliverables**:
- ✅ Extended API endpoints
- ✅ Stats service: `backend/src/services/results-stats.service.ts`
- ✅ CSV export: `backend/src/utils/csv-exporter.ts`

#### **Phase 2: Basic Dashboard (Week 2)**
1. Results dashboard layout (tabs)
2. Recent results tabel (sortable/filterable)
3. Event results detail view
4. Team member highlighting

**Deliverables**:
- ✅ Dashboard met 3 tabs (Recent, Events, Riders)
- ✅ Basic filtering (date range, rider, category)
- ✅ Responsive design (mobile-friendly)

#### **Phase 3: Analytics & Charts (Week 3)**
1. Rider performance charts (recharts/visx)
2. Trend analysis (avg_wkg over time)
3. Team comparison view
4. Stats cards (wins, podiums, avg rank)

**Deliverables**:
- ✅ 3 chart types (line, bar, scatter)
- ✅ Interactive tooltips
- ✅ Drill-down naar event details

#### **Phase 4: Advanced Features (Week 4)**
1. Real-time updates (WebSocket optioneel)
2. PR tracking (personal records)
3. Goal setting (target avg_wkg)
4. Leaderboards (team internal)

**Deliverables**:
- ✅ PR badges op results
- ✅ Goal progress bars
- ✅ Team leaderboard widget

### Data Sync Strategy

**Huidige situatie**:
- ✅ `POST /api/results/:eventId/sync` - Manual sync per event
- ❌ Geen automatic sync voor results

**Voorgesteld**:
```typescript
// New cron job in server.ts
cron.schedule('0 */6 * * *', async () => {  // Every 6 hours
  console.log('🔄 [CRON] Syncing recent event results...');
  
  // Get events from last 7 days
  const recentEvents = await supabase.getEvents({
    from: new Date(Date.now() - 7*24*60*60*1000),
    to: new Date()
  });
  
  // Sync results for each event
  for (const event of recentEvents) {
    try {
      await resultsService.syncEventResults(event.event_id);
    } catch (err) {
      console.error(`Failed to sync results for ${event.event_id}`, err);
    }
  }
});
```

### Success Metrics

- ✅ Dashboard load time <3 sec
- ✅ Toon results binnen 6h na race finish
- ✅ Charts renderen binnen 1 sec
- ✅ CSV export compleet binnen 5 sec
- ✅ Mobile responsive (tablet/phone)

---

## 🚀 Aanbevolen Volgorde

### Optie A: TeamBuilder eerst (Complexer, meer business value)
**Week 1-4**: TeamBuilder (database, API, UI)  
**Week 5-8**: Results Dashboard (sneller want minder dependencies)

**Voordelen**:
- Complexste feature eerst (meer momentum)
- TeamBuilder data nuttig voor Results filtering (team-based)
- Eligibility snapshots kunnen race results verrijken

**Nadelen**:
- Langere tijd tot eerste feature live
- Meer unknowns (Club Ladder API, vELO sync)

### Optie B: Results Dashboard eerst (Quick wins)
**Week 1-4**: Results Dashboard (sneller, data al beschikbaar)  
**Week 5-8**: TeamBuilder (meer research tijd)

**Voordelen**:
- Snelle win (data + API al grotendeels klaar)
- Geeft tijd voor Club Ladder research
- Results data helpt bij TeamBuilder decisions (wie in welk team)

**Nadelen**:
- Minder impactvol voor dagelijks gebruik (TeamBuilder belangrijker)
- Results Dashboard limiet zonder team context

### 💡 Aanbeveling: **Optie B - Results Dashboard eerst**

**Rationale**:
1. **Data beschikbaarheid**: `zwift_api_race_results` al beschikbaar
2. **API gereed**: Endpoints al deels geïmplementeerd
3. **Research tijd**: Gebruik 4 weken voor Club Ladder API onderzoek
4. **Quick feedback**: Team kan results zien en feedback geven
5. **Momentum**: Snelle win motiveert voor complexere TeamBuilder

---

## 📋 Next Steps

### Immediate Actions
1. **Results Dashboard kickoff**:
   - [ ] Review `zwift_api_race_results` schema
   - [ ] Test bestaande `/api/results` endpoints
   - [ ] Check hoeveel results data al aanwezig is
   - [ ] Wireframe dashboard layout (Figma/paper)

2. **TeamBuilder research** (parallel):
   - [ ] Login Club Ladder dashboard
   - [ ] Inspect network calls (zoek API endpoints)
   - [ ] Read Notion Race Book (vELO details)
   - [ ] Check WTRL website voor ZRL API docs
   - [ ] Document findings in `TEAMBUILDER_CLUB_LADDER_DATA.md`

### Week 1 Deliverables (Results Dashboard)
- [ ] Extended API endpoints (`/api/results/recent`, `/api/results/rider/:id/stats`)
- [ ] Basic frontend layout (3 tabs: Recent, Events, Riders)
- [ ] Results tabel component (sortable/filterable)
- [ ] Connect API → Frontend (fetch results)

---

**Questions? Check:**
- TeamBuilder: `TEAMBUILDER_CONTEXT.md` (766 regels spec)
- Architecture: `ARCHITECTURE_DIAGRAM.md` (complete system overview)
- Database: `COMPLETE_SUPABASE_SCHEMA.md` (current schema)
