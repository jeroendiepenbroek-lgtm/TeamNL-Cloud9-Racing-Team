# ⚠️ AGGRESSIVE SCHEDULER CONFIGURATION - WAARSCHUWING

**Datum**: 28 oktober 2025  
**Configuratie**: Zeer agressief sync schema

---

## 🔴 Kritieke Waarschuwingen

### Forward Scan ELK UUR = PROBLEMATISCH! ⚠️

**Huidige configuratie:**
```bash
FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_CRON=0 */1 * * *  # ELK UUR!
FORWARD_SCAN_MAX_EVENTS=1000   # 17+ uur per scan
```

**PROBLEEM:**
- **1 scan duurt 17+ uur** (1000 events × 61 sec)
- Start elk uur = nieuwe scan terwijl vorige nog loopt
- Na 24 uur = **24 overlappende scans tegelijk**!
- Enorme API load + resource gebruik

**CONSEQUENTIES:**
```
Uur 0:  Start scan 1 (eindigt uur 17)
Uur 1:  Start scan 2 (eindigt uur 18) + scan 1 loopt nog
Uur 2:  Start scan 3 (eindigt uur 19) + scan 1,2 lopen nog
...
Uur 17: Start scan 18 + 17 scans lopen tegelijk!
Uur 24: 24 scans tegelijk actief!

Resultaat:
- 24,000 API calls per uur (24 × 1000 events)
- Mogelijk rate limit errors
- Hoge server load
- Duplicate data processing
```

---

## 📊 Huidige Configuratie

| Job | Interval | Duur | Impact |
|-----|----------|------|--------|
| **Favorites Sync** | Elk uur | ~2 min | ✅ OK - korte duur |
| **Club Sync** | Daily 06:00 | 61+ min/club | ✅ OK - dagelijks is goed |
| **Forward Scan** | ⚠️ **ELK UUR** | ⚠️ **17+ uur** | 🔴 PROBLEEM - overlapping! |
| **Cleanup** | Daily 04:00 | <1 min | ✅ OK |

---

## 🎯 Aanbevolen Aanpassingen

### Optie 1: KLEINERE FORWARD SCANS (Aanbevolen)

Als je echt elk uur wilt scannen, maak de scans veel kleiner:

```bash
# In .env:
FORWARD_SCAN_CRON=0 */1 * * *  # Elk uur
FORWARD_SCAN_MAX_EVENTS=50     # Slechts 50 events = ~51 min
```

**Voordelen:**
- Scan eindigt voor volgende start (51 min < 60 min)
- Geen overlapping
- Frequente updates (elk uur nieuwe data)
- Totaal: 50 × 24 = 1200 events/dag (meer dan daily 1000!)

**Nadelen:**
- Kleinere coverage per scan
- Maar totaal per dag is groter!

### Optie 2: DAGELIJKSE GROTE SCAN (Veilig)

Terug naar dagelijkse grote scan:

```bash
# In .env:
FORWARD_SCAN_CRON=0 2 * * *    # Daily 02:00
FORWARD_SCAN_MAX_EVENTS=1000   # Volledige scan
```

**Voordelen:**
- Geen overlapping (1x per dag)
- Volledige coverage (1000 events)
- Lage server load
- Veilig en voorspelbaar

**Nadelen:**
- Minder frequent (1x/dag vs 24x/dag)

### Optie 3: MEERDERE KLEINE SCANS PER DAG (Balans)

```bash
# In .env:
FORWARD_SCAN_CRON=0 6,18 * * *  # 2x/dag (06:00, 18:00)
FORWARD_SCAN_MAX_EVENTS=500     # Medium scan = ~8.5 uur
```

**Voordelen:**
- 2 scans per dag = 1000 events totaal
- Eindigt voor volgende scan (8.5u < 12u)
- Frequenter dan dagelijks
- Geen overlapping

**Nadelen:**
- Minder frequent dan elk uur

---

## 🧮 Resource Calculaties

### Huidige Config (Elk Uur + 1000 Events)

**API Calls:**
```
Favorites: 24 × 10 riders = 240 calls/dag
Club:      1 × 3 clubs = 3 calls/dag
Forward:   24 × 1000 events = 24,000 calls/dag (!!!)
────────────────────────────────────────────────
TOTAAL:    ~24,243 API calls/dag

API Limit: 1440 calls/dag voor events (1/min)
OVERSCHRIJDING: 24,000 / 1440 = 16.7x TE VEEL! 🔴
```

### Aanbevolen Config (Elk Uur + 50 Events)

**API Calls:**
```
Favorites: 24 × 10 riders = 240 calls/dag
Club:      1 × 3 clubs = 3 calls/dag
Forward:   24 × 50 events = 1,200 calls/dag ✅
────────────────────────────────────────────────
TOTAAL:    ~1,443 API calls/dag

API Limit: 1440 calls/dag voor events
STATUS:    Bijna maximaal, maar binnen limits ✅
```

---

## 🚀 Actie Vereist

### STAP 1: Stop Forward Scan Overlapping

**Optie A: Disable forward scan tijdelijk**
```bash
# In .env:
FORWARD_SCAN_ENABLED=false
```

**Optie B: Verklein max events drastisch**
```bash
# In .env:
FORWARD_SCAN_MAX_EVENTS=50  # Van 1000 → 50
```

### STAP 2: Restart Server

```bash
npm run dev
# Of
pm2 restart all
```

### STAP 3: Monitor

Check of scans nu correct lopen zonder overlap:
```bash
curl http://localhost:3000/api/scheduler/status
```

---

## 📋 Toelichting per Job

### ✅ Favorites Sync (Elk Uur) - PRIMA

**Configuratie:**
```bash
FAVORITES_SYNC_CRON=0 */1 * * *  # Elk uur
```

**Waarom OK?**
- Duur: ~2 minuten (10 riders × 12 sec)
- Eindigt ruim voor volgende start
- Frequente updates zijn nuttig
- Geen overlapping mogelijk

### ✅ Club Sync (Daily) - PRIMA

**Configuratie:**
```bash
CLUB_SYNC_CRON=0 6 * * *  # Daily 06:00
```

**Waarom OK?**
- API rate limit: 1/60min per club
- Daily is perfect (respecteert limit)
- 1 cyclus = 3+ uur (3 clubs)
- Eindigt om ~09:00, ruim voor volgende dag

### 🔴 Forward Scan (Elk Uur) - PROBLEMATISCH

**Configuratie:**
```bash
FORWARD_SCAN_CRON=0 */1 * * *     # ELK UUR
FORWARD_SCAN_MAX_EVENTS=1000      # 17+ UUR DUUR
```

**Waarom PROBLEEM?**
- Duur >> Interval (17u > 1u)
- Constante overlapping
- API overbelasting
- Server resource drain

**OPLOSSING:**
- Verklein max events naar 50
- Of: verander naar dagelijks

### ✅ Cleanup (Daily) - PRIMA

**Configuratie:**
```bash
CLEANUP_CRON=0 4 * * *  # Daily 04:00
```

**Waarom OK?**
- Duur: <1 minuut
- Daily is voldoende
- Geen API calls
- Lichte database operatie

---

## 🎛️ Voorgestelde Finale Config

```bash
# AANBEVOLEN CONFIGURATIE
# Balans tussen frequentie en resources

# Favorites Sync - Elk uur (hoge frequentie OK)
FAVORITES_SYNC_ENABLED=true
FAVORITES_SYNC_CRON=0 */1 * * *
FAVORITES_SYNC_ON_STARTUP=false

# Club Sync - Daily (respecteert rate limit)
CLUB_SYNC_ENABLED=true
CLUB_SYNC_CRON=0 6 * * *
CLUB_SYNC_ON_STARTUP=false

# Forward Scan - Elk uur MET KLEINE SCANS
FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_CRON=0 */1 * * *
FORWARD_SCAN_MAX_EVENTS=50        # ← AANGEPAST: 1000 → 50
FORWARD_SCAN_RETENTION_DAYS=100
FORWARD_SCAN_ON_STARTUP=false

# Cleanup - Daily (voldoende)
CLEANUP_ENABLED=true
CLEANUP_CRON=0 4 * * *
CLEANUP_RETENTION_DAYS=100
```

**Resultaat:**
- ✅ Elk uur 50 nieuwe events gescand
- ✅ Totaal: 1200 events/dag (meer dan 1x 1000!)
- ✅ Geen overlapping (51 min < 60 min)
- ✅ Binnen API limits
- ✅ Hoge frequentie data updates

---

## ⚡ Implementatie

### Via .env (Permanent)

```bash
# 1. Edit .env file
nano .env

# 2. Wijzig regel:
FORWARD_SCAN_MAX_EVENTS=50  # Was 1000

# 3. Restart
npm run dev
```

### Via GUI (Runtime)

```bash
# 1. Open browser
http://localhost:3000/scheduler-config.html

# 2. Wijzig "Max Events per Scan" naar 50
# 3. Klik "💾 Opslaan (Runtime)"
```

---

## 📞 Support

Bij vragen of problemen:
- Check `docs/SCHEDULER_CONFIGURATION.md`
- Monitor: `curl http://localhost:3000/api/sync/logs`
- Status: `curl http://localhost:3000/api/scheduler/status`

---

**ACTIE VEREIST: Pas Forward Scan configuratie aan om overlapping te voorkomen!** 🚨
