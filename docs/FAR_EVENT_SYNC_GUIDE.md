# Far Event Sync - Geavanceerde Gids

## 🎯 Overzicht

De Far Event Sync is geoptimaliseerd voor efficiency én flexibiliteit. Standaard worden alleen **nieuwe events** gesynchroniseerd, maar je kunt ook custom ranges laden of alle events opnieuw syncen.

## 📊 Sync Modes

### 1. **Standaard Mode** (Automatisch via Cron)
```
Frequentie: Elke 2 uur om :30
Lookforward: 48 uur (configureerbaar)
Behavior: Alleen NIEUWE events worden gesynchroniseerd
```

**Voordelen:**
- ✅ 90% minder API calls
- ✅ Snellere sync (2min vs 30min)
- ✅ Minder rate limit druk

**Wanneer gebruiken:**
- Normale operatie
- Automatische background sync

---

### 2. **Custom Lookforward Mode** (Manual via POST)
```bash
POST /api/sync/events/far
Body: {
  "lookforwardHours": 168  // 7 dagen vooruit
}
```

**Use cases:**
- 🗓️ Week vooruit plannen (168 uur = 7 dagen)
- 📅 Maand vooruit laden (720 uur = 30 dagen)
- 🎯 Specifieke range synchroniseren

**Voorbeeld - Laad 7 dagen vooruit:**
```bash
curl -X POST http://localhost:3000/api/sync/events/far \
  -H "Content-Type: application/json" \
  -d '{"lookforwardHours": 168}'
```

---

### 3. **Force Mode** (Alle Events Opnieuw Syncen)
```bash
POST /api/sync/events/far
Body: {
  "lookforwardHours": 48,
  "force": true  // Sync ALLE events, ook bestaande
}
```

**Use cases:**
- 🔄 Database refresh na problemen
- 📊 Signup counts updaten voor alle events
- 🧹 Data consistency check

**⚠️ Let op:** Force mode maakt **VEEL** API calls (~300+). Gebruik spaarzaam!

**Voorbeeld - Full refresh 7 dagen:**
```bash
curl -X POST http://localhost:3000/api/sync/events/far \
  -H "Content-Type: application/json" \
  -d '{"lookforwardHours": 168, "force": true}'
```

---

## 🖥️ Sync Scheduler UI

### Locatie
```
http://jouw-server/sync-scheduler.html
```

### Geavanceerde Sectie
Onder de "Far Event Sync" kaart vind je:

**1. Lookforward Hours Input**
- Min: 1 uur
- Max: 168 uur (7 dagen)
- Standaard: 48 uur

**2. Force Sync Checkbox**
- ☐ Uit: Alleen nieuwe events (aanbevolen)
- ☑ Aan: Alle events opnieuw syncen

**3. Start Geavanceerde Sync Button**
- Triggert POST met custom parameters
- Live feedback in logs sectie

---

## 📈 Efficiency Metrics

De sync logs tonen nu efficiency stats:

```log
[FAR EVENT SYNC] Efficiency: 8 nieuwe events gesynchroniseerd, 287 bestaande events overgeslagen
```

**Interpretatie:**
- **Nieuwe events**: Aantal events dat nog niet in database stond → gesynchroniseerd
- **Overgeslagen**: Aantal events dat al in database stond → skipped (efficiency)

**Zonder force mode:**
```
300 total events → 8 new → 8 API calls ✅
```

**Met force mode:**
```
300 total events → 300 synced → 300 API calls ⚠️
```

---

## 🔧 Configuratie

### Via Config File (`config.ts`)
```typescript
export const config = {
  // Standaard lookforward voor automatische sync
  lookforwardHours: 48,
  
  // Interval tussen far event syncs
  farEventSyncIntervalMinutes: 120,
  
  // Threshold (events < 15min = near, > 15min = far)
  nearEventThresholdMinutes: 15,
};
```

### Via POST Body (Runtime Override)
```json
{
  "lookforwardHours": 168,  // Override config
  "force": true             // Extra parameter
}
```

---

## 🎯 Best Practices

### ✅ DO's

1. **Dagelijkse sync**: Gebruik standaard mode (48h lookforward)
   ```
   Automatisch via cron - geen actie nodig
   ```

2. **Begin van de week**: Laad 7 dagen vooruit
   ```bash
   POST /api/sync/events/far
   Body: {"lookforwardHours": 168}
   ```

3. **Voor races**: Check 1 dag vooruit voor last-minute changes
   ```bash
   POST /api/sync/events/far
   Body: {"lookforwardHours": 24}
   ```

### ❌ DON'Ts

1. **Niet force mode in automatische cron**
   - Te veel API calls
   - Rate limit overschrijding
   - Waste van resources

2. **Niet force mode voor normale updates**
   - Gebruik standaard mode (alleen nieuwe events)
   - Force alleen voor troubleshooting

3. **Niet >168h lookforward zonder goede reden**
   - Meer events = meer API calls
   - Standaard 48h is meestal voldoende

---

## 🚀 Quick Start Scenarios

### Scenario 1: "Ik wil bij zijn met alle events deze week"
```bash
curl -X POST http://localhost:3000/api/sync/events/far \
  -H "Content-Type: application/json" \
  -d '{"lookforwardHours": 168}'
```
**Resultaat:** Alle events in komende 7 dagen, alleen nieuwe worden gesyncen.

---

### Scenario 2: "Database is out of sync, alles opnieuw laden"
```bash
curl -X POST http://localhost:3000/api/sync/events/far \
  -H "Content-Type: application/json" \
  -d '{"lookforwardHours": 168, "force": true}'
```
**Resultaat:** ALLE events in komende 7 dagen worden geforceerd opnieuw gesyncen.

---

### Scenario 3: "Check alleen vandaag en morgen"
```bash
curl -X POST http://localhost:3000/api/sync/events/far \
  -H "Content-Type: application/json" \
  -d '{"lookforwardHours": 48}'
```
**Resultaat:** Default behavior, efficiënt.

---

## 📊 Monitoring

### In Sync Logs
```log
🚀 FAR EVENT sync gestart (lookforward: 168h, force: false)...
[FAR EVENT SYNC] Found 312 events in next 168 hours
[FAR EVENT SYNC] Found 287 existing events in database
[FAR EVENT SYNC] [NEW] Syncing: Team Race #1 (5234567)
[FAR EVENT SYNC] [NEW] Syncing: Team Race #2 (5234568)
...
[FAR EVENT SYNC] Efficiency: 25 nieuwe events gesynchroniseerd, 287 bestaande events overgeslagen
✅ FAR EVENT sync voltooid - 25 far events, 450 signups
```

### Met Force Mode
```log
🚀 FAR EVENT sync gestart (lookforward: 168h, force: true)...
[FAR EVENT SYNC] FORCE mode - will sync ALL events
[FAR EVENT SYNC] [FORCE] Syncing: Team Race #1 (5234567)
[FAR EVENT SYNC] [FORCE] Syncing: Team Race #2 (5234568)
...
✅ FAR EVENT sync voltooid - 312 far events, 5600 signups
```

---

## 🔒 Rate Limits

**ZwiftRacing API Limits:**
- `GET /api/events/upcoming`: 1/min
- `GET /api/events/{id}/signups`: 1/min

**Safe Practices:**
- 200ms delay tussen signup requests
- Max ~300 events per run zonder rate limit errors
- Force mode: ~1 uur voor 300 events

---

## 🐛 Troubleshooting

### "Rate limit bereikt"
**Oplossing:** Wacht 1-2 minuten, probeer opnieuw met lagere lookforward:
```json
{"lookforwardHours": 24}
```

### "Geen nieuwe events gevonden"
**Check:**
1. Zijn er events in de komende X uur? → Check ZwiftRacing.app
2. Is lookforward hoog genoeg? → Verhoog naar 168h
3. Draait de automatische sync al? → Check coordinator status

### "Te veel events, sync duurt te lang"
**Oplossing:**
1. Gebruik standaard mode (geen force)
2. Verlaag lookforward naar 48h
3. Laat automatische cron de rest doen

---

## 📝 API Response Format

```json
{
  "message": "Far event sync completed",
  "metrics": {
    "type": "FAR_EVENT_SYNC",
    "timestamp": "2025-11-17T14:30:00.000Z",
    "events_scanned": 312,
    "events_far": 25,
    "events_near": 287,
    "signups_synced": 450,
    "duration_ms": 5200,
    "status": "success",
    "error_count": 0
  },
  "config": {
    "lookforwardHours": 168,
    "force": false
  }
}
```

---

## 🎉 Conclusie

Met deze nieuwe features kun je:
- ✅ Efficiënt syncen (standaard mode)
- ✅ Custom ranges laden (lookforward parameter)
- ✅ Full refresh doen (force mode)
- ✅ Precies controleren wat gesynchroniseerd wordt

**Aanbeveling:** Laat de automatische sync (elke 2 uur) draaien voor normale operatie, en gebruik de geavanceerde opties alleen wanneer nodig (begin van de week, troubleshooting).
