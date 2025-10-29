# Sync Configuratie Guide

## Overzicht

Vanaf nu kun je **per component** configureren hoe vaak en wanneer data gesynchroniseerd wordt. Dit gebeurt via `.env` variabelen.

## ✅ Wat is nieuw?

### 1. Configureerbare Sync per Component

Voorheen: Alles gebeurde in de oude `SyncService` met vaste intervals.

**Nu**: 4 onafhankelijke sync componenten:

| Component | Wat | Standaard Schema | Duur |
|-----------|-----|------------------|------|
| **Favorites Sync** | Sync rider stats van favorieten | Elke 6 uur | ~2 min |
| **Club Sync** | Sync club rosters | Elke 12 uur | ~5 min |
| **Forward Scan** | Scan nieuwe events | Daily 04:00 | ~17 uur |
| **Cleanup** | Verwijder oude data | Daily 03:00 | ~1 min |

### 2. GitHub Actions - 24/7 Sync Zonder Laptop

**Nieuw**: `.github/workflows/data-sync.yml` workflow die draait op GitHub servers.

✅ **Voordelen**:
- Laptop mag uit
- Volledig gratis (2000 min/maand free tier)
- Automatische retries bij errors
- Database wordt opgeslagen als artifact

⚠️ **Nadeel**: SQLite database wordt **niet gedeeld** tussen lokaal en GitHub Actions. Je hebt 2 databases:
- Lokaal: `prisma/dev.db`
- GitHub: `prisma/github-actions.db` (artifact)

## Configuratie

### .env Variabelen

Kopieer deze naar je `.env` file (of pas `.env.example` aan):

```bash
# =============================================================================
# DATA SYNC SCHEDULING - Configureer per component
# =============================================================================

# 1. FAVORITE RIDERS SYNC (Workflow Step 2)
FAVORITES_SYNC_ENABLED=true
FAVORITES_SYNC_CRON=0 */6 * * *    # Elke 6 uur (04:00, 10:00, 16:00, 22:00)
FAVORITES_SYNC_ON_STARTUP=false     # Sync bij server start

# 2. CLUB ROSTERS SYNC (Workflow Step 4) 
CLUB_SYNC_ENABLED=true
CLUB_SYNC_CRON=0 */12 * * *        # Elke 12 uur (04:00, 16:00)
CLUB_SYNC_ON_STARTUP=false          # Sync bij server start

# 3. FORWARD EVENT SCAN (Workflow Step 5)
FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_CRON=0 4 * * *         # Daily at 04:00
FORWARD_SCAN_MAX_EVENTS=1000        # Max events per scan (~17 uur @ 1/min)
FORWARD_SCAN_RETENTION_DAYS=100     # 100-day retention policy
FORWARD_SCAN_ON_STARTUP=false       # Scan bij server start (niet aanbevolen!)

# 4. DATA CLEANUP (Old events & results)
CLEANUP_ENABLED=true
CLEANUP_CRON=0 3 * * *              # Daily at 03:00 (voor forward scan)
CLEANUP_RETENTION_DAYS=100          # Events ouder dan 100 dagen soft delete
CLEANUP_GRACE_DAYS=7                # Results hard delete na 7 dagen grace
```

### Cron Syntax

Formaat: `minute hour day month weekday`

**Voorbeelden**:
```bash
0 4 * * *       # Elke dag om 04:00
*/15 * * * *    # Elke 15 minuten
0 */6 * * *     # Elke 6 uur (00:00, 06:00, 12:00, 18:00)
0 0 * * 0       # Elke zondag om middernacht
30 2 1 * *      # 1e van elke maand om 02:30
```

**Tool**: https://crontab.guru voor het testen van cron expressions

## Gebruik

### Lokaal (Laptop/Server)

**Start server met scheduler**:
```bash
npm start
```

De scheduler start automatisch en logt:
```
✅ Scheduler gestart met 4 jobs
📅 Scheduled: favorites-sync (0 */6 * * *)
📅 Scheduled: club-sync (0 */12 * * *)
📅 Scheduled: forward-scan (0 4 * * *)
📅 Scheduled: cleanup (0 3 * * *)
```

**Check scheduler status**:
```bash
curl http://localhost:3000/api/scheduler/status
```

Response:
```json
{
  "enabled": true,
  "totalJobs": 4,
  "jobs": [
    {"name": "favorites-sync", "schedule": "0 */6 * * *"},
    {"name": "club-sync", "schedule": "0 */12 * * *"},
    {"name": "forward-scan", "schedule": "0 4 * * *"},
    {"name": "cleanup", "schedule": "0 3 * * *"}
  ],
  "config": {
    "favoritesSyncCron": "0 */6 * * *",
    "clubSyncCron": "0 */12 * * *",
    "forwardScanCron": "0 4 * * *",
    "cleanupCron": "0 3 * * *"
  }
}
```

### GitHub Actions (24/7 zonder laptop)

**Setup**:

1. **Enable workflows** in GitHub repo settings:
   - Settings → Actions → General → Allow all actions

2. **Add secret** voor API key:
   - Settings → Secrets and variables → Actions → New repository secret
   - Name: `ZWIFT_API_KEY`
   - Value: `650c6d2fc4ef6858d74cbef1`

3. **Commit workflow**:
   ```bash
   git add .github/workflows/data-sync.yml
   git commit -m "Add 24/7 GitHub Actions sync"
   git push
   ```

4. **Test handmatig**:
   - GitHub repo → Actions tab → "24/7 Data Sync" → Run workflow

**Hoe het werkt**:

1. **Forward scan** draait daily om 04:00 UTC (~17 uur runtime)
2. **Database** wordt opgeslagen als artifact (7 dagen retention)
3. **Volgende run** downloadt vorige database en gaat verder

**⚠️ Limitaties**:

- **GitHub Actions free tier**: 2000 min/maand
- **Forward scan**: ~17 uur = 1020 min per dag = **30,600 min/maand** ❌
- **Oplossing**: Reduce `maxEvents` naar 100 = 102 min/dag = **3,060 min/maand** ❌

**Conclusie**: GitHub Actions is **niet geschikt** voor forward scanning (te lang).

**Alternatief**: Gebruik GitHub Actions voor:
- ✅ Favorites sync (2 min × 4x/dag = 240 min/maand)
- ✅ Club sync (5 min × 2x/dag = 300 min/maand)
- ❌ Forward scan (gebruik lokale cron of external VM)

### Hybride Setup (Aanbevolen)

**Lokale cron** (voor forward scan):
```bash
crontab -e

# Add:
0 4 * * * cd /path/to/project && npm run sync:forward >> /var/log/forward-sync.log 2>&1
```

**GitHub Actions** (voor snelle syncs):
- Favorites sync: elke 6 uur
- Club sync: elke 12 uur

Dit geeft je:
- ✅ Zero-cost (lokale forward scan)
- ✅ 24/7 favorites/club sync (GitHub Actions)
- ✅ Backup database (GitHub artifacts)

## API Endpoints

Alle syncs kun je ook **handmatig triggeren** via API:

```bash
# Favorites sync
curl -X POST http://localhost:3000/api/subteam/sync

# Forward scan
curl -X POST http://localhost:3000/api/sync/forward \
  -H "Content-Type: application/json" \
  -d '{"maxEvents": 10, "retentionDays": 100}'

# Scheduler status
curl http://localhost:3000/api/scheduler/status
```

## Customization

### Voorbeeld 1: Meer Frequente Favorites Sync

Wijzig in `.env`:
```bash
FAVORITES_SYNC_CRON=*/30 * * * *  # Elke 30 minuten
```

**Let op**: Rate limit van ZwiftRacing API is 5/min voor riders. Als je 10 favorites hebt:
- 10 riders × 12 sec/rider = 2 minuten per sync
- Elke 30 min = OK ✅

### Voorbeeld 2: Weekend-Only Forward Scan

```bash
FORWARD_SCAN_CRON=0 4 * * 6,0  # Zaterdag en zondag om 04:00
```

### Voorbeeld 3: Nachtelijke Club Sync

```bash
CLUB_SYNC_CRON=0 2 * * *  # Elke nacht om 02:00
```

### Voorbeeld 4: Disable Components

```bash
FAVORITES_SYNC_ENABLED=false  # Geen favorites sync
CLUB_SYNC_ENABLED=false       # Geen club sync
CLEANUP_ENABLED=false         # Geen cleanup
```

Alleen forward scan blijft actief.

## Monitoring

### Logs

```bash
# Real-time logs (bij npm start)
npm start

# PM2 logs (bij pm2 start)
npm run pm2:logs

# Cron logs (bij OS cron)
tail -f /var/log/forward-sync.log
```

### Database Stats

```bash
# Events
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM events WHERE deletedAt IS NULL;"

# Archived events
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM events WHERE deletedAt IS NOT NULL;"

# Results
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM race_results;"

# Favorites
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM riders WHERE isFavorite = 1;"
```

## Troubleshooting

### Scheduler start niet

**Check**:
```bash
# Logs kijken
npm start

# Zie je dit?
✅ Scheduler gestart met 4 jobs
```

**Als niet**:
- Check `.env` file (moet `FAVORITES_SYNC_ENABLED=true` bevatten)
- Check cron syntax met https://crontab.guru
- Check logs voor errors

### Cron job draait niet

**Check**:
```bash
# Status
curl http://localhost:3000/api/scheduler/status

# Server logs
npm run pm2:logs
```

**Debug**:
- Zet `FAVORITES_SYNC_ON_STARTUP=true` om direct te testen
- Check of server draait: `curl http://localhost:3000/api/health`

### GitHub Actions fail

**Check**:
- Actions tab → Failed workflow → View logs
- Common issues:
  - Secret `ZWIFT_API_KEY` niet ingesteld
  - API rate limit bereikt
  - Database artifact te groot (>5GB)

## Performance Tips

### Rate Limiting

**ZwiftRacing API limits**:
- Riders: 5/min
- Clubs: 1/60min
- Events: 1/min

**Scheduler respect deze limits**:
- Favorites sync: 12 sec tussen riders
- Forward scan: 61 sec tussen events
- Club sync: (nog te implementeren, maar ≥60 min)

### Database Size

**Groei**:
- 100 events × 20 riders = 2000 results = ~500 KB
- 1000 events = ~5 MB
- 10,000 events (100 days) = ~50 MB

**SQLite limits**: 281 TB max, 50 MB is **geen probleem**.

### Memory Usage

**Node.js server**: ~100 MB idle, ~150 MB tijdens sync

**Forward scan**: ~200 MB (streamt events, laadt niet alles in memory)

## Migratie van Oude Setup

**Voor**:
- `SmartScheduler` (priority-based)
- Oude `SyncService` cron

**Nu**:
- `SchedulerService` (configureerbaar per component)
- `.env` based configuratie

**Migratiestappen**:

1. Update `.env` met nieuwe variabelen (zie boven)
2. Remove oude cron in `src/server.ts` (al gedaan)
3. Restart server: `npm run pm2:restart`
4. Verify: `curl http://localhost:3000/api/scheduler/status`

**Breaking changes**: Geen! Oude API endpoints werken nog steeds.

## Vragen?

Check de docs:
- `docs/WORKFLOW_DESIGN.md` - Workflow uitleg
- `docs/DEPLOYMENT.md` - Production deployment
- `docs/API.md` - API documentatie
