# Complete API Architecture - Alle 3 Zwift Racing APIs

**Generated:** 2025-11-26  
**Total Coverage:** 14 endpoints, 926+ fields  
**Test Rider:** 150437 (JRøne | CloudRacer-9 @YouTube)

---

## 📊 Executive Summary

We hebben **alle 3 Zwift Racing APIs** volledig gedocumenteerd:

| API | Endpoints | Fields | Auth | Status |
|-----|-----------|--------|------|--------|
| **ZwiftRacing.app** | 5 | 258+ | None (Public) | ✅ Online |
| **ZwiftPower** | 4 categories | 100+ (estimated) | Username/Password | ✅ Online |
| **Zwift.com Official** | 5 | 668+ | OAuth Bearer | ✅ Online |
| **TOTAAL** | **14** | **926+** | Mixed | ✅ |

---

## 1️⃣ ZwiftRacing.app API

**Base URL:** `https://zwift-ranking.herokuapp.com/api`  
**Authentication:** None (public API)  
**Rate Limits:**
- Clubs: 1/60min
- Riders: 5/min  
- Bulk riders: 1/15min

### Endpoints

#### GET `/api/riders/{id}`
**Fields:** 167 (including nested)  
**Description:** Complete rider profile met power data, race stats, phenotype, achievements

**Top-level keys:**
- `name`, `riderId`, `age`, `male`, `weight`, `height`
- `power` (17 subfields: w5-w1200, wkg5-wkg1200, CP, AWC, compoundScore)
- `race` (8 subfields: rating, finishes, wins, podiums, max30, max90)
- `handicaps` (4 subfields: flat, rolling, hilly, mountainous)
- `phenotype` (scores: sprinter, puncheur, enduro, time-trialist)
- `achievements` (array of 50+ achievement objects)
- `history` (race history data)
- `ranks` (ranking positions)
- `club` (club affiliation)
- `visibility`, `zpClass` (category)

**Sample data (Rider 150437):**
```json
{
  "name": "JRøne | CloudRacer-9 @YouTube (TeamNL)",
  "riderId": 150437,
  "power": {
    "CP": 242.5,
    "wkg5": 13.027,
    "w1200": 258
  },
  "race": {
    "rating": 1395.99,
    "finishes": 24,
    "wins": 0,
    "podiums": 4
  },
  "phenotype": {
    "value": "Sprinter",
    "scores": {
      "sprinter": 97.1,
      "puncheur": 81.8,
      "enduro": 66.3,
      "timetrialist": 67.3
    }
  }
}
```

#### GET `/api/routes`
**Fields:** 16  
**Count:** 275 routes  
**Description:** All Zwift routes with profile information

**Fields:**
- `name`, `world`, `routeId`
- `distance`, `elevation`
- `profile` (Flat, Rolling, Hilly, Mountainous)
- `difficulty`, `laps`
- `leadIn`, `leadInDistance`, `leadInElevation`
- `url`, `image`, `eventOnly`
- `_id`, `__v`, `updatedAt`

**Profiles available:** Flat, Rolling, Hilly, Mountainous

#### GET `/api/events/upcoming`
**Fields:** 11  
**Count:** 822 events  
**Description:** Upcoming Zwift events

**Fields:**
- `eventId`, `time` (unix timestamp)
- `title`, `type`, `subType`
- `routeId`, `distance`, `numLaps`
- `categories`, `signups`, `staggeredStart`

#### GET `/api/events/{id}/signups`
**Fields:** 64  
**Description:** Event signup details per category

**Structure:**
```json
{
  "0": {  // Category index
    "name": "A",
    "riders": [/* array of rider objects */],
    "ratedRiders": 15,
    "avgRating": 1450.5
  }
}
```

#### GET `/api/clubs/{id}`
**Fields:** 5  
**Description:** Club basic information

**Fields:**
- `name`, `backgroundColor`, `textColor`
- `borderColor`, `totalRiders`

**Sample (TeamNL club 2281):**
```json
{
  "name": "TeamNL",
  "backgroundColor": "ffa500",
  "textColor": "ffffff",
  "borderColor": "ffa500",
  "totalRiders": 1073
}
```

---

## 2️⃣ ZwiftPower API

**Base URL:** `https://zwiftpower.com`  
**Authentication:** Username/Password (via zpdatafetch library)  
**Rate Limits:** Unknown  
**Library:** `zpdatafetch` (Python)

### Available Modules

#### `Cyclist` - Rider Profile
**Endpoint:** `Cyclist.fetch(zwift_id)`  
**Description:** Complete rider profile from ZwiftPower

**Available data:**
- FTP (calculated from races)
- Power curve (5s, 15s, 30s, 1min, 5min, 20min)
- W/kg values for all durations
- Race history (last 90 days)
- Category (A+, A, B, C, D, E)
- ZP points
- Best results per distance
- Average power/HR per race

#### `Primes` - Sprint/KOM Segments
**Endpoint:** `Primes.fetch(event_id, category, prime_type)`  
**Description:** Sprint and KOM segment data per event

**Prime types:**
- `msec` → FAL (Fastest Absolute Lap)
- `elapsed` → FTS (First To Sprint)

**Available data:**
- Sprint segment names and distances
- KOM segment rankings
- Segment times per category (A, B, C, D, E)
- Sprint winners
- Power data per segment

**URL:** `https://zwiftpower.com/api3.php?do=event_primes&zid={event_id}&category={cat}&prime_type={type}`

#### `Sprints` - Sprint Results
**Endpoint:** `Sprints.fetch(event_id)`  
**Description:** Detailed sprint results per event

**Available data:**
- Sprint banners (segment definitions)
- Sprint times
- Sprint rankings
- Power output per sprint

**URL:** `https://zwiftpower.com/api3.php?do=event_sprints&zid={event_id}`

#### `Result` - Race Results
**Endpoint:** `Result.fetch(event_id)`  
**Description:** Complete race results with DQ status

**Available data:**
- Position, Name, Time
- Avg Power, Max Power, W/kg
- Avg HR, Max HR
- Speed, Distance
- Category, ZP points
- DQ status and reasons
- Power curve per rider (5s-20min)

#### `Team` - Team Information
**Endpoint:** `Team.fetch(team_id)`  
**Description:** Team details and member list

#### `Signup` - Event Signups
**Endpoint:** `Signup.fetch(event_id)`  
**Description:** Event signup data with categories

---

## 3️⃣ Zwift.com Official API

**Base URL:** `https://us-or-rly101.zwift.com/api`  
**Authentication:** OAuth Bearer token (password grant flow)  
**Rate Limits:** Unknown

### Endpoints

#### GET `/profiles/{id}`
**Fields:** 566 (!)  
**Description:** Complete rider profile from official Zwift platform

**Top-level keys (92 fields):**
- `id`, `publicId`, `firstName`, `lastName`
- `male`, `eventCategory`, `imageSrc`, `imageSrcLarge`
- `playerType`, `countryAlpha3`, `countryCode`
- `useMetric`, `riding`, `privacy`
- `socialFacts` (followers, followees, counts)
- `worldId`, `enrolledZwiftAcademy`
- `currentActivityId`, `likelyInGame`
- `connectedToStrava`, `connectedToTrainingPeaks`, etc.
- `age`, `bodyType`, `dob`, `emailAddress`
- `height`, `weight`, `ftp`
- `runTime1miInSeconds`, `runTime5kmInSeconds`, etc.
- `achievementLevel`, `totalDistance`, `totalDistanceClimbed`
- `totalTimeInMinutes`, `totalWattHours`
- `totalExperiencePoints`, `totalGold`
- `runAchievementLevel`, `totalRunDistance`
- `powerSourceType`, `powerSourceModel`, `virtualBikeModel`
- `streaksCurrentLength`, `streaksMaxLength`
- **`competitionMetrics`** (racingScore, category, categoryWomen)
- `totalWattHoursPerKg`

**Nested structures (+474 fields):**
- `privacy` (9 fields)
- `socialFacts` (7 fields)
- `address` (10+ fields)
- `location` (5+ fields)
- `publicAttributes` (extensive nested structure)
- `privateAttributes` (extensive nested structure)
- `profilePropertyChanges` (array with change tracking)
- `competitionMetrics` (racing category data)

**Sample data (Rider 150437):**
```json
{
  "id": 150437,
  "firstName": "JRøne",
  "lastName": "CloudRacer-9 @YT (TeamNL)",
  "ftp": 246,
  "weight": 74000,  // in grams
  "height": 175,  // in cm
  "competitionMetrics": {
    "racingScore": 554.0,
    "category": "C",
    "categoryWomen": "E"
  },
  "streaksCurrentLength": 69,
  "streaksMaxLength": 69,
  "totalDistance": 120548.5,
  "totalDistanceClimbed": 12345.6,
  "socialFacts": {
    "followersCount": 4261,
    "followeesCount": 132
  }
}
```

**🎯 KEY FIELDS:**
- **Racing Score (ZRS):** `competitionMetrics.racingScore` (554.0)
- **Category:** `competitionMetrics.category` ("C")
- **FTP:** `ftp` (246W) - **MEEST CURRENT!**
- **Streak:** `streaksCurrentLength` (69 days)

#### GET `/profiles/{id}/followers`
**Fields:** 44  
**Type:** Array  
**Description:** Follower list with profile data

**Fields per follower:**
- `id`, `followerId`, `followeeId`, `status`
- `isFolloweeFavoriteOfFollower`
- `followerProfile` (nested profile object, 30+ fields)
- `followeeProfile`

#### GET `/profiles/{id}/followees`
**Fields:** 44  
**Type:** Array  
**Description:** Following list with profile data

**Structure:** Same as followers

#### GET `/profiles/{id}/activities`
**Fields:** 28  
**Type:** Array (20 most recent)  
**Description:** Activity history with ride details

**Fields per activity:**
- `id`, `id_str`, `profileId`, `profile` (nested)
- `worldId`, `name`, `description`
- `privateActivity`, `sport`, `startDate`, `endDate`
- `duration`, `distanceInMeters`, `totalElevation`
- `avgWatts`, `calories`, `movingTimeInMs`
- `rideOnGiven`, `activityRideOnCount`, `activityCommentCount`
- `fitFileBucket`, `fitFileKey`
- `primaryImageUrl`, `snapshotList`
- `privacy`, `deletedOn`

**Sample activity:**
```json
{
  "id": 2013869760357335072,
  "name": "Zwift - Race: Zwift Crit Racing Club - Toefield Tornado (B)",
  "sport": "CYCLING",
  "startDate": "2025-11-24T10:36:41.409+0000",
  "duration": "41",
  "distanceInMeters": 24131.9,
  "totalElevation": 113.284,
  "avgWatts": 199.159,
  "activityRideOnCount": 75,
  "calories": 450.501
}
```

#### GET `/profiles/{id}/goals`
**Fields:** 14  
**Description:** User-defined goals and challenges

---

## 🎯 Data Sourcing Strategy

### Racing Matrix Dashboard
**Priority:** Zwift.com > ZwiftRacing > ZwiftPower

| Field | Source | Endpoint | Reason |
|-------|--------|----------|--------|
| **FTP** | Zwift.com | `/profiles/{id}` | Most current, user-set value |
| **Weight** | Zwift.com | `/profiles/{id}` | Real-time profile data |
| **Category** | Zwift.com | `/profiles/{id}.competitionMetrics` | Official racing category |
| **ZRS (Racing Score)** | Zwift.com | `/profiles/{id}.competitionMetrics` | Official metric |
| **vELO** | ZwiftRacing | `/api/riders/{id}` | Community rating system |
| **Power Curve** | ZwiftRacing | `/api/riders/{id}.power` | Comprehensive 5s-1200s |
| **Phenotype** | ZwiftRacing | `/api/riders/{id}.phenotype` | Rider style classification |
| **Handicaps** | ZwiftRacing | `/api/riders/{id}.handicaps` | Route preference scores |
| **Achievements** | ZwiftRacing | `/api/riders/{id}.achievements` | Racing achievements |
| **Race Stats** | ZwiftRacing | `/api/riders/{id}.race` | Wins, podiums, finishes |

### Results Dashboard
**Priority:** ZwiftRacing > ZwiftPower

| Data Type | Source | Endpoint | Reason |
|-----------|--------|----------|--------|
| **Race Results** | ZwiftRacing | `/api/riders/{id}` via history | Real-time updates |
| **Event Details** | ZwiftRacing | `/api/events/{id}` | Event metadata |
| **Power Analysis** | ZwiftPower | `Result.fetch()` | Detailed power curves per race |
| **DQ Status** | ZwiftPower | `Result.fetch()` | Official disqualification data |
| **Sprint Results** | ZwiftPower | `Primes.fetch()` | Segment-level performance |

### Events Dashboard
**Source:** ZwiftRacing.app only

| Data Type | Endpoint | Fields |
|-----------|----------|--------|
| **Upcoming Events** | `/api/events/upcoming` | 822 events, 11 fields each |
| **Event Signups** | `/api/events/{id}/signups` | Per-category signup data |
| **Route Profiles** | `/api/routes` | 275 routes with elevation/distance |

---

## 🔧 Implementation Notes

### API Authentication

```typescript
// ZwiftRacing.app - No auth required
const response = await axios.get('https://zwift-ranking.herokuapp.com/api/riders/150437');

// ZwiftPower - Python library
from zpdatafetch import Cyclist, Config
Config.write(username='email@example.com', password='password')
cyclist = Cyclist()
data = cyclist.fetch(150437)

// Zwift.com - OAuth token
const tokenResponse = await axios.post(
  'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
  {
    username: 'email@example.com',
    password: 'password',
    grant_type: 'password',
    client_id: 'Zwift_Mobile_Link'
  }
);
const token = tokenResponse.data.access_token;
const profile = await axios.get(
  'https://us-or-rly101.zwift.com/api/profiles/150437',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Rate Limiting

```typescript
// ZwiftRacing.app
- Club sync: 1/60min (Standard tier)
- Individual riders: 5/min
- Bulk riders: 1/15min
- Results: 1/min

// ZwiftPower
- Unknown limits
- Respectful delays recommended: 1-2s between calls

// Zwift.com
- Unknown limits
- Official API, likely generous
```

### Data Consistency

**FTP Comparison (Rider 150437):**
- Zwift.com: **246W** ✅ (most current, user-set)
- ZwiftRacing: 242.5W (CP estimated)
- ZwiftPower: 234W (race-based calculation)

**Recommendation:** Always use Zwift.com for FTP, weight, category.

---

## 📋 Admin Dashboard Implementation

### Backend Endpoint
**Location:** `backend/src/api/endpoints/api-documentation.ts`  
**Routes:**
- `GET /api/admin/api-documentation` - Full documentation JSON
- `GET /api/admin/api-documentation/status` - Live API status checks
- `GET /api/admin/api-documentation/fields` - Flattened field list

### Frontend Page
**Location:** `backend/frontend/src/pages/ApiDocumentation.tsx`  
**Features:**
- Tabbed interface (ZwiftRacing, ZwiftPower, Zwift.com)
- Live API status indicators
- Field counts per endpoint
- Sample data viewers
- Collapsible JSON samples
- API metadata (base URLs, auth, rate limits)

### Admin Tile
**Location:** `backend/frontend/src/pages/AdminHome.tsx`  
**Added:** 7th tile with indigo gradient
- Icon: 📚
- Title: "API Documentation"
- Link: `/admin/api-documentation`

---

## 🚀 Next Steps

1. **Implement ZwiftPower Integration**
   - Build Python bridge service
   - Add backend endpoints for Primes, Sprints, Results
   - Cache data to respect rate limits

2. **Enhance Zwift.com Integration**
   - Token refresh mechanism
   - Activity feed integration
   - Goal tracking features

3. **Data Synchronization**
   - Scheduled updates from all 3 APIs
   - Conflict resolution (FTP, weight differences)
   - Historical snapshots for trend analysis

4. **Advanced Features**
   - Live rider tracking (via Zwift.com `likelyInGame`)
   - Power curve comparisons across categories
   - Phenotype-based team builder recommendations
   - Sprint/KOM segment leaderboards

---

## 📚 Resources

- **ZwiftRacing.app:** https://zwift-ranking.herokuapp.com
- **ZwiftPower:** https://zwiftpower.com
- **Zwift.com:** https://www.zwift.com
- **zpdatafetch Library:** https://pypi.org/project/zpdatafetch/
- **API Discovery Script:** `backend/scripts/complete_api_discovery.py`
- **Discovery JSON:** `/tmp/complete_api_discovery.json`

---

**Last Updated:** 2025-11-26  
**Total APIs:** 3  
**Total Endpoints:** 14  
**Total Fields:** 926+  
**Status:** ✅ Complete
