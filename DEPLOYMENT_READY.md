# 🎯 RACE RESULTS SCANNER - COMPLETE PAKKET

**Status:** ✅ Klaar voor deployment  
**Datum:** 3 januari 2026  
**Implementatie:** 100% ZwiftRacing API (geen HTML scraping)

---

## 📦 Wat is er Klaar?

### 1. ✅ Database Schema
- **Locatie:** `migrations/013_race_results_system.sql` (206 regels)
- **Tabellen:** race_results, race_scan_config, race_scan_log
- **Views:** v_race_results_recent, v_rider_race_stats
- **Functie:** cleanup_old_race_results()

### 2. ✅ Backend Scanner (100% API)
- **Locatie:** `backend/src/server.ts` (regels 3386-3745)
- **Functie:** `scanRaceResults()` - Intelligent race scanning
- **API:** GET `/riders/{id}` + GET `/results/{eventId}`
- **Features:**
  - Smart filtering (alleen mijn riders)
  - Rate limiting (1s riders, 2s events)
  - Auto-stop op 429 errors
  - Comprehensive logging

### 3. ✅ Admin Endpoints
- POST `/api/admin/scan-race-results` - Manual trigger
- GET `/api/admin/scan-status` - Status + logs
- POST `/api/admin/scan-config` - Update settings

### 4. ✅ Cached Results Endpoint
- GET `/api/results/my-riders/cached` - Fast DB retrieval

### 5. ✅ Automated Scheduler
- **Interval:** 60 minuten (configureerbaar)
- **Auto-start:** Bij server startup
- **Routing:** Geïntegreerd in executeSyncJob

---

## 🚀 Deployment Bestanden

### Voor Jou (Copy-Paste Ready):

1. **SUPABASE_MIGRATION_013.sql** (5.5K)
   - Clean SQL voor direct gebruik in Supabase
   - Inclusief verificatie queries
   - Geen dependencies

2. **quick-start-scanner.sh** (2.6K)
   - Interactieve setup wizard
   - Stap-voor-stap met validatie
   - Auto server restart + test

3. **test-race-scanner.sh** (2.7K)
   - Complete test suite (6 tests)
   - JSON formatting met jq
   - Status monitoring

4. **RACE_SCANNER_SETUP.md** (7.6K)
   - Volledige documentatie
   - Troubleshooting guide
   - SQL queries voor monitoring
   - API endpoint reference

---

## 📋 Deployment Stappen (3 minuten)

### Optie A: Quick Start (Aanbevolen)
```bash
./quick-start-scanner.sh
```
Volg de wizard - alles wordt voor je gedaan!

### Optie B: Handmatig

**Stap 1:** Supabase Migration
```bash
# 1. Open Supabase SQL Editor
# 2. Copy-paste: SUPABASE_MIGRATION_013.sql
# 3. Run (F5)
```

**Stap 2:** Server Restart
```bash
lsof -ti:8080 | xargs kill -9
cd backend && npm start &
```

**Stap 3:** Test
```bash
./test-race-scanner.sh
```

---

## 🎯 Wat Gebeurt er?

### Scan Flow:
```
⏰ Elke 60 min → Scanner start
  ↓
📋 Haal alle "my riders" op (is_team_member=true)
  ↓
🔍 Voor elke rider:
  - API: GET /riders/{id} → krijg history (event IDs)
  - Verzamel laatste 20 events
  ↓
🎯 Voor elk uniek event:
  - API: GET /results/{eventId} → krijg complete results
  - Check: zijn mijn riders aanwezig?
  - ✅ JA → Save to race_results (upsert)
  - ❌ NEE → Skip (discard)
  ↓
📊 Update race_scan_config met statistieken
  ↓
💾 Log alles in race_scan_log
  ↓
✅ Klaar! Next scan over 60 minuten
```

### Smart Filtering:
- Alleen events MET mijn riders worden opgeslagen
- Events ZONDER mijn riders worden genegeerd
- Duplicaten worden automatisch voorkomen (UNIQUE constraint)
- Oude data (>1 jaar) wordt automatisch opgeschoond

---

## 📊 Verwachte Resultaten

### Na Eerste Scan (5 riders, actief racing):
- ⏱️ **Duration:** 2-5 minuten
- 🔍 **Events Checked:** 50-100 events
- ✅ **Events Saved:** 10-30 events (met mijn riders)
- 💾 **Results Saved:** 15-50 race results

### Database Usage:
- **Per result:** ~500 bytes
- **100 results:** ~50 KB
- **1000 results/jaar:** ~500 KB
- **Negligible impact** op Supabase free tier

---

## ⚙️ Default Configuratie

```json
{
  "enabled": true,
  "scan_interval_minutes": 60,
  "lookback_hours": 24,
  "max_events_per_scan": 100
}
```

**Betekent:**
- ✅ Scanner actief
- 🕐 Scan elke 60 minuten
- 🔙 Kijk 24 uur terug
- 🎯 Max 100 events per run

---

## 🔍 Monitoring Commands

### Check Scan Status:
```bash
curl http://localhost:8080/api/admin/scan-status | jq '.'
```

### View Recent Results:
```bash
curl http://localhost:8080/api/results/my-riders/cached | jq '.'
```

### Watch Logs Real-time:
```bash
tail -f /tmp/server.log | grep -E "(race|scan|event)"
```

### Database Queries:
```sql
-- Laatste 10 scans
SELECT * FROM race_scan_log ORDER BY started_at DESC LIMIT 10;

-- Laatste 20 results
SELECT * FROM race_results ORDER BY event_date DESC LIMIT 20;

-- Rider statistieken
SELECT * FROM v_rider_race_stats;
```

---

## 🎨 Frontend Integration (Later)

Cached endpoint is klaar voor frontend:
```javascript
// Fast cached data from database
fetch('/api/results/my-riders/cached')
  .then(r => r.json())
  .then(data => {
    console.log('Riders:', data.riders);
    console.log('Rider of Week:', data.riderOfWeek);
    console.log('Total Races:', data.totalRaces);
  });
```

---

## 🆘 Troubleshooting

### ❌ "Cannot coerce to single JSON"
```sql
-- Config tabel is leeg, insert default:
INSERT INTO race_scan_config (enabled, scan_interval_minutes, lookback_hours)
VALUES (true, 60, 24);
```

### ❌ "Rate limit 429"
```bash
# Verhoog interval naar 2 uur:
curl -X POST http://localhost:8080/api/admin/scan-config \
  -H "Content-Type: application/json" \
  -d '{"scan_interval_minutes": 120}'
```

### ❌ "No riders in roster"
```sql
-- Check riders:
SELECT rider_id, racing_name, is_team_member FROM v_rider_complete;

-- Fix:
UPDATE riders SET is_team_member = true WHERE rider_id = 12345;
```

---

## ✅ Checklist

Deployment voltooid als:
- [ ] SUPABASE_MIGRATION_013.sql uitgevoerd
- [ ] 3 tabellen bestaan (race_results, race_scan_config, race_scan_log)
- [ ] 2 views bestaan (v_race_results_recent, v_rider_race_stats)
- [ ] Server herstart met "Scheduler started for race_results"
- [ ] Manual scan succesvol: `curl -X POST .../scan-race-results`
- [ ] Status endpoint werkt: `curl .../scan-status`
- [ ] Cached endpoint werkt: `curl .../my-riders/cached`
- [ ] Data zichtbaar in race_results table
- [ ] Logs zichtbaar in race_scan_log table

---

## 🎉 Success Criteria

Je weet dat het werkt als:
1. ✅ Server logs tonen: "Scheduler started for race_results"
2. ✅ `/api/admin/scan-status` toont laatste scan info
3. ✅ race_results table bevat jouw rider results
4. ✅ race_scan_log toont successful scans
5. ✅ `/api/results/my-riders/cached` geeft data terug

---

## 📞 Support Files

Alle bestanden in root directory:
- `SUPABASE_MIGRATION_013.sql` - Database schema
- `quick-start-scanner.sh` - Interactive setup
- `test-race-scanner.sh` - Test suite
- `RACE_SCANNER_SETUP.md` - Full documentation
- `migrations/013_race_results_system.sql` - Original migration

---

## 🚀 Ready to Go!

**Alles staat klaar. Begin met:**
```bash
./quick-start-scanner.sh
```

Of lees eerst de volledige docs:
```bash
cat RACE_SCANNER_SETUP.md
```

**Happy Racing! 🚴‍♂️💨**
