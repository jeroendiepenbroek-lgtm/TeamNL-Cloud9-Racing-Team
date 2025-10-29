# 🧪 End-to-End Testing Guide

## Overzicht

Test de **complete workflow** van TeamNL Cloud9 Dashboard:

1. ✅ Upload favorites (vanuit TXT/CSV)
2. ✅ Sync rider stats (Step 2)
3. ✅ Extract clubs (Step 3)
4. ⏭️ Sync club rosters (Step 4 - nog te implementeren)
5. ✅ Forward event scan (Step 5)
6. ✅ Database verification

**Duur**: ~10-15 minuten (afhankelijk van aantal favorites en events)

**Kosten**: €0 (gratis ZwiftRacing API)

---

## Optie 1: GUI Test (Aanbevolen)

### Stap 1: Maak een TXT Bestand

Maak een bestand `my-favorites.txt`:

```txt
# Mijn TeamNL Cloud9 Favorites
150437
123456
789012
```

Eén Zwift ID per regel. Regels met `#` worden genegeerd.

### Stap 2: Start de Server

```bash
npm start
```

Open: http://localhost:3000

### Stap 3: Upload Favorites

1. **Drag & drop** je TXT bestand naar de upload zone
2. Selecteer **Priority** (standaard: 2)
3. Klik **Upload & Toevoegen**

Je ziet de favorites verschijnen in de tabel binnen 30 seconden.

### Stap 4: Run End-to-End Test

1. Klik op de groene **"🧪 End-to-End Test"** knop
2. Bevestig in de popup
3. De test draait automatisch:
   - Step 1: Verify favorites ✅
   - Step 2: Sync rider stats 🔄
   - Step 3: Extract clubs 🏢
   - Step 4: Club rosters (skip) ⏭️
   - Step 5: Forward scan (5 events) 🔍

**Duur**: ~10 minuten

### Stap 5: Bekijk Resultaten

Na voltooiing krijg je een popup met:

```
🎉 END-TO-END TEST GESLAAGD!

📊 Resultaten:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Step 1: 3 favorites
✅ Step 2: 3 riders gesynchroniseerd
✅ Step 3: 2 clubs geëxtraheerd
⏭️ Step 4: Club sync (nog te implementeren)
✅ Step 5: 5 events gescand
           2 met tracked riders
           2 events in database

⏱️ Totale tijd: 6 minuten
💾 Database: OK
🌐 API: OK
🔄 Workflow: Compleet!
```

---

## Optie 2: CLI Test

Voor command-line interface liefhebbers.

### Gebruik

```bash
# Basis test (gebruikt examples/favorites-example.txt)
npm run test:e2e

# Custom TXT bestand
npm run test:e2e -- --file=my-favorites.txt

# Skip upload (gebruik bestaande favorites)
npm run test:e2e -- --skip-upload

# Custom aantal events
npm run test:e2e -- --max-events=10

# Combinatie
npm run test:e2e -- --file=team.txt --max-events=10
```

### Output Voorbeeld

```
═══════════════════════════════════════════════════════════
  🧪 END-TO-END TEST - TeamNL Cloud9 Workflow
═══════════════════════════════════════════════════════════

📤 STEP 1: Upload favorites vanuit TXT bestand
   Bestand: my-favorites.txt
   Gevonden: 3 Zwift IDs
   ✅ Added: 3
   ⏭️  Skipped (already exist): 0
   ❌ Failed: 0

🔄 STEP 2: Sync rider stats
   ✅ Synced: 3
   ❌ Failed: 0
   🏢 Clubs extracted: 2

🏢 STEP 3: Verify club extraction
   Total clubs: 2
   Favorite clubs: 2
   Total club members: 45

👥 STEP 4: Sync club rosters
   ⏭️  Skipped (niet geïmplementeerd in ClubService)

🔍 STEP 5: Forward event scan
   Max events: 5
   ⏱️  Estimated time: ~5 minutes
   ✅ Scanned: 5 events
   🎯 Found: 2 events with tracked riders
   💾 Saved: 2 events
   🗑️  Archived: 0 old events
   ⏱️  Duration: 6 minutes
   🔖 Last event ID: 5129370

✅ VERIFICATION: Database integrity check
   Events (active): 2
   Race results: 12
   Favorites: 3

═══════════════════════════════════════════════════════════
  📊 TEST RESULTS
═══════════════════════════════════════════════════════════

✅ Step 1: Upload Favorites
   count: 3

✅ Step 2: Sync Rider Stats
   synced: 3
   clubsExtracted: 2

✅ Step 3: Club Extraction
   clubs: 2
   members: 45

✅ Step 4: Club Rosters
   message: Skipped (not implemented)

✅ Step 5: Forward Scan
   scanned: 5
   found: 2
   saved: 2

✅ Verification
   events: 2
   results: 12
   favorites: 3

🎉 ALL TESTS PASSED! Workflow is volledig functioneel.

═══════════════════════════════════════════════════════════
```

---

## TXT Bestand Formaat

### Basis Formaat

```txt
150437
123456
789012
```

### Met Comments

```txt
# TeamNL Cloud9 - A Team
150437  # John Doe - Climber
123456  # Jane Smith - Sprinter

# TeamNL Cloud9 - B Team
789012  # Bob Johnson - All-rounder
```

### CSV Format (Ook Ondersteund)

```csv
zwiftId,name,notes
150437,John Doe,Climber
123456,Jane Smith,Sprinter
789012,Bob Johnson,All-rounder
```

**Let op**: Alleen de `zwiftId` kolom wordt gebruikt!

---

## Database Verificatie

Na de test kun je de database inspecteren:

```bash
# Prisma Studio (GUI)
npm run db:studio

# SQLite CLI
sqlite3 prisma/dev.db

# Queries
sqlite3 prisma/dev.db "SELECT COUNT(*) as favorites FROM riders WHERE isFavorite = 1;"
sqlite3 prisma/dev.db "SELECT COUNT(*) as clubs FROM clubs WHERE source = 'favorite_rider';"
sqlite3 prisma/dev.db "SELECT COUNT(*) as events FROM events WHERE deletedAt IS NULL;"
sqlite3 prisma/dev.db "SELECT COUNT(*) as results FROM race_results;"
```

---

## API Endpoints Testen

Na de test kun je de API endpoints handmatig testen:

```bash
# Start server
npm start

# Get favorites
curl http://localhost:3000/api/subteam/riders

# Get tracked events
curl http://localhost:3000/api/events/tracked?limit=10

# Get club info
curl http://localhost:3000/api/club

# Scheduler status
curl http://localhost:3000/api/scheduler/status
```

---

## Troubleshooting

### "Geen geldige Zwift IDs gevonden"

**Probleem**: TXT bestand bevat geen geldige IDs.

**Oplossing**:
- Check formaat: één ID per regel
- Verwijder comments zonder `#`
- Check voor lege regels

### "Rate limit bereikt"

**Probleem**: API rate limit overschreden.

**Oplossing**:
- Wacht 1 minuut
- Reduce aantal favorites
- Check `docs/SYNC_CONFIGURATION.md` voor rate limits

### "Database is locked"

**Probleem**: Prisma Studio of andere proces heeft lock.

**Oplossing**:
```bash
# Stop Prisma Studio
pkill -f "prisma studio"

# Of restart server
npm run pm2:restart
```

### Test loopt vast bij Step 5

**Probleem**: Forward scan duurt lang (1 event/min).

**Oplossing**:
- Dit is normaal! 5 events = ~5 minuten
- Check logs voor voortgang
- Reduce `--max-events` naar 2-3 voor snellere test

---

## Advanced Testing

### Test met Grote Dataset

```bash
# 100 favorites, 10 events (duur: ~30 min)
npm run test:e2e -- --file=large-team.txt --max-events=10
```

### Test met Productie Data

```bash
# Skip upload, gebruik bestaande favorites
npm run test:e2e -- --skip-upload --max-events=20
```

### Continuous Testing

```bash
# Run test elke 6 uur via cron
0 */6 * * * cd /path/to/project && npm run test:e2e -- --skip-upload --max-events=5 >> /var/log/e2e-test.log 2>&1
```

---

## Performance Metrics

### Expected Duration

| Step | Duration | Rate Limit |
|------|----------|------------|
| Upload favorites | <1 sec | N/A |
| Sync rider stats | 12 sec × riders | 5/min |
| Extract clubs | <1 sec | N/A |
| Club rosters | Skipped | N/A |
| Forward scan | 61 sec × events | 1/min |
| **Total** | **~10-15 min** | - |

### Example Timings

| Favorites | Events | Total Time |
|-----------|--------|------------|
| 3 | 5 | ~6 min |
| 10 | 10 | ~12 min |
| 20 | 20 | ~24 min |
| 50 | 50 | ~60 min |

---

## Next Steps

Na succesvolle test:

1. ✅ **Production deployment**: Zie `docs/DEPLOYMENT.md`
2. ✅ **Scheduler setup**: Zie `docs/SYNC_CONFIGURATION.md`
3. ✅ **Frontend**: GUI is al beschikbaar op `/`
4. ⏳ **Club sync**: Implementeer Step 4 in `ClubService`

---

## Vragen?

- **Workflow design**: `docs/WORKFLOW_DESIGN.md`
- **API docs**: `docs/API.md`
- **Deployment**: `docs/DEPLOYMENT.md`
- **Sync config**: `docs/SYNC_CONFIGURATION.md`

**Support**: Open een GitHub issue!
