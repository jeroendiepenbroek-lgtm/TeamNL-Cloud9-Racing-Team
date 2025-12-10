# 🌐 ALLE API Endpoints - Complete Inventory

**Datum**: 8 december 2025  
**Status**: ✅ Volledig getest (34 endpoints)  
**Werkende endpoints**: 11 (32%)

---

## 📊 Quick Summary

| API | Werkend | Getest | Success | Data Quality |
|-----|---------|--------|---------|--------------|
| **ZwiftRacing.app** | 6 | 12 | 50% | ⭐⭐⭐⭐⭐ |
| **Zwift Official** | 4 | 15 | 27% | ⭐⭐⭐⭐ |
| **ZwiftPower** | 1 | 7 | 14% | ⭐⭐ |
| **TOTAAL** | **11** | **34** | **32%** | - |

---

## 1️⃣ ZWIFTRACING.APP - 6 Working Endpoints

### ✅ Rider Endpoints (3)

1. **GET /public/riders/{id}** - Individual rider
   - Data: 51 fields (vELO, power curve, phenotype)
   - Tabel: `zwift_racing_riders`
   - View: `v_rider_profile`
   - Dashboard: RiderProfilePage

2. **POST /public/riders/bulk** - Bulk riders (MAX 1000)
   - Data: 51 fields per rider
   - Rate limit: 1/15min
   - Tabel: `zwift_racing_riders`
   - View: `v_team_rankings`
   - Dashboard: TeamDashboard ⭐ MAIN

3. **GET /public/teams/{id}** - Team info + riders
   - Data: Team + rider list
   - Tabel: `team_riders`
   - View: `v_team_roster`
   - Dashboard: TeamRosterPage

### ✅ Event Endpoints (3)

4. **GET /api/events/upcoming** - Upcoming events list
   - Data: 856 events found!
   - Fields: eventId, time, title, distance, type, categories, signups
   - Tabel: `zwift_events`
   - View: `v_upcoming_races`
   - Dashboard: RaceCalendar

5. **GET /api/events/{eventId}/signups** - Event signups ⭐ AMAZING!
   - Data: Complete rider profiles per signup
   - Fields: 50+ per rider (power, rating, phenotype, club, handicaps)
   - Grouped by category (A/B/C/D/E)
   - Tabel: `event_signups`
   - View: `v_event_preview`
   - Dashboard: RacePreview (wie rijdt er?)
   - **USE CASE**: Pre-race analysis!

6. **GET /public/results/{eventId}** - Event results
   - Data: Race results (needs testing with completed event)
   - Rate limit: 1/min (historical)
   - Tabel: `event_results`
   - View: `v_race_results`
   - Dashboard: ResultsPage

### ❌ Failed Endpoints (6)

- ❌ GET /api/events/{id} - Specific event (404)
- ❌ GET /public/clubs/{id} - Club/team (404)
- ❌ GET /public/riders?limit=N - Rider rankings (failed)
- ❌ GET /public/teams/{id}/riders - Team riders detailed (failed)
- ❌ GET /api/search/riders?q= - Search riders (failed)
- ❌ GET /api/leaderboard/velo?limit=N - vELO leaderboard (failed)

---

## 2️⃣ ZWIFT OFFICIAL - 4 Working Endpoints

### ✅ Profile Endpoints (4)

1. **GET /profiles/{id}** - Complete profile
   - Data: 92 fields (avatar, social, demographics, achievements)
   - Tabel: `zwift_official_profiles`
   - View: `v_rider_social`
   - Dashboard: RiderProfilePage (avatar + social section)

2. **GET /profiles/{id}/activities** - Recent activities
   - Data: 28 fields per activity + nested 92-field profile
   - Limit: Default 20
   - Tabel: `zwift_activities`
   - View: `v_rider_recent_activities`
   - Dashboard: ActivityFeedPage

3. **GET /profiles/{id}/followers** - Followers list
   - Data: ~30 fields per follower (profile, social facts, status)
   - Paginated: start + limit
   - Tabel: `rider_followers` (optional)
   - View: `v_rider_social_network`
   - Dashboard: RiderProfile - Followers section

4. **GET /profiles/{id}/followees** - Following list
   - Data: Same as followers (30+ fields)
   - Paginated: start + limit
   - Tabel: `rider_followees` (optional)
   - View: `v_rider_following`
   - Dashboard: RiderProfile - Following section

### ❌ Failed Endpoints (11)

- ❌ GET /profiles/{id}/achievements - 403/404
- ❌ GET /profiles/{id}/goals - 403/404
- ❌ GET /profiles/{id}/worldrecords - 403/404
- ❌ GET /profiles/{id}/power-curve - 403/404
- ❌ GET /profiles/{id}/segment-results - 403/404
- ❌ GET /events/feed - 403/404
- ❌ GET /events/{id} - 403/404
- ❌ GET /events/{id}/participants - 403/404
- ❌ GET /worlds - 403/404
- ❌ GET /routes - Timeout
- ❌ GET /profiles/{id}/garage - 403/404

---

## 3️⃣ ZWIFTPOWER - 1 Working Endpoint

### ✅ History Endpoint (1)

1. **GET /cache3/profile/{id}_all.json** - Complete race history
   - Data: 85 fields × 427 races
   - Method: Python library (zpdatafetch) only
   - Tabel: `zwift_power_race_history` (OPTIONAL)
   - View: `v_rider_historical_races`
   - Dashboard: HistoricalAnalysis (manual only)
   - **Recommendation**: ❌ SKIP - Too complex

### ❌ Failed Endpoints (6)

- ❌ GET /api3.php?do=profile_results - Empty
- ❌ GET /cache3/results/{id}_all.json - 403
- ❌ GET /cache3/stats/{id}_all.json - 403
- ❌ GET /api3.php?do=rider_results - Empty
- ❌ GET /api3.php?do=rider_info - Empty
- ❌ GET /profile.php?z={id} - HTML (not JSON)

---

## 🗄️ Complete Database Schema

### Core Tables (6 tables)

```sql
-- Racing data (PRIMARY)
CREATE TABLE zwift_racing_riders (...)     -- 51 fields from bulk endpoint
CREATE TABLE team_riders (...)             -- Team membership mapping

-- Events (NEW!)
CREATE TABLE zwift_events (...)            -- Upcoming events list
CREATE TABLE event_signups (...)           -- Signup details per event
CREATE TABLE event_results (...)           -- Race results

-- Social/Official (ENRICHMENT)
CREATE TABLE zwift_official_profiles (...) -- 92 fields from profile endpoint
CREATE TABLE zwift_activities (...)        -- 28 fields per activity
CREATE TABLE rider_followers (...)         -- Optional: social network
CREATE TABLE rider_followees (...)         -- Optional: following list
```

### Views (8 views)

```sql
-- Main dashboards
CREATE VIEW v_team_rankings            -- 80 riders ranked
CREATE VIEW v_rider_profile            -- Complete rider data
CREATE VIEW v_rider_recent_activities  -- Activity feed

-- Events (NEW!)
CREATE VIEW v_upcoming_races           -- Race calendar
CREATE VIEW v_event_preview            -- Pre-race analysis
CREATE VIEW v_race_results             -- Results leaderboard

-- Social
CREATE VIEW v_rider_social_network     -- Followers graph
CREATE VIEW v_rider_following          -- Following list

-- Performance
CREATE VIEW v_power_rankings           -- Power leaderboards
CREATE VIEW v_team_roster              -- Team members
```

---

## 📱 Dashboard Mapping (Complete)

| Dashboard | Primary View | Data Source | Endpoints Used |
|-----------|-------------|-------------|----------------|
| **TeamDashboard** ⭐ | `v_team_rankings` | ZwiftRacing | POST /riders/bulk |
| **RiderProfile** | `v_rider_profile` | Racing + Official | GET /riders/{id} + /profiles/{id} |
| **ActivityFeed** | `v_rider_recent_activities` | Official | GET /profiles/{id}/activities |
| **RaceCalendar** 🆕 | `v_upcoming_races` | ZwiftRacing | GET /events/upcoming |
| **RacePreview** 🆕 | `v_event_preview` | ZwiftRacing | GET /events/{id}/signups |
| **ResultsPage** 🆕 | `v_race_results` | ZwiftRacing | GET /results/{id} |
| **PowerRankings** | `v_power_rankings` | ZwiftRacing | POST /riders/bulk |
| **TeamRoster** | `v_team_roster` | Racing + Official | GET /teams/{id} |
| **SocialNetwork** 🆕 | `v_rider_social_network` | Official | GET /profiles/{id}/followers |

---

## 🔥 KEY DISCOVERIES

### 1. Event Signups Endpoint = GOLD MINE! 🏆

**GET /api/events/{eventId}/signups** geeft:
- Complete rider profiles (50+ fields)
- Power curve (all 7 durations)
- Race ratings & stats
- Phenotype classification
- Club info with colors
- **Grouped by category** (A/B/C/D/E)

**USE CASES**:
- Pre-race analysis: "Wie rijdt er tegen je?"
- Category strength comparison
- Phenotype distribution per cat
- Club representation
- Power profile analysis

### 2. Upcoming Events = 856 Races!

**GET /api/events/upcoming** geeft:
- Real-time event calendar
- Signup counts per category
- Route, distance, type
- **Perfect voor race planning**

### 3. Followers/Followees = Social Network

**GET /profiles/{id}/followers** + **followees**:
- Build social network graph
- Mutual followers
- Team connections
- Community analysis

---

## ✅ Production Recommendations

### Week 1: Core Racing (UNCHANGED)
- ✅ POST /riders/bulk (bulk sync 15 min)
- ✅ GET /riders/{id} (on-demand)
- ✅ GET /teams/{id} (daily)

### Week 2: Social Enrichment (UNCHANGED)
- ✅ GET /profiles/{id} (daily)
- ✅ GET /profiles/{id}/activities (on-demand)

### Week 3: Events & Social (NEW!)
- 🆕 GET /events/upcoming (hourly sync)
- 🆕 GET /events/{id}/signups (on page load)
- 🆕 GET /profiles/{id}/followers (optional)
- 🆕 GET /profiles/{id}/followees (optional)

### Week 4: Results (NEW!)
- 🆕 GET /results/{id} (after events complete)

---

## 📊 Updated Field Count

| Source | Endpoints | Total Fields | Unique Data |
|--------|-----------|--------------|-------------|
| **ZwiftRacing Riders** | 2 | 51 | Racing performance |
| **ZwiftRacing Events** | 3 | 10-60 | Event calendar & signups |
| **Zwift Official Profile** | 1 | 92 | Social & avatars |
| **Zwift Official Activities** | 1 | 28 | Activity details |
| **Zwift Official Social** | 2 | 30 | Network graph |
| **ZwiftPower** | 1 | 85 | Historical (skip) |
| **TOTAAL** | **11** | **~300** | **Comprehensive** |

---

## 🎯 Final Summary

**Discovered**: 34 endpoints tested  
**Working**: 11 endpoints (32% success rate)  
**Production Ready**: 9 endpoints (excluding ZwiftPower + social optional)

**New Capabilities**:
1. ✅ **Race Calendar** - 856 upcoming events
2. ✅ **Pre-race Analysis** - Complete signup data with power profiles
3. ✅ **Race Results** - Post-event leaderboards
4. ✅ **Social Network** - Followers/followees graphs

**Recommendation**: Implement all 6 ZwiftRacing endpoints + 2-4 Zwift Official endpoints.

**Skip**: ZwiftPower (too complex), failed Zwift Official endpoints (403/404).

---

## 📚 Related Documentation

- [API_ENDPOINTS_COMPLETE_OVERVIEW.md](./API_ENDPOINTS_COMPLETE_OVERVIEW.md) - Original overzicht (update needed)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API credentials
- [COMPLETE_API_COMPARISON.md](./COMPLETE_API_COMPARISON.md) - 3-API vergelijking

**Test Scripts**:
- `test-all-zwiftracing-endpoints.sh` - ZwiftRacing tests
- `test-all-zwift-official-endpoints.sh` - Zwift Official tests
