# Auto-Sync Test Instructies

## 🧪 Test Setup

### Stap 1: Open Team Manager
1. Ga naar: https://teamnl-cloud9-racing-team-production.up.railway.app/team-manager
2. Open browser DevTools (F12)
3. Ga naar Console tab

### Stap 2: Enable Auto-Sync met Test Interval
1. Vink de **"Auto"** checkbox aan (linksboven naast Sync knop)
2. Selecteer **"1m (test)"** uit de dropdown
3. Je zou direct moeten zien in console:
   ```
   🔄 Auto-sync enabled: every 1 minutes
   ```

### Stap 3: Monitor Auto-Sync Triggers
Na **60 seconden** zou je moeten zien:
1. **In Console:**
   ```
   🔄 Auto-sync triggered
   ```
2. **In Network Tab:**
   - POST request naar `/api/admin/sync-all`
3. **In UI:**
   - Groene sync button toont spinner
   - Toast notificatie: "✅ 2 riders gesynchroniseerd!"

### Stap 4: Verify Continuous Operation
- De auto-sync blijft triggeren elke 60 seconden
- Je kunt de checkbox uitvinken om te stoppen
- Je kunt het interval veranderen (wordt direct actief)

## ✅ Verwachte Resultaten

### Console Logs Pattern:
```
🔄 Auto-sync enabled: every 1 minutes
... (60 seconden wachten) ...
🔄 Auto-sync triggered
ℹ️  ZwiftRacing API responded for 1495
✅ ZwiftRacing data synced for 1495
ℹ️  Zwift Official API responded for 1495
✅ Zwift Official data synced for 1495
✅ Rider 1495 synced (Racing: true, Profile: true)
... (nog een rider) ...
✅ 2 riders gesynchroniseerd!
... (60 seconden wachten) ...
🔄 Auto-sync triggered
... (herhaalt) ...
```

### Network Tab Pattern:
- Elke 60 seconden: `POST /api/admin/sync-all`
- Status: 200 OK
- Response body:
  ```json
  {
    "success": true,
    "total": 2,
    "synced": 2,
    "failed": 0,
    "results": [
      { "rider_id": 1495, "synced": true },
      { "rider_id": 150437, "synced": true }
    ]
  }
  ```

## 🐛 Troubleshooting

### Auto-sync triggert niet
1. **Check console:** Zie je "🔄 Auto-sync enabled: every X minutes"?
   - Nee → Herlaad pagina, vink checkbox opnieuw aan
   - Ja → Wacht volledige interval (60s voor test)

2. **Check useEffect:**
   - Open React DevTools
   - Zoek TeamManager component
   - Check hooks: autoSyncEnabled=true, autoSyncInterval=1

3. **Check interval:**
   - Interval berekening: `1 * 60 * 1000 = 60000ms`
   - setInterval moet actief zijn (geen clearInterval voordat trigger)

### Sync faalt
1. **Check backend logs:**
   ```bash
   railway logs --tail 50
   ```
2. **Kijk naar response:**
   - 500 error? → Backend probleem
   - 404 error? → Endpoint niet gevonden
   - CORS error? → Browser beveiligingsissue

## 🎯 Test Scenarios

### Scenario 1: Basic Trigger Test
- Enable auto-sync met 1m
- Wacht 60 seconden
- ✅ PASS als sync triggert

### Scenario 2: Interval Change Test
- Start met 1m interval
- Na 1e trigger, verander naar 15m
- ✅ PASS als oude interval stopt en nieuwe start

### Scenario 3: Enable/Disable Test
- Enable auto-sync met 1m
- Na 30 seconden, disable checkbox
- ✅ PASS als sync NIET triggert na 60s

### Scenario 4: Manual + Auto Sync
- Enable auto-sync met 1m
- Klik manual "Sync" knop
- ✅ PASS als beide werken zonder conflicts

### Scenario 5: Tab/Window Switch
- Enable auto-sync met 1m
- Switch naar andere tab
- Switch terug na 2 minuten
- ✅ PASS als sync heeft getriggerd tijdens absence

## 📊 Performance Check

Monitor deze metrics:
- **Memory:** Should stay stable (geen leaks)
- **Network:** Only syncs at intervals (geen constant polling)
- **CPU:** Low when idle between syncs
- **Battery:** Minimal impact (efficient timers)

## 🔧 Dev Tools Commands

```javascript
// Check active intervals
console.log('Active timers:', window.setInterval.length)

// Force trigger (in component)
handleSyncAll()

// Check state
console.log('Auto-sync enabled:', autoSyncEnabled)
console.log('Interval (min):', autoSyncInterval)
```
