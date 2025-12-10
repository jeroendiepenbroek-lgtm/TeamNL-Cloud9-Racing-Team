# ZwiftRacing.app Riders API Documentation

**Datum**: 9 december 2025  
**Doel**: Direct rider data ophalen zonder club dependency

## 🔑 Authentication

**Header**:
```
Authorization: 650c6d2fc4ef6858d74cbef1
```

**⚠️ BELANGRIJK**: Deze API key is REQUIRED voor alle `/public/riders` endpoints

## 📊 Endpoints

### 1. Get Current Rider Data

**Endpoint**: `GET /public/riders/<riderId>`  
**Base URL**: `https://zwift-ranking.herokuapp.com`  
**Full URL**: `https://zwift-ranking.herokuapp.com/public/riders/150437`

**Headers**:
```
Authorization: 650c6d2fc4ef6858d74cbef1
```

**Rate Limits**: 
- **Standard**: 5 calls every 1 minute
- **Premium**: Higher limits (not documented)

**Response** (Expected 51 fields zoals clubs endpoint):
```json
{
  "id": 150437,
  "name": "JRøne CloudRacer-9 @YT",
  "velo": 1234.56,
  "racing_score": 567.89,
  "ftp": 248,
  "weight": 74.0,
  "height": 180,
  "power_5s": 850,
  "power_15s": 720,
  "power_30s": 650,
  "power_60s": 550,
  "power_120s": 480,
  "power_300s": 400,
  "power_1200s": 320,
  "power_5s_wkg": 11.5,
  "power_15s_wkg": 9.7,
  "power_30s_wkg": 8.8,
  "power_60s_wkg": 7.4,
  "power_120s_wkg": 6.5,
  "power_300s_wkg": 5.4,
  "power_1200s_wkg": 4.3,
  "phenotype": "Sprinter",
  "category": "B",
  "race_count": 127,
  "zwift_id": 150437,
  "country": "NLD",
  "age": null
}
```

### 2. Get Historical Rider Data

**Endpoint**: `GET /public/riders/<riderId>/<time>`  
**Full URL**: `https://zwift-ranking.herokuapp.com/public/riders/150437/1733788800`

**Headers**:
```
Authorization: 650c6d2fc4ef6858d74cbef1
```

**Parameters**:
- `<riderId>`: Zwift ID (integer)
- `<time>`: Unix epoch timestamp **zonder milliseconds** (10 digits)

**Example Time Conversion**:
```javascript
// Current time
const epoch = Math.floor(Date.now() / 1000);  // 1733788800

// Specific date (1 week ago)
const weekAgo = Math.floor(new Date('2024-12-02').getTime() / 1000);
```

**Rate Limits**: Standard - 5 calls every 1 minute

**Use Case**: 
- Track vELO progression over time
- Analyze power curve improvements
- Historical performance comparison

## 🔄 Integration met Current Architecture

### Source Table: api_zwiftracing_public_riders

**Nieuw**: Direct rider endpoint (bypasses club requirement)

```sql
CREATE TABLE IF NOT EXISTS api_zwiftracing_public_riders (
  -- Meta
  rider_id INTEGER PRIMARY KEY,
  source_api TEXT DEFAULT 'zwiftracing.app' NOT NULL,
  endpoint TEXT DEFAULT '/public/riders/{id}' NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Same 51 fields as clubs_riders
  id INTEGER NOT NULL,
  name TEXT,
  velo DECIMAL(10,2),
  racing_score DECIMAL(10,2),
  
  -- Power absolute (watts)
  ftp INTEGER,
  power_5s INTEGER,
  power_15s INTEGER,
  power_30s INTEGER,
  power_60s INTEGER,
  power_120s INTEGER,
  power_300s INTEGER,
  power_1200s INTEGER,
  
  -- Power relative (w/kg)
  power_5s_wkg DECIMAL(5,2),
  power_15s_wkg DECIMAL(5,2),
  power_30s_wkg DECIMAL(5,2),
  power_60s_wkg DECIMAL(5,2),
  power_120s_wkg DECIMAL(5,2),
  power_300s_wkg DECIMAL(5,2),
  power_1200s_wkg DECIMAL(5,2),
  
  -- Physical
  weight DECIMAL(5,2),
  height INTEGER,
  
  -- Classification
  phenotype TEXT,
  category TEXT,
  
  -- Stats
  race_count INTEGER,
  
  -- Additional
  zwift_id INTEGER,
  country TEXT,
  age INTEGER,
  
  -- Raw JSON backup
  raw_response JSONB NOT NULL
);

COMMENT ON TABLE api_zwiftracing_public_riders IS 
  '1:1 mapping van GET /public/riders/{id}. 
   Direct rider data ZONDER club dependency. 
   Gebruikt voor custom team management.';
```

### Fetch Script: fetch-zwiftracing-rider.js

```javascript
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const ZWIFTRACING_API_KEY = '650c6d2fc4ef6858d74cbef1';

async function fetchRider(riderId) {
  const response = await axios.get(
    `https://zwift-ranking.herokuapp.com/public/riders/${riderId}`,
    {
      headers: {
        'Authorization': ZWIFTRACING_API_KEY
      }
    }
  );
  
  // Upload to api_zwiftracing_public_riders
  await supabase.from('api_zwiftracing_public_riders').upsert({
    rider_id: response.data.id,
    id: response.data.id,
    name: response.data.name,
    velo: response.data.velo,
    racing_score: response.data.racing_score,
    // ... all 51 fields
    raw_response: response.data,
    fetched_at: new Date().toISOString()
  });
}
```

## 🎯 Voordelen vs Club Endpoint

| Feature | `/public/clubs/{id}` | `/public/riders/{id}` |
|---------|---------------------|----------------------|
| **Club Required** | ✅ Yes | ❌ No |
| **Rate Limit** | 1/60min (Standard) | 5/60min (Standard) |
| **Max Riders** | 1000 per club | 1 per call |
| **Use Case** | Bulk team sync | Individual rider lookup |
| **Custom Teams** | ❌ No | ✅ Yes |
| **Historical Data** | ❌ No | ✅ Yes (with time param) |

## 🚀 Implementation Plan

### Phase 1: Add New Source Table ✅
```sql
-- migrations/005_add_riders_endpoint.sql
CREATE TABLE api_zwiftracing_public_riders ( ... );
```

### Phase 2: Create Fetch Script
```bash
node fetch-zwiftracing-rider.js 150437
```

### Phase 3: Update Views
```sql
-- v_rider_complete: UNION with new table
FROM api_zwiftracing_public_riders zr
FULL OUTER JOIN api_zwift_api_profiles zo ON zr.rider_id = zo.rider_id
```

### Phase 4: Custom Team Management
- Frontend: Add rider by Zwift ID
- Backend: Fetch via `/public/riders/{id}`
- Database: Store in custom team table
- Views: Join with api_zwiftracing_public_riders

## 📝 Notes

1. **API Key Security**: Store in environment variable
2. **Rate Limiting**: Max 5 riders per minute (Standard)
3. **Caching**: Store responses to avoid re-fetching
4. **Club Independence**: Perfect voor custom team composition
5. **Historical Tracking**: Use time parameter voor progress tracking

## 🔗 Related Endpoints

- **Clubs**: `GET /public/clubs/{id}` (bulk, club-based)
- **Events**: `GET /api/events/upcoming` (race calendar)
- **Event Signups**: `GET /api/events/{id}/signups` (pre-race analysis)
- **Results**: `GET /public/results` (race results)

## ✅ Test Queries

```bash
# Current rider data
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/riders/150437

# Historical data (1 week ago)
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/riders/150437/1733788800
```

## 🎯 Use Cases voor Custom Team Management

1. **Add Rider to Custom Team**: Fetch via rider ID, ongeacht club
2. **Track Individual Progress**: Historical endpoint voor vELO trends
3. **Compare Riders**: Meerdere riders fetchen en vergelijken
4. **Real-time Updates**: Frequent polling binnen rate limits
5. **Multi-Club Teams**: Riders van verschillende clubs samenvoegen
