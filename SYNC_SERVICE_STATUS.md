# Sync Service Status

## Current Implementation

### Architecture
- **Parallel API Sync**: Promise.allSettled voor beide APIs tegelijk
- **Error Handling**: Non-blocking - als 1 API faalt, gaat de andere door
- **Success Criteria**: Sync succesvol als minstens 1 API data levert

### API Status

#### ✅ ZwiftRacing API - WERKEND
- **Endpoint**: `https://zwift-ranking.herokuapp.com/public/riders/{riderId}`
- **Authentication**: Bearer token via ZWIFTRACING_API_TOKEN env var
- **Data**: vELO scores, power curve, race stats, phenotype
- **Status**: ✅ 100% success rate
- **Table**: `api_zwiftracing_riders`

#### ⚠️ Zwift Official API - AUTHENTICATION VEREIST
- **Endpoint**: `https://us-or-rly101.zwift.com/api/profiles/{riderId}`
- **Authentication**: Requires valid Zwift session cookie
- **Data**: Personal info, avatar, weight, height, FTP, following stats
- **Status**: ❌ Returns "Unauthorized" zonder valide cookie
- **Table**: `api_zwift_official_profiles`

### Current Behavior

**When adding a rider:**
1. ✅ ZwiftRacing API sync succeeds → Power data, vELO, race stats saved
2. ❌ Zwift Official API fails → Personal info not saved (maar niet blocking)
3. ✅ Rider toegevoegd aan team_roster (is_active=true)
4. ✅ Rider zichtbaar in Team Dashboard (via v_rider_complete view)

**Logs:**
```
🔄 Syncing rider 150437...
✅ ZwiftRacing data synced for 150437
✅ Rider 150437 synced (Racing: true, Profile: false)
```

### Solution Options

#### Option 1: Obtain Zwift Session Cookie (Recommended)
1. Log in to Zwift website
2. Extract cookie from browser DevTools
3. Set via Railway: `railway variables --set "ZWIFT_COOKIE=<cookie_value>"`
4. Cookie header already implemented in code

#### Option 2: Use Alternative Public API
- Some Zwift data available via public endpoints
- Research needed for unauthenticated profile access

#### Option 3: Skip Zwift Official (Current)
- ZwiftRacing API provides sufficient racing data
- Personal info (avatar, real name) not critical for Racing Matrix
- Power data, vELO, race stats all available from ZwiftRacing

## Data Coverage

### Available from ZwiftRacing API ✅
- vELO scores (live, 30day, 90day)
- Full power curve (5s, 15s, 30s, 60s, 120s, 300s, 1200s)
- Power w/kg values
- FTP
- Race statistics (wins, podiums, finishes, DNFs)
- Phenotype (Sprinter, Climber, etc.)
- Weight, height
- Category (A/B/C/D)

### Missing from Zwift Official (Not Critical)
- Avatar images
- Real first/last name (vs racing name)
- Email, address
- Following/followers count
- Total distance/elevation
- Currently riding status

## Recommendation

**KEEP CURRENT IMPLEMENTATION** - ZwiftRacing API provides all essential racing data. Zwift Official API authentication is complex and data is not critical for Racing Matrix functionality. If user wants avatars/personal info later, can add cookie then.

## US1-US3 Status

### ✅ US1: Team Dashboard Auto-Refresh
- Racing Matrix ververst elke 30 seconden automatisch
- Handmatige "Ververs" button toegevoegd
- Toevoegingen/verwijderingen direct zichtbaar na refresh

### ✅ US2: Dual API Sync
- Beide APIs worden parallel aangeroepen (Promise.allSettled)
- ZwiftRacing: ✅ Werkend
- Zwift Official: ⚠️ Vereist authenticatie (niet blocking)

### ✅ US3: Sync Service Verified
- Parallel execution confirmed in code
- Non-blocking error handling
- Success met minimaal 1 API = rider wordt toegevoegd
- Team roster updates correct
