# Scheduler Configuration Guide
**Laatste update**: 28 oktober 2025

---

## 📅 Huidige Scheduler Schema

### Overzicht
```
┌─────────────────────────────────────────────────────────────────┐
│ Job             │ Interval          │ Duur     │ Rate Limit     │
├─────────────────────────────────────────────────────────────────┤
│ Favorites Sync  │ Elke 4 uur        │ ~2 min   │ 12s/rider      │
│ Club Sync       │ 2x per dag        │ 61+ min  │ 60 min/club    │
│ Forward Scan    │ Dagelijks 02:00   │ 17+ uur  │ 61s/event      │
│ Cleanup         │ Dagelijks 03:00   │ <1 min   │ N/A            │
└─────────────────────────────────────────────────────────────────┘
```

### Dagelijks Tijdschema
```
00:00 ─┬─ Favorites Sync (4u interval)
       │
02:00 ─┼─ Forward Scan START ───────────────────────────────┐
       │                                                      │
03:00 ─┼─ Cleanup (tijdens forward scan)                     │
       │                                                      │
04:00 ─┼─ Favorites Sync                                     │
       │                                                      │
06:00 ─┼─ Club Sync #1 START ───┐                           │
       │                          │                           │
07:00+ ┼─ (Club sync loopt)      │ (3+ clubs = 3+ uur)      │
       │                          │                           │
08:00 ─┼─ Favorites Sync         │                           │
       │                          ▼                           │
09:00+ ┼─ Club Sync #1 END ──────┘                           │
       │                                                      │
12:00 ─┼─ Favorites Sync                                     │
       │                                                      │
16:00 ─┼─ Favorites Sync                                     │
       │                                                      │
18:00 ─┼─ Club Sync #2 START ───┐                           │
       │                          │                           │
19:00+ ┼─ (Club sync loopt)      │ (3+ clubs = 3+ uur)      │
       │                          ▼                           │
19:00+ └─ Forward Scan END ──────────────────────────────────┘
20:00    Favorites Sync
21:00+   Club Sync #2 END
```

---

## ⚙️ Job Configuratie Details

### 1️⃣ Favorites Sync (Step 2)

**Doel**: Update stats van alle favorite riders (FTP, ranking, power curve, etc.)

**Configuratie**:
```bash
FAVORITES_SYNC_ENABLED=true
FAVORITES_SYNC_CRON=0 */4 * * *  # Elke 4 uur
FAVORITES_SYNC_ON_STARTUP=false
```

**Timings**:
- **Interval**: Elke 4 uur (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
- **Duur**: ~2 minuten (10 riders × 12 sec)
- **API Calls**: 1 call per rider (rate limit: 5/min = 12 sec/rider)

**Waarom elke 4 uur?**
- ✅ Balans tussen data versheid en API gebruik
- ✅ 6x per dag = goede coverage van training sessions
- ✅ Niet te agressief (batterij/resources)

**Aanpassen?**
```bash
# Vaker syncen (elke 2 uur):
FAVORITES_SYNC_CRON=0 */2 * * *

# Minder vaak (elke 6 uur):
FAVORITES_SYNC_CRON=0 */6 * * *

# Alleen overdag (8u-20u, elke 4u):
FAVORITES_SYNC_CRON=0 8,12,16,20 * * *

# Specifieke tijden:
FAVORITES_SYNC_CRON=0 6,12,18 * * *  # 06:00, 12:00, 18:00
```

---

### 2️⃣ Club Rosters Sync (Step 4)

**Doel**: Sync alle leden van favorite clubs (basis stats + isFavorite linking)

**Configuratie**:
```bash
CLUB_SYNC_ENABLED=true
CLUB_SYNC_CRON=0 6,18 * * *  # 2x per dag (06:00 en 18:00)
CLUB_SYNC_ON_STARTUP=false
```

**Timings**:
- **Interval**: 2x per dag (06:00 en 18:00)
- **Duur per club**: 61+ minuten (API rate limit!)
- **Totale duur**: 61 min × aantal clubs
  - 1 club = 61 min
  - 2 clubs = 122 min (2u 2min)
  - 3 clubs = 183 min (3u 3min)

**⚠️ BELANGRIJKE LIMITATIES**:
- API rate limit: **1 call per 60 minuten per club**
- Service wacht automatisch 61 min tussen clubs
- Bij 3 clubs duurt 1 cyclus 3+ uur!

**Waarom 2x per dag?**
- ✅ Respecteert API rate limit
- ✅ Ochtend (06:00) = vers overzicht start dag
- ✅ Avond (18:00) = update na trainingen
- ✅ Geen overlap met forward scan (nacht)

**Aanpassen?**
```bash
# 1x per dag (ochtend):
CLUB_SYNC_CRON=0 6 * * *

# 3x per dag (als API het toelaat):
CLUB_SYNC_CRON=0 6,14,22 * * *

# Alleen op werkdagen:
CLUB_SYNC_CRON=0 6,18 * * 1-5  # Maandag-Vrijdag

# Weekend anders:
# (requires multiple cron entries in code)
```

---

### 3️⃣ Forward Event Scan (Step 5)

**Doel**: Scan nieuwe events en bewaar resultaten van tracked riders

**Configuratie**:
```bash
FORWARD_SCAN_ENABLED=false  # ⚠️ Standaard UIT
FORWARD_SCAN_CRON=0 2 * * *  # Dagelijks 02:00
FORWARD_SCAN_MAX_EVENTS=1000
FORWARD_SCAN_RETENTION_DAYS=100
FORWARD_SCAN_ON_STARTUP=false  # NOOIT AANZETTEN!
```

**Timings**:
- **Interval**: 1x per dag (02:00)
- **Duur**: ~17 uur (1000 events × 61 sec)
- **API Calls**: 1 call per event (rate limit: 1/min)

**⚠️ KRITIEKE WAARSCHUWING**:
- 1000 events = **17+ uur** scan tijd!
- Start om 02:00 → eindigt rond 19:00+
- Loopt door overdag (geen probleem, non-blocking)
- **NOOIT** `FORWARD_SCAN_ON_STARTUP=true` gebruiken!

**Waarom dagelijks 02:00?**
- ✅ 's Nachts starten = minder impact overdag
- ✅ Eindigt voor einde werkdag
- ✅ Geen overlap met andere sync jobs
- ✅ Consistent ritme

**Aanpassen?**
```bash
# Minder events (sneller, minder coverage):
FORWARD_SCAN_MAX_EVENTS=500  # ~8.5 uur

# Meer events (langzamer, betere coverage):
FORWARD_SCAN_MAX_EVENTS=2000  # ~34 uur (loopt 2 dagen!)

# Andere starttijd:
FORWARD_SCAN_CRON=0 1 * * *  # 01:00
FORWARD_SCAN_CRON=0 23 * * *  # 23:00 vorige avond

# Om de 2 dagen (minder load):
FORWARD_SCAN_CRON=0 2 */2 * *
```

**Kleine scans (test/debug)**:
```bash
FORWARD_SCAN_MAX_EVENTS=10  # Test: 10 events = ~10 min
FORWARD_SCAN_MAX_EVENTS=50  # Small: 50 events = ~51 min
FORWARD_SCAN_MAX_EVENTS=100 # Medium: 100 events = ~1.7 uur
```

---

### 4️⃣ Data Cleanup (Retention Policy)

**Doel**: Archiveer events ouder dan 100 dagen (soft delete + hard delete results)

**Configuratie**:
```bash
CLEANUP_ENABLED=true
CLEANUP_CRON=0 3 * * *  # Dagelijks 03:00
CLEANUP_RETENTION_DAYS=100
```

**Timings**:
- **Interval**: 1x per dag (03:00)
- **Duur**: < 1 minuut (database queries)
- **API Calls**: Geen (pure database operatie)

**Waarom dagelijks 03:00?**
- ✅ Tijdens forward scan (low impact)
- ✅ Database onderhoud 's nachts
- ✅ Voor meeste mensen slapen

**Aanpassen?**
```bash
# Langere retentie:
CLEANUP_RETENTION_DAYS=180  # 6 maanden
CLEANUP_RETENTION_DAYS=365  # 1 jaar

# Minder vaak (wekelijks):
CLEANUP_CRON=0 3 * * 0  # Elke zondag 03:00

# Andere tijd:
CLEANUP_CRON=0 4 * * *  # 04:00
```

---

## 🎛️ Profiel Presets

### Profiel 1: Development (Lage Frequentie)
**Use case**: Testing, low API usage, development
```bash
FAVORITES_SYNC_ENABLED=false
CLUB_SYNC_ENABLED=false
FORWARD_SCAN_ENABLED=false
CLEANUP_ENABLED=false
```

### Profiel 2: Production Light (Gemiddelde Frequentie)
**Use case**: Normaal gebruik, balans tussen versheid en resources
```bash
FAVORITES_SYNC_ENABLED=true
FAVORITES_SYNC_CRON=0 */6 * * *  # Elke 6 uur

CLUB_SYNC_ENABLED=true
CLUB_SYNC_CRON=0 7,19 * * *  # 2x per dag (07:00, 19:00)

FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_CRON=0 2 * * *  # Dagelijks 02:00
FORWARD_SCAN_MAX_EVENTS=500  # ~8.5 uur

CLEANUP_ENABLED=true
CLEANUP_CRON=0 3 * * *
```

### Profiel 3: Production Aggressive (Hoge Frequentie)
**Use case**: Pro team, maximale data versheid, alle features
```bash
FAVORITES_SYNC_ENABLED=true
FAVORITES_SYNC_CRON=0 */2 * * *  # Elke 2 uur

CLUB_SYNC_ENABLED=true
CLUB_SYNC_CRON=0 6,14,22 * * *  # 3x per dag

FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_CRON=0 1 * * *  # Dagelijks 01:00
FORWARD_SCAN_MAX_EVENTS=1000

CLEANUP_ENABLED=true
CLEANUP_CRON=0 4 * * *
```

### Profiel 4: Weekend Only
**Use case**: Amateur team, alleen weekend races belangrijk
```bash
FAVORITES_SYNC_ENABLED=true
FAVORITES_SYNC_CRON=0 8,14,20 * * 0,6  # Za+Zo: 08:00, 14:00, 20:00

CLUB_SYNC_ENABLED=true
CLUB_SYNC_CRON=0 7,19 * * 0,6  # Za+Zo: 07:00, 19:00

FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_CRON=0 2 * * 1  # Elke maandag 02:00 (weekend data)

CLEANUP_ENABLED=true
CLEANUP_CRON=0 3 * * 1  # Maandag 03:00
```

---

## 🔧 Advanced Configuration

### Startup Sync Options

**⚠️ Gebruik met voorzichtigheid!**

```bash
# Favorites sync bij opstarten (OK, duurt ~2 min):
FAVORITES_SYNC_ON_STARTUP=true

# Club sync bij opstarten (OK, kan 1-3 uur duren):
CLUB_SYNC_ON_STARTUP=true

# Forward scan bij opstarten (❌ NOOIT DOEN - 17+ uur!):
FORWARD_SCAN_ON_STARTUP=false  # ALTIJD false!
```

**Aanbevolen**: Alles op `false`, gebruik cron timing

---

## 📊 Cron Syntax Cheatsheet

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7, 0 en 7 = zondag)
│ │ │ │ │
* * * * *

Voorbeelden:
0 */4 * * *     - Elke 4 uur
0 8,20 * * *    - 08:00 en 20:00
0 6 * * 1-5     - Elke werkdag 06:00
0 10 * * 6,0    - Elk weekend 10:00
*/30 * * * *    - Elke 30 minuten
0 0 1 * *       - Elke 1e van de maand 00:00
```

**Tool**: https://crontab.guru voor syntax validatie

---

## 🧮 Resource Planning

### API Calls per Dag (voorbeeld: 10 favorites, 3 clubs)

**Huidige configuratie**:
```
Favorites Sync (elke 4u = 6x/dag):
  6 × 10 riders = 60 calls/dag

Club Sync (2x/dag):
  2 × 3 clubs = 6 calls/dag

Forward Scan (1x/dag):
  1000 events = 1000 calls/dag
  
TOTAAL: ~1066 API calls/dag
```

**API Limits** (ZwiftRacing.app):
- Riders: 5/min = 7200/dag ✅
- Clubs: 1/60min = 24/dag ✅
- Events: 1/min = 1440/dag ✅

→ Ruim binnen limits!

---

## 🚨 Troubleshooting

### "Scheduler jobs overlappen"
**Probleem**: Club sync loopt nog als favorites sync start

**Oplossing**: 
- Jobs zijn non-blocking (parallel mogelijk)
- Of: verhoog interval tussen jobs
- Check logs: `curl http://localhost:3000/api/sync/status`

### "Forward scan duurt te lang"
**Probleem**: 1000 events = 17 uur

**Oplossing**:
```bash
# Minder events per scan:
FORWARD_SCAN_MAX_EVENTS=500

# Of: Split in meerdere kleine scans:
# Vereist custom cron setup in code
```

### "Te veel API calls"
**Probleem**: Rate limit errors

**Oplossing**:
```bash
# Verminder favorites sync frequentie:
FAVORITES_SYNC_CRON=0 */6 * * *  # Van 4u naar 6u

# Club sync 1x/dag:
CLUB_SYNC_CRON=0 6 * * *
```

---

## 📝 Logs & Monitoring

### Check scheduler status:
```bash
curl http://localhost:3000/api/sync/status
```

### Check sync logs:
```bash
curl http://localhost:3000/api/sync/logs?limit=20
```

### Database queries:
```sql
-- Laatste sync logs
SELECT * FROM sync_logs ORDER BY createdAt DESC LIMIT 10;

-- Sync statistieken per type
SELECT syncType, COUNT(*), AVG(duration), MAX(duration)
FROM sync_logs
GROUP BY syncType;
```

---

**Laatste update**: 28 oktober 2025  
**Versie**: 2.0 (Geoptimaliseerd schema)
