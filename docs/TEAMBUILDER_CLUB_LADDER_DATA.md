# Club Ladder - Live Data & Research Notes

## 📊 Dashboard Access
**URL**: https://ladder.cycleracing.club/dashboard  
**Login**: jeroen.diepenbroek@gmail.com  
**Password**: CloudRacer-9  
**Status**: ✅ Toegang verified (14 nov 2025)

## 📚 Official Documentation
**Race Book**: https://clubladder.notion.site/Club-Ladder-Race-Book-b2dca4b01d9047bd85d5ecbe8f578570

---

## 🎯 Action Items voor Feature Implementatie

### Data Gathering Checklist
Wanneer je gaat werken aan TeamBuilder feature, haal de volgende info op:

#### Van Dashboard (ladder.cycleracing.club/dashboard)
- [ ] **Jouw vELO rating** - Huidige rating en positie in ladder
- [ ] **TeamNL Cloud9 teams lijst**:
  - [ ] Thunder - vELO range, member count
  - [ ] Lightning - vELO range, member count  
  - [ ] Spark - vELO range, member count
  - [ ] Woeste Storm - vELO range, member count
- [ ] **Team rosters** - Welke riders in welk team
- [ ] **Upcoming races** - Geplande events (datum, tijd, route)
- [ ] **Recent results** - Laatste race uitslagen
- [ ] **Club ranking** - TeamNL Cloud9 positie in ladder

#### Van Notion Race Book
- [ ] **vELO systeem details**:
  - [ ] Hoe wordt vELO berekend?
  - [ ] Range 1-7: wat betekent elke level?
  - [ ] Update frequency (na elke race?)
- [ ] **Race format**:
  - [ ] Race types (TTT, Points, Scratch, andere?)
  - [ ] Race length (km/minutes)
  - [ ] Powerup rules
  - [ ] TT bikes allowed?
- [ ] **Team structure**:
  - [ ] Min/max riders per team
  - [ ] Roster size voor races (max 6 zoals ZRL?)
  - [ ] Substitute rules
  - [ ] Team registration process
- [ ] **Scoring systeem**:
  - [ ] Hoe worden punten toegekend?
  - [ ] Individual vs team scoring
  - [ ] Ladder ranking calculation
- [ ] **Seizoen structuur**:
  - [ ] Aantal races per seizoen
  - [ ] Race frequency (weekly, bi-weekly?)
  - [ ] Start/end dates
  - [ ] Playoffs/finals?

#### API Research
- [ ] **Check of Club Ladder API bestaat**:
  - [ ] Inspect network calls in browser DevTools
  - [ ] Look for `/api/` endpoints
  - [ ] Check for authentication headers
- [ ] **Data structuur**:
  - [ ] Team data format (JSON)
  - [ ] Rider data format
  - [ ] vELO rating data
  - [ ] Race results data
- [ ] **Rate limits** - Als API bestaat, check limits

---

## 🔍 Research Questions

### Technical
1. **vELO Sync**: Kunnen we vELO ratings automatisch syncen via API?
   - Alternative: Manual CSV import
   - Alternative: Riders vullen zelf in

2. **Team Registration**: Waar registreren teams officieel?
   - Dashboard only?
   - External registration vereist?

3. **Roster Management**: Hoe werkt lineup selection?
   - Via dashboard?
   - Via separate tool?
   - Email to organizers?

### Business Logic
4. **Multi-team Membership**: Kan rider in meerdere Club Ladder teams?
   - Bijvoorbeeld: in Thunder (1-3) én Lightning (3-5) als vELO = 3?
   - Of: 1 team per rider per seizoen?

5. **Team Transitions**: Wat gebeurt bij vELO change?
   - Auto-move naar ander team?
   - Manual reassignment?
   - Blijft in current team tot einde seizoen?

6. **Eligibility Window**: Wanneer checken we eligibility?
   - Bij roster submission (strict)?
   - Bij race start (flexible)?
   - Daily snapshot?

---

## 🗂️ Data Export Plan

### Option 1: Screenshots
Maak screenshots van:
1. Dashboard overview
2. Each team roster page
3. Upcoming races list
4. Recent results
5. Notion Race Book key sections

### Option 2: Manual Data Entry
Copy-paste naar dit document:
- Team names + vELO ranges
- Member lists per team
- Race schedule
- Key rules

### Option 3: Browser DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh dashboard
4. Look for API calls
5. Copy response JSON

---

## 📋 Template voor Data Entry

Vul onderstaande template in wanneer je de data verzamelt:

### TeamNL Cloud9 Ladder Teams

#### Thunder
- **vELO Range**: [FILL IN]
- **Target Riders**: [FILL IN]
- **Current Members** (from dashboard):
  ```
  1. [Name] - vELO [X]
  2. [Name] - vELO [X]
  ...
  ```

#### Lightning
- **vELO Range**: [FILL IN]
- **Target Riders**: [FILL IN]
- **Current Members**:
  ```
  1. [Name] - vELO [X]
  2. [Name] - vELO [X]
  ...
  ```

#### Spark
- **vELO Range**: [FILL IN]
- **Target Riders**: [FILL IN]
- **Current Members**:
  ```
  1. [Name] - vELO [X]
  2. [Name] - vELO [X]
  ...
  ```

#### Woeste Storm
- **vELO Range**: [FILL IN]
- **Target Riders**: [FILL IN]
- **Current Members**:
  ```
  1. [Name] - vELO [X]
  2. [Name] - vELO [X]
  ...
  ```

### Race Schedule (Upcoming)
```
1. [Date] [Time] - [Route] - [Distance]
2. [Date] [Time] - [Route] - [Distance]
...
```

### Key Rules (from Notion)
```
- Race Format: [FILL IN]
- Team Size: [FILL IN]
- Roster Limit: [FILL IN]
- vELO Update Frequency: [FILL IN]
- Scoring System: [FILL IN]
```

---

## 🔗 Related Documents
- **Feature Spec**: `docs/TEAMBUILDER_CONTEXT.md`
- **Roadmap**: `docs/FEATURE_ROADMAP_V1.5.md` (lines 257-550)
- **Database Schema**: `docs/DATA_MODEL.md`

---

## 📝 Implementation Notes

### Database Changes Needed
Wanneer Club Ladder data compleet is:

1. **Update `teams` table seed data**:
   - Accurate vELO ranges voor 4 teams
   - Team colors kiezen

2. **Add `riders.velo_rating` column**:
   ```sql
   ALTER TABLE riders ADD COLUMN velo_rating INTEGER CHECK (velo_rating BETWEEN 1 AND 7);
   ```

3. **Eligibility validation**:
   - Function: `isEligibleForLadder(rider, team)`
   - Check: `rider.velo_rating >= team.velo_min AND rider.velo_rating <= team.velo_max`

### API Endpoints Priority
Alleen nodig als Club Ladder API gevonden wordt:
- `GET /api/ladder/teams` - Team info
- `GET /api/ladder/riders/:id/velo` - vELO rating
- `GET /api/ladder/races` - Race schedule

### Frontend Updates
- EligibilityFilter: Add vELO badge display
- TeamCard: Show vELO range instead of ZP category
- RosterBuilder: vELO-based eligibility validation

---

## 🚀 Next Steps

1. **Deze week**: Collect data from dashboard + Notion
2. **Update** `TEAMBUILDER_CONTEXT.md` met accurate info
3. **Plan** vELO sync strategy (API vs manual)
4. **Start** Phase 1 implementation (database tables)

---

**Document Created**: 14 november 2025  
**Last Updated**: 14 november 2025  
**Status**: 🟡 Data gathering pending  
**Owner**: jeroendiepenbroek
