# 🏗️ ARCHITECTUUR & BRONDOCUMENT - TeamNL Cloud9 Racing Team

**Project**: Racing Matrix Dashboard  
**Versie**: 1.0 Definitief  
**Datum**: 5 december 2025  
**Status**: Production Ready Architecture

---

## 📊 OVERZICHT EXTERNE APIs

### 1️⃣ ZwiftRacing.app API (PRIMARY SOURCE)

**Base URL**: `https://zwift-ranking.herokuapp.com`  
**Authenticatie**: API Key in Authorization header  
**Rate Limits**: Standard tier (upgradebaar naar Premium = 10x)

#### Credentials
```env
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
```

#### Endpoints (GET)

| Endpoint | Rate Limit | Doel | Response |
|----------|------------|------|----------|
| `GET /public/clubs/{clubId}` | 1/60min | Club members lijst | `ZwiftRider[]` max 1000 |
| `GET /public/clubs/{clubId}/{riderId}` | 1/60min | Pagination vanaf riderId | `ZwiftRider[]` max 1000 |
| `GET /public/riders/{riderId}` | 5/min | Individuele rider data | `ZwiftRider` object |
| `GET /public/riders/{riderId}/{timestamp}` | 5/min | Historical rider snapshot | `ZwiftRider` object |
| `GET /public/results/{eventId}` | 1/min | Event results | `ZwiftResult[]` |
| `GET /public/zp/{eventId}/results` | 1/min | ZwiftPower results | `any[]` |
| `GET /api/events/upcoming` | Unknown | Upcoming events (800+) | `ZwiftEvent[]` |
| `GET /api/events/{eventId}` | Unknown | Event details + pens | `ZwiftEvent` object |
| `GET /api/events/{eventId}/signups` | Unknown | Signups per category | `EventSignups[]` |

#### Endpoints (POST)

| Endpoint | Rate Limit | Doel | Request Body | Response |
|----------|------------|------|--------------|----------|
| `POST /public/riders` | 1/15min | Bulk riders (max 1000) | `number[]` | `ZwiftRider[]` |
| `POST /public/riders/{timestamp}` | 1/15min | Bulk historical | `number[]` | `ZwiftRider[]` |

#### ZwiftRider Object Structure
```typescript
{
  riderId: number,
  name: string,
  club: { id: number, name: string },
  country: string,          // ISO 2-letter
  age: string,              // "Vet", "Junior", "Senior"
  weight: number,           // kg
  height: number,           // cm
  gender: string,           // "M" of "F"
  zpCategory: string,       // "A", "B", "C", "D", "E"
  zpFTP: number,            // Watts
  
  power: {
    w5: number,    w15: number,   w30: number,
    w60: number,   w120: number,  w300: number,
    w1200: number,                // 20 min power
    wkg5: number,  wkg15: number, wkg30: number,
    wkg60: number, wkg120: number, wkg300: number,
    wkg1200: number,
    CP: number,              // Critical Power
    AWC: number,             // Anaerobic Work Capacity
    compoundScore: number,
    powerRating: number
  },
  
  race: {
    current: {
      rating: number,        // vELO rating
      mixed: {
        category: string,    // "A", "B", "C", "D"
        number: string       // Rank bijv. "5"
      }
    },
    max30: { rating: number },  // Max vELO 30 dagen
    max90: { rating: number },  // Max vELO 90 dagen
    wins: number,
    podiums: number,
    finishes: number,
    last: {
      date: string,          // ISO timestamp
      rating: number
    }
  },
  
  phenotype: {
    value: string,           // "Pursuiter", "Sprinter", etc.
    scores: {
      sprinter: number,
      climber: number,
      pursuiter: number,
      puncheur: number
    }
  },
  
  handicaps: {
    flat: number,
    hilly: number,
    rolling: number,
    mountainous: number
  }
}
```

#### ⚠️ BELANGRIJKE BEPERKINGEN
- **GEEN race history field** - rider endpoint bevat alleen `race.last` (1 race), geen volledige history!
- Voor race history: gebruik `GET /public/results/{eventId}` per event
- Bulk POST beperkt tot 1000 riders per call
- Rate limits strict - Premium upgrade mogelijk voor 10x capacity

---

### 2️⃣ Zwift.com Official API (ENRICHMENT SOURCE)

**Base URL**: `https://us-or-rly101.zwift.com/api`  
**Authenticatie**: OAuth Bearer Token (Password Grant Flow)  
**Rate Limits**: Onbekend, conservatief gebruik aanbevolen

#### Credentials
```env
ZWIFT_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFT_PASSWORD=CloudRacer-9
```

#### OAuth Flow
```typescript
// Token endpoint
POST https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token

Body (x-www-form-urlencoded):
  client_id: "Zwift_Mobile_Link"
  username: {ZWIFT_USERNAME}
  password: {ZWIFT_PASSWORD}
  grant_type: "password"

Response:
  access_token: string
  expires_in: number (seconds)
  
// Gebruik Bearer token in alle requests:
Authorization: Bearer {access_token}
```

#### Endpoints (GET)

| Endpoint | Doel | Response |
|----------|------|----------|
| `GET /profiles/{profileId}` | Volledige profiel (566 velden) | `ZwiftProfile` |
| `GET /profiles/{profileId}/activities` | Activity lijst | `ZwiftActivity[]` |
| `GET /profiles/{profileId}/followers` | Followers lijst | `any[]` |
| `GET /profiles/{profileId}/followees` | Following lijst | `any[]` |
| `GET /profiles/{profileId}/goals` | Rider goals | `any[]` |

#### ZwiftProfile Object (Selectie)
```typescript
{
  id: number,                    // profileId (= riderId)
  firstName: string,
  lastName: string,
  male: boolean,
  imageSrc: string,              // Avatar URL (klein)
  imageSrcLarge: string,         // Avatar URL (groot)
  countryAlpha3: string,         // ISO 3-letter
  countryCode: number,
  riding: boolean,               // Currently active
  privacy: {
    displayWeight: boolean,
    displayAge: boolean,
    // ... meer privacy settings
  },
  socialFacts: {
    followersCount: number,
    followeesCount: number
  },
  worldId: number | null,        // Huidige wereld
  currentActivityId: number | null
}
```

#### ZwiftActivity Object
```typescript
{
  id: number,
  profileId: number,
  name: string,
  sport: string,                 // "CYCLING", "RUNNING"
  startDate: string,             // ISO timestamp
  endDate: string,
  distanceInMeters: number,
  durationInSeconds: number,
  totalElevation: number,
  avgWatts: number,
  calories: number,
  avgHeartRate: number,
  maxHeartRate: number,
  avgSpeedInMetersPerSecond: number
}
```

#### Data Verrijking
Zwift.com Official vult aan:
- ✅ `avatar_url` en `avatar_url_large`
- ✅ `gender` (via male boolean)
- ✅ `followers_count` en `followees_count`
- ✅ `currently_riding` status
- ⚠️ Activity history beschikbaar maar rate limits onbekend

---

### 3️⃣ ZwiftPower.com API (VERIFICATION SOURCE)

**Base URL**: `https://zwiftpower.com/api3.php`  
**Authenticatie**: Cookie-based (PHPSESSID)  
**Rate Limits**: Onbekend, zeer voorzichtig gebruik

#### Credentials
```env
ZWIFTPOWER_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFTPOWER_PASSWORD=CloudRacer-9
```

#### Login Flow
```typescript
POST https://zwiftpower.com/ucp.php?mode=login

Body (x-www-form-urlencoded):
  username: {ZWIFTPOWER_USERNAME}
  password: {ZWIFTPOWER_PASSWORD}
  login: "Login"

Response: Set-Cookie header met PHPSESSID

// Gebruik cookie in alle requests:
Cookie: PHPSESSID={session_id}
```

#### Endpoints (GET)

| Endpoint | Doel | Response |
|----------|------|----------|
| `GET /api3.php?do=profile&z={zwiftId}` | Rider profiel | JSON object |
| `GET /api3.php?do=profile_results&z={zwiftId}&limit={n}` | Race results | JSON array |
| `GET /cache3/results/{eventId}_{lap}.json` | Event results | JSON object |

#### ⚠️ BELANGRIJKE BEPERKINGEN
- **Niet alle riders hebben ZwiftPower profiel** (bijv. rider 150437 heeft GEEN profiel!)
- Cookie-based auth minder betrouwbaar dan OAuth
- Rate limits onbekend - risico op IP ban
- Data kwaliteit variabel (verouderd, incomplete)
- **RECOMMENDATION**: Gebruik alleen als fallback, SKIP bij 404 errors

#### ZwiftPower Response (indien beschikbaar)
```typescript
{
  zwid: number,
  name: string,
  category: string,              // "A", "B", "C", "D"
  ftp: number,
  weight: number,
  power_curve: number[],
  results: [
    {
      event_id: number,
      event_date: string,
      position: number,
      category: string,
      avg_wkg: number,
      // ... meer race data
    }
  ]
}
```

---

## 🗄️ DATABASE SCHEMA (Supabase PostgreSQL)

**Connection**:
```env
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Core Tables

#### 1. `my_team_members` (Source of Truth voor Team)
```sql
CREATE TABLE my_team_members (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER NOT NULL UNIQUE,    -- ZwiftID
  nickname TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Status**: ✅ 75 riders actief

#### 2. `riders_unified` (Multi-Source Unified Data)
```sql
CREATE TABLE riders_unified (
  rider_id INTEGER PRIMARY KEY,
  name TEXT,
  
  -- Club (ZwiftRacing)
  club_id INTEGER,
  club_name TEXT,
  
  -- Physical (ZwiftRacing)
  weight_kg NUMERIC,
  height_cm INTEGER,
  ftp INTEGER,
  
  -- Power Curve (ZwiftRacing) - 14 kolommen
  power_5s_w INTEGER,     power_5s_wkg NUMERIC,
  power_15s_w INTEGER,    power_15s_wkg NUMERIC,
  power_30s_w INTEGER,    power_30s_wkg NUMERIC,
  power_1m_w INTEGER,     power_1m_wkg NUMERIC,
  power_2m_w INTEGER,     power_2m_wkg NUMERIC,
  power_5m_w INTEGER,     power_5m_wkg NUMERIC,
  power_20m_w INTEGER,    power_20m_wkg NUMERIC,
  
  critical_power NUMERIC,
  anaerobic_work_capacity NUMERIC,
  compound_score NUMERIC,
  
  -- Race Stats (ZwiftRacing)
  velo_rating NUMERIC,
  velo_max_30d NUMERIC,              -- Calculated from race.max30
  velo_max_90d NUMERIC,              -- Calculated from race.max90
  velo_rank TEXT,
  race_wins INTEGER,
  race_podiums INTEGER,
  race_dnfs INTEGER,
  race_count_90d INTEGER,
  
  -- Phenotype (ZwiftRacing)
  phenotype_sprinter NUMERIC,
  phenotype_pursuiter NUMERIC,
  phenotype_puncheur NUMERIC,
  
  -- Categories (Mixed sources)
  zp_category TEXT,                   -- ZwiftRacing zpCategory
  category TEXT,                      -- Legacy/duplicate
  age_category TEXT,                  -- ZwiftRacing age field
  
  -- Profile (Zwift Official)
  avatar_url TEXT,
  avatar_url_large TEXT,
  gender TEXT,                        -- "M" of "F"
  country_code TEXT,                  -- ISO 2-letter
  country_alpha3 TEXT,                -- ISO 3-letter
  currently_riding BOOLEAN,
  followers_count INTEGER,
  followees_count INTEGER,
  level INTEGER,
  zwift_profile_id TEXT,
  
  -- Handicaps (ZwiftRacing)
  handicap_flat NUMERIC,
  handicap_rolling NUMERIC,
  handicap_hilly NUMERIC,
  handicap_mountainous NUMERIC,
  
  -- Sync Tracking
  last_synced_zwift_racing TIMESTAMPTZ,
  last_synced_zwift_official TIMESTAMPTZ,
  last_synced_zwiftpower TIMESTAMPTZ,
  velo_rating_updated_at TIMESTAMPTZ,
  
  -- Team Management
  is_team_member BOOLEAN DEFAULT false,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Totaal**: 60 kolommen  
**Status**: ✅ In sync process (44/75 complete)

#### 3. `zwift_api_race_results` (Event Results)
```sql
CREATE TABLE zwift_api_race_results (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  rider_id INTEGER NOT NULL,
  
  -- Event info
  event_date TIMESTAMPTZ,
  event_name TEXT,
  route_id INTEGER,
  route_name TEXT,
  distance_km NUMERIC,
  
  -- Result data
  rank INTEGER,
  category TEXT,
  avg_wkg NUMERIC,
  avg_watts NUMERIC,
  finish_time_seconds INTEGER,
  
  -- Additional
  penalties TEXT,
  dq_reason TEXT,
  
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, rider_id)
);
```
**Status**: ✅ 30 results voor rider 150437

#### 4. `view_my_team` (JOIN View)
```sql
CREATE VIEW view_my_team AS
SELECT 
  t.rider_id,
  t.nickname,
  t.is_favorite,
  r.name,
  r.club_name,
  r.velo_rating,
  r.category,
  r.ftp,
  r.race_wins,
  r.last_synced_zwift_racing
FROM my_team_members t
LEFT JOIN riders_unified r ON t.rider_id = r.rider_id
ORDER BY r.velo_rating DESC NULLS LAST;
```
**Purpose**: Racing Matrix frontend data

---

## 🔄 SYNC ARCHITECTUUR

### Multi-Source Sync Flow

```typescript
async function syncRider(riderId: number) {
  // PHASE 1: ZwiftRacing.app (ALTIJD - PRIMARY)
  const zwiftRacingData = await zwiftRacingClient.getRider(riderId);
  
  // Map naar database formaat
  const baseData = {
    rider_id: zwiftRacingData.riderId,
    name: zwiftRacingData.name,
    weight_kg: zwiftRacingData.weight,
    ftp: zwiftRacingData.zpFTP,
    zp_category: zwiftRacingData.zpCategory,
    age_category: zwiftRacingData.age,
    
    // Power curve mapping
    power_5s_w: extract(zwiftRacingData.power.w5),
    power_1m_w: extract(zwiftRacingData.power.w60),
    power_20m_w: extract(zwiftRacingData.power.w1200),
    // ... 11 meer power kolommen
    
    critical_power: zwiftRacingData.power.CP,
    anaerobic_work_capacity: zwiftRacingData.power.AWC,
    
    // vELO ratings (DIRECT UIT API!)
    velo_rating: zwiftRacingData.race.current.rating,
    velo_max_30d: zwiftRacingData.race.max30?.rating,
    velo_max_90d: zwiftRacingData.race.max90?.rating,
    velo_rank: zwiftRacingData.race.current.mixed?.number,
    
    race_wins: zwiftRacingData.race.wins,
    race_podiums: zwiftRacingData.race.podiums,
    
    phenotype_sprinter: zwiftRacingData.phenotype.scores?.sprinter,
    phenotype_pursuiter: zwiftRacingData.phenotype.scores?.pursuiter,
    phenotype_puncheur: zwiftRacingData.phenotype.scores?.puncheur,
    
    club_id: zwiftRacingData.club?.id,
    club_name: zwiftRacingData.club?.name,
    
    last_synced_zwift_racing: new Date().toISOString()
  };
  
  // PHASE 2: Zwift.com Official (OPTIONEEL - ENRICHMENT)
  let enrichmentData = {};
  try {
    const zwiftProfile = await zwiftOfficialClient.getProfile(riderId);
    enrichmentData = {
      avatar_url: zwiftProfile.imageSrc,
      avatar_url_large: zwiftProfile.imageSrcLarge,
      gender: zwiftProfile.male ? 'M' : 'F',
      country_alpha3: zwiftProfile.countryAlpha3,
      currently_riding: zwiftProfile.riding,
      followers_count: zwiftProfile.socialFacts.followersCount,
      followees_count: zwiftProfile.socialFacts.followeesCount,
      zwift_profile_id: zwiftProfile.id.toString(),
      last_synced_zwift_official: new Date().toISOString()
    };
  } catch (err) {
    console.log('⚠️  Zwift Official enrichment skipped:', err.message);
  }
  
  // PHASE 3: ZwiftPower (SKIP INDIEN GEEN PROFIEL)
  let verificationData = {};
  try {
    const zpData = await zwiftPowerClient.getRider(riderId);
    verificationData = {
      // ZwiftPower data als verification
      last_synced_zwiftpower: new Date().toISOString()
    };
  } catch (err) {
    console.log('⚠️  ZwiftPower skipped (geen profiel)');
  }
  
  // MERGE & UPSERT
  const unified = {
    ...baseData,
    ...enrichmentData,
    ...verificationData
  };
  
  await supabase
    .from('riders_unified')
    .upsert(unified, { onConflict: 'rider_id' });
}
```

### Rate Limit Strategie

```typescript
// Conservative delays tussen calls
const DELAYS = {
  zwiftRacing_individual: 12000,  // 12s = 5/min safe
  zwiftRacing_bulk: 900000,       // 15 min
  zwiftRacing_results: 65000,     // 65s = <1/min safe
  zwiftOfficial: 5000,            // 5s conservatief
  zwiftPower: 10000               // 10s zeer conservatief
};
```

---

## 🎯 IMPLEMENTATIE PRIORITEITEN

### Phase 1: ZwiftRacing Only (HUIDIG - IN PROGRESS)
- ✅ ZwiftRacing.app client werkend
- ✅ Database schema `riders_unified` correct
- 🔄 Sync script draait (44/75 riders)
- ⏳ Wacht op completion (~7 min)

### Phase 2: Multi-Source Enrichment (VOLGENDE)
- ⏳ Zwift Official OAuth integratie
- ⏳ Avatar URLs en gender toevoegen
- ⏳ Update sync script voor multi-source

### Phase 3: Race Results (LATER)
- ⏳ Event results sync
- ⏳ Historical race data

---

## ✅ HUIDIGE STATUS CHECK

**Sync Progress**: 44/75 riders (58.7%)  
**Laatste sync**: rider 6899522 @ 22:09:07  
**Nog te doen**: 31 riders (~7 minuten)

**Data Volledigheid POC vs Nieuw**:
- POC (rider 150437): 50/60 kolommen gevuld
- Nieuw (rider 1495): 42/60 kolommen gevuld
- Missend in nieuwe sync: 8 kolommen (Zwift Official data)

**Missende Kolommen Oorzaak**:
1. `avatar_url` / `avatar_url_large` → Zwift Official API
2. `gender` → Zwift Official API
3. `age_category` → ZwiftRacing `age` field (mapping fout)
4. `category` → Duplicate van `zp_category` (niet kritiek)
5. `last_synced_zwift_official` → Niet geïmplementeerd
6. `last_synced_zwiftpower` → Niet geïmplementeerd
7. `velo_max_30d` → ✅ ZwiftRacing `race.max30.rating` (wel beschikbaar!)
8. `velo_max_90d` → ✅ ZwiftRacing `race.max90.rating` (wel beschikbaar!)

---

Dit document is de **single source of truth** voor alle API integraties en database structuur.
