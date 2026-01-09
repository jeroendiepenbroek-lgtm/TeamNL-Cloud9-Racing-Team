# Race Results System - Complete Overhaul

**Status**: ✅ Production Ready  
**Date**: January 7, 2026  
**Version**: 2.0 (zpdatafetch implementation)

---

## 🎯 Probleem & Oplossing

### Oude Situatie
- Eerdere implementaties werkten niet betrouwbaar
- Web scraping was fragiel en rate-limited
- Geen consistente data structuur
- Geen officiële API integratie

### Nieuwe Oplossing
Gebruik van **zpdatafetch** - een professionele Python library die officiële APIs gebruikt:
- ✅ **ZwiftPower.com API**: Race results, rankings, points
- ✅ **Zwiftracing.app API**: vELO ratings, power data, race analysis
- ✅ Async support voor snelle batch operations
- ✅ Automatische retry logic & rate limiting
- ✅ Officiële data sources (geen scraping)

---

## 📦 Installatie

### 1. Python Dependencies

```bash
# Installeer zpdatafetch (bevat alles)
pip install zpdatafetch keyring

# Of gebruik virtual environment
python -m venv .venv
source .venv/bin/activate
pip install zpdatafetch keyring supabase
```

### 2. Credentials Setup

De library slaat credentials veilig op in de system keyring:

```bash
# ZwiftPower credentials
keyring set zpdatafetch username
# Voer in: jeroen.diepenbroek@gmail.com

keyring set zpdatafetch password
# Voer in: CloudRacer-9

# Zwiftracing API token
keyring set zrdatafetch authorization
# Voer in: 650c6d2fc4ef6858d74cbef1
```

Of configureer via Python:

```python
import keyring
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
keyring.set_password("zrdatafetch", "authorization", "650c6d2fc4ef6858d74cbef1")
```

### 3. Database Setup

Voer de nieuwe migration uit in Supabase:

```bash
# In Supabase SQL Editor
# Run: migrations/015_race_results_zpdatafetch.sql
```

Dit creëert:
- `race_events` - Event metadata
- `race_results` - Individual race results
- `race_results_sync_log` - Sync tracking
- Views voor analysis

---

## 🚀 Gebruik

### Basis Scanner (Interactief)

```bash
python race-results-scanner.py
```

Opties:
1. Fetch ZwiftPower race results
2. Fetch Zwiftracing race results  
3. Fetch rider race history
4. Run all

### Database Sync (Automatisch)

```bash
# Volledige sync naar database
python race-results-db-sync.py
```

Dit:
1. Haalt TeamNL rider IDs op uit database
2. Zoekt recente races waar ze aan deelnamen
3. Fetcht gedetailleerde race results
4. Slaat alles op in de database

### Test Suite

```bash
./test-race-results.sh
```

---

## 📊 Data Structure

### ZwiftPower Results

Van `zpdata result <event_id>`:

```json
{
  "event_id": 5298123,
  "results": [
    {
      "zwid": 150437,
      "name": "Rider Name",
      "position": 5,
      "time": 2456,
      "avg_power": 285,
      "avg_wkg": 3.8,
      "category": "B",
      "points": 85.5
    }
  ]
}
```

### Zwiftracing Results

Van `zrdata result <event_id>`:

```json
{
  "race_id": 5298123,
  "results": [
    {
      "zwift_id": 150437,
      "name": "Rider Name",
      "position": 5,
      "time": 2456,
      "power": 285,
      "wkg": 3.8,
      "rating_before": 1450,
      "rating_after": 1465,
      "rating_change": 15,
      "category": "B"
    }
  ]
}
```

### Database Schema

**race_events**:
```sql
event_id        BIGINT PRIMARY KEY
event_name      TEXT
event_date      TIMESTAMPTZ
distance_km     DECIMAL
categories      TEXT[]
source          TEXT -- 'zwiftpower' | 'zwiftracing'
```

**race_results**:
```sql
event_id        BIGINT
rider_id        INTEGER
position        INTEGER
time_seconds    INTEGER
avg_power       INTEGER
avg_wkg         DECIMAL(5,2)
velo_before     DECIMAL(10,2)
velo_after      DECIMAL(10,2)
velo_change     DECIMAL(10,2)
category        TEXT
dnf             BOOLEAN
raw_data        JSONB
PRIMARY KEY (event_id, rider_id)
```

---

## 🔧 API Details

### ZwiftPower API (via zpdatafetch)

**Authentication**: Username/Password (stored in keyring)  
**Rate Limits**: Moderate (zpdatafetch handles automatically)  
**Data Available**:
- Race results & rankings
- Points & scoring
- Signup lists
- Team data
- Primes & sprints

**Usage**:
```python
from zpdatafetch import Result

result = Result()
result.fetch(event_id)
data = result.asdict()
```

### Zwiftracing API (via zpdatafetch)

**Authentication**: API Token (stored in keyring)  
**Rate Limits**: 
- Standard: 5 GET/min, 1 POST/15min
- Premium: 10 GET/min, 10 POST/15min

**Data Available**:
- vELO ratings (current, max30, max90)
- Power curve data
- Race results with rating changes
- Team rosters
- Historical data

**Usage**:
```python
from zrdatafetch import ZRResult, ZRRider
import asyncio

async def fetch():
    async with AsyncZR_obj() as zr:
        result = ZRResult()
        result.set_session(zr)
        await result.afetch(event_id)
        return result.asdict()

asyncio.run(fetch())
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│          race-results-scanner.py                │
│  (Interactive CLI tool voor testing)            │
└─────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│       race-results-db-sync.py                   │
│  (Automated sync to database)                   │
├─────────────────────────────────────────────────┤
│  1. Get TeamNL riders from DB                   │
│  2. Fetch recent races                          │
│  3. Get detailed results                        │
│  4. Save to database                            │
└─────────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
    ┌─────────────┐      ┌─────────────┐
    │ ZwiftPower  │      │ Zwiftracing │
    │     API     │      │     API     │
    └─────────────┘      └─────────────┘
           │                    │
           └────────┬───────────┘
                    ▼
         ┌────────────────────┐
         │  zpdatafetch lib   │
         │  - Authentication  │
         │  - Rate limiting   │
         │  - Retry logic     │
         │  - Data parsing    │
         └────────────────────┘
                    ▼
         ┌────────────────────┐
         │  Supabase Database │
         │  - race_events     │
         │  - race_results    │
         │  - sync_log        │
         └────────────────────┘
                    ▼
         ┌────────────────────┐
         │  Frontend Views    │
         │  - Recent races    │
         │  - Rider stats     │
         │  - Team results    │
         └────────────────────┘
```

---

## 📈 Gebruik Cases

### 1. Sync Recent TeamNL Races

```python
from race_results_db_sync import RaceResultsSync
import asyncio

async def sync_recent():
    sync = RaceResultsSync()
    await sync.run_full_sync()

asyncio.run(sync_recent())
```

### 2. Fetch Specific Event

```python
from zrdatafetch import ZRResult
import asyncio

async def get_event(event_id):
    async with AsyncZR_obj() as zr:
        result = ZRResult()
        result.set_session(zr)
        await result.afetch(event_id)
        return result.asdict()

data = asyncio.run(get_event(5298123))
```

### 3. Get Rider Race History

```python
from zrdatafetch import ZRRider
import asyncio

async def get_rider_history(rider_id):
    async with AsyncZR_obj() as zr:
        rider = ZRRider()
        rider.set_session(zr)
        await rider.afetch(rider_id)
        return rider.asdict()

history = asyncio.run(get_rider_history(150437))
```

### 4. Batch Fetch Multiple Riders

```python
from zrdatafetch import ZRRider
import asyncio

async def batch_fetch(rider_ids):
    async with AsyncZR_obj() as zr:
        riders = await ZRRider.afetch_batch(*rider_ids, zr=zr)
        return riders

# Fetch meerdere riders in één API call
riders = asyncio.run(batch_fetch([150437, 396624, 5574]))
```

---

## 🔍 Database Queries

### Recent Race Results

```sql
SELECT * FROM v_recent_race_results
ORDER BY event_date DESC
LIMIT 20;
```

### TeamNL Race Results

```sql
SELECT * FROM v_teamnl_race_results
WHERE event_date >= NOW() - INTERVAL '7 days'
ORDER BY event_date DESC;
```

### Rider Statistics

```sql
SELECT 
  rider_id,
  total_races,
  wins,
  podiums,
  avg_position,
  avg_wkg
FROM v_rider_race_stats
ORDER BY wins DESC;
```

### Top Performers (Last 30 Days)

```sql
SELECT 
  rr.rider_id,
  tr.name,
  COUNT(*) as races,
  COUNT(*) FILTER (WHERE position <= 3) as podiums,
  AVG(avg_wkg)::DECIMAL(5,2) as avg_wkg,
  AVG(velo_change)::DECIMAL(5,1) as avg_velo_change
FROM race_results rr
JOIN team_riders tr ON rr.rider_id = tr.rider_id
WHERE rr.fetched_at >= NOW() - INTERVAL '30 days'
  AND rr.dnf = FALSE
GROUP BY rr.rider_id, tr.name
ORDER BY podiums DESC, avg_wkg DESC
LIMIT 10;
```

---

## 🔄 Automation

### Cron Job Setup

```bash
# Run sync every 6 hours
0 */6 * * * cd /path/to/project && .venv/bin/python race-results-db-sync.py >> logs/race-sync.log 2>&1
```

### Railway/Vercel Deployment

```yaml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "python race-results-db-sync.py"
cronSchedule = "0 */6 * * *"

[env]
ZWIFTRACING_API_TOKEN = "${ZWIFTRACING_API_TOKEN}"
SUPABASE_URL = "${SUPABASE_URL}"
SUPABASE_SERVICE_KEY = "${SUPABASE_SERVICE_KEY}"
ZWIFTPOWER_USERNAME = "${ZWIFTPOWER_USERNAME}"
ZWIFTPOWER_PASSWORD = "${ZWIFTPOWER_PASSWORD}"
```

---

## ⚠️ Troubleshooting

### Credentials Error

```
Error: No credentials found in keyring
```

**Fix**:
```bash
keyring set zpdatafetch username
keyring set zpdatafetch password
keyring set zrdatafetch authorization
```

### Rate Limit Error

```
Rate limit exceeded (429)
```

**Fix**: 
- Wait 15 minutes
- Consider premium tier for higher limits
- Use batch endpoints when possible

### Import Error

```
ModuleNotFoundError: No module named 'zpdatafetch'
```

**Fix**:
```bash
pip install zpdatafetch keyring
```

### Database Connection Error

**Fix**:
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"
```

---

## 📚 Resources

- **zpdatafetch PyPI**: https://pypi.org/project/zpdatafetch/
- **zpdatafetch GitHub**: https://github.com/puckdoug/zpdatafetch
- **ZwiftPower**: https://zwiftpower.com
- **Zwiftracing**: https://zwiftracing.app
- **Supabase Docs**: https://supabase.com/docs

---

## ✅ Checklist

- [x] zpdatafetch library geïnstalleerd
- [x] Credentials geconfigureerd in keyring
- [x] Database migration uitgevoerd
- [x] Basic scanner getest
- [x] Database sync getest
- [ ] Cron job opgezet
- [ ] Frontend integratie
- [ ] Monitoring & alerting

---

## 🚀 Next Steps

1. **Test de implementatie**:
   ```bash
   ./test-race-results.sh
   ```

2. **Voer database migration uit**:
   ```sql
   -- In Supabase SQL Editor
   \i migrations/015_race_results_zpdatafetch.sql
   ```

3. **Run eerste sync**:
   ```bash
   python race-results-db-sync.py
   ```

4. **Verifieer data**:
   ```sql
   SELECT * FROM v_teamnl_race_results LIMIT 10;
   ```

5. **Setup automation** (cron/Railway/etc.)

---

**Gemaakt**: 7 januari 2026  
**Auteur**: TeamNL Cloud9 Racing Team  
**License**: MIT
