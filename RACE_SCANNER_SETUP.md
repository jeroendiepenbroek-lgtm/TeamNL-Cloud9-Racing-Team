# 🔍 Race Results Scanner - Setup Guide

**Datum:** 3 januari 2026  
**Implementatie:** 100% ZwiftRacing API (geen HTML scraping)

---

## 📋 Stap 1: Supabase Migratie Uitvoeren

### 1.1 Open Supabase SQL Editor
```
https://supabase.com/dashboard/project/[jouw-project-id]/sql
```

### 1.2 Run Migration 013
1. Klik op **"New Query"**
2. Kopieer **VOLLEDIG** script hieronder:

```sql
-- Het COMPLETE migration script staat in:
-- migrations/013_race_results_system.sql (206 regels)
```

3. Plak in SQL Editor
4. Druk **F5** of klik **"Run"**

### 1.3 Verifieer Tabellen
```sql
-- Check of tabellen zijn aangemaakt
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'race_%';
```

**Verwacht resultaat:**
- ✅ `race_results` (opslag race data)
- ✅ `race_scan_config` (scanner instellingen)
- ✅ `race_scan_log` (audit trail)

### 1.4 Check Views
```sql
-- Check of views zijn aangemaakt
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name LIKE 'v_race_%';
```

**Verwacht resultaat:**
- ✅ `v_race_results_recent` (laatste 90 dagen)
- ✅ `v_rider_race_stats` (rider statistieken)

---

## 🚀 Stap 2: Server Herstarten

```bash
# Stop oude server
lsof -ti:8080 | xargs kill -9 2>/dev/null

# Start nieuwe server
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
npm start > /tmp/server.log 2>&1 &

# Check of scanner is gestart
tail -20 /tmp/server.log | grep -E "(race_results|Scheduler)"
```

**Verwacht output:**
```
🔄 Scheduler started for race_results: every 60 minutes
📅 Next race_results sync: 3-1-2026, 18:00:00
```

---

## 🧪 Stap 3: Test Scanner

### Option A: Gebruik Test Script (Aanbevolen)
```bash
# Run volledige test suite
./test-race-scanner.sh
```

### Option B: Handmatige Tests

#### Test 1: Check Status
```bash
curl http://localhost:8080/api/admin/scan-status | jq '.'
```

#### Test 2: Trigger Manual Scan
```bash
curl -X POST http://localhost:8080/api/admin/scan-race-results
```

#### Test 3: Monitor Logs
```bash
# Real-time logs
tail -f /tmp/server.log

# Of in database
SELECT * FROM race_scan_log ORDER BY started_at DESC LIMIT 5;
```

#### Test 4: Check Results
```bash
# Via API
curl http://localhost:8080/api/results/my-riders/cached | jq '.'

# Of in database
SELECT 
  event_name, 
  rider_name, 
  position, 
  total_riders,
  velo_rating
FROM race_results 
ORDER BY event_date DESC 
LIMIT 10;
```

---

## ⚙️ Stap 4: Configureer Scanner

### 4.1 Default Settings
```json
{
  "enabled": true,
  "scan_interval_minutes": 60,
  "lookback_hours": 24,
  "max_events_per_scan": 100
}
```

### 4.2 Update Settings
```bash
curl -X POST http://localhost:8080/api/admin/scan-config \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "scan_interval_minutes": 120,
    "lookback_hours": 48,
    "max_events_per_scan": 150
  }'
```

### 4.3 Settings Uitleg

| Setting | Beschrijving | Aanbevolen |
|---------|-------------|------------|
| `enabled` | Scanner aan/uit | `true` |
| `scan_interval_minutes` | Hoe vaak scannen | `60` (elk uur) |
| `lookback_hours` | Hoeveel uur terug | `24` (laatste dag) |
| `max_events_per_scan` | Max events per run | `100` |

**Tips:**
- 🏁 **Veel races?** → Verhoog `lookback_hours` naar 48
- ⚡ **API limits?** → Verlaag `max_events_per_scan` naar 50
- 🔄 **Frequent updates?** → Verlaag `scan_interval_minutes` naar 30

---

## 🔍 Stap 5: Monitoring & Troubleshooting

### 5.1 Check Scan Logs
```sql
SELECT 
  started_at,
  status,
  events_checked,
  events_with_my_riders,
  results_saved,
  duration_seconds,
  error_message
FROM race_scan_log 
ORDER BY started_at DESC 
LIMIT 10;
```

### 5.2 Check Recent Results
```sql
SELECT 
  event_name,
  event_date,
  rider_name,
  position,
  total_riders,
  category,
  velo_rating,
  velo_change
FROM v_race_results_recent
ORDER BY event_date DESC
LIMIT 20;
```

### 5.3 Rider Statistics
```sql
SELECT 
  rc.racing_name,
  rs.total_races,
  rs.total_wins,
  rs.total_podiums,
  rs.avg_position,
  rs.avg_wkg,
  rs.max_velo,
  rs.last_race_date
FROM v_rider_race_stats rs
JOIN v_rider_complete rc ON rs.rider_id = rc.rider_id
WHERE rc.is_team_member = true
ORDER BY rs.total_races DESC;
```

### 5.4 Common Issues

#### ❌ "Cannot coerce to single JSON object"
**Oorzaak:** race_scan_config table leeg  
**Fix:**
```sql
INSERT INTO race_scan_config (enabled, scan_interval_minutes, lookback_hours)
VALUES (true, 60, 24);
```

#### ❌ "Rate limit 429"
**Oorzaak:** Te veel API calls  
**Fix:**
```bash
# Verhoog interval
curl -X POST http://localhost:8080/api/admin/scan-config \
  -H "Content-Type: application/json" \
  -d '{"scan_interval_minutes": 120}'
```

#### ❌ "No riders in roster"
**Oorzaak:** Geen riders met `is_team_member=true`  
**Fix:**
```sql
-- Check riders
SELECT rider_id, racing_name, is_team_member 
FROM v_rider_complete;

-- Update indien nodig
UPDATE riders SET is_team_member = true WHERE rider_id IN (...);
```

---

## 📊 API Endpoints Overzicht

### Admin Endpoints

| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| POST | `/api/admin/scan-race-results` | Trigger manual scan |
| GET | `/api/admin/scan-status` | View status + logs |
| POST | `/api/admin/scan-config` | Update settings |

### Public Endpoints

| Method | Endpoint | Beschrijving |
|--------|----------|-------------|
| GET | `/api/results/my-riders/cached` | Fast cached results |
| GET | `/api/results/my-riders` | Live scraping (slow) |

---

## 🎯 Hoe het Werkt

### Scan Process Flow
```
1. ⏰ Scheduler triggers (elke 60 min)
   ↓
2. 📋 Haal alle "my riders" op uit database
   ↓
3. 🔍 Voor elke rider:
   - GET /api/public/riders/{riderId} → History
   - Verzamel laatste 20 event IDs
   ↓
4. 🎯 Voor elk uniek event:
   - GET /api/public/results/{eventId} → Results
   - Check: zijn mijn riders aanwezig?
   - ✅ JA → Save to database (upsert)
   - ❌ NEE → Skip event
   ↓
5. 📊 Update statistics
   ↓
6. 💾 Log alles in race_scan_log
```

### Rate Limiting
- **1 sec** tussen riders
- **2 sec** tussen events
- **Auto-stop** bij 429 Too Many Requests

### Smart Filtering
- ✅ Alleen events met mijn riders worden opgeslagen
- ✅ Upsert voorkomt duplicaten
- ✅ Automatic cleanup van oude data (>1 jaar)

---

## 📈 Expected Results

Na eerste scan (met ~5 riders):
- ⏱️ **Duration:** 2-5 minuten
- 🔍 **Events Checked:** 50-100
- ✅ **Events Saved:** 5-20 (afhankelijk van racing activiteit)
- 💾 **Results Saved:** 10-50

---

## 🔧 Maintenance

### Cleanup Old Data
```sql
-- Manual cleanup (>1 year)
SELECT cleanup_old_race_results();

-- Or set up cron job in Supabase
-- See: https://supabase.com/docs/guides/database/extensions/pg_cron
```

### Reset Scanner
```sql
-- Clear all race results
TRUNCATE race_results CASCADE;

-- Clear scan logs
TRUNCATE race_scan_log;

-- Reset config
UPDATE race_scan_config SET
  last_scan_at = NULL,
  last_scan_events_checked = 0,
  last_scan_events_saved = 0;
```

---

## ✅ Checklist

- [ ] Migration 013 uitgevoerd in Supabase
- [ ] Tabellen aanwezig: race_results, race_scan_config, race_scan_log
- [ ] Views aanwezig: v_race_results_recent, v_rider_race_stats
- [ ] Default config insert uitgevoerd
- [ ] Server herstart met scheduler actief
- [ ] Manual scan getriggerd en succesvol
- [ ] Results zichtbaar in database
- [ ] Scan logs zichtbaar in race_scan_log
- [ ] Cached endpoint werkt: /api/results/my-riders/cached

---

## 📞 Support

Bij problemen, check:
1. Server logs: `tail -f /tmp/server.log`
2. Supabase logs in dashboard
3. race_scan_log table voor errors
4. Network tab in browser DevTools

**Happy Racing! 🚴‍♂️💨**
