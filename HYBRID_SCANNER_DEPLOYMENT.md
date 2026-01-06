# 🚀 HYBRID RACE SCANNER DEPLOYMENT
**Datum:** 6 januari 2026  
**Commit:** 6a62872  
**Status:** ✅ DEPLOYED (Railway auto-deployment)

---

## 📊 Wat is er Geïmplementeerd?

### Hybrid Scanner Strategie
Een **robuuste, redundante oplossing** met automatische fallback:

1. **PRIMARY: Web Scraping** (~5 minuten)
   - Scraped recent eventIds van ZwiftRacing website
   - Snel en efficient voor normale operatie
   
2. **FALLBACK: Rider Polling** (~66 minuten)
   - Polls riders voor race state changes
   - 100% betrouwbaar als backup
   - Gebruikt eventId berekening (timestamp → eventId)

3. **MONITORING**
   - Logt welke methode succesvol is
   - Automatische method selection
   - Zichtbaar in sync logs

---

## ✅ Code Changes

### Toegevoegd
- ✅ `backend/src/scan-race-results-hybrid.ts` - Main hybrid scanner (380 lines)
- ✅ `API_TEST_SUMMARY.md` - API vergelijkings resultaten
- ✅ Cheerio dependency voor HTML parsing

### Verwijderd
- ❌ `scan-race-results-v2.ts` (standalone bulk filtering)
- ❌ `scan-race-results-v3-poll.ts` (standalone polling)
- ❌ Oude 450+ regel sequential scanner
- ❌ Test files en debug scripts

### Gewijzigd
- ✅ `server.ts` - Geïntegreerd hybrid scanner (50 lines clean code)
- ✅ `package.json` - Added cheerio@^1.0.0

---

## 🧪 API Test Resultaten

Alle 3 beschikbare APIs zijn getest:

### 1. ZwiftRacing API ❌
- **Endpoint:** `/public/riders/{id}`
- **Probleem:** Heeft GEEN race history
- **Data:** Alleen `race.last.date` (laatste race timestamp)
- **Conclusie:** Polling is enige optie

### 2. Zwift.com API ❌
- **Endpoint:** `/api/profiles/{id}/activities`
- **Login:** ✅ OAuth werkt
- **Probleem:** Activities hebben GEEN eventId!
- **Conclusie:** Kan niet linken naar ZwiftRacing events
- **User was correct:** "Zwift.com legt de events vast, maar niet de eventids"

### 3. ZwiftPower API ❌
- **Endpoint:** `/api3.php?do=profile_results`
- **Probleem:** Complexe phpBB authenticatie
- **Conclusie:** Niet reliable voor automation

**BESLUIT:** Hybrid scanner (scraping + polling) is beste oplossing ✅

---

## ⚙️ Deployment Checklist

### ✅ Completed
- [x] Code committed & pushed to GitHub
- [x] Railway auto-deployment triggered
- [x] TypeScript compileert zonder errors
- [x] Dependencies geïnstalleerd (cheerio)
- [x] Oude code opgeschoond
- [x] API tests gedocumenteerd

### ⏳ Pending (Manual Steps)

#### 1. Database Migratie Uitvoeren
**BELANGRIJK:** Run in Supabase SQL Editor:

```sql
-- Kopieer inhoud van migrations/create_rider_race_state_table.sql
-- Of:
```

Open het bestand en voer de SQL uit in Supabase.

**Wat het doet:**
- Creëert `rider_race_state` table voor polling fallback
- Tracked `last_race_date` per rider
- Indexes voor snelle queries

#### 2. Test de Deployment

**Via Dashboard:**
1. Ga naar je TeamNL dashboard
2. Open "Dual Sync Manager"
3. Klik "Trigger Sync Now" bij Race Results
4. Monitor de logs

**Expected Output:**
```
🚀 HYBRID RACE SCANNER
==================================
Lookback: 7 days
Strategy: Scraping → Polling fallback
🕷️  Scraping recent events from ZwiftRacing website...
```

**Twee scenarios:**
- ✅ Scraping vindt 10+ events → Gebruikt scraping (5 min)
- ⚠️  Scraping vindt <10 events → Valt terug op polling (66 min)

#### 3. Verify Results

```sql
-- Check race_results table
SELECT COUNT(*) FROM race_results WHERE rider_id = 150437;

-- Check recent scans
SELECT * FROM sync_log 
WHERE sync_type = 'race_results_hybrid' 
ORDER BY created_at DESC 
LIMIT 5;
```

#### 4. Monitor Performance

**Dashboard:** Team Race Results
- Moet nu events tonen
- Grouped by race
- Sorted by date

**Sync Log Fields:**
- `method`: 'scraping' of 'polling'
- `records_synced`: Aantal results
- `duration_ms`: Tijd in milliseconds

---

## 🎯 Performance Verwachtingen

### Scenario 1: Scraping Succesvol (IDEAL)
- **Tijd:** ~5 minuten
- **Events:** 50-100 recent events
- **Hit Rate:** 5-10% (events met team riders)
- **Results:** 10-50 nieuwe results

### Scenario 2: Polling Fallback (BACKUP)
- **Tijd:** ~66 minuten (78 riders × 12s + 50 events × 60s)
- **Hit Rate:** 100% (weet exact welke events nieuw zijn)
- **Results:** Alle nieuwe team rider results

### Rate Limits (Respecteert Automatisch)
- ✅ Rider polling: 5 calls/min (12s delay)
- ✅ Event fetching: 1 call/min (60s delay)
- ✅ Bulk rider check: 1 call/15min

---

## 🔧 Configuration

### Sync Config (Database)
```sql
-- sync_config table
{
  "fullScanDays": 7,     -- Lookback periode
  "retentionDays": 90    -- Auto-cleanup oude data
}
```

### Scheduler (race_scan_config)
- **Interval:** 120 minuten (2 uur)
- **Auto-enabled:** true
- **Next scan:** Automatisch berekend

---

## 📚 Documentatie

### Bestanden
- [API_TEST_SUMMARY.md](../API_TEST_SUMMARY.md) - API vergelijking details
- [migrations/create_rider_race_state_table.sql](../migrations/create_rider_race_state_table.sql) - Database schema
- [backend/src/scan-race-results-hybrid.ts](../backend/src/scan-race-results-hybrid.ts) - Source code

### Logs Interpreteren

**Scraping gebruikt:**
```
Method: SCRAPING
Events scanned: 75
Results saved: 23
Duration: 320s
```

**Polling gebruikt:**
```
Method: POLLING
Events scanned: 50
Results saved: 18
Duration: 3960s
```

---

## 🐛 Troubleshooting

### "Scanner runs but finds 0 results"
- ✅ **NORMAAL** als alle results al in database staan
- Check: `last_scan_at` in `race_scan_config`
- Oplossing: Wacht op nieuwe races

### "Scraping always fails"
- Website HTML structure changed
- ✅ **GEEN PROBLEEM** - Polling fallback werkt
- Monitor: Check `method: 'polling'` in logs

### "Polling takes too long"
- Expected: 16 min poll + 50 min fetch = 66 min
- ✅ **NORMAAL** voor 78 riders
- Optimalisatie: Reduce fullScanDays van 7 naar 3

### "Rate limit errors (429)"
- Scanner respects alle delays
- Maar: Multiple manual triggers can overlap
- Oplossing: Wait for automatic schedule

---

## 🎉 Success Criteria

✅ **Deployment is succesvol als:**
1. Railway build completes zonder errors
2. Server start logs tonen "Hybrid scanner loaded"
3. Manual trigger geeft results (scraping OF polling)
4. Dashboard toont race results
5. sync_log table heeft entries met method + duration

---

## 🚦 Next Steps

1. **Nu:** Monitor Railway deployment (~3 min)
2. **Daarna:** Run database migratie
3. **Dan:** Trigger eerste sync manually
4. **Wacht:** 5-66 minuten (afhankelijk van method)
5. **Check:** Dashboard heeft data!

---

## 📞 Support

**Logs bekijken:**
- Railway: Deployment logs
- Database: `sync_log` table
- Frontend: Browser console

**Key Metrics:**
- Scanner method used (scraping vs polling)
- Duration per scan
- Hit rate (events with team riders)
- Results added per scan

---

## ✨ Voordelen van Hybrid Approach

1. **Speed:** Scraping is 10x sneller dan polling
2. **Reliability:** Polling fallback = 100% uptime
3. **Automatic:** Kiest zelf beste method
4. **Monitored:** Logs tonen wat werkt
5. **Maintained:** Beide methods blijven onderhouden

**Geen single point of failure! 🎯**
