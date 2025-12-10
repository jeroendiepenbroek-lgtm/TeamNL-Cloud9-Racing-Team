# API Documentatie - TeamNL Cloud9 Racing

**Versie**: 4.0.0-fresh-start  
**Datum**: 8 december 2025  
**Status**: Externe APIs ready - Supabase leeg

---

## 🌐 EXTERNE DATA SOURCES - 3 APIs

### ⚡ Quick Reference Table

| API | Base URL | Auth Method | Rate Limit | Status |
|-----|----------|-------------|------------|--------|
| **ZwiftRacing.app** | `zwift-ranking.herokuapp.com` | API Key | 5/min | ✅ PRIMARY |
| **Zwift Official** | `us-or-rly101.zwift.com` | OAuth Token | Unknown | 🟡 ENRICHMENT |
| **ZwiftPower** | `zwiftpower.com` | Cookie Session | Unknown | ⚪ FALLBACK |

---

## 1️⃣ ZWIFTRACING.APP API ⭐ PRIMARY SOURCE

**Base URL**: `https://zwift-ranking.herokuapp.com`  
**Documentation**: Geen officiële docs (reverse engineered)  
**Status**: ✅ **ACTIEF** - Meest complete data source

### 🔑 Authentication

**API Key**: `650c6d2fc4ef6858d74cbef1`

**Headers**:
```bash
Authorization: 650c6d2fc4ef6858d74cbef1
```

### 📊 Rate Limiting

- **Limit**: 5 requests per minuut per IP
- **Response bij overschrijding**: 429 Too Many Requests
- **Best Practice**: Queue requests met 12s interval

### 🎯 Available Endpoints

#### A. Get Rider Profile (Complete Power + vELO Data)
```http
GET /public/riders/{riderId}
```

**Parameters**:
- `riderId` (path): ZwiftRacing rider ID (integer)

**Example**:
```bash
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/riders/150437
```

**Response** (200 OK):
```json
{
  "riderId": 150437,
  "name": "Jeroen Diepenbroek",
  "club": {
    "id": 11818,
    "name": "TeamNL Cloud9"
  },
  "country": "NL",
  "age": "Vet",
  "weight": 85,
  "height": 183,
  "gender": "M",
  "zpCategory": "B",
  "zpFTP": 280,
  
  "power": {
    "w5": 1250,
    "w15": 1000,
    "w30": 800,
    "w60": 650,
    "w120": 480,
    "w300": 390,
    "w1200": 290,
    "wkg5": 14.7,
    "wkg15": 11.8,
    "wkg30": 9.4,
    "wkg60": 7.6,
    "wkg120": 5.6,
    "wkg300": 4.6,
    "wkg1200": 3.4,
    "CP": 320,
    "AWC": 22000,
    "compoundScore": 85.5,
    "powerRating": 92.3
  },
  
  "race": {
    "current": {
      "rating": 1875,
      "mixed": {
        "category": "B",
        "number": "125"
      }
    },
    "max30": { "rating": 1950 },
    "max90": { "rating": 2100 },
    "wins": 8,
    "podiums": 24,
    "finishes": 156,
    "last": {
      "date": "2025-12-07",
      "rating": 1875
    }
  },
  
  "phenotype": {
    "value": "Pursuiter",
    "scores": {
      "sprinter": 65,
      "climber": 48,
      "pursuiter": 92,
      "puncheur": 55
    }
  },
  
  "handicaps": {
    "flat": 0.98,
    "hilly": 1.05,
    "rolling": 1.02,
    "mountainous": 1.12
  }
}
```

**Data Fields** (48 totaal):
- **Basic**: riderId, name, club, country, age, weight, height, gender, zpCategory, zpFTP (10)
- **Power Curve**: w5/w15/w30/w60/w120/w300/w1200 (watts) + wkg variants (14)
- **Power Metrics**: CP, AWC, compoundScore, powerRating (4)
- **vELO Stats**: current rating, max30, max90, wins, podiums, finishes, last race (7)
- **Phenotype**: value, 4 scores (sprinter/climber/pursuiter/puncheur) (5)
- **Handicaps**: flat, hilly, rolling, mountainous (4)

#### B. Get Team Riders
```http
GET /public/teams/{teamId}/riders
```

**Parameters**:
- `teamId` (path): Team ID (TeamNL Cloud9 = **11818**)

**Example**:
```bash
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/teams/11818/riders
```

**Response**: Array van rider objects (light version zonder phenotype/handicaps)

#### C. Upcoming Events (800+ events!)
```http
GET /api/events/upcoming
```

**No parameters needed**

**Example**:
```bash
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/api/events/upcoming
```

**Response** (200 OK):
```json
[
  {
    "id": 12345,
    "name": "Zwift Racing League - Stage 5",
    "time": 1733670000,
    "route": "Watopia - Volcano Circuit",
    "distance": 32.5,
    "elevation": 425,
    "eventType": "RACE",
    "organizer": "Zwift",
    "signups": 245
  }
]
```

**Use Case**: Filter voor 48h lookforward dashboard

---

## 2️⃣ ZWIFT OFFICIAL API 🎮 ENRICHMENT SOURCE

**Base URL**: `https://us-or-rly101.zwift.com`  
**Documentation**: Geen officiële public docs  
**Status**: 🟡 **SECONDARY** - Voor avatar, level, social stats

### 🔑 Authentication - OAuth 2.0

**Token Endpoint**: `https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token`

**Grant Type**: Password (Resource Owner Password Credentials)

**Credentials**:
```bash
ZWIFT_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFT_PASSWORD=CloudRacer-9
```

**cURL Example** (Get Token):
```bash
curl -X POST https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=Zwift_Mobile_Link" \
  -d "username=jeroen.diepenbroek@gmail.com" \
  -d "password=CloudRacer-9" \
  -d "grant_type=password"
```

**Response**:
```json
{
  "access_token": "eyJhbGc...[JWT token]",
  "expires_in": 21600,
  "refresh_expires_in": 86400,
  "refresh_token": "eyJhbGc...[refresh token]",
  "token_type": "Bearer"
}
```

**Token Lifetime**: 6 uur (21600s)  
**Refresh Token**: 24 uur (86400s)

### 📊 Rate Limiting

- **Unknown** - Wees conservatief
- **Recommendation**: Max 1 request per seconde

### 🎯 Available Endpoints

#### A. Get Profile
```http
GET /api/profiles/{zwiftId}
```

**Headers**:
```bash
Authorization: Bearer {access_token}
```

**Parameters**:
- `zwiftId` (path): Zwift Profile ID (⚠️ NIET dezelfde als riderId!)

**Example**:
```bash
curl -H "Authorization: Bearer eyJhbGc..." \
  https://us-or-rly101.zwift.com/api/profiles/150437
```

**Response** (200 OK):
```json
{
  "id": 150437,
  "publicId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "firstName": "Jeroen",
  "lastName": "Diepenbroek",
  "male": true,
  "imageSrc": "https://static-cdn.zwift.com/prod/profile/a1b2c3-small.jpg",
  "imageSrcLarge": "https://static-cdn.zwift.com/prod/profile/a1b2c3-large.jpg",
  "countryAlpha3": "NLD",
  "countryCode": 528,
  "useMetric": true,
  "riding": false,
  "achievementLevel": 42,
  "totalDistance": 12450000,
  "totalDistanceClimbed": 145000,
  "totalTimeInMinutes": 45600,
  "totalInKomJersey": 120,
  "totalInSprintersJersey": 95,
  "totalWattHours": 8500000,
  "socialFacts": {
    "followersCount": 156,
    "followeesCount": 98,
    "profileId": 150437
  }
}
```

**Data Fields** (9 extra):
- **Avatar**: imageSrc, imageSrcLarge
- **Profile**: firstName, lastName, male, countryAlpha3
- **Status**: riding, achievementLevel
- **Social**: followersCount, followeesCount

**Use Case**: Enrich rider profiles met avatar URLs en social stats

---

## 3️⃣ ZWIFTPOWER API 📊 FALLBACK SOURCE

**Base URL**: `https://www.zwiftpower.com`  
**Documentation**: https://zwiftpower.com/api.php  
**Status**: ⚪ **LEGACY** - Cookie-based, unreliable

### 🔑 Authentication - Cookie Session

**Login Required**: Ja (browser session)

**Cookie**: `PHPSESSID={session_id}`

**⚠️ CRITICAL ISSUES**:
- Niet alle riders hebben ZwiftPower profiel (404 errors)
- Cookie expireert onvoorspelbaar
- Rate limiting onbekend
- **RECOMMENDATION**: ❌ **SKIP** - Gebruik ZwiftRacing.app instead

### 🎯 Available Endpoints (indien nodig)

#### A. Team Riders (Legacy)
```http
GET /api3.php?do=team_riders&id={teamId}
```

**Parameters**:
- `do=team_riders`
- `id`: Team ID (TeamNL Cloud9 = **11818**)

**Example**:
```bash
curl "https://www.zwiftpower.com/api3.php?do=team_riders&id=11818" \
  --cookie "PHPSESSID=your_session_cookie"
```

**Response**: HTML/JSON hybrid (inconsistent format)

#### B. Profile Results
```http
GET /api3.php?do=profile_results&z={riderId}
```

**⚠️ Vaak 404** - Niet reliable

**Use Case**: Alleen voor verification/fallback als ZwiftRacing down

**Project**: `bktbeefdmrpxhsyyalvc`  
**URL**: `https://bktbeefdmrpxhsyyalvc.supabase.co`  
**Status**: 🆕 **LEEG** - Tabellen moeten nog aangemaakt worden

### 🔑 Environment Variables

```bash
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3Mzk0NTIsImV4cCI6MjA0NjMxNTQ1Mn0.6hHXDxq_OOMM89GrSfN1CRd0XgGMqU72gBHG9CYmUE4
SUPABASE_SERVICE_KEY=[Te vinden in Supabase Dashboard → Settings → API]
```

### 📋 Benodigde Tabellen (nog aan te maken)

Database schema volgt later - eerst externe APIs testen!

---

## 🔄 DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│              EXTERNE APIS (Data Sources)            │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐│
│  │ ZwiftRacing  │  │ Zwift        │  │ ZwiftPower││
│  │    .app      │  │  Official    │  │  (legacy) ││
│  │              │  │              │  │           ││
│  │ • Riders     │  │ • Avatars    │  │ • Backup  ││
│  │ • Power      │  │ • Social     │  │ • Verify  ││
│  │ • vELO       │  │ • Levels     │  │           ││
│  │ • Events     │  │              │  │           ││
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘│
│         │                 │                 │      │
└─────────┼─────────────────┼─────────────────┼──────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                           ↓
          ┌─────────────────────────────────┐
          │      BACKEND API (Express)      │
          │                                 │
          │  • Fetch from external APIs     │
          │  • Transform data               │
          │  • Store in Supabase            │
          │  • Serve to frontend            │
          │                                 │
          │  Endpoints:                     │
          │  - GET /api/riders/team         │
          │  - GET /api/events/upcoming     │
          │  - GET /api/results/recent      │
          └────────────┬────────────────────┘
                       │
                       ↓
          ┌─────────────────────────────────┐
          │      SUPABASE DATABASE          │
          │                                 │
          │  Tables (to be created):        │
          │  - team_riders                  │
          │  - events                       │
          │  - results                      │
          │  - sync_logs                    │
          └────────────┬────────────────────┘
                       │
                       ↓
          ┌─────────────────────────────────┐
          │         FRONTEND (React)        │
          │                                 │
          │  • Racing Matrix Dashboard      │
          │  • Events Dashboard (48h)       │
          │  • Results Dashboard            │
          └─────────────────────────────────┘
```

---

## 🚀 VOLGENDE STAPPEN

### Stap 1: Test Externe APIs ✅ READY
```bash
# Test ZwiftRacing.app
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/riders/150437

# Test Zwift Official (first get token)
curl -X POST https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token \
  -d "client_id=Zwift_Mobile_Link" \
  -d "username=jeroen.diepenbroek@gmail.com" \
  -d "password=CloudRacer-9" \
  -d "grant_type=password"
```

### Stap 2: Supabase Schema Maken
- Maak `team_riders` tabel met alle fields uit ZwiftRacing API
- Maak `events` tabel voor upcoming events
- Maak `results` tabel voor race results
- Maak `sync_logs` tabel voor tracking

### Stap 3: Backend API Client Bouwen
```typescript
// backend/src/clients/zwift-racing-client.ts
import axios from 'axios';

export const zwiftRacingClient = axios.create({
  baseURL: 'https://zwift-ranking.herokuapp.com',
  headers: {
    Authorization: '650c6d2fc4ef6858d74cbef1'
  }
});

export async function getRiderProfile(riderId: number) {
  const response = await zwiftRacingClient.get(`/public/riders/${riderId}`);
  return response.data;
}
```

### Stap 4: Replace Mock Data
Backend endpoints ophalen van echte APIs en opslaan in Supabase

### Stap 5: Sync Service (optioneel)
Automatische hourly sync van externe APIs → Supabase

---

## 📝 BELANGRIJKE NOTES

### TeamNL Cloud9 Specifics
- **Team ID (ZwiftRacing)**: 11818
- **Team Name**: TeamNL Cloud9
- **Primary Rider ID (test)**: 150437 (Jeroen Diepenbroek)

### API Priority
1. **ZwiftRacing.app** → PRIMARY (gebruik dit altijd)
2. **Zwift Official** → ENRICHMENT (avatars, social)
3. **ZwiftPower** → SKIP (alleen als backup nodig)

### Rate Limiting Strategy
- ZwiftRacing: Max 5/min → Queue met 12s interval
- Zwift Official: Max 1/sec → Conservative approach
- ZwiftPower: Avoid completely

### Security
- ⚠️ Credentials in deze docs zijn voor DEVELOPMENT
- 🔒 Voor production: gebruik Railway environment variables
- 🚫 NEVER commit API keys naar git
- ✅ Gebruik .env files (already in .gitignore)

---

## 🔗 LINKS

- **Railway Dashboard**: https://railway.app/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc
- **ZwiftRacing Team**: https://zwift-ranking.herokuapp.com/public/teams/11818
- **GitHub Repo**: https://github.com/jeroendiepenbroek-lgtm/TeamNL-Cloud9-Racing-Team
- **Live Dashboard**: https://teamnl-cloud9-racing-team-production.up.railway.app

---

## ✅ SAMENVATTING

**3 Externe APIs beschikbaar**:
1. ⭐ **ZwiftRacing.app** - API Key: `650c6d2fc4ef6858d74cbef1` - Riders, Power, vELO, Events
2. 🎮 **Zwift Official** - OAuth: `jeroen.diepenbroek@gmail.com` / `CloudRacer-9` - Avatars, Social
3. 📊 **ZwiftPower** - Cookie-based (skip) - Legacy fallback only

**Supabase Database**: Leeg, schema moet nog gemaakt worden

**Volgende fase**: Extern APIs testen → Supabase schema maken → Backend integratie
