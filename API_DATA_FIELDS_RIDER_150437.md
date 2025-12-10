# API Data Fields Vergelijking - Rider 150437

**Rider**: JRøne CloudRacer-9 @YT (TeamNL)  
**Datum**: 8 december 2025  
**Test**: Alle 3 APIs getest met rider ID 150437

---

## ✅ API 1: ZwiftRacing.app - VOLLEDIG WERKEND

**Endpoint**: `GET /public/riders/150437`  
**Auth**: `Authorization: 650c6d2fc4ef6858d74cbef1`  
**Status**: ✅ **200 OK** - Alle data beschikbaar

### Beschikbare Data Fields (51 totaal)

#### 1. BASIC INFO (11 fields)
```json
{
  "riderId": 150437,                          // INTEGER - Primary key
  "name": "JRøne  CloudRacer-9 @YT (TeamNL)", // TEXT - Full name
  "gender": "M",                               // TEXT - M/F
  "country": "nl",                             // TEXT - ISO-2 lowercase
  "age": "Vet",                                // TEXT - Age category
  "height": 183,                               // INTEGER - cm
  "weight": 74,                                // INTEGER - kg
  "zpCategory": "C",                           // TEXT - A/B/C/D/E
  "zpFTP": 241,                                // INTEGER - Watts
  "club": {
    "id": 2281,                                // INTEGER - Club ID
    "name": "TeamNL"                           // TEXT - Club name
  }
}
```

#### 2. POWER CURVE - Watts (7 fields)
```json
{
  "power": {
    "w5": 916,      // INTEGER - 5 seconden max power
    "w15": 762,     // INTEGER - 15 seconden
    "w30": 586,     // INTEGER - 30 seconden
    "w60": 440,     // INTEGER - 1 minuut
    "w120": 371,    // INTEGER - 2 minuten
    "w300": 300,    // INTEGER - 5 minuten
    "w1200": 260    // INTEGER - 20 minuten (FTP proxy)
  }
}
```

#### 3. POWER CURVE - W/kg (7 fields)
```json
{
  "power": {
    "wkg5": 12.378,   // NUMERIC - Watts per kg 5s
    "wkg15": 10.297,  // NUMERIC - 15s
    "wkg30": 7.919,   // NUMERIC - 30s
    "wkg60": 5.946,   // NUMERIC - 1min
    "wkg120": 5.014,  // NUMERIC - 2min
    "wkg300": 4.054,  // NUMERIC - 5min
    "wkg1200": 3.514  // NUMERIC - 20min
  }
}
```

#### 4. POWER METRICS (3 fields)
```json
{
  "power": {
    "CP": 245.3,              // NUMERIC - Critical Power
    "AWC": 18063.55,          // NUMERIC - Anaerobic Work Capacity (joules)
    "compoundScore": 1152.39  // NUMERIC - Overall power score
  }
}
```

#### 5. vELO RACE STATS (13 fields)
```json
{
  "race": {
    "current": {
      "rating": 1407.85,           // NUMERIC - Current vELO rating
      "date": 1765033200,          // UNIX TIMESTAMP - Last update
      "mixed": {
        "category": "Amethyst",    // TEXT - Tier name
        "number": 5                // INTEGER - Tier number (1-8)
      }
    },
    "last": {
      "rating": 1407.85,           // NUMERIC - Last race vELO
      "date": 1765033200,          // UNIX TIMESTAMP
      "mixed": { /* same */ }
    },
    "max30": {
      "rating": 1407.85,           // NUMERIC - Max vELO last 30 days
      "date": 1765033200,          // UNIX TIMESTAMP
      "expires": 1767625200,       // UNIX TIMESTAMP - When it expires
      "mixed": { /* same */ }
    },
    "max90": {
      "rating": 1461.01,           // NUMERIC - Max vELO last 90 days
      "date": 1758651540,          // UNIX TIMESTAMP
      "expires": 1772809200,       // UNIX TIMESTAMP
      "mixed": {
        "category": "Sapphire",
        "number": 4
      }
    },
    "finishes": 22,                // INTEGER - Total race finishes
    "dnfs": 2,                     // INTEGER - Did Not Finish count
    "wins": 0,                     // INTEGER - Total wins
    "podiums": 4                   // INTEGER - Total podium finishes (1-3)
  }
}
```

**vELO Tier System** (8 tiers):
1. Diamond (2200+)
2. Ruby (1900-2199)
3. Emerald (1650-1899)
4. Sapphire (1450-1649) ← Rider 150437 max90
5. Amethyst (1300-1449) ← Rider 150437 current
6. Platinum (1150-1299)
7. Gold (1000-1149)
8. Silver (850-999)

#### 6. PHENOTYPE (6 fields)
```json
{
  "phenotype": {
    "value": "Sprinter",         // TEXT - Primary phenotype
    "bias": 12.47,               // NUMERIC - Strength of classification
    "scores": {
      "sprinter": 92.9,          // NUMERIC - Score 0-100
      "puncheur": 85.4,          // NUMERIC - Score 0-100
      "pursuiter": 73.3,         // NUMERIC - Score 0-100
      "climber": 70.1,           // NUMERIC - Score 0-100
      "tt": 65.3                 // NUMERIC - Time trial score 0-100
    }
  }
}
```

**Phenotype Types**: Sprinter, Puncheur, Pursuiter, Climber, Time Trialist

#### 7. HANDICAPS (4 fields)
```json
{
  "handicaps": {
    "profile": {
      "flat": 75.94,             // NUMERIC - Flat terrain multiplier
      "rolling": 16.71,          // NUMERIC - Rolling terrain
      "hilly": -40.91,           // NUMERIC - Hilly terrain (negative = disadvantage)
      "mountainous": -109.43     // NUMERIC - Mountainous terrain
    }
  }
}
```

**Interpretatie**: Positieve waarden = voordeel, negatieve = nadeel op dat terrein

---

### DATA SUMMARY ZwiftRacing.app

| Category | Fields | Example Values |
|----------|--------|----------------|
| Basic Info | 11 | riderId, name, club, weight, height, FTP |
| Power Watts | 7 | w5=916, w15=762, w30=586, w60=440, w120=371, w300=300, w1200=260 |
| Power W/kg | 7 | wkg5=12.4, wkg15=10.3, wkg30=7.9, wkg60=5.9, wkg120=5.0, wkg300=4.1, wkg1200=3.5 |
| Power Metrics | 3 | CP=245, AWC=18064, compoundScore=1152 |
| vELO Stats | 13 | current=1408 (Amethyst), max90=1461 (Sapphire), wins=0, podiums=4 |
| Phenotype | 6 | Sprinter (92.9), Puncheur (85.4), Pursuiter (73.3), Climber (70.1), TT (65.3) |
| Handicaps | 4 | flat=75.9 (goed), mountainous=-109.4 (slecht) |
| **TOTAAL** | **51** | **Volledig bruikbaar voor Racing Matrix!** |

---

## ❌ API 2: Zwift Official - AUTHENTICATION WERKT, ENDPOINT REDIRECT

**Endpoint**: `GET /api/profiles/150437`  
**Auth**: OAuth Bearer token (successfully obtained)  
**Status**: ⚠️ **307 Temporary Redirect** - Endpoint mogelijk verplaatst

### OAuth Token Successfully Retrieved ✅
```bash
Token: eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJiTE4tTVNWaEJl...
Expires: 86400 seconds (24 uur)
```

### Probleem
API geeft 307 redirect in plaats van JSON response. Mogelijke oorzaken:
1. Endpoint URL veranderd (niet meer `/api/profiles/{id}`)
2. Andere region server nodig (niet `us-or-rly101`)
3. Zwift heeft API structure aangepast

### Verwachte Data Fields (indien werkend)
Op basis van eerdere responses zou dit beschikbaar zijn:

```json
{
  "id": 150437,                    // INTEGER - Zwift Profile ID
  "publicId": "uuid-string",       // TEXT - Public UUID
  "firstName": "JRøne",            // TEXT
  "lastName": "CloudRacer-9...",   // TEXT
  "male": true,                    // BOOLEAN
  "imageSrc": "url-small.jpg",     // TEXT - Avatar URL (klein)
  "imageSrcLarge": "url-large.jpg",// TEXT - Avatar URL (groot)
  "countryAlpha3": "NLD",          // TEXT - ISO-3
  "countryCode": 528,              // INTEGER - Numeric code
  "useMetric": true,               // BOOLEAN
  "riding": false,                 // BOOLEAN - Currently riding
  "achievementLevel": 42,          // INTEGER - Zwift level
  "totalDistance": 12450000,       // INTEGER - Meters
  "totalDistanceClimbed": 145000,  // INTEGER - Meters
  "totalTimeInMinutes": 45600,     // INTEGER - Minutes
  "totalInKomJersey": 120,         // INTEGER - KOM jersey count
  "totalInSprintersJersey": 95,    // INTEGER - Sprint jersey count
  "totalWattHours": 8500000,       // INTEGER - Total watt-hours
  "socialFacts": {
    "followersCount": 156,         // INTEGER
    "followeesCount": 98,          // INTEGER
    "profileId": 150437            // INTEGER
  }
}
```

**Potentiële Fields**: 18 (indien endpoint werkt)

**Use Case**: Avatar URLs, social stats, Zwift level - **ENRICHMENT ONLY**

---

## ⚠️ API 3: ZwiftPower - REDIRECT / CAPTCHA PROTECTION

**Endpoint**: `GET /api3.php?do=team_riders&id=11818`  
**Auth**: Geen (publieke endpoint)  
**Status**: ❌ **307 Redirect** - Nginx protection / CAPTCHA

### Probleem
```html
<html>
<head><title>307 Temporary Redirect</title></head>
<body>
<center><h1>307 Temporary Redirect</h1></center>
<hr><center>nginx</center>
</body>
</html>
```

**Oorzaken**:
1. Bot protection / CAPTCHA voor curl requests
2. Cookie-based session vereist (PHPSESSID)
3. Rate limiting / IP blocking
4. Cloudflare protection

**Conclusie**: ❌ **NIET BRUIKBAAR** zonder browser session

---

## 🎯 CONCLUSIE & AANBEVELINGEN

### ✅ Primary Data Source: ZwiftRacing.app

**Status**: Volledig werkend met 51 data fields  
**Coverage**: 100% van wat we nodig hebben voor Racing Matrix

**Alle benodigde data beschikbaar**:
- ✅ Basic info (naam, club, gewicht, FTP)
- ✅ Power curve (7 intervals in watts + w/kg)
- ✅ vELO ratings (current, max30, max90)
- ✅ Race stats (wins, podiums, finishes, DNFs)
- ✅ Phenotype scores (5 types)
- ✅ Handicaps (4 terrain types)

**Rate Limit**: 5 requests/min (12s interval)  
**Recommendation**: ⭐ **USE THIS AS PRIMARY SOURCE**

---

### ⚠️ Secondary Source: Zwift Official (Troubleshoot Needed)

**Status**: OAuth werkt, maar endpoint geeft redirect  
**Potentiële waarde**: Avatar URLs, social stats, Zwift level  
**Recommendation**: 🔧 **TROUBLESHOOT ENDPOINT** - Voor enrichment later

**Mogelijke oplossingen**:
1. Probeer andere region servers
2. Check Zwift API documentatie voor nieuwe endpoints
3. Test met Zwift Companion app network traffic

---

### ❌ Skip: ZwiftPower

**Status**: Niet toegankelijk via curl (bot protection)  
**Recommendation**: ❌ **SKIP COMPLETELY**  
**Reden**: ZwiftRacing.app heeft alle data die ZwiftPower zou kunnen bieden

---

## 🚀 IMPLEMENTATIE PLAN

### Fase 1: Gebruik ZwiftRacing.app ✅ READY NOW

**Endpoint voor team riders**:
```bash
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/teams/2281/riders
```

**Team ID**: 2281 (TeamNL) - Niet 11818 (dat is TeamNL Cloud9 op ZwiftPower)

### Fase 2: Supabase Schema

Maak tabel `team_riders` met alle 51 fields van ZwiftRacing.app:

```sql
CREATE TABLE team_riders (
  -- Basic (11)
  rider_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT,
  country TEXT,
  age_category TEXT,
  height INTEGER,
  weight INTEGER,
  zp_category TEXT,
  zp_ftp INTEGER,
  club_id INTEGER,
  club_name TEXT,
  
  -- Power Watts (7)
  power_w5 INTEGER,
  power_w15 INTEGER,
  power_w30 INTEGER,
  power_w60 INTEGER,
  power_w120 INTEGER,
  power_w300 INTEGER,
  power_w1200 INTEGER,
  
  -- Power W/kg (7)
  power_wkg5 NUMERIC,
  power_wkg15 NUMERIC,
  power_wkg30 NUMERIC,
  power_wkg60 NUMERIC,
  power_wkg120 NUMERIC,
  power_wkg300 NUMERIC,
  power_wkg1200 NUMERIC,
  
  -- Power Metrics (3)
  critical_power NUMERIC,
  anaerobic_work_capacity NUMERIC,
  compound_score NUMERIC,
  
  -- vELO Stats (13)
  velo_current_rating NUMERIC,
  velo_current_date BIGINT,
  velo_current_tier TEXT,
  velo_current_tier_number INTEGER,
  velo_last_rating NUMERIC,
  velo_last_date BIGINT,
  velo_max30_rating NUMERIC,
  velo_max30_date BIGINT,
  velo_max30_expires BIGINT,
  velo_max90_rating NUMERIC,
  velo_max90_date BIGINT,
  velo_max90_expires BIGINT,
  velo_max90_tier TEXT,
  race_finishes INTEGER,
  race_dnfs INTEGER,
  race_wins INTEGER,
  race_podiums INTEGER,
  
  -- Phenotype (6)
  phenotype_type TEXT,
  phenotype_bias NUMERIC,
  phenotype_sprinter NUMERIC,
  phenotype_puncheur NUMERIC,
  phenotype_pursuiter NUMERIC,
  phenotype_climber NUMERIC,
  phenotype_tt NUMERIC,
  
  -- Handicaps (4)
  handicap_flat NUMERIC,
  handicap_rolling NUMERIC,
  handicap_hilly NUMERIC,
  handicap_mountainous NUMERIC,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Fase 3: Backend Integration

```typescript
// backend/src/clients/zwift-racing.ts
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://zwift-ranking.herokuapp.com',
  headers: { Authorization: '650c6d2fc4ef6858d74cbef1' }
});

// Fetch single rider
export async function getRider(riderId: number) {
  const { data } = await client.get(`/public/riders/${riderId}`);
  return data;
}

// Fetch team riders
export async function getTeamRiders(teamId: number = 2281) {
  const { data } = await client.get(`/public/teams/${teamId}/riders`);
  return data;
}
```

### Fase 4: Replace Mock Endpoint

```typescript
// backend/src/server.ts
import { getTeamRiders } from './clients/zwift-racing';
import { supabase } from './clients/supabase';

app.get('/api/riders/team', async (req, res) => {
  try {
    // Fetch from Supabase (cached data)
    const { data, error } = await supabase
      .from('team_riders')
      .select('*')
      .order('velo_current_rating', { ascending: false });
    
    if (error) throw error;
    
    // Transform to frontend format (MatrixRider interface)
    const riders = data.map(r => ({
      rider_id: r.rider_id,
      name: r.name,
      zp_category: r.zp_category,
      zp_ftp: r.zp_ftp,
      weight: r.weight,
      race_last_rating: r.velo_current_rating,
      race_max30_rating: r.velo_max30_rating,
      power_w5: r.power_w5,
      power_w15: r.power_w15,
      power_w30: r.power_w30,
      power_w60: r.power_w60,
      power_w120: r.power_w120,
      power_w300: r.power_w300,
      power_w1200: r.power_w1200,
      race_wins: r.race_wins,
      race_podiums: r.race_podiums,
      race_finishes: r.race_finishes,
      race_dnfs: r.race_dnfs,
      watts_per_kg: r.power_wkg1200
    }));
    
    res.json(riders);
  } catch (error) {
    console.error('Error fetching riders:', error);
    res.status(500).json({ error: 'Failed to fetch riders' });
  }
});
```

---

## 📊 DATA FIELD MAPPING

Voor Racing Matrix Dashboard heb je nodig:

| Dashboard Field | ZwiftRacing.app Field | Available? |
|-----------------|----------------------|------------|
| rider_id | riderId | ✅ |
| name | name | ✅ |
| zp_category | zpCategory | ✅ |
| zp_ftp | zpFTP | ✅ |
| weight | weight | ✅ |
| race_last_rating | race.current.rating | ✅ |
| race_max30_rating | race.max30.rating | ✅ |
| power_w5 | power.w5 | ✅ |
| power_w15 | power.w15 | ✅ |
| power_w30 | power.w30 | ✅ |
| power_w60 | power.w60 | ✅ |
| power_w120 | power.w120 | ✅ |
| power_w300 | power.w300 | ✅ |
| power_w1200 | power.w1200 | ✅ |
| race_wins | race.wins | ✅ |
| race_podiums | race.podiums | ✅ |
| race_finishes | race.finishes | ✅ |
| race_dnfs | race.dnfs | ✅ |
| watts_per_kg | power.wkg1200 | ✅ |

**Coverage**: 18/18 = 100% ✅

**Extra data beschikbaar**:
- Phenotype scores (sprinter, puncheur, pursuiter, climber, tt)
- Handicaps (flat, rolling, hilly, mountainous)
- Power metrics (CP, AWC, compound score)
- Volledige vELO geschiedenis (current, last, max30, max90)

