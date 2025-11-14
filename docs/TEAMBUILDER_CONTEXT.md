# TeamBuilder Feature - Context & Research

## 📋 Executive Summary

TeamBuilder is een **geplande feature** (v1.5) voor het samenstellen en beheren van competitie teams binnen TeamNL Cloud9 Racing Team. De feature ondersteunt **2 competities** met **11 teams totaal**.

**Status**: 🚧 Niet geïmplementeerd - Planning fase  
**Prioriteit**: Medium (na core sync + analytics)  
**Complexiteit**: Hoog (nieuwe database schema, eligibility validatie, drag-drop UI)

---

## 🏆 Competities Overview

### 1. Zwift Racing League (ZRL)
**Organisator**: WTRL (World Tactical Racing League)  
**Website**: https://www.wtrl.racing/zwift-racing-league/  
**Huidige Seizoen**: 2025/26 Season 17

#### Format & Regels
- **Team-based racing** - Weekly events
- **Indeling**: ZwiftPower Categories (A/B/C/D)
- **Pace Group Category** vereist voor deelname
- **Roster size**: Max 6 riders per race
- **Race types**: Points, Scratch, Team Time Trials (TTT)
- **Powerups**: Custom selection tijdens races
- **TT bikes**: Toegestaan bij TTT, disabled bij Points/Scratch
- **Steering/Braking**: Disabled
- **Rider flagging**: Disabled

#### TeamNL Cloud9 ZRL Teams (7 teams)
| Team Name | Short | Category | Target Riders |
|-----------|-------|----------|---------------|
| TeamNL // Cloud9 Alpapen | Alpapen | A | ZP Category A |
| TeamNL // Cloud9 Bangers | Bangers | B | ZP Category B |
| TeamNL // Cloud9 Bonkers | Bonkers | B | ZP Category B |
| TeamNL // Cloud9 Bandits | Bandits | B | ZP Category B |
| TeamNL // Cloud9 Blizzard | Blizzard | B | ZP Category B |
| TeamNL // Cloud9 Cradle | Cradle | C | ZP Category C |
| TeamNL // Cloud9 Chaos | Chaos | C | ZP Category C |

**Key Insights**:
- **Multiple B teams**: 4 teams voor Category B (grootste groep riders)
- **No D team**: Mogelijk nog niet genoeg D riders
- **Team registration**: Via WTRL platform, requires Team Admin role
- **Weekly racing**: Consistent schedule (Round 1, Race 1, etc.)

---

### 2. Club Ladder
**Organisator**: Cycle Racing Club  
**Website**: https://ladder.cycleracing.club/dashboard  
**Auth Required**: Yes (login credentials nodig)

#### Format & Regels
- **Indeling**: vELO Rating (schaal 1-7)
  - **1**: Hoogste niveau (strongest riders)
  - **7**: Beginner niveau
- **Club-based racing**: Interne ladder binnen clubs
- **Dynamic ratings**: vELO updates na elke race

#### TeamNL Cloud9 Ladder Teams (4 teams)
| Team Name | Short | vELO Range | Target Riders |
|-----------|-------|------------|---------------|
| TeamNL Cloud9 Thunder | Thunder | 1, 2, 3 | Top performers (vELO 1-3) |
| TeamNL Cloud9 Lightning | Lightning | 3, 4, 5 | Mid-high (vELO 3-5) |
| TeamNL Cloud9 Spark | Spark | 4, 5, 6 | Mid-range (vELO 4-6) |
| TeamNL Cloud9 Woeste Storm | Woeste Storm | 5, 6, 7 | Developing riders (vELO 5-7) |

**Key Insights**:
- **Overlapping ranges**: vELO 3,4,5,6 kunnen in meerdere teams (flexibiliteit)
- **Gradual progression**: Riders kunnen "opschuiven" naar hoger team bij verbetering
- **Dutch naming**: "Woeste Storm" past bij Nederlandse club cultuur

---

## 📊 Database Design

### ERD Schema Extension
```
┌─────────────────┐
│  competitions   │
├─────────────────┤
│ competition_id  │◄─────┐
│ competition_name│       │
│ competition_url │       │
│ season          │       │
│ ranking_type    │       │  (zp_category | velo_rating)
│ start_date      │       │
│ end_date        │       │
│ status          │       │
└─────────────────┘       │
                          │
                          │ FK
┌─────────────────┐       │
│     teams       │───────┘
├─────────────────┤
│ team_id         │◄──────┬──────┬─────┐
│ competition_id  │       │      │     │
│ team_name       │       │      │     │
│ team_short_name │       │      │     │
│ target_category │  (A/B/C/D for ZRL)
│ velo_min        │  (1-7 for Ladder)
│ velo_max        │  (1-7 for Ladder)
│ team_color      │       │      │     │
│ logo_url        │       │      │     │
└─────────────────┘       │      │     │
                          │      │     │
                     FK   │      │     │ FK
┌─────────────────┐       │      │     │
│  team_members   │───────┘      │     │
├─────────────────┤              │     │
│ id              │              │     │
│ team_id         │              │     │
│ rider_id        │──────►riders │     │
│ role            │  (captain/member/substitute)
│ joined_at       │              │     │
│ active          │              │     │
└─────────────────┘              │     │
                                 │     │
                            FK   │     │ FK
┌─────────────────┐              │     │
│  team_rosters   │──────────────┴─────┘
├─────────────────┤
│ roster_id       │
│ team_id         │
│ event_id        │──────►zwift_api_events
│ rider_id        │──────►riders
│ position        │  (1-6 max for ZRL)
│ confirmed       │
└─────────────────┘
```

### Table Details

#### 1. `competitions`
```sql
CREATE TABLE competitions (
  competition_id SERIAL PRIMARY KEY,
  competition_name VARCHAR(100) NOT NULL, -- "Zwift Racing League", "Club Ladder"
  competition_url TEXT,
  season VARCHAR(50), -- "2025 Season 1", "2025/26 Season 17"
  ranking_type VARCHAR(20) NOT NULL CHECK (ranking_type IN ('zp_category', 'velo_rating')),
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Seed Data**:
```sql
INSERT INTO competitions (competition_name, competition_url, season, ranking_type, status) VALUES
('Zwift Racing League', 'https://www.wtrl.racing/zwift-racing-league/', '2025/26 Season 17', 'zp_category', 'active'),
('Club Ladder', 'https://ladder.cycleracing.club/dashboard', '2025 Season', 'velo_rating', 'active');
```

#### 2. `teams`
```sql
CREATE TABLE teams (
  team_id SERIAL PRIMARY KEY,
  competition_id INTEGER REFERENCES competitions(competition_id) ON DELETE CASCADE,
  team_name VARCHAR(100) NOT NULL,
  team_short_name VARCHAR(50) NOT NULL,
  target_category VARCHAR(1), -- A/B/C/D for ZRL (NULL for Ladder)
  velo_min INTEGER, -- 1-7 for Ladder (NULL for ZRL)
  velo_max INTEGER, -- 1-7 for Ladder (NULL for ZRL)
  team_color VARCHAR(7), -- Hex color (e.g., #FF5733)
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT chk_zrl_category CHECK (
    (target_category IS NOT NULL AND velo_min IS NULL AND velo_max IS NULL) OR
    (target_category IS NULL AND velo_min IS NOT NULL AND velo_max IS NOT NULL)
  ),
  CONSTRAINT chk_velo_range CHECK (velo_min BETWEEN 1 AND 7 AND velo_max BETWEEN 1 AND 7 AND velo_min <= velo_max)
);
```

**Seed Data (7 ZRL + 4 Ladder teams)**:
```sql
-- ZRL Teams (competition_id = 1)
INSERT INTO teams (competition_id, team_name, team_short_name, target_category, team_color) VALUES
(1, 'TeamNL // Cloud9 Alpapen', 'Alpapen', 'A', '#FF0000'),
(1, 'TeamNL // Cloud9 Bangers', 'Bangers', 'B', '#FF8C00'),
(1, 'TeamNL // Cloud9 Bonkers', 'Bonkers', 'B', '#FFD700'),
(1, 'TeamNL // Cloud9 Bandits', 'Bandits', 'B', '#32CD32'),
(1, 'TeamNL // Cloud9 Blizzard', 'Blizzard', 'B', '#1E90FF'),
(1, 'TeamNL // Cloud9 Cradle', 'Cradle', 'C', '#9370DB'),
(1, 'TeamNL // Cloud9 Chaos', 'Chaos', 'C', '#FF1493');

-- Club Ladder Teams (competition_id = 2)
INSERT INTO teams (competition_id, team_name, team_short_name, velo_min, velo_max, team_color) VALUES
(2, 'TeamNL Cloud9 Thunder', 'Thunder', 1, 3, '#FFD700'),
(2, 'TeamNL Cloud9 Lightning', 'Lightning', 3, 5, '#C0C0C0'),
(2, 'TeamNL Cloud9 Spark', 'Spark', 4, 6, '#CD7F32'),
(2, 'TeamNL Cloud9 Woeste Storm', 'Woeste Storm', 5, 7, '#4169E1');
```

#### 3. `team_members`
```sql
CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(team_id) ON DELETE CASCADE,
  rider_id INTEGER REFERENCES riders(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('captain', 'member', 'substitute')),
  joined_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(team_id, rider_id) -- Rider kan maar 1x in hetzelfde team
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_rider ON team_members(rider_id);
```

#### 4. `team_rosters`
```sql
CREATE TABLE team_rosters (
  roster_id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(team_id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES zwift_api_events(event_id) ON DELETE CASCADE,
  rider_id INTEGER REFERENCES riders(id) ON DELETE CASCADE,
  position INTEGER CHECK (position BETWEEN 1 AND 6), -- ZRL max 6
  confirmed BOOLEAN DEFAULT FALSE,
  
  UNIQUE(team_id, event_id, position), -- Geen dubbele posities
  UNIQUE(team_id, event_id, rider_id)  -- Rider kan maar 1 positie hebben per event
);

CREATE INDEX idx_team_rosters_team_event ON team_rosters(team_id, event_id);
```

---

## 🔌 API Endpoints Design

### Competitions
**GET /api/competitions**
- Returns: Alle competities met status
```json
[
  {
    "competition_id": 1,
    "competition_name": "Zwift Racing League",
    "season": "2025/26 Season 17",
    "ranking_type": "zp_category",
    "status": "active",
    "teams_count": 7
  },
  {
    "competition_id": 2,
    "competition_name": "Club Ladder",
    "season": "2025 Season",
    "ranking_type": "velo_rating",
    "status": "active",
    "teams_count": 4
  }
]
```

**GET /api/competitions/:id/teams**
- Returns: Teams binnen competitie + member counts
```json
{
  "competition_id": 1,
  "competition_name": "Zwift Racing League",
  "teams": [
    {
      "team_id": 1,
      "team_name": "TeamNL // Cloud9 Alpapen",
      "target_category": "A",
      "members_count": 12,
      "active_members": 10
    }
  ]
}
```

### Teams
**GET /api/teams/:teamId**
- Returns: Team details + members + recent rosters
```json
{
  "team_id": 1,
  "team_name": "TeamNL // Cloud9 Alpapen",
  "target_category": "A",
  "members": [
    {
      "rider_id": 123,
      "name": "John Doe",
      "zp_category": "A",
      "role": "captain",
      "active": true
    }
  ],
  "recent_rosters": [...]
}
```

**POST /api/teams** (Admin only)
- Body: Team creation data
- Returns: Created team

**PUT /api/teams/:teamId** (Admin only)
- Body: Updated team data
- Returns: Updated team

### Team Members
**GET /api/teams/:teamId/members**
- Returns: All team members + eligibility status
```json
[
  {
    "rider_id": 123,
    "name": "John Doe",
    "zp_category": "A",
    "velo_rating": 2,
    "role": "captain",
    "eligible": true,
    "joined_at": "2025-01-15T10:30:00Z"
  }
]
```

**POST /api/teams/:teamId/members** (Admin only)
- Body: `{ "rider_id": 123, "role": "member" }`
- Validates: Eligibility (category/vELO match)
- Returns: Created team_member

**DELETE /api/teams/:teamId/members/:riderId** (Admin only)
- Sets: `active = false`
- Returns: Success message

**PUT /api/teams/:teamId/members/:riderId/role** (Admin only)
- Body: `{ "role": "captain" }`
- Returns: Updated team_member

### Team Rosters (Event-specific lineups)
**GET /api/teams/:teamId/rosters/:eventId**
- Returns: Roster voor specifiek event
```json
{
  "team_id": 1,
  "event_id": 5129235,
  "roster": [
    {
      "position": 1,
      "rider_id": 123,
      "name": "John Doe",
      "confirmed": true
    },
    {
      "position": 2,
      "rider_id": 456,
      "name": "Jane Smith",
      "confirmed": false
    }
  ]
}
```

**POST /api/teams/:teamId/rosters** (Admin only)
- Body: 
```json
{
  "event_id": 5129235,
  "roster": [
    { "rider_id": 123, "position": 1 },
    { "rider_id": 456, "position": 2 }
  ]
}
```
- Validates: Max 6 riders, all eligible
- Returns: Created roster

**PUT /api/teams/:teamId/rosters/:eventId/confirm** (Admin only)
- Sets all roster entries: `confirmed = true`
- Returns: Updated roster

### Eligibility Validation
**GET /api/teams/:teamId/eligible-riders**
- Returns: Riders die eligible zijn voor het team
- Voor ZRL: Match ZP category
- Voor Ladder: vELO binnen range
```json
[
  {
    "rider_id": 123,
    "name": "John Doe",
    "zp_category": "A",
    "velo_rating": 2,
    "eligible": true,
    "reason": null
  },
  {
    "rider_id": 789,
    "name": "Bob Jones",
    "zp_category": "B",
    "eligible": false,
    "reason": "Category mismatch (need A, has B)"
  }
]
```

---

## 🎨 Frontend Components

### 1. CompetitionsOverview
**Route**: `/admin/competitions`

**Features**:
- Tabs voor ZRL / Club Ladder
- Team cards met member counts
- Quick stats (total teams, active members)
- "Register New Team" button (admin only)

**Layout**:
```
┌─────────────────────────────────────────┐
│  🏆 Competitions                         │
├─────────────────────────────────────────┤
│  [ ZRL ]  [ Club Ladder ]               │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐            │
│  │ Alpapen  │  │ Bangers  │            │
│  │ Cat: A   │  │ Cat: B   │            │
│  │ 12 riders│  │ 15 riders│            │
│  └──────────┘  └──────────┘            │
│                                          │
│  [+ Register New Team]                  │
└─────────────────────────────────────────┘
```

### 2. TeamBuilder (Dashboard)
**Route**: `/admin/teams/:teamId`

**Features**:
- Team info (name, category/vELO range)
- Member list with drag-drop sorting
- Add/Remove member buttons (admin only)
- Role assignment (captain/member/substitute)
- Eligibility badges (✅ eligible, ❌ not eligible)

**Layout**:
```
┌─────────────────────────────────────────┐
│  TeamNL // Cloud9 Alpapen               │
│  Category: A  |  12 Members             │
├─────────────────────────────────────────┤
│  Search: [__________] [+ Add Member]    │
├─────────────────────────────────────────┤
│  ✅ John Doe (Captain) - ZP: A          │
│  ✅ Jane Smith (Member) - ZP: A         │
│  ❌ Bob Jones (Member) - ZP: B          │
│     └─ Not eligible: Category mismatch  │
└─────────────────────────────────────────┘
```

### 3. TeamCard (Component)
**Used in**: CompetitionsOverview

**Props**:
- `team`: Team object
- `onClick`: Navigate to TeamBuilder

**Features**:
- Team name + short name
- Category/vELO badge
- Member count
- Team color accent

### 4. RosterBuilder (Drag-Drop UI)
**Route**: `/admin/teams/:teamId/roster/:eventId`

**Features**:
- Drag-drop interface voor lineup
- Max 6 positions (ZRL rule)
- Live eligibility validation
- Confirm roster button
- Copy from previous roster

**Layout**:
```
┌─────────────────────────────────────────┐
│  Roster for Event #5129235              │
│  Date: Nov 15, 2025 | Distance: 42km   │
├─────────────────────────────────────────┤
│  Available Members          Roster      │
│  ┌──────────────────┐    ┌──────────┐  │
│  │ ☰ John Doe       │    │ 1. [Drop]│  │
│  │ ☰ Jane Smith     │    │ 2. [Drop]│  │
│  │ ☰ Bob Jones      │    │ 3. [Drop]│  │
│  └──────────────────┘    │ 4. [Drop]│  │
│                           │ 5. [Drop]│  │
│                           │ 6. [Drop]│  │
│                           └──────────┘  │
│                                          │
│  [Copy Previous] [Clear] [Confirm]      │
└─────────────────────────────────────────┘
```

### 5. EligibilityFilter (Component)
**Used in**: TeamBuilder, RosterBuilder

**Features**:
- Real-time validation
- Show/hide ineligible riders toggle
- Eligibility reason tooltips

---

## 🧠 Business Logic

### Eligibility Rules

#### ZRL Teams (ZP Category Based)
```typescript
function isEligibleForZRL(rider: Rider, team: Team): boolean {
  if (!rider.zp_category) return false;
  return rider.zp_category === team.target_category;
}
```

**Edge Cases**:
- Rider zonder ZP category → Not eligible (moet eerst races rijden)
- Category promotions/demotions → Update rider.zp_category via sync

#### Club Ladder Teams (vELO Based)
```typescript
function isEligibleForLadder(rider: Rider, team: Team): boolean {
  if (!rider.velo_rating) return false;
  return rider.velo_rating >= team.velo_min && rider.velo_rating <= team.velo_max;
}
```

**Edge Cases**:
- Rider zonder vELO → Not eligible (moet ladder account linken)
- Overlapping ranges (vELO 3-5) → Rider kan in meerdere teams
- vELO updates na race → Check eligibility bij roster confirmation

### Multi-Team Membership
**Regel**: Rider kan in meerdere teams als ze verschillende competities zijn
```typescript
async function canJoinTeam(riderId: number, teamId: number): Promise<boolean> {
  const team = await getTeam(teamId);
  const competitionId = team.competition_id;
  
  // Check of rider al in ander team van DEZE competitie zit
  const existingMembership = await db.query(
    'SELECT * FROM team_members WHERE rider_id = $1 AND team_id IN (SELECT team_id FROM teams WHERE competition_id = $2)',
    [riderId, competitionId]
  );
  
  if (existingMembership.rows.length > 0) {
    return false; // Al in ander team van deze competitie
  }
  
  return true; // Mag joinen
}
```

**Voorbeelden**:
- ✅ John in "Alpapen" (ZRL A) + "Thunder" (Ladder 1-3) → OK (verschillende competities)
- ❌ John in "Alpapen" (ZRL A) + "Bangers" (ZRL B) → NOT OK (zelfde competitie)

### Roster Validation
```typescript
async function validateRoster(teamId: number, eventId: number, roster: RosterEntry[]): Promise<ValidationResult> {
  const team = await getTeam(teamId);
  
  // Rule 1: Max 6 riders (ZRL)
  if (roster.length > 6) {
    return { valid: false, error: 'Max 6 riders per roster (ZRL rule)' };
  }
  
  // Rule 2: All riders must be team members
  const teamMemberIds = await getTeamMemberIds(teamId);
  const invalidRiders = roster.filter(r => !teamMemberIds.includes(r.rider_id));
  if (invalidRiders.length > 0) {
    return { valid: false, error: 'Some riders are not team members' };
  }
  
  // Rule 3: All riders must be eligible
  for (const entry of roster) {
    const rider = await getRider(entry.rider_id);
    const eligible = team.target_category 
      ? isEligibleForZRL(rider, team)
      : isEligibleForLadder(rider, team);
    
    if (!eligible) {
      return { valid: false, error: `${rider.name} not eligible for this team` };
    }
  }
  
  // Rule 4: No duplicate positions
  const positions = roster.map(r => r.position);
  if (new Set(positions).size !== positions.length) {
    return { valid: false, error: 'Duplicate positions detected' };
  }
  
  return { valid: true };
}
```

---

## 🗺️ Implementation Roadmap

### Phase 1: Database Setup (Week 1)
- [ ] Create migrations voor 4 nieuwe tables
- [ ] Seed 2 competitions
- [ ] Seed 11 teams (7 ZRL + 4 Ladder)
- [ ] Add indexes voor performance
- [ ] Test foreign key constraints

### Phase 2: Backend API (Week 2-3)
- [ ] Implement 11 API endpoints
- [ ] Add eligibility validation logic
- [ ] Write unit tests (coverage > 80%)
- [ ] API documentation (Swagger/OpenAPI)

### Phase 3: Frontend Components (Week 4-5)
- [ ] CompetitionsOverview page
- [ ] TeamCard component
- [ ] TeamBuilder dashboard

### Phase 4: Roster Builder (Week 6-7)
- [ ] Drag-drop interface (react-beautiful-dnd)
- [ ] Event selection dropdown
- [ ] Copy previous roster feature
- [ ] Confirmation flow

### Phase 5: Integration & Polish (Week 8)
- [ ] Connect with existing rider sync
- [ ] Add ZP category to rider data (via ZwiftPower API?)
- [ ] Add vELO rating sync (Club Ladder API?)
- [ ] Admin permissions check
- [ ] E2E testing

### Phase 6: Documentation & Training (Week 9)
- [ ] User guide (Nederlands)
- [ ] Admin training video
- [ ] Troubleshooting guide

---

## 🚨 Open Questions & Decisions Needed

### Data Sync
**Q1**: Hoe syncen we ZP categories?
- **Optie A**: Via ZwiftPower API (bestaat die?)
- **Optie B**: Manual import via CSV
- **Optie C**: Riders vullen zelf in (honor system)

**Q2**: Hoe syncen we vELO ratings?
- **Optie A**: Via Club Ladder API (auth required)
- **Optie B**: Manual import van ladder dashboard
- **Optie C**: Niet syncen, alleen manual entry

**Decision Needed**: Prioriteit + feasibility bepalen

### Team Registration
**Q3**: Waar registreren teams official?
- WTRL website vereist external registration
- Onze app = internal roster management only?
- Of willen we ook external registration automation?

**Decision Needed**: Scope bepalen (MVP = internal only?)

### Permissions
**Q4**: Wie mag rosters bevestigen?
- **Optie A**: Alleen admins
- **Optie B**: Team captains ook (role='captain')
- **Optie C**: Any team member

**Decision Needed**: Permission model definiëren

### UI/UX
**Q5**: Hoe tonen we overlapping vELO ranges?
- Visual badge zoals "Also eligible for Lightning"?
- Multi-select dropdown bij Add Member?

**Q6**: Drag-drop library?
- react-beautiful-dnd (populair, maar deprecated)
- @dnd-kit/core (modern alternatief)
- react-dnd (complex, veel features)

**Decision Needed**: Library keuze + UX flows

---

## 📚 External Resources

### ZRL
- **WTRL Main**: https://www.wtrl.racing/
- **ZRL Home**: https://www.wtrl.racing/zwift-racing-league/
- **Schedule**: https://www.wtrl.racing/zwift-racing-league/schedule/
- **Team Hunt**: https://www.wtrl.racing/zwift-racing-league/teamhunt/
- **My Teams**: https://www.wtrl.racing/zwift-racing-league/myteams/ (login required)

### Club Ladder
- **Dashboard**: https://ladder.cycleracing.club/dashboard (login required)
- **API Docs**: Unknown (research needed)

### Zwift Insider
- **Racing Tips**: https://zwiftinsider.com/category/tips/racing/
- **ZRL Articles**: Search for "ZRL" on site

### ZwiftPower
- **Categories**: https://zwiftpower.com/events.php (category system)
- **API**: Unofficial API exists (rate limits unknown)

---

## 🎯 Success Criteria

### MVP (Minimum Viable Product)
- [ ] 11 teams created en synced
- [ ] Riders kunnen toegevoegd worden aan teams
- [ ] Basic eligibility validation (ZP category + vELO)
- [ ] Team overview pagina's

### V1 (Full Feature)
- [ ] Drag-drop roster builder
- [ ] Event-specific rosters
- [ ] Roster history (past lineups)
- [ ] Eligibility badges + tooltips
- [ ] Captain role permissions

### V2 (Advanced)
- [ ] Auto-sync ZP categories
- [ ] Auto-sync vELO ratings
- [ ] Roster suggestions (AI-powered?)
- [ ] Team performance analytics
- [ ] External registration integration

---

## 💡 Technical Notes

### Performance Considerations
- **N+1 queries**: Use JOIN voor team members + riders
- **Caching**: Competition/team data wijzigt weinig → cache 1h
- **Pagination**: Team members list bij grote teams (50+ riders)

### Security
- **Admin only**: Create/Update/Delete operations
- **Read-only**: Regular users kunnen teams bekijken
- **Captain permissions**: Optioneel (Phase 2)

### Extensibility
Schema ondersteunt toekomstige competities:
- **FEARLESS** (Women's Championship)
- **WTRL TTT** (Team Time Trial)
- **ZRL Summer Showdown**
- Custom club events

---

**Document Versie**: 1.0  
**Laatste Update**: 14 november 2025  
**Auteur**: GitHub Copilot + jeroendiepenbroek  
**Status**: 🚧 Planning - Niet geïmplementeerd
