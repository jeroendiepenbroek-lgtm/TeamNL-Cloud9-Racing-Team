# Feature Roadmap v1.5 - TeamNL Cloud9 Racing Team

**Status**: Planning & Design Phase  
**Target Version**: v1.5  
**Datum**: 2025-11-12  
**Basis**: v1.4-production-working

---

## 🎯 Feature Overview

Vijf hoofdfeatures om de dashboard uit te breiden met event management, prestatie tracking, club integratie, team building functionaliteit voor competities, en uitgebreide rider profiles.

---

## Feature 1: Events Page (48-uur vooruitblik)

### 📋 Beschrijving
Pagina die alle aankomende events toont waarin riders uit de Rider database zijn ingeschreven. Kijkt 48 uur vooruit.

### 🔗 Referentie
- Voorbeeld: https://www.zwiftracing.app/events
- Focus: Toekomstige events (next 48 hours)

### 📊 Data Requirements
**Database Tables Needed**:
- `events` - Event informatie
  - `event_id` (PK)
  - `event_name`
  - `event_date` (timestamp)
  - `event_type` (race/group_ride/etc)
  - `zwift_event_id`
  - `event_url`
  - `description`
  - `category_enforcement` (boolean)

- `event_signups` - Koppeltabel riders ↔ events
  - `id` (PK)
  - `event_id` (FK → events)
  - `rider_id` (FK → riders)
  - `signup_date`
  - `category` (A/B/C/D/E)
  - `status` (confirmed/tentative/cancelled)

**API Endpoints Needed**:
- `GET /api/events/upcoming` - Events komende 48 uur
  - Query params: `hours=48` (default)
  - Filter: `has_team_riders=true` (alleen events met onze riders)
  
- `GET /api/events/:eventId` - Event details
  - Include: Alle ingeschreven riders
  - Include: Event metadata (route, distance, etc)

- `GET /api/riders/:riderId/events/upcoming` - Events per rider

**ZwiftRacing.app API**:
- Check: `/public/rider/{riderId}/upcoming-events`
- Check: `/public/events` (indien beschikbaar)

### 🎨 UI Components
- **EventsList** - Grid/lijst met event cards
- **EventCard** - Compacte event preview
  - Event naam + datum/tijd
  - Aantal ingeschreven team riders
  - Badge: categorie
  - Countdown timer tot start
  
- **EventDetails** - Modal/pagina met volledige info
  - Route info
  - Ingeschreven riders (gefilterd op team)
  - External link naar zwiftracing.app

### 🔄 Data Sync Strategy
- **Cron job**: Elke 6 uur sync upcoming events
- **On-demand**: Manual refresh button
- **Scope**: Alleen events waarin ≥1 rider uit database ingeschreven is

### ✅ Acceptance Criteria
- [ ] Toont events van nu tot +48 uur
- [ ] Filtert op riders in database
- [ ] Realtime countdown tot event start
- [ ] Link naar zwiftracing.app event pagina
- [ ] Mobile responsive design
- [ ] Laadt binnen 2 seconden

---

## Feature 2: Results Page (48-uur terugblik)

### 📋 Beschrijving
Overzicht van prestaties van riders uit de database over afgelopen 48 uur. Toont race results, rankings, en performance metrics.

### 🔗 Referentie
- Voorbeeld: https://www.zwiftracing.app/clubs/2281
- Focus: Historische results (last 48 hours)
- **Note**: Club 2281 is voorbeeld, wij gebruiken onze eigen riders

### 📊 Data Requirements
**Database Tables Needed**:
- `race_results` (bestaand - extend indien nodig)
  - `result_id` (PK)
  - `event_id` (FK)
  - `rider_id` (FK)
  - `event_date`
  - `position`
  - `time`
  - `power_avg`
  - `power_np`
  - `hr_avg`
  - `category`
  - `zp_points_gained`
  - `zp_rating_change`

- `performance_metrics` (nieuw - optioneel)
  - `id` (PK)
  - `rider_id` (FK)
  - `period_start` (timestamp)
  - `period_end` (timestamp)
  - `races_count`
  - `avg_position`
  - `podiums_count`
  - `rating_trend` (up/down/stable)

**API Endpoints Needed**:
- `GET /api/results/recent` - Results laatste 48 uur
  - Query params: `hours=48` (default)
  - Filter: Alleen riders uit database
  - Sort: event_date DESC

- `GET /api/riders/:riderId/results/recent` - Recent results per rider

- `GET /api/analytics/performance` - Aggregated metrics
  - Period: 48h / 7d / 30d (selectable)
  - Metrics: avg position, rating change, race count

**ZwiftRacing.app API**:
- `/public/rider/{riderId}/results?limit=10`
- Filter client-side op laatste 48 uur

### 🎨 UI Components
- **ResultsTimeline** - Chronologische lijst
  - Grouping per dag
  - Event naam + rider naam
  - Position badge (1st/2nd/3rd krijgen medaille icoon)
  
- **ResultCard** - Race result details
  - Rider foto/naam
  - Position + categorie
  - Key metrics (power, HR, time)
  - Rating change (↗️ ↘️ ↔️)
  
- **PerformanceStats** - Summary widgets
  - Total races (48h)
  - Best result
  - Average position
  - Total rating points gained/lost

### 🔄 Data Sync Strategy
- **Real-time**: Sync results na elk event (webhook indien mogelijk)
- **Fallback cron**: Elke 2 uur check voor nieuwe results
- **Historical backfill**: On-demand voor oudere data

### ✅ Acceptance Criteria
- [ ] Toont results van -48 uur tot nu
- [ ] Filtert op riders in database
- [ ] Grouping per dag/event
- [ ] Performance metrics dashboard
- [ ] Export naar CSV (optioneel)
- [ ] Mobile responsive

---

## Feature 3: Club Pages

### 📋 Beschrijving
Dynamische pagina's voor alle clubs waar onze riders lid van zijn. Toont club info, members, en aggregate statistics.

### 🔗 Referentie
- ClubIDs komen uit `riders` tabel (kolom: `club_id`)
- Voorbeeld: https://www.zwiftracing.app/clubs/{clubId}

### 📊 Data Requirements
**Database Tables Needed**:
- `clubs` (nieuw of extend bestaand)
  - `club_id` (PK)
  - `club_name`
  - `club_tag` (bijv. "C9")
  - `club_description`
  - `founded_date`
  - `member_count`
  - `logo_url` (optioneel)
  - `zwift_club_id`
  - `last_sync` (timestamp)

- `club_stats` (nieuw - optioneel)
  - `id` (PK)
  - `club_id` (FK)
  - `total_riders`
  - `active_riders_7d`
  - `total_races_30d`
  - `avg_rating`
  - `calculated_at` (timestamp)

**API Endpoints Needed**:
- `GET /api/clubs` - Lijst van alle clubs
  - Filtered: Alleen clubs met ≥1 rider in database
  
- `GET /api/clubs/:clubId` - Club details
  - Include: All members (riders uit database)
  - Include: Recent results
  - Include: Club statistics

- `GET /api/clubs/:clubId/members` - Club members
  - Paginated
  - Sortable op rating/name/races

- `GET /api/clubs/:clubId/results` - Club race results
  - Time range filter

**ZwiftRacing.app API**:
- `/public/clubs/{clubId}` - Club info
- `/public/clubs/{clubId}/members` - Members lijst

### 🎨 UI Components
- **ClubsOverview** - Grid met club cards
  - Club naam + tag
  - Member count (van onze riders)
  - Club logo/banner
  
- **ClubPage** - Dedicated club pagina
  - Header: Club info + stats
  - Tabs:
    1. Members (lijst met riders)
    2. Recent Results (laatste races)
    3. Statistics (charts)
  
- **ClubCard** - Compacte preview
  - Club tag prominent
  - "X riders from our team"
  - Link naar full page

### 🔄 Data Sync Strategy
- **Initial**: Discover all unique club_ids uit riders tabel
- **Sync**: Dagelijks update club metadata
- **On-demand**: Refresh button per club

### ✅ Acceptance Criteria
- [ ] Auto-discover clubs uit riders.club_id
- [ ] Dedicated pagina per club
- [ ] Toont alleen riders uit onze database
- [ ] Club statistics dashboard
- [ ] Navigation tussen clubs
- [ ] Mobile responsive

---

## Feature 4: Team Builder (Competitie Teams)

### 📋 Beschrijving
Functionaliteit om teams samen te stellen voor verschillende competities. Riders kunnen in meerdere teams zitten afhankelijk van categorie en competitie.

### 🏆 Competitie 1: Zwift Racing League (ZRL)
**URL**: https://www.wtrl.racing/zwift-racing-league/  
**Indeling**: Op ZP-categorie (A/B/C/D)

**Onze Teams**:
1. **TeamNL // Cloud9 Alpapen** (A)
2. **TeamNL // Cloud9 Bangers** (B)
3. **TeamNL // Cloud9 Bonkers** (B)
4. **TeamNL // Cloud9 Bandits** (B)
5. **TeamNL // Cloud9 Blizzard** (B)
6. **TeamNL // Cloud9 Cradle** (C)
7. **TeamNL // Cloud9 Chaos** (C)

### 🏆 Competitie 2: Club Ladder
**URL**: https://ladder.cycleracing.club/dashboard  
**Indeling**: Op vELO ranking (1-7 schaal)

**Onze Teams**:
1. **TeamNL Cloud9 Thunder** (vELO 1,2,3)
2. **TeamNL Cloud9 Lightning** (vELO 3,4,5)
3. **TeamNL Cloud9 Spark** (vELO 4,5,6)
4. **TeamNL Cloud9 Woeste Storm** (vELO 5,6,7)

### 📊 Data Requirements

**Database Tables Needed**:

**1. competitions** (nieuw)
```sql
- competition_id (PK)
- competition_name (bijv. "Zwift Racing League", "Club Ladder")
- competition_url
- season (bijv. "2025 Season 1")
- ranking_type (enum: 'zp_category', 'velo_rating') -- ZRL=zp, Ladder=velo
- start_date
- end_date
- status (upcoming/active/completed)
```

**2. teams** (nieuw)
```sql
- team_id (PK)
- competition_id (FK → competitions)
- team_name (bijv. "TeamNL // Cloud9 Alpapen", "TeamNL Cloud9 Thunder")
- team_short_name (bijv. "Alpapen", "Thunder")
- target_category (A/B/C/D) -- voor ZRL (zp_category based)
- velo_min (INT) -- voor Club Ladder (bijv. 1)
- velo_max (INT) -- voor Club Ladder (bijv. 3)
- team_color (hex) -- voor UI styling
- logo_url (optioneel)
- created_at
```

**3. team_members** (nieuw - koppeltabel)
```sql
- id (PK)
- team_id (FK → teams)
- rider_id (FK → riders)
- role (captain/member/substitute)
- joined_at
- active (boolean) -- voor roster changes
```

**4. team_rosters** (nieuw - event-specifieke lineup)
```sql
- roster_id (PK)
- team_id (FK → teams)
- event_id (FK → events)
- rider_id (FK → riders)
- position (1-6, voor ZRL max 6 riders)
- confirmed (boolean)
```

**API Endpoints Needed**:

**Teams Management**:
- `GET /api/competitions` - Alle competities
- `GET /api/competitions/:id/teams` - Teams in competitie
- `GET /api/teams/:teamId` - Team details + members
- `POST /api/teams` - Nieuw team aanmaken (admin only)
- `PUT /api/teams/:teamId` - Update team (admin only)

**Team Members**:
- `GET /api/teams/:teamId/members` - Team members
- `POST /api/teams/:teamId/members` - Rider toevoegen (admin only)
- `DELETE /api/teams/:teamId/members/:riderId` - Rider verwijderen (admin only)
- `PUT /api/teams/:teamId/members/:riderId/role` - Update role (admin only)

**Team Builder**:
- `GET /api/riders/available-for-category/:category` - Eligible riders voor categorie
- `POST /api/teams/:teamId/roster` - Lineup voor specifiek event
- `GET /api/teams/:teamId/roster/:eventId` - Lineup ophalen

### 🎨 UI Components

**1. CompetitionsOverview**
- Grid met actieve competities
- Card per competitie:
  - Naam + logo
  - Aantal teams
  - Season info
  - Status badge (active/upcoming/ended)

**2. TeamBuilder Dashboard**
- Sidebar: Lijst van teams
- Main: Selected team details
  - Team naam + categorie badge
  - Member lijst (draggable)
  - "Available Riders" pool (filtered op categorie)
  
**3. TeamCard**
- Team naam + short name
- Categorie badge (groot, prominent)
- Member count
- Captain indicator
- Quick actions: Edit, View Roster

**4. RosterBuilder** (voor events)
- Event selector
- Drag & drop interface:
  - Left: Team pool (alle members)
  - Right: Active lineup (max 6 voor ZRL)
- Save/confirm button
- Validation: Check category eligibility

**5. RiderEligibilityFilter**
- Filter riders op:
  - ZP Category (match team category)
  - Availability (niet al in ander team lineup voor zelfde event)
  - Active status

### 🔄 Business Logic

**Team Assignment Rules**:
1. Rider kan in meerdere teams (verschillende competities/categorieën)
2. Rider kan NIET in 2 teams voor zelfde event
3. **ZRL - Categorie check**:
   ```typescript
   function isEligibleForZRLTeam(rider: Rider, team: Team): boolean {
     return rider.zp_category === team.target_category;
   }
   ```
4. **Club Ladder - vELO check**:
   ```typescript
   function isEligibleForLadderTeam(rider: Rider, team: Team): boolean {
     // Rider moet vELO rating hebben binnen team range
     const riderVelo = rider.velo_rating; // 1-7 schaal
     return riderVelo >= team.velo_min && riderVelo <= team.velo_max;
   }
   ```

**Roster Validation**:
```typescript
function validateRoster(roster: TeamRoster[]): ValidationResult {
  // Check 1: Max riders (6 voor ZRL)
  if (roster.length > 6) return { valid: false, error: "Max 6 riders" };
  
  // Check 2: All riders in correct category
  const invalidCategory = roster.find(r => 
    r.rider.zp_category !== roster[0].team.target_category
  );
  if (invalidCategory) return { valid: false, error: "Category mismatch" };
  
  // Check 3: No duplicate riders
  const uniqueRiders = new Set(roster.map(r => r.rider_id));
  if (uniqueRiders.size !== roster.length) {
    return { valid: false, error: "Duplicate riders" };
  }
  
  return { valid: true };
}
```

### 🎯 User Workflows

**Workflow 1: Team aanmaken (ZRL)**
1. Admin gaat naar Teams > Create New
2. Selecteert competitie: "Zwift Racing League"
3. Vult team info in:
   - Naam: "TeamNL // Cloud9 Alpapen"
   - Short name: "Alpapen"
   - Ranking type: ZP Category
   - Categorie: A
   - Kleur: #FF6B00 (oranje)
4. Save → Team wordt aangemaakt

**Workflow 1b: Team aanmaken (Club Ladder)**
1. Admin gaat naar Teams > Create New
2. Selecteert competitie: "Club Ladder"
3. Vult team info in:
   - Naam: "TeamNL Cloud9 Thunder"
   - Short name: "Thunder"
   - Ranking type: vELO
   - vELO Range: Min 1, Max 3
   - Kleur: #4A90E2 (blauw)
4. Save → Team wordt aangemaakt

**Workflow 2: Riders toevoegen aan team (ZRL)**
1. Admin opent team "Alpapen" (Cat A)
2. Ziet "Available Riders" lijst (gefilterd op ZP Cat A)
3. Selecteert riders:
   - Drag & drop naar team member lijst
   - Of: Click "Add to team" button
4. Wijst captain role toe aan 1 rider
5. Save → Members gekoppeld

**Workflow 2b: Riders toevoegen aan team (Club Ladder)**
1. Admin opent team "Thunder" (vELO 1-3)
2. Ziet "Available Riders" lijst (gefilterd op vELO 1, 2, of 3)
3. System toont vELO rating per rider in lijst
4. Selecteert riders binnen range
5. Wijst captain role toe
6. Save → Members gekoppeld

**Workflow 3: Event lineup maken**
1. Admin gaat naar team "Alpapen"
2. Selecteert aankomend ZRL event
3. Roster Builder opent:
   - Links: 12 team members
   - Rechts: Lege lineup (max 6 slots)
4. Drag 6 riders naar lineup
5. Validation check: All Cat A? ✅
6. Save → Roster confirmed
7. (Optioneel) Export naar clipboard voor posting in Discord

**Workflow 4: Multi-team management**
1. Admin bekijkt "All Teams" dashboard
2. Quick view per team:
   - Member count
   - Upcoming events met lineup status
   - Missing rosters (⚠️ warning)
3. Bulk actions:
   - "Fill all rosters for next event"
   - "Notify captains"

### ✅ Acceptance Criteria

**Teams**:
- [ ] CRUD voor competitions en teams (admin only)
- [ ] Team cards tonen categorie + member count
- [ ] Multiple teams per competition mogelijk
- [ ] Team archiving (voor oude seasons)

**Team Members**:
- [ ] Add/remove riders to/from team
- [ ] Category validation (A riders → A teams)
- [ ] Role management (captain/member/sub)
- [ ] History tracking (wie was wanneer in team)

**Roster Builder**:
- [ ] Drag & drop interface voor lineup
- [ ] Max 6 riders voor ZRL events
- [ ] Real-time validation
- [ ] Conflict detection (rider in 2 teams voor zelfde event)
- [ ] Export roster (text/JSON)

**UI/UX**:
- [ ] Mobile responsive (table view)
- [ ] Keyboard shortcuts (voor power users)
- [ ] Undo/redo functionality
- [ ] Auto-save drafts

---

## Feature 5: Rider Profile Dashboard

### 📋 Beschrijving
Uitgebreide individuele rider pagina met alle statistieken, race geschiedenis, performance trends, en interactieve grafieken. Deep-dive analytics per rider.

### 🔗 Referentie
- Voorbeeld: https://www.zwiftracing.app/riders/150437
- Focus: Complete rider profile met historical data

### 📊 Data Requirements

**Database Tables Needed**:

**Extend existing `riders` table** met extra velden:
```sql
- profile_image_url (URL)
- country_code (bijv. "NL")
- bio (TEXT) -- optioneel, rider kan zelf invullen
- strava_url (URL) -- optioneel
- discord_handle (VARCHAR)
- join_date (timestamp) -- wanneer bij Cloud9 gekomen
```

**New table: `rider_statistics`** (aggregated metrics)
```sql
- id (PK)
- rider_id (FK → riders)
- period (enum: 'all_time', '90d', '30d', '7d')
- total_races (INT)
- total_wins (INT)
- total_podiums (INT)
- avg_position (DECIMAL)
- best_position (INT)
- races_per_category (JSON) -- {A: 5, B: 20, C: 3}
- win_rate (DECIMAL) -- percentage
- podium_rate (DECIMAL)
- avg_power (INT) -- watts
- avg_wkg (DECIMAL)
- max_20min_power (INT)
- calculated_at (timestamp)
```

**New table: `rider_rating_history`** (time series)
```sql
- id (PK)
- rider_id (FK → riders)
- recorded_at (timestamp)
- zp_rating (INT)
- zp_category (CHAR)
- velo_rating (DECIMAL) -- voor Club Ladder
- zp_rank_global (INT) -- optioneel
- zp_rank_country (INT) -- optioneel
```

**New table: `rider_achievements`** (badges/milestones)
```sql
- id (PK)
- rider_id (FK → riders)
- achievement_type (enum: 'first_win', 'podium_streak', 'category_promotion', 'milestone_races', etc)
- achievement_name (VARCHAR)
- achievement_description (TEXT)
- icon_url (URL)
- unlocked_at (timestamp)
- metadata (JSON) -- extra context
```

**API Endpoints Needed**:

**Profile Data**:
- `GET /api/riders/:riderId/profile` - Full profile data
  - Include: Basic info, current stats, teams, achievements
  
- `PUT /api/riders/:riderId/profile` - Update profile (rider zelf of admin)
  - Updateable: bio, profile_image, strava_url, discord_handle

**Statistics**:
- `GET /api/riders/:riderId/stats` - Aggregated statistics
  - Query params: `period=all_time|90d|30d|7d`
  
- `GET /api/riders/:riderId/stats/compare` - Compare met andere riders
  - Query params: `compareWith=[riderIds]`

**Race History**:
- `GET /api/riders/:riderId/results` - Race results (paginated)
  - Query params: `page=1&limit=20&sortBy=date&order=desc`
  - Filters: `category=B&dateFrom=2025-01-01&dateTo=2025-12-31`
  
- `GET /api/riders/:riderId/results/summary` - Results by period
  - Returns: Grouped by month/week

**Rating History**:
- `GET /api/riders/:riderId/rating-history` - Time series data
  - Query params: `from=2025-01-01&to=2025-12-31&metric=zp_rating|velo_rating`
  - Returns: Array van {date, rating} voor charting

**Power Analysis**:
- `GET /api/riders/:riderId/power-curve` - Power curve data
  - Durations: 5s, 30s, 1min, 5min, 20min, 60min
  - Returns: Best efforts per duration
  
- `GET /api/riders/:riderId/power-trends` - Power trends over time

**Achievements**:
- `GET /api/riders/:riderId/achievements` - All unlocked achievements
- `POST /api/riders/:riderId/achievements` - Award achievement (admin only)

**ZwiftRacing.app API**:
- `/public/rider/{riderId}` - Basic profile
- `/public/rider/{riderId}/results` - Race history
- `/public/rider/{riderId}/power-profile` - Power curve (indien beschikbaar)

### � UI Components

**1. ProfileHeader**
- Large profile image/avatar
- Rider naam + country flag
- Current ZP category badge (prominent)
- Current rating (ZP + vELO)
- Team badges (alle teams waarin rider zit)
- Social links (Strava, Discord)
- Quick stats: Total races, Win rate, Podiums

**2. StatsOverview** (Cards grid)
- **Career Stats Card**:
  - Total races
  - Wins / Podiums
  - Win rate %
  - Best result
  
- **Current Form Card** (laatste 30 dagen):
  - Races deze maand
  - Avg position
  - Rating change (↗️/↘️/↔️)
  
- **Power Profile Card**:
  - FTP (functional threshold power)
  - W/kg ratio
  - Max 20min power
  
- **Category Distribution** (pie chart):
  - Races per categorie (A/B/C/D)

**3. RatingChart** (Interactive line chart)
- X-axis: Time (selecteerbaar: 7d, 30d, 90d, all time)
- Y-axis: Rating
- Multiple lines:
  - ZP Rating (primary)
  - vELO Rating (secondary, different color)
- Markers voor category promotions/demotions
- Zoom/pan functionality

**4. PowerCurveChart**
- X-axis: Duration (log scale: 5s → 60min)
- Y-axis: Power (watts)
- Two lines:
  - Absolute power (watts)
  - Relative power (w/kg)
- Benchmarks: Show category average lines

**5. RaceHistoryTable** (Sortable, filterable)
Columns:
- Date
- Event name (link naar event page)
- Category
- Position
- Time
- Avg Power
- Avg HR
- Rating change
- View details button

Filters:
- Date range picker
- Category filter (A/B/C/D)
- Result type (Win/Podium/Top10/All)
- Sort by: Date, Position, Power, Rating change

**6. AchievementsBadges**
- Grid van badges/medals
- Hover: Tooltip met beschrijving + unlock date
- Categories:
  - 🏆 Race wins (1st, 10th, 50th win)
  - 🥇 Podiums (streaks)
  - 📈 Category promotions
  - 🎯 Milestones (100 races, 500 races, etc)
  - ⚡ Power records (FTP PRs)
  - 🔥 Streaks (consecutive races, active weeks)

**7. TeamsSection**
- List van alle teams waarin rider zit
- Per team:
  - Team naam + badge
  - Competition naam
  - Role (captain/member/sub)
  - Link naar team page

**8. RecentActivityTimeline**
- Chronologische feed van laatste activiteiten:
  - Race results
  - Team assignments
  - Achievements unlocked
  - Rating milestones
- Style: Twitter/Facebook feed achtig

**9. ComparisonWidget** (optioneel)
- Select andere riders uit database
- Side-by-side stats vergelijking
- Visual diff (bar charts)

### 🎨 Page Layout

```
┌─────────────────────────────────────────────────────┐
│ ProfileHeader (full width, sticky top?)             │
├─────────────────────────────────────────────────────┤
│ Tabs: Overview | Stats | Race History | Achievements│
├─────────────────────────────────────────────────────┤
│                                                       │
│ TAB: Overview                                        │
│ ┌─────────────┬─────────────┬─────────────┐        │
│ │ Career Stats│ Current Form│ Power Profile│        │
│ └─────────────┴─────────────┴─────────────┘        │
│                                                       │
│ ┌───────────────────────────────────────────┐       │
│ │ Rating History Chart (full width)         │       │
│ │ (interactive, zoomable)                   │       │
│ └───────────────────────────────────────────┘       │
│                                                       │
│ ┌──────────────────┬──────────────────────┐         │
│ │ Recent Races     │ Teams                │         │
│ │ (last 5)         │ (current memberships)│         │
│ └──────────────────┴──────────────────────┘         │
│                                                       │
│ TAB: Stats                                           │
│ - Detailed statistics per period                    │
│ - Power curve chart                                 │
│ - Category distribution                             │
│ - Comparison tool                                   │
│                                                       │
│ TAB: Race History                                    │
│ - Full results table (paginated)                    │
│ - Advanced filters                                  │
│ - Export to CSV                                     │
│                                                       │
│ TAB: Achievements                                    │
│ - All badges/achievements                           │
│ - Progress bars voor locked achievements            │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 🔄 Data Sync Strategy

**Initial Profile Load**:
1. Fetch basic rider data (cached, instant)
2. Lazy load heavy data:
   - Rating history (on chart view)
   - Full race history (on tab open)
   - Power curve (on demand)

**Background Updates**:
- **Real-time**: After new race result → update stats
- **Hourly**: Rating history snapshots
- **Daily**: Aggregate statistics recalculation
- **Weekly**: Achievements check (unlock new badges)

**Caching Strategy**:
- Profile data: Cache 5 min (Redis)
- Statistics: Cache 1 hour
- Race history: Cache 30 min
- Charts data: Cache client-side (session storage)

### 🧮 Statistics Calculation

**Automated calculations via cron job**:

```typescript
// Daily job: Calculate rider statistics
async function calculateRiderStats(riderId: number, period: string) {
  const dateFrom = getPeriodStartDate(period); // 7d, 30d, 90d, all_time
  
  const results = await db.raceResults.findMany({
    where: { 
      rider_id: riderId,
      event_date: { gte: dateFrom }
    }
  });
  
  const stats = {
    total_races: results.length,
    total_wins: results.filter(r => r.position === 1).length,
    total_podiums: results.filter(r => r.position <= 3).length,
    avg_position: average(results.map(r => r.position)),
    best_position: Math.min(...results.map(r => r.position)),
    win_rate: (wins / total_races) * 100,
    podium_rate: (podiums / total_races) * 100,
    avg_power: average(results.map(r => r.power_avg)),
    avg_wkg: average(results.map(r => r.power_avg / rider.weight)),
    // ... more calculations
  };
  
  await db.riderStatistics.upsert({
    where: { rider_id_period: { rider_id: riderId, period } },
    update: stats,
    create: { rider_id: riderId, period, ...stats }
  });
}
```

**Achievement Detection**:

```typescript
// After each race result sync
async function checkAchievements(riderId: number) {
  const rider = await db.rider.findUnique({ 
    where: { rider_id: riderId },
    include: { 
      results: true, 
      achievements: true 
    }
  });
  
  // Check: First win
  if (rider.results.filter(r => r.position === 1).length === 1) {
    await awardAchievement(riderId, 'FIRST_WIN');
  }
  
  // Check: 10 wins milestone
  if (rider.results.filter(r => r.position === 1).length === 10) {
    await awardAchievement(riderId, 'WIN_MILESTONE_10');
  }
  
  // Check: Podium streak
  const recentResults = rider.results
    .sort((a, b) => b.event_date - a.event_date)
    .slice(0, 5);
  if (recentResults.every(r => r.position <= 3)) {
    await awardAchievement(riderId, 'PODIUM_STREAK_5');
  }
  
  // Check: Category promotion
  const ratingHistory = await db.riderRatingHistory.findMany({
    where: { rider_id: riderId },
    orderBy: { recorded_at: 'desc' },
    take: 2
  });
  if (ratingHistory[0].zp_category < ratingHistory[1].zp_category) {
    await awardAchievement(riderId, 'CATEGORY_PROMOTION', {
      from: ratingHistory[1].zp_category,
      to: ratingHistory[0].zp_category
    });
  }
}
```

### 🔗 Integration met andere Features

**Cross-feature links**:
- Van **Racing Matrix** → Click rider naam → Rider Profile
- Van **Teams** → Click team member → Rider Profile
- Van **Events** → Click participant → Rider Profile
- Van **Results** → Click rider naam → Rider Profile
- Van **Clubs** → Click member → Rider Profile

**Shared components**:
- RiderCard (compact) - gebruikt door meerdere features
- RatingBadge - consistent design overal
- PowerDisplay - herbruikbaar component

### ✅ Acceptance Criteria

**Profile Page**:
- [ ] Laadt binnen 2 seconden (initial view)
- [ ] Responsive design (mobile + desktop)
- [ ] Shareable URL (bijv. /riders/150437)
- [ ] SEO friendly (meta tags, og:image)

**Statistics**:
- [ ] Real-time data (max 5 min vertraging)
- [ ] Multiple time periods selecteerbaar
- [ ] Accurate calculations (verified tegen ZwiftRacing.app)
- [ ] Export functionality (CSV/JSON)

**Charts**:
- [ ] Interactive (hover tooltips, zoom, pan)
- [ ] Smooth animations
- [ ] Color-blind friendly palette
- [ ] Dark mode support

**Performance**:
- [ ] Lazy loading voor zware data
- [ ] Infinite scroll voor race history
- [ ] Client-side caching
- [ ] Optimistic UI updates

**Privacy**:
- [ ] Public profiles (iedereen kan zien)
- [ ] Optioneel: Private modus (alleen team members)
- [ ] Bio/social links: rider kan zelf bewerken

---

## 🏗️ Implementation Roadmap (UPDATED)

### Phase 1: Database Schema (Week 1)
- [ ] Create migrations voor nieuwe tables
- [ ] **Seed competitions**: ZRL + Club Ladder
- [ ] **Seed teams**: 7 ZRL teams + 4 Ladder teams
- [ ] Add foreign keys en indexes
- [ ] **Feature 5**: rider_statistics, rider_rating_history, rider_achievements tables
- [ ] Test data integrity

### Phase 2: Backend API (Week 2-3)
- [ ] Feature 1: Events endpoints
- [ ] Feature 2: Results endpoints
- [ ] Feature 3: Clubs endpoints
- [ ] Feature 4: Teams/Roster endpoints (ZRL + Ladder)
- [ ] **Feature 5**: Rider profile endpoints (profile, stats, rating-history, achievements)
- [ ] Validation middleware (ZP category + vELO range)
- [ ] API documentation

### Phase 3: Data Sync (Week 3-4)
- [ ] ZwiftRacing.app client updates
- [ ] Cron jobs: events/results sync
- [ ] **Feature 5**: Rating history snapshots (hourly)
- [ ] **Feature 5**: Statistics calculation (daily)
- [ ] **Feature 5**: Achievement detection (after each race)
- [ ] Webhook handlers (indien beschikbaar)
- [ ] Error handling + retry logic

### Phase 4: Frontend Components (Week 4-7)
- [ ] Feature 1: Events page + components
- [ ] Feature 2: Results page + timeline
- [ ] Feature 3: Clubs overview + pages
- [ ] Feature 4: Team Builder UI (dual competition support)
- [ ] **Feature 5**: Rider Profile page (Week 6-7)
  - [ ] ProfileHeader + StatsOverview
  - [ ] RatingChart (Chart.js / Recharts)
  - [ ] PowerCurveChart
  - [ ] RaceHistoryTable
  - [ ] AchievementsBadges
  - [ ] TeamsSection
- [ ] Shared components (cards, filters, charts)

### Phase 5: Integration & Testing (Week 8)
- [ ] E2E tests per feature
- [ ] Cross-feature integration
- [ ] **Feature 5**: Profile page load performance testing
- [ ] Chart interactivity testing
- [ ] Mobile testing (all features)

### Phase 6: Deployment (Week 9)
- [ ] Staging deployment
- [ ] User acceptance testing
- [ ] Production deployment
- [ ] Monitoring + analytics
- [ ] **Feature 5**: Profile page analytics (page views, bounce rate)

---

## 🔗 External Dependencies

### ZwiftRacing.app API Endpoints (te verifiëren)
- `/public/rider/{riderId}/upcoming-events` - Feature 1
- `/public/rider/{riderId}/results` - Feature 2
- `/public/events` - Feature 1 (indien beschikbaar)
- `/public/clubs/{clubId}` - Feature 3
- `/public/clubs/{clubId}/members` - Feature 3

### Rate Limits (huidige)
- Individual riders: 5/min
- Bulk riders: 1/15min
- Results: 1/min
- **Opschalen nodig?** → Contact ZwiftRacing.app voor higher limits

---

## 📊 Success Metrics

**Feature 1 (Events)**:
- Metric: % van aankomende events correct getoond
- Target: >95% binnen 1 uur na signup

**Feature 2 (Results)**:
- Metric: Time to show result na event finish
- Target: <30 minuten

**Feature 3 (Clubs)**:
- Metric: Club page load time
- Target: <2 seconden

**Feature 4 (Team Builder)**:
- Metric: Time to create complete roster
- Target: <5 minuten
- Metric: Roster conflicts prevented
- Target: 0 conflicts in production

---

## 🚀 Next Steps

1. **Review & Refinement**:
   - [ ] Review dit document met team/stakeholders
   - [ ] Prioriteer features (volgorde OK?)
   - [ ] Identify missing requirements

2. **Technical Design**:
   - [ ] Database ERD diagram maken
   - [ ] API contract definitions (OpenAPI spec)
   - [ ] UI wireframes/mockups
   - [ ] Architecture decision records

3. **Proof of Concept**:
   - [ ] Test ZwiftRacing.app API endpoints
   - [ ] Verify data availability
   - [ ] Build simple prototype voor 1 feature

4. **Resource Planning**:
   - [ ] Time estimation per feature
   - [ ] Identify blockers/dependencies
   - [ ] Set sprint goals

---

## 📝 Notes & Questions

**Open Questions**:
1. ✅ **BEANTWOORD**: Andere competities naast ZRL? → **JA: Club Ladder toegevoegd**
2. Moeten riders zelf teams kunnen joinen (self-service) of alleen admin?
3. Willen we notifications (email/Discord) voor roster changes?
4. Export formaat voor rosters? (plain text, JSON, CSV?)
5. Historical team data: hoe lang bewaren we oude seasons?
6. **Feature 5**: Moeten riders hun eigen bio kunnen bewerken of alleen admin?
7. **Feature 5**: Privacy opties gewenst? (publieke vs private profiles)

**Filtering & Dashboard - Advies Gevraagd**:

### 🎯 Dashboard Filtering - Aanbevelingen

**1. Racing Matrix (bestaand) - Extend filters**:
- ✅ Huidige filters: Search, Category (A/B/C/D)
- ➕ **Nieuw**: Filter op Team
  - Dropdown: "Alle teams" / "Alpapen" / "Bangers" / etc
  - Multi-select: Meerdere teams tegelijk tonen
- ➕ **Nieuw**: Filter op Competition
  - Toggle: "ZRL teams" / "Ladder teams" / "Alle riders"
- ➕ **Nieuw**: Filter op vELO Range
  - Slider: vELO 1-7 range selector
- ➕ **Nieuw**: Status filter
  - Active/Inactive riders
  - Has upcoming events (Ja/Nee)
  - Recently raced (laatste 7 dagen)

**2. Global Dashboard View - Multi-feature Overview**:
```
┌─────────────────────────────────────────────────┐
│ Dashboard Home                                  │
├─────────────────────────────────────────────────┤
│ Quick Filters (persistent across all features): │
│ [🏆 Competition: All ▼] [👥 Team: All ▼]       │
│ [⭐ Category: All ▼] [📊 vELO: 1-7 ━━━━━━━ ]   │
├─────────────────────────────────────────────────┤
│                                                  │
│ ┌─────────────┬─────────────┬─────────────┐    │
│ │ Upcoming    │ Recent      │ Active      │    │
│ │ Events (48h)│ Results(48h)│ Riders      │    │
│ │ 12 events   │ 8 results   │ 74 riders   │    │
│ └─────────────┴─────────────┴─────────────┘    │
│                                                  │
│ ┌───────────────────────────────────────────┐  │
│ │ Teams Overview (per competition)          │  │
│ │                                            │  │
│ │ 🏆 Zwift Racing League:                   │  │
│ │ • Alpapen (A): 8 members, 3 upcoming      │  │
│ │ • Bangers (B): 12 members, 2 upcoming     │  │
│ │ • ... (expandable)                        │  │
│ │                                            │  │
│ │ 🏆 Club Ladder:                           │  │
│ │ • Thunder (vELO 1-3): 6 members           │  │
│ │ • ... (expandable)                        │  │
│ └───────────────────────────────────────────┘  │
│                                                  │
│ ┌───────────────────────────────────────────┐  │
│ │ Recent Activity Feed (timeline)           │  │
│ │ • John Doe won Race XYZ (Cat B) - 2h ago  │  │
│ │ • Jane Smith promoted to Cat A - 5h ago   │  │
│ │ • Thunder team roster confirmed - 1d ago  │  │
│ └───────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

**3. Saved Filters / Views**:
- Gebruikers kunnen filter combinaties opslaan
- Voorbeelden:
  - "Mijn Team" → Alleen Alpapen riders
  - "Active Racers" → Riders met event laatste 7 dagen
  - "B Category Pool" → Alle B riders voor team selection
- Quick access dropdown in navbar

**4. URL-based Filtering** (deep linking):
```
/dashboard?competition=zrl&team=alpapen&category=A
/dashboard?velo=1-3&hasEvents=true
/riders?team=thunder&sortBy=rating
```
- Shareable filtered views
- Bookmarkable
- SEO friendly

**5. Smart Filters (AI-powered suggesties)**:
- "Riders beschikbaar voor ZRL event volgende week"
  - Auto-filter: heeft geen conflict, juiste categorie
- "Top performers laatste maand"
  - Auto-sort: rating gain, podiums
- "Riders die captain kunnen zijn"
  - Auto-filter: experience, results, availability

### 💡 Advies: Welke filtering is prioriteit?

**Must-have (Week 1-2)**:
- ✅ Team filter in Racing Matrix
- ✅ Competition filter (ZRL vs Ladder)
- ✅ Category filter (extend bestaand)
- ✅ URL-based filtering (deep links)

**Should-have (Week 3-4)**:
- ✅ vELO range slider
- ✅ Status filters (active, has events, etc)
- ✅ Saved views (user preferences)
- ✅ Quick filters in dashboard home

**Nice-to-have (Week 5+)**:
- 🔮 Smart filters (AI suggesties)
- 🔮 Advanced query builder (power users)
- 🔮 Bulk actions op gefilterde resultaten
- 🔮 Export filtered data (CSV/PDF)

**Mijn aanbeveling**: Start met **Team + Competition filters** want die zijn essentieel voor Feature 4 (Team Builder). Riders moeten snel kunnen filteren op "Toon alleen Ladder teams" of "Toon alleen ZRL Cat B riders". Dit maakt team management veel efficiënter.

**Design Decisions Needed**:
- [ ] Kleurenschema per team (matchen met bestaand oranje/blauw thema?)
  - **Suggestie ZRL teams**: Gradient oranje-rood (brand colors)
  - **Suggestie Ladder teams**: Gradient blauw-paars (differentiate)
- [ ] Iconography voor categorieën (badges, medals?)
  - **Suggestie**: Font Awesome icons + custom SVG badges
- [ ] Navigation: Nieuwe top-level items of submenu onder "Team"?
  - **Suggestie**: Top-level items:
    - 🏠 Home (dashboard overview)
    - 🏁 Events (Feature 1)
    - 📊 Results (Feature 2)
    - 🏆 Teams (Feature 4)
    - 👥 Riders (extend bestaand met Feature 5)
    - 🏛️ Clubs (Feature 3)
- [ ] **Feature 5**: Chart library keuze?
  - **Opties**: Chart.js, Recharts, Victory, D3.js
  - **Aanbeveling**: **Recharts** (React-native, responsive, customizable)
- [ ] **Teams**: Roster export formaat?
  - **Aanbeveling**: Discord-friendly format:
    ```
    📋 TeamNL // Cloud9 Alpapen - Roster voor [Event Name]
    
    Starting Lineup:
    1. 🚴 John Doe (Cat A, 4.2 w/kg)
    2. 🚴 Jane Smith (Cat A, 4.5 w/kg)
    ...
    
    Substitutes:
    • Mike Johnson (Cat A, 4.0 w/kg)
    ```

**Technical Concerns**:
- Rate limiting bij bulk event sync (veel riders × upcoming events)
- Real-time updates tijdens live events (websockets?)
- Caching strategy voor frequently accessed data

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-12  
**Next Review**: Na technical design fase
