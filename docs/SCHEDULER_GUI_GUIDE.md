# Scheduler Configuration via GUI - Gebruikershandleiding

**Laatste update**: 28 oktober 2025

---

## 🎯 Wat is dit?

Een visuele interface om de automatische sync intervallen van je TeamNL Cloud9 dashboard aan te passen **zonder de .env file te moeten editen**. Perfect voor niet-technische gebruikers!

---

## 🚀 Toegang

### Via Browser
1. Start de server: `npm run dev`
2. Open: http://localhost:3000/scheduler-config.html

### Via Favorites Manager
1. Open: http://localhost:3000
2. Klik rechts bovenaan op **"⚙️ Scheduler Config"**

---

## 📋 Configureerbare Jobs

### 1️⃣ Favorites Sync 🏁
**Wat doet het?**
- Update stats van al je favorite riders
- Sync FTP, ranking, power curve (66 attributes)

**Aanbevolen interval:**
- **Elke 4 uur** (standaard): `0 */4 * * *`
- Vaker: `0 */2 * * *` (elke 2 uur)
- Specifieke tijden: `0 8,12,16,20 * * *`

**Duur per sync:**
- ~2 minuten (10 riders × 12 sec)

---

### 2️⃣ Club Rosters Sync 🏢
**Wat doet het?**
- Sync alle leden van je favorite clubs
- Update isFavorite linking

**Aanbevolen interval:**
- **2x per dag** (standaard): `0 6,18 * * *` (06:00 en 18:00)
- 1x per dag: `0 6 * * *`
- 3x per dag: `0 6,14,22 * * *`

**⚠️ BELANGRIJK:**
- API rate limit: **1 call per 60 minuten per club**
- Bij 3 clubs = 3+ uur per cyclus!
- **NIET** elk uur syncen (te snel!)

**Duur per sync:**
- 1 club = 61 minuten
- 3 clubs = 183 minuten (3u 3min)

---

### 3️⃣ Forward Event Scan 🔍
**Wat doet het?**
- Scan nieuwe events incrementeel
- Bewaar resultaten van tracked riders

**Aanbevolen interval:**
- **Dagelijks 02:00** (standaard): `0 2 * * *`
- Andere tijd: `0 1 * * *` (01:00)

**⚠️ WAARSCHUWING:**
- 1000 events = **~17 uur** scan tijd!
- Start bij voorkeur 's nachts
- Loopt door overdag (non-blocking)

**Max Events instelling:**
- Test: 10-50 events
- Medium: 500 events (~8.5 uur)
- Standaard: 1000 events (~17 uur)
- Groot: 2000 events (~34 uur - loopt 2 dagen!)

---

### 4️⃣ Data Cleanup 🗑️
**Wat doet het?**
- Archiveer events ouder dan X dagen
- Soft delete + hard delete results

**Aanbevolen interval:**
- **Dagelijks 03:00** (standaard): `0 3 * * *`
- Wekelijks: `0 3 * * 0` (zondag 03:00)

**Retention Days:**
- Standaard: 100 dagen
- Langer: 180-365 dagen
- Korter: 30-60 dagen

**Duur per sync:**
- < 1 minuut (database queries)

---

## 🎨 GUI Features

### Enable/Disable Toggle
- **Groen** = Job is actief
- **Grijs** = Job is uitgeschakeld
- Klik om aan/uit te zetten

### Cron Schedule Input
- Typ je gewenste cron expressie
- Tooltip (ℹ️) toont voorbeelden
- "Huidige" toont wat er nu draait

### Tooltips
- Hover over ℹ️ iconen
- Toon voorbeelden en uitleg
- Cron syntax hulp

### Alert Messages
- **Groen**: Succesvol opgeslagen
- **Rood**: Fout (ongeldige cron syntax)
- Auto-hide na 5 seconden

---

## 🔧 Gebruik

### Configuratie Wijzigen

1. **Open de pagina**
   ```
   http://localhost:3000/scheduler-config.html
   ```

2. **Pas instellingen aan**
   - Enable/disable jobs met toggle
   - Wijzig cron expressies
   - Pas max events / retention aan

3. **Opslaan**
   - Klik **"💾 Opslaan (Runtime)"**
   - Scheduler herstart automatisch
   - Nieuwe instellingen actief

4. **Verificatie**
   - Check groene bevestiging
   - "Huidige" waarden updaten
   - Scheduler draait met nieuwe config

### Configuratie Herladen

Klik **"🔄 Herladen"** om:
- Huidige waarden ophalen
- Wijzigingen resetten
- Verse data laden

---

## ⚠️ Belangrijke Opmerkingen

### Runtime Only! 🔴
**Configuratie wijzigingen zijn NIET permanent!**

- Opgeslagen config = **runtime only**
- Bij server restart = terug naar .env waarden
- Voor permanente wijzigingen:
  - Pas `.env` file aan
  - Of: kopieer nieuwe waarden naar `.env`

### Waarom Runtime Only?
- **Veiligheid**: Voorkomt per ongeluk .env overschrijven
- **Flexibiliteit**: Test nieuwe instellingen zonder risico
- **Eenvoud**: Geen file writes nodig (permissions)

### Permanente Wijzigingen Maken
```bash
# 1. Open .env file
nano .env

# 2. Pas waarden aan:
FAVORITES_SYNC_CRON=0 */2 * * *  # Nieuwe waarde

# 3. Restart server
npm run dev
```

---

## 📊 Cron Syntax Cheatsheet

### Basis Format
```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-7, 0/7=zondag)
│ │ │ │ │
* * * * *
```

### Veel Gebruikte Patterns
```bash
# Elke X uur
0 */4 * * *      # Elke 4 uur (00:00, 04:00, 08:00, ...)
0 */2 * * *      # Elke 2 uur
0 */6 * * *      # Elke 6 uur

# Specifieke tijden
0 8,20 * * *     # 08:00 en 20:00
0 6,12,18 * * *  # 06:00, 12:00, 18:00
0 7,19 * * *     # 07:00 en 19:00

# Dagelijks
0 2 * * *        # Dagelijks 02:00
0 6 * * *        # Dagelijks 06:00

# Weekdagen
0 8 * * 1-5      # Maandag-Vrijdag 08:00
0 10 * * 6,0     # Weekend (za+zo) 10:00

# Wekelijks
0 3 * * 0        # Elke zondag 03:00
0 6 * * 1        # Elke maandag 06:00

# Maandelijks
0 0 1 * *        # Elke 1e van de maand 00:00

# Minuten
*/30 * * * *     # Elke 30 minuten
*/15 * * * *     # Elke 15 minuten (LET OP: zeer frequent!)
```

### Validator Tool
Niet zeker van je cron syntax?
→ https://crontab.guru

---

## 🔍 Monitoring

### API Endpoints

**Get huidige configuratie:**
```bash
curl http://localhost:3000/api/scheduler/config
```

**Get scheduler status:**
```bash
curl http://localhost:3000/api/scheduler/status
```

**Update configuratie (via API):**
```bash
curl -X PUT http://localhost:3000/api/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{
    "favoritesSync": {
      "enabled": true,
      "cron": "0 */2 * * *"
    }
  }'
```

### Database Logs

Check sync logs in database:
```sql
SELECT * FROM sync_logs 
ORDER BY createdAt DESC 
LIMIT 20;
```

---

## 🚨 Troubleshooting

### "Ongeldige cron expressie"
**Probleem**: Foutmelding bij opslaan

**Oplossing**:
1. Valideer syntax op https://crontab.guru
2. Check voor typefouten (spaties!)
3. Gebruik voorbeelden uit deze guide

### "Jobs overlappen"
**Probleem**: Club sync loopt nog als favorites sync start

**Oplossing**:
- Normaal: Jobs zijn non-blocking (parallel OK)
- Probleem? Verhoog interval tussen jobs
- Club sync: kies tijden met ruimte (06:00, 18:00)

### "Configuratie reset na restart"
**Probleem**: Instellingen weg na server restart

**Oplossing**:
- Dit is normaal (runtime only!)
- Voor permanent: pas `.env` file aan
- Kopieer waarden van GUI naar `.env`

### "Forward scan duurt te lang"
**Probleem**: 1000 events = 17+ uur

**Oplossing**:
- Verminder "Max Events" naar 500
- Of: accepteer lange duur (start 's nachts)
- Test eerst met 10-50 events

---

## 📚 Gerelateerde Documentatie

- **Volledige guide**: `docs/SCHEDULER_CONFIGURATION.md`
- **Cron syntax**: https://crontab.guru
- **API docs**: `docs/API.md`

---

## ✅ Best Practices

### Development
```bash
# Alle jobs UIT tijdens development:
FAVORITES_SYNC_ENABLED=false
CLUB_SYNC_ENABLED=false
FORWARD_SCAN_ENABLED=false
```

### Production Light
```bash
# Balans tussen versheid en resources:
FAVORITES_SYNC_CRON=0 */6 * * *      # Elke 6 uur
CLUB_SYNC_CRON=0 7,19 * * *          # 2x/dag
FORWARD_SCAN_CRON=0 2 * * *          # Daily 02:00
FORWARD_SCAN_MAX_EVENTS=500          # ~8.5 uur
```

### Production Aggressive
```bash
# Maximale data versheid:
FAVORITES_SYNC_CRON=0 */2 * * *      # Elke 2 uur
CLUB_SYNC_CRON=0 6,14,22 * * *       # 3x/dag
FORWARD_SCAN_CRON=0 1 * * *          # Daily 01:00
FORWARD_SCAN_MAX_EVENTS=1000         # ~17 uur
```

### Weekend Only
```bash
# Alleen weekend actief:
FAVORITES_SYNC_CRON=0 8,14,20 * * 0,6   # Za+Zo 3x
CLUB_SYNC_CRON=0 7,19 * * 0,6           # Za+Zo 2x
FORWARD_SCAN_CRON=0 2 * * 1             # Maandag 02:00
```

---

**Veel succes! 🚀**

Bij vragen: check `docs/SCHEDULER_CONFIGURATION.md` of open een issue op GitHub.
