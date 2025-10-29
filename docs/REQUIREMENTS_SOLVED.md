# ✅ SOLVED: Configureerbare Sync + 24/7 zonder Laptop

## Jouw Requirements

1. ✅ **"Ik wil de data-sync voor verschillende onderdelen kunnen configureren"**
2. ✅ **"Ik wil dat de data-sync loopt ook als ik de laptop uit heb staan"**

---

## Oplossing 1: Configureerbare Sync

### Wat is toegevoegd?

**Nieuwe service**: `src/services/scheduler.ts` (280 regels)

**Configuratie via `.env`**:
```bash
# 4 onafhankelijke sync componenten:

FAVORITES_SYNC_ENABLED=true         # On/off
FAVORITES_SYNC_CRON=0 */6 * * *     # Wanneer (elke 6 uur)

CLUB_SYNC_ENABLED=true
CLUB_SYNC_CRON=0 */12 * * *         # Elke 12 uur

FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_CRON=0 4 * * *         # Daily at 04:00

CLEANUP_ENABLED=true
CLEANUP_CRON=0 3 * * *              # Daily at 03:00
```

### Hoe gebruik je het?

```bash
# 1. Configureer .env (zie .env.example)
nano .env

# 2. Start server
npm start

# 3. Check status
curl http://localhost:3000/api/scheduler/status
```

**Output**:
```json
{
  "enabled": true,
  "totalJobs": 4,
  "jobs": [
    {"name": "favorites-sync", "schedule": "0 */6 * * *"},
    {"name": "club-sync", "schedule": "0 */12 * * *"},
    {"name": "forward-scan", "schedule": "0 4 * * *"},
    {"name": "cleanup", "schedule": "0 3 * * *"}
  ]
}
```

### Voordelen

✅ **Per component aan/uit**
✅ **Eigen schedule per component** (cron syntax)
✅ **Optioneel sync bij startup** (`_ON_STARTUP=true`)
✅ **API endpoint** voor status check

---

## Oplossing 2: 24/7 Sync zonder Laptop

### Optie A: GitHub Actions (Gratis, Laptop uit)

**Bestand**: `.github/workflows/data-sync.yml`

**Hoe werkt het?**:
1. GitHub Actions draait workflow op hun servers
2. Schedule: Daily om 04:00 UTC (configureerbaar)
3. Database wordt opgeslagen als artifact
4. Volgende run laadt vorige database

**Setup**:
```bash
# 1. Add secret in GitHub
Settings → Secrets → ZWIFT_API_KEY = 650c6d2fc4ef6858d74cbef1

# 2. Push workflow
git add .github/workflows/data-sync.yml
git commit -m "Add 24/7 sync"
git push

# 3. Test handmatig
GitHub → Actions → "24/7 Data Sync" → Run workflow
```

**Cost**: €0 voor public repo, €0 tot 2000 min/maand voor private repo

⚠️ **Limitatie**: 
- Forward scan = 17 uur = 1020 min per dag
- Free tier = 2000 min/maand = **NOT ENOUGH**
- **Oplossing**: Gebruik alleen voor snelle syncs (favorites, clubs)

### Optie B: Ingebouwde Scheduler (Laptop moet aan)

**Beste voor**: Forward scanning (17 uur)

```bash
# Configureer in .env
FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_CRON=0 4 * * *

# Start server
npm start
# Of met PM2 (blijft draaien na logout):
npm run pm2:start
```

### Optie C: Externe VM (Zero-Cost)

**Providers**:
- Oracle Cloud Always Free: 1GB RAM VM, altijd gratis
- Fly.io Free Tier: 256MB RAM, 3GB disk
- AWS EC2 t2.micro (12 maanden gratis)

**Setup**:
1. Deploy code naar VM
2. Gebruik PM2 of systemd
3. Scheduler draait 24/7

**Cost**: €0 met free tiers

---

## Hybride Setup (Aanbevolen)

Combineer beide opties voor optimale workflow:

### Lokaal (Laptop)
```bash
# .env
FORWARD_SCAN_ENABLED=true          # 17 uur, moet lokaal
FORWARD_SCAN_CRON=0 4 * * *

FAVORITES_SYNC_ENABLED=false        # Via GitHub Actions
CLUB_SYNC_ENABLED=false             # Via GitHub Actions
```

### GitHub Actions
```yaml
# Scheduled triggers:
- cron: '0 */6 * * *'  # Favorites elke 6 uur
- cron: '0 */12 * * *' # Clubs elke 12 uur
```

**Resultaat**:
- ✅ Forward scan lokaal (gratis, laptop moet aan voor 17 uur/dag)
- ✅ Snelle syncs via GitHub (gratis, 24/7, laptop mag uit)
- ✅ Backup database in GitHub artifacts

---

## Wat is Nieuw

### Bestanden

1. **`src/services/scheduler.ts`** (280 regels)
   - Nieuwe configureerbare scheduler service
   - 4 onafhankelijke cron jobs
   - Startup sync optie

2. **`src/server.ts`** (updated)
   - Integreert scheduler
   - Graceful shutdown van jobs
   - Export getSchedulerStatus()

3. **`src/api/routes.ts`** (updated)
   - Nieuwe endpoint: `GET /api/scheduler/status`

4. **`.env.example`** (updated)
   - 12 nieuwe configuratie variabelen
   - Per-component sync settings

5. **`.github/workflows/data-sync.yml`** (280 regels)
   - GitHub Actions workflow voor 24/7 sync
   - 2 jobs: forward-scan + favorites-sync
   - Database artifact storage

6. **`docs/SYNC_CONFIGURATION.md`** (480 regels)
   - Complete configuration guide
   - Voorbeelden voor alle use cases
   - Troubleshooting section

7. **`docs/DEPLOYMENT.md`** (updated)
   - 3 deployment opties gedocumenteerd
   - Hybride setup aanbevelingen

### Breaking Changes

**Geen!** Oude API endpoints blijven werken.

---

## Quick Start

### Test Configuratie (Lokaal)

```bash
# 1. Update .env
cat >> .env << EOF
FAVORITES_SYNC_ENABLED=true
FAVORITES_SYNC_CRON=*/5 * * * *
FAVORITES_SYNC_ON_STARTUP=true
EOF

# 2. Build
npm run build

# 3. Start (je ziet sync binnen 5 min)
npm start
```

### Test GitHub Actions

```bash
# 1. Add secret in GitHub UI
# ZWIFT_API_KEY = 650c6d2fc4ef6858d74cbef1

# 2. Push workflow
git add .
git commit -m "Add 24/7 sync config"
git push

# 3. Trigger handmatig
# GitHub → Actions → Run workflow
```

---

## Kosten Overzicht

| Setup | Forward Scan | Quick Syncs | Total Cost | Laptop Vereist |
|-------|--------------|-------------|------------|----------------|
| **Lokaal alleen** | ✅ Gratis | ✅ Gratis | €0 | Ja (24/7) |
| **GitHub alleen** | ❌ Te duur | ✅ Gratis | €0* | Nee |
| **Hybride** | ✅ Gratis | ✅ Gratis | €0 | Deels (17u/dag) |
| **Oracle VM** | ✅ Gratis | ✅ Gratis | €0 | Nee |

*GitHub Actions: €0 tot 2000 min/maand (forward scan past niet)

---

## Volgende Stappen

1. ✅ **Configuratie testen**:
   ```bash
   npm start
   curl http://localhost:3000/api/scheduler/status
   ```

2. ⏳ **GitHub Actions setup** (optioneel):
   - Add secret
   - Enable workflow
   - Test handmatig

3. ⏳ **Production deployment**:
   - Kies lokaal of externe VM
   - Setup PM2 of systemd
   - Monitor logs

4. ⏳ **Club sync implementeren**:
   - Update ClubService voor roster sync
   - Link met isFavorite field

---

## Documentatie

- **`docs/SYNC_CONFIGURATION.md`** - Complete sync configuration guide
- **`docs/DEPLOYMENT.md`** - Production deployment options
- **`docs/WORKFLOW_DESIGN.md`** - 5-step workflow explained
- **`.env.example`** - All configuration variables

---

## Support

**Vraag?** Check docs of open GitHub issue!

**Problem?** Check `docs/SYNC_CONFIGURATION.md` troubleshooting sectie.
