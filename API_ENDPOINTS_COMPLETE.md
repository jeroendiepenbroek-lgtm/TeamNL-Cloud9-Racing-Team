# 🌐 Complete API Endpoints - Per API Bron

**Laatste update:** 1 december 2025

---

## 🔵 API 1: ZwiftRacing.app

**Base URL:** `https://zwift-ranking.herokuapp.com`  
**Authenticatie:** API Key in `Authorization` header  
**Tier:** Standard (Premium: 10× hogere limits voor clubs/riders)

---

### 📁 CLUBS Endpoints

#### 1. Get Club Members (Active, sorted by riderId)
```
GET /public/clubs/{clubId}
```
**Rate Limit:** 1 call / 60 minuten  
**Max Results:** 1000 riders  
**Response:** Array van ZwiftRider objecten

**Example:**
```bash
GET /public/clubs/11818
```

**Response Structure:**
```json
[
  {
    "riderId": 150437,
    "name": "JRøne CloudRacer-9",
    "rating": 1395,
    "category": "B",
    "raceResults90Days": 25,
    "raceCurrentRating": 1395,
    "raceLastEventDate": "2025-11-24T10:40:00Z"
  }
]
```

**Used by:** Rider Sync Service  
**Dashboard:** Rider Performance, Team List

---

#### 2. Get Club Members Paginated (Pagination support)
```
GET /public/clubs/{clubId}/{afterRiderId}
```
**Rate Limit:** 1 call / 60 minuten  
**Max Results:** 1000 riders per page  
**Response:** Array van ZwiftRider objecten (riderId > afterRiderId)

**Example:**
```bash
GET /public/clubs/11818/150437
```

**Use Case:** Voor clubs met >1000 members  
**Currently Used:** ❌ NEE (TeamNL heeft ~75 members)

---

### 📁 RESULTS Endpoints

#### 3. Get Event Results (ZwiftRacing data)
```
GET /public/results/{eventId}
```
**Rate Limit:** 1 call / 1 minuut  
**Response:** Array van race results voor event

**Example:**
```bash
GET /public/results/5178019
```

**Response Structure:**
```json
[
  {
    "riderId": 150437,
    "position": 3,
    "rank": 3,
    "time": 1782,
    "power": {
      "avg": 245,
      "max": 890,
      "wkg": {
        "avg": 3.2,
        "p5s": 10.91,
        "p15s": 9.01,
        "p30s": 7.92,
        "p1m": 5.15,
        "p2m": 4.35,
        "p5m": 3.66,
        "p20m": 3.28
      }
    },
    "heartRate": {
      "avg": 151,
      "max": 180
    },
    "rating": 1395,
    "ratingDelta": 25,
    "category": "B",
    "dnf": false,
    "effortScore": 50,
    "racePoints": 120.94
  }
]
```

**Used by:** Results Sync Service  
**Dashboard:** Results Dashboard

---

#### 4. Get Event Results (ZwiftPower data via proxy)
```
GET /public/zp/{eventId}/results
```
**Rate Limit:** 1 call / 1 minuut  
**Response:** ZwiftPower results met CE/DQ flags

**Example:**
```bash
GET /public/zp/5178019/results
```

**Response Structure:**
```json
[
  {
    "zwid": 150437,
    "name": "JRøne CloudRacer-9",
    "position": 3,
    "category": "B",
    "category_enforcement": true,
    "flag": null,
    "flag_description": null,
    "age_group_pos": 2,
    "zp_points": 85,
    "ftp": 295,
    "weight": 76.5
  }
]
```

**Used by:** ❌ NEE (potentieel voor enrichment)  
**Dashboard:** Results Dashboard (enrichment)

---

### 📁 RIDERS Endpoints (Individual GET)

#### 5. Get Single Rider (Current data)
```
GET /public/riders/{riderId}
```
**Rate Limit:** 5 calls / 1 minuut  
**Response:** Single ZwiftRider object met history

**Example:**
```bash
GET /public/riders/150437
```

**Response Structure:**
```json
{
  "riderId": 150437,
  "name": "JRøne CloudRacer-9",
  "rating": 1395,
  "category": "B",
  "raceResults90Days": 25,
  "history": [
    {
      "time": 1701388800,
      "rating": 1370
    },
    {
      "time": 1701475200,
      "rating": 1395
    }
  ]
}
```

**Used by:** ❌ NEE  
**Potential:** Rating history graph!

---

#### 6. Get Single Rider (Historical snapshot)
```
GET /public/riders/{riderId}/{epochTime}
```
**Rate Limit:** 5 calls / 1 minuut  
**Response:** Rider data at specific timestamp

**Example:**
```bash
GET /public/riders/150437/1701388800
```

**Parameters:**
- `epochTime` - Unix timestamp in **seconds** (not milliseconds!)

**Used by:** ❌ NEE  
**Use Case:** Historical analysis, rating changes over time

---

### 📁 RIDERS Endpoints (Bulk POST)

#### 7. Get Bulk Riders (Current data for multiple riders)
```
POST /public/riders
```
**Rate Limit:** 1 call / 15 minuten  
**Max:** 1000 rider IDs per call  
**Body:** Array van rider IDs

**Example:**
```bash
POST /public/riders
Content-Type: application/json

[150437, 123456, 789012]
```

**Response:** Array van ZwiftRider objecten (zelfde structuur als #5)

**Used by:** ❌ NEE  
**Optimization Opportunity:** 75 riders in 1 call vs 75 individuele calls!

---

#### 8. Get Bulk Riders (Historical snapshot for multiple riders)
```
POST /public/riders/{epochTime}
```
**Rate Limit:** 1 call / 15 minuten  
**Max:** 1000 rider IDs per call  
**Body:** Array van rider IDs

**Example:**
```bash
POST /public/riders/1701388800
Content-Type: application/json

[150437, 123456, 789012]
```

**Used by:** ❌ NEE  
**Use Case:** Team rating comparison at specific point in time

---

### 📁 EVENTS Endpoints

#### 9. Get Upcoming Events
```
GET /api/events/upcoming
```
**Rate Limit:** Onbekend (conservatief gebruiken)  
**Response:** Array van 800+ upcoming events

**Example:**
```bash
GET /api/events/upcoming
```

**Response Structure:**
```json
[
  {
    "eventId": "5178019",
    "time": 1732446000,
    "title": "Zwift Crit Racing Club - Toefield Tornado",
    "routeId": 12345,
    "distance": 20.5,
    "type": "RACE",
    "subType": "SCRATCH",
    "categories": "A,B,C,D",
    "signups": "12,23,34,15"
  }
]
```

**Used by:** Events Sync Service (Near + Far)  
**Dashboard:** Events Dashboard

---

#### 10. Get Event Details (with participants/pens)
```
GET /api/events/{eventId}
```
**Rate Limit:** Onbekend  
**Response:** Detailed event object met participant data

**Example:**
```bash
GET /api/events/5178019
```

**Used by:** ❌ NEE  
**Potential:** Detailed event view

---

#### 11. Get Event Signups (per category/pen)
```
GET /api/events/{eventId}/signups
```
**Rate Limit:** Onbekend  
**Response:** Array van pens (A/B/C/D/E) met riders per pen

**Example:**
```bash
GET /api/events/5178019/signups
```

**Response Structure:**
```json
[
  {
    "pen": "B",
    "riders": [
      {
        "riderId": 150437,
        "name": "JRøne CloudRacer-9",
        "weight": 76.5,
        "height": 183,
        "club": {
          "id": 11818,
          "name": "TeamNL Cloud9 Racing Team"
        },
        "power": {
          "wkg5s": 10.9,
          "wkg1m": 5.2,
          "wkg5m": 3.7,
          "wkg20m": 3.3,
          "cp": 290,
          "awc": 18500
        },
        "rating": 1395,
        "wins": 5,
        "podiums": 18,
        "phenotype": "ALLROUNDER"
      }
    ]
  }
]
```

**Used by:** Signup Sync Service  
**Dashboard:** Events Dashboard (team signups)

---

### 📁 ROUTES Endpoints

#### 12. Get All Routes (with profile data)
```
GET /api/routes
```
**Rate Limit:** Onbekend (cached 24h)  
**Response:** Array van alle Zwift routes

**Example:**
```bash
GET /api/routes
```

**Response Structure:**
```json
[
  {
    "routeId": 12345,
    "name": "Toefield Tornado",
    "world": "New York",
    "profile": "Rolling",
    "distance": 20.5,
    "elevation": 106
  }
]
```

**Used by:** Route enrichment service  
**Dashboard:** Events + Results (route info)

---

## 🟢 API 2: Zwift.com Official API

**Base URL:** `https://us-or-rly101.zwift.com/api`  
**Authenticatie:** OAuth Bearer token (Password Grant Flow)  
**Client ID:** `Zwift_Mobile_Link`

---

### 📁 AUTHENTICATION Endpoint

#### 13. OAuth Token (Password Grant)
```
POST https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token
```
**Rate Limit:** Onbekend  
**Body:** `client_id`, `username`, `password`, `grant_type=password`

**Example:**
```bash
POST /auth/realms/zwift/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

client_id=Zwift_Mobile_Link&username=user@email.com&password=xxx&grant_type=password
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 21600,
  "refresh_expires_in": 0,
  "token_type": "Bearer"
}
```

**Used by:** ZwiftOfficialClient (automatic)

---

### 📁 PROFILES Endpoints

#### 14. Get Profile (566 fields!)
```
GET /profiles/{profileId}
```
**Rate Limit:** Onbekend (conservatief)  
**Auth Required:** Bearer token  
**Response:** Complete profile object

**Example:**
```bash
GET /profiles/150437
Authorization: Bearer {token}
```

**Response Structure:**
```json
{
  "id": 150437,
  "firstName": "Jeroen",
  "lastName": "Diepen",
  "male": true,
  "imageSrc": "https://static-cdn.zwift.com/prod/profile/...",
  "imageSrcLarge": "https://...",
  "countryAlpha3": "NLD",
  "useMetric": true,
  "riding": false,
  "privacy": {
    "displayWeight": false,
    "displayAge": true
  },
  "socialFacts": {
    "followersCount": 245,
    "followeesCount": 189
  },
  "worldId": null,
  "level": 42,
  "currentActivityId": null
}
```

**Used by:** Unified Rider Sync  
**Dashboard:** Rider Performance (avatar, country, social)

---

#### 15. Get Activities (Recent rides/runs)
```
GET /profiles/{profileId}/activities
```
**Rate Limit:** Onbekend  
**Auth Required:** Bearer token  
**Params:** `start`, `limit` (pagination)

**Example:**
```bash
GET /profiles/150437/activities?start=0&limit=20
Authorization: Bearer {token}
```

**Response Structure:**
```json
[
  {
    "id": 123456789,
    "profileId": 150437,
    "worldId": 1,
    "name": "Morning Ride",
    "sport": "CYCLING",
    "startDate": "2025-11-24T06:30:00Z",
    "endDate": "2025-11-24T07:45:00Z",
    "distanceInMeters": 45000,
    "durationInSeconds": 4500,
    "totalElevation": 650,
    "avgWatts": 245,
    "calories": 890,
    "avgHeartRate": 152,
    "maxHeartRate": 180
  }
]
```

**Used by:** ❌ NEE  
**Potential:** Training volume analysis

---

#### 16. Get Followers
```
GET /profiles/{profileId}/followers
```
**Rate Limit:** Onbekend  
**Auth Required:** Bearer token  
**Params:** `start`, `limit`

**Example:**
```bash
GET /profiles/150437/followers?start=0&limit=20
Authorization: Bearer {token}
```

**Used by:** ❌ NEE  
**Potential:** Social features

---

#### 17. Get Followees (Following)
```
GET /profiles/{profileId}/followees
```
**Rate Limit:** Onbekend  
**Auth Required:** Bearer token  
**Params:** `start`, `limit`

**Example:**
```bash
GET /profiles/150437/followees?start=0&limit=20
Authorization: Bearer {token}
```

**Used by:** ❌ NEE  
**Potential:** Social network

---

#### 18. Get Goals
```
GET /profiles/{profileId}/goals
```
**Rate Limit:** Onbekend  
**Auth Required:** Bearer token

**Example:**
```bash
GET /profiles/150437/goals
Authorization: Bearer {token}
```

**Used by:** ❌ NEE  
**Potential:** Goals tracking

---

## 🟠 API 3: ZwiftPower.com

**Base URL:** `https://zwiftpower.com`  
**Authenticatie:** Cookie-based session (username/password login)  
**Note:** Scraping-achtige API, gebruik zeer conservatief

---

### 📁 AUTHENTICATION Endpoints

#### 19. Get Login Page (Session init)
```
GET /
```
**Purpose:** Establish session + get cookies

**Example:**
```bash
GET /
```

---

#### 20. Login (Post credentials)
```
POST /ucp.php?mode=login
```
**Body:** `username`, `password`, `login=Login`, `redirect=./`  
**Content-Type:** `application/x-www-form-urlencoded`

**Example:**
```bash
POST /ucp.php?mode=login
Content-Type: application/x-www-form-urlencoded

username=myuser&password=mypass&login=Login&redirect=./
```

**Used by:** ZwiftPowerClient (automatic)

---

### 📁 RIDER Endpoints

#### 21. Get Rider Profile (Cache endpoint)
```
GET /cache3/profile/{zwiftId}_all.json
```
**Auth Required:** Login session (cookies)  
**Response:** Rider profile met FTP/weight

**Example:**
```bash
GET /cache3/profile/150437_all.json
Cookie: phpbb3_...
```

**Response Structure:**
```json
{
  "zwid": 150437,
  "name": "JRøne CloudRacer-9",
  "ftp": 295,
  "weight": 76.5,
  "category": "B",
  "flag": "nl",
  "res_positions": [3, 9, 41, 9, 36],
  "zp_rank": 1245
}
```

**Used by:** Unified Rider Sync  
**Dashboard:** Rider Performance (FTP, W/kg calculation)

**⭐ KRITIEK:** Enige bron voor FTP + actueel gewicht!

---

#### 22. Get Rider Results (Recent races)
```
GET /api3.php?do=rider_results&zwift_id={zwiftId}&limit={limit}
```
**Auth Required:** Mogelijk (niet getest)  
**Params:** `do=rider_results`, `zwift_id`, `limit`

**Example:**
```bash
GET /api3.php?do=rider_results&zwift_id=150437&limit=10
```

**Response Structure:**
```json
{
  "data": [
    {
      "event_id": 5178019,
      "event_title": "Zwift Crit Racing Club",
      "date": "2025-11-24",
      "position": 3,
      "category": "B",
      "ftp": 295,
      "weight": 76.5,
      "power_avg": 245,
      "zp_points": 85,
      "flag": null
    }
  ]
}
```

**Used by:** ❌ NEE  
**Potential:** Historical FTP tracking

---

#### 23. Get Event Results (via api3.php)
```
GET /api3.php?do=event_results&zid={eventId}
```
**Auth Required:** Mogelijk  
**Params:** `do=event_results`, `zid` (event ID)

**Example:**
```bash
GET /api3.php?do=event_results&zid=5178019
```

**Response:** Similar to endpoint #4 (ZwiftRacing proxy)

**Used by:** ❌ NEE (gebruik #4 via ZwiftRacing proxy)

---

## 📊 Endpoint Usage Summary

### ✅ Currently Used (9 endpoints)

| # | Endpoint | API | Frequency |
|---|----------|-----|-----------|
| 1 | `GET /public/clubs/{id}` | ZwiftRacing | 1/60min |
| 3 | `GET /public/results/{eventId}` | ZwiftRacing | 1/min |
| 9 | `GET /api/events/upcoming` | ZwiftRacing | Per sync |
| 11 | `GET /api/events/{id}/signups` | ZwiftRacing | Per event |
| 12 | `GET /api/routes` | ZwiftRacing | 1/24h (cached) |
| 13 | `POST {oauth}/token` | Zwift.com | Per 6h |
| 14 | `GET /profiles/{id}` | Zwift.com | Per rider |
| 19 | `GET /` | ZwiftPower | Per session |
| 20 | `POST /ucp.php?mode=login` | ZwiftPower | Per session |
| 21 | `GET /cache3/profile/{id}_all.json` | ZwiftPower | Per rider |

---

### 🔵 High Priority (Not Used, Should Use)

| # | Endpoint | API | Why Important |
|---|----------|-----|---------------|
| 4 | `GET /public/zp/{eventId}/results` | ZwiftRacing | CE/DQ flags enrichment |
| 5 | `GET /public/riders/{riderId}` | ZwiftRacing | Rating history for graphs! |
| 7 | `POST /public/riders` | ZwiftRacing | Bulk efficiency (75× faster) |
| 15 | `GET /profiles/{id}/activities` | Zwift.com | Training volume analysis |

---

### 🟡 Medium Priority (Nice to Have)

| # | Endpoint | API | Use Case |
|---|----------|-----|----------|
| 6 | `GET /public/riders/{id}/{time}` | ZwiftRacing | Historical snapshots |
| 10 | `GET /api/events/{eventId}` | ZwiftRacing | Event details |
| 16 | `GET /profiles/{id}/followers` | Zwift.com | Social features |
| 17 | `GET /profiles/{id}/followees` | Zwift.com | Social network |
| 22 | `GET /api3.php?do=rider_results` | ZwiftPower | Historical FTP |

---

### 🟢 Low Priority (Optional)

| # | Endpoint | API | Use Case |
|---|----------|-----|----------|
| 2 | `GET /public/clubs/{id}/{afterId}` | ZwiftRacing | >1000 members clubs |
| 8 | `POST /public/riders/{time}` | ZwiftRacing | Bulk historical |
| 18 | `GET /profiles/{id}/goals` | Zwift.com | Goals tracking |
| 23 | `GET /api3.php?do=event_results` | ZwiftPower | Use #4 instead |

---

## 🎯 Next Steps voor Implementation

### FASE 1: Enable High Priority Endpoints (2-3 uur)

1. **Endpoint #5: Rating History**
   ```typescript
   // In zwift-client.ts
   async getRiderWithHistory(riderId: number): Promise<ZwiftRider> {
     return await this.client.get(`/public/riders/${riderId}`);
   }
   ```

2. **Endpoint #7: Bulk Riders**
   ```typescript
   // In zwift-client.ts (AL GEÏMPLEMENTEERD, alleen gebruiken!)
   async getBulkRiders(riderIds: number[]): Promise<ZwiftRider[]> {
     return await this.client.post('/public/riders', riderIds);
   }
   ```

3. **Endpoint #4: ZwiftPower Results**
   ```typescript
   // In results-sync.service.ts
   const zpResults = await zwiftClient.getEventResultsZwiftPower(eventId);
   // Merge CE/DQ flags
   ```

4. **Endpoint #15: Activities**
   ```typescript
   // In zwift-official-client.ts (AL GEÏMPLEMENTEERD, alleen gebruiken!)
   const activities = await zwiftOfficialClient.getActivities(profileId);
   ```

### FASE 2: Integrate in Unified Sync (3-4 uur)

Update sync orchestrator om nieuwe endpoints te gebruiken

### FASE 3: Update Dashboards (2-3 uur)

Add UI voor nieuwe data (rating graphs, activities, CE badges)

---

**Total Endpoints: 23**  
**Currently Used: 10 (43%)**  
**Should Use: 4 (17%)**  
**Optional: 9 (40%)**
