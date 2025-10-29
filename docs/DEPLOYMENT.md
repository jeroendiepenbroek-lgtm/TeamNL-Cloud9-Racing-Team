# 🚀 Production Deployment Guide# Deployment Guide - TeamNL Cloud9 Dashboard

## Zero-Cost Hosting & Setup

## Railway.app Deployment (Aanbevolen - Zero Cost)

**Laatst bijgewerkt**: 27 oktober 2025

### Quick Start

---

1. **Railway Account**: https://railway.app → Login met GitHub

2. **New Project** → Deploy from GitHub → Selecteer deze repo## Overzicht

3. **Add PostgreSQL**: New → Database → PostgreSQL

4. **Environment Variables** (zie hieronder)Deze guide beschrijft hoe je de TeamNL Cloud9 Dashboard draait op een **zero-cost** setup met:

5. **Deploy!** - Automatisch bij push naar main- **SQLite database** (lokaal of op VM)

- **Node.js** server (jouw eigen machine of gratis VM)

### Environment Variables- **Cron jobs** voor automatische syncs

- **ZwiftRacing API** (gratis public API)

```bash

NODE_ENV=production**Totale kosten**: €0/maand (als je eigen hardware gebruikt of gratis VM tier)

AUTH_ENABLED=true

API_USERNAME=admin---

API_PASSWORD=jouw-veilige-wachtwoord

## Vereisten

ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1

ZWIFT_CLUB_ID=2281### Software

ENABLE_AUTO_SYNC=true- Node.js 18+ (LTS)

SCHEDULER_ENABLED=true- npm 9+

- Git

# DATABASE_URL wordt automatisch gezet door Railway- sqlite3 (optioneel, voor DB inspect)

```

### Hardware Minimaal

### Authenticatie- CPU: 1 core

- RAM: 512MB

**Basic Auth voorbeeld:**- Disk: 1GB (database groeit ~10MB/maand)

```bash- Network: 1Mbps (voor API calls)

curl -u admin:password https://your-app.railway.app/api/workflow/status

```### Zero-Cost Hosting Opties



**JavaScript:**1. **Lokaal (jouw PC/laptop)**

```javascript   - ✅ Volledig gratis

const auth = btoa('admin:password');   - ✅ Geen setup

fetch('https://your-app.railway.app/api/workflow/status', {   - ❌ Moet altijd aan blijven voor cron

  headers: { 'Authorization': `Basic ${auth}` }

});2. **Fly.io Free Tier**

```   - ✅ 256MB RAM gratis

   - ✅ 3GB disk gratis

### Database Toegang   - ✅ Persistent volume voor SQLite

   - ❌ Cold starts (na inactiviteit)

Via Prisma Studio (lokaal):

```bash3. **Railway Free Tier** (nu beperkt)

# Kopieer DATABASE_URL van Railway dashboard   - ⚠️ $5 credit/maand (was gratis)

export DATABASE_URL="postgresql://..."   - ❌ Niet meer echt zero-cost

npx prisma studio

```4. **Oracle Cloud Always Free**

   - ✅ 1GB RAM VM gratis

### Monitoring   - ✅ Altijd online

   - ❌ Setup complexer

- **Health**: `https://your-app.railway.app/api/health`

- **Logs**: Railway dashboard → Logs tab**Aanbeveling**: Start lokaal, migreer naar Fly.io als je 24/7 uptime wilt.

- **Metrics**: CPU/Memory usage in dashboard

---

### Cost

## Setup Stappen

- $5 gratis credit/maand (binnen GitHub benefits)

- Deze app: ~350 uur/maand = binnen limiet! ✅### 1. Clone Repository



---```bash

git clone https://github.com/<jouw-username>/TeamNL-Cloud9-Racing-Team.git

## Docker Deployment (Self-hosted)cd TeamNL-Cloud9-Racing-Team

```

```bash

# Build en run met Docker Compose### 2. Install Dependencies

docker-compose up -d

```bash

# Check logsnpm install

docker-compose logs -f app```



# Stop### 3. Database Setup

docker-compose down

``````bash

# Genereer Prisma client

---npm run db:generate



## Troubleshooting# Run migrations

npm run db:migrate

**App crashed:**

```bash# (Optioneel) Seed test data

railway logs --tail 100npm run db:seed

``````



**Cron jobs werken niet:**### 4. Environment Variables

- Check `ENABLE_AUTO_SYNC=true`

- Check logs voor scheduler messagesKopieer `.env.example` naar `.env`:



**Database connectie:**```bash

- Verifieer `DATABASE_URL` in Railway variablescp .env.example .env

- PostgreSQL service moet running zijn```



---Edit `.env`:



Zie `.env.production.example` voor alle environment variables.```bash

# Database (SQLite = zero-cost!)
DATABASE_URL="file:./prisma/dev.db"

# ZwiftRacing API (gratis)
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
ZWIFT_API_BASE_URL=https://zwift-ranking.herokuapp.com

# Server
PORT=3000
NODE_ENV=production

# Forward scanning (optional overrides)
FORWARD_SCAN_ENABLED=true
FORWARD_SCAN_MAX_EVENTS=1000
FORWARD_SCAN_RETENTION_DAYS=100
```

### 5. Build & Start

```bash
# Build TypeScript
npm run build

# Start server
npm start

# Of met PM2 (aanbevolen voor production)
npm run pm2:start
```

Server draait nu op `http://localhost:3000`

---

## Cron Jobs - Automated Syncs

⭐ **NIEUW**: Server heeft ingebouwde scheduler! Zie `docs/SYNC_CONFIGURATION.md` voor complete guide.

Voor automatische data synchronisatie heb je **3 opties**:

### ✅ Optie 1: Ingebouwde Scheduler (Aanbevolen, Laptop moet aanstaan)

**Voordeel**: Volledig configureerbaar via `.env`, geen OS-level cron nodig!

**Setup**:

1. **Configureer in `.env`**:
   ```bash
   # Zie .env.example of docs/SYNC_CONFIGURATION.md voor alle opties
   FAVORITES_SYNC_ENABLED=true
   FAVORITES_SYNC_CRON=0 */6 * * *
   
   CLUB_SYNC_ENABLED=true
   CLUB_SYNC_CRON=0 */12 * * *
   
   FORWARD_SCAN_ENABLED=true
   FORWARD_SCAN_CRON=0 4 * * *
   ```

2. **Start server**:
   ```bash
   npm start
   ```
   
   Je ziet:
   ```
   ✅ Scheduler gestart met 4 jobs
   📅 Scheduled: favorites-sync (0 */6 * * *)
   📅 Scheduled: club-sync (0 */12 * * *)
   📅 Scheduled: forward-scan (0 4 * * *)
   📅 Scheduled: cleanup (0 3 * * *)
   ```

3. **Check status**:
   ```bash
   curl http://localhost:3000/api/scheduler/status
   ```

✅ **Done!** Alles draait automatisch.

---

### ✅ Optie 2: GitHub Actions (24/7 zonder laptop)

**Voordeel**: Draait op GitHub servers, laptop mag uit!

**Setup**:

1. **Add secret** in GitHub repo:
   - Settings → Secrets → New: `ZWIFT_API_KEY` = `650c6d2fc4ef6858d74cbef1`

2. **Enable workflow**:
   ```bash
   # Workflow al toegevoegd in .github/workflows/data-sync.yml
   git push
   ```

3. **Test handmatig**:
   - GitHub → Actions → "24/7 Data Sync" → Run workflow

⚠️ **Limitatie**: GitHub Actions free tier = 2000 min/maand. Forward scan (17 uur) past hier niet in. Gebruik voor:
- ✅ Favorites sync (2 min)
- ✅ Club sync (5 min)
- ❌ Forward scan (gebruik lokale cron)

**Aanbeveling**: Hybride setup (zie `docs/SYNC_CONFIGURATION.md`)

---

### ✅ Optie 3: OS-Level Crontab (Laptop moet aanstaan)

Voor Linux/Mac systemen met lokale scheduling.

Open crontab editor:

```bash
crontab -e
```

Voeg deze regels toe:

```cron
# Forward event scanning - daily at 04:00
0 4 * * * cd /path/to/TeamNL-Cloud9-Racing-Team && npm run sync:forward >> /var/log/forward-sync.log 2>&1

# Rider stats sync - elke 6 uur
0 */6 * * * cd /path/to/TeamNL-Cloud9-Racing-Team && npm run sync:favorites >> /var/log/rider-sync.log 2>&1

# Club roster sync - elk uur (let op rate limit!)
0 * * * * cd /path/to/TeamNL-Cloud9-Racing-Team && npm run sync:events:club >> /var/log/club-sync.log 2>&1
```

**Belangrijk**: Vervang `/path/to/TeamNL-Cloud9-Racing-Team` met je echte pad!

Check cron status:

```bash
# List active cron jobs
crontab -l

# View logs
tail -f /var/log/forward-sync.log
```

### Windows - Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 04:00
4. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd C:\path\to\project && npm run sync:forward >> sync.log 2>&1`

### Fly.io - Scheduled Tasks

Als je op Fly.io draait, gebruik hun scheduler:

```toml
# fly.toml
[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1

[[mounts]]
  source = "data"
  destination = "/data"
  
[env]
  DATABASE_URL = "file:/data/dev.db"

# Scheduled task (Fly Machines)
[cron.forward-scan]
  schedule = "0 4 * * *"
  cmd = "npm run sync:forward"
```

---

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Subteam Management (Workflow Steps 1-3)

**Add Favorites**:

```bash
curl -X POST http://localhost:3000/api/subteam/riders \
  -H "Content-Type: application/json" \
  -d '{"zwiftIds": [150437, 123456]}'
```

**List Favorites**:

```bash
curl http://localhost:3000/api/subteam/riders
```

**Remove Favorite**:

```bash
curl -X DELETE http://localhost:3000/api/subteam/riders/150437
```

**Sync Stats** (manual trigger):

```bash
curl -X POST http://localhost:3000/api/subteam/sync
```

### Forward Scanning (Workflow Step 5)

**Manual Trigger**:

```bash
curl -X POST http://localhost:3000/api/sync/forward \
  -H "Content-Type: application/json" \
  -d '{"maxEvents": 10, "retentionDays": 100}'
```

**Get Tracked Events**:

```bash
curl http://localhost:3000/api/events/tracked?limit=50
```

---

## CLI Scripts

### Test Forward Scan (Small Range)

```bash
# Test with 5 events
npm run sync:forward -- --maxEvents=5 --startEventId=5129365

# Full scan (1000 events, ~17 uur)
npm run sync:forward

# Custom retention
npm run sync:forward -- --retentionDays=90
```

### Database Inspection

```bash
# Prisma Studio GUI
npm run db:studio

# SQLite CLI
sqlite3 prisma/dev.db

# Queries
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM riders WHERE isFavorite = 1;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM events WHERE deletedAt IS NULL;"
```

---

## Monitoring & Logs

### PM2 Logs

```bash
# View real-time logs
npm run pm2:logs

# Status
npm run pm2:status

# Restart
npm run pm2:restart
```

### Log Files

- `/var/log/forward-sync.log` - Forward scanning
- `/var/log/rider-sync.log` - Rider stats sync
- `/var/log/club-sync.log` - Club roster sync

### Database Size Monitoring

```bash
# Check database size
du -h prisma/dev.db

# Event count
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM events WHERE deletedAt IS NULL;"

# Archived event count
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM events WHERE deletedAt IS NOT NULL;"
```

---

## Troubleshooting

### Error: "database is locked"

**Oorzaak**: SQLite kan maar 1 schrijver tegelijk hebben.

**Oplossing**:
1. Sluit Prisma Studio (`npm run db:studio`)
2. Of: migrate naar PostgreSQL voor concurrency

### Error: "Rate limit bereikt"

**Oorzaak**: ZwiftRacing API rate limits overschreden.

**Oplossing**:
- Club sync: max 1 per 60 min
- Rider sync: max 5 per min
- Event sync: max 1 per min

Check laatste sync:

```bash
curl http://localhost:3000/api/sync/logs | jq '.[-1]'
```

### Cron Not Running

**Check**:

```bash
# Is cron service active?
systemctl status cron

# Logs
grep CRON /var/log/syslog

# Manual test
cd /path/to/project && npm run sync:forward
```

### Database Migration Failed

**Reset**:

```bash
# Backup first!
cp prisma/dev.db prisma/dev.db.backup

# Reset and re-migrate
npx prisma migrate reset
npm run db:migrate
```

---

## Backup Strategie

### Automatische Backups (Cron)

```cron
# Daily backup at 03:00 (before forward scan at 04:00)
0 3 * * * cp /path/to/prisma/dev.db /backups/dev-$(date +\%Y\%m\%d).db
```

### Manual Backup

```bash
# Backup database
cp prisma/dev.db backups/dev-backup-$(date +%Y%m%d).db

# Restore
cp backups/dev-backup-20251027.db prisma/dev.db
```

### Cloud Backup (Optional)

```bash
# Upload to Google Drive (rclone)
rclone copy prisma/dev.db gdrive:backups/

# Or AWS S3
aws s3 cp prisma/dev.db s3://my-bucket/backups/
```

---

## Performance Optimization

### Database Indices

Prisma schema heeft al de belangrijkste indices:

```prisma
@@index([eventDate])
@@index([deletedAt])
@@index([isFavorite])
```

### Query Optimization

```typescript
// ✅ Good - select only needed fields
const riders = await prisma.rider.findMany({
  select: { zwiftId: true, name: true, ftp: true },
  where: { isFavorite: true }
});

// ❌ Bad - fetches everything
const riders = await prisma.rider.findMany({
  where: { isFavorite: true }
});
```

### Rate Limit Buffers

Default settings zijn veilig:

- Club: 61 min tussen calls (safe for 60 min limit)
- Rider: 12 sec tussen calls (5/min)
- Events: 61 sec tussen calls (1/min)

---

## Security Checklist

- [ ] `.env` file **NOOIT** committen (staat in `.gitignore`)
- [ ] API key geheim houden (geen logs, geen public repos)
- [ ] Firewall: alleen poort 3000 open indien nodig
- [ ] PM2 draaien als non-root user
- [ ] Database backups encrypted (indien gevoelige data)

---

## Kosten Overzicht

| Service | Kosten | Opmerking |
|---------|--------|-----------|
| ZwiftRacing API | €0 | Public API, gratis |
| SQLite Database | €0 | Lokaal bestand |
| Node.js Server | €0 | Eigen hardware |
| Fly.io (optional) | €0 | Free tier 256MB RAM |
| Cron Jobs | €0 | OS feature |
| **Totaal** | **€0/maand** | ✅ Volledig gratis |

**Als je groeit**:
- PostgreSQL (Supabase free tier): €0 tot 500MB
- Fly.io scale-up: ~€5-10/maand voor meer RAM
- External backups: Google Drive gratis 15GB

---

## Volgende Stappen

1. ✅ **Test lokaal**: Add 1-2 favorites, run forward scan met `--maxEvents=5`
2. ✅ **Setup cron**: Voor daily automatic forward scanning
3. ⏳ **Monitor logs**: Check na eerste cron run of alles werkt
4. ⏳ **Backups**: Setup daily database backup
5. ⏳ **Frontend**: Bouw dashboard UI (Next.js)

---

## Support & Resources

- **Project Docs**: `docs/WORKFLOW_DESIGN.md`, `docs/IMPLEMENTATION_STATUS.md`
- **API Docs**: `docs/API.md`
- **GitHub Issues**: Voor bugs en feature requests
- **ZwiftRacing API**: https://zwift-ranking.herokuapp.com

**Vraag?** Check de docs of open een GitHub issue!

