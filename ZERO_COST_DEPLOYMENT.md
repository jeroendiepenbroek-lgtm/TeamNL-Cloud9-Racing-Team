# 💰 ZERO-COST DEPLOYMENT GUIDE

**Status**: ✅ Production Ready  
**Cost**: €0/maand (GitHub Pro subscription + Supabase free tier)  
**Architecture**: Serverless via GitHub Actions

## 🎯 Overview

Complete autonomous data sync workflow zonder externe server kosten:

- **GitHub Actions** (free met GitHub Pro): Scheduled workflows elke N uur
- **Supabase** (free tier): PostgreSQL database (500MB, 2GB bandwidth/maand)
- **No external server**: Alles draait in GitHub Actions runners
- **Configureerbaar**: Sync times, event scraping, rate limiting

## 📐 Architecture

```
GitHub Actions Cron (configureerbaar)
    ↓
Runner startet (Ubuntu latest)
    ↓
1. Install dependencies (npm ci)
    ↓
2. Generate Prisma client
    ↓
3. Run migrations (Supabase)
    ↓
4. Sync club members
    ↓ 
5. Sync custom riders (optional)
    ↓
6. Scrape events (if enabled)
    ↓
7. Get statistics
    ↓
Supabase PostgreSQL (persistent data)
    ↓
Real-time subscriptions → Frontend
```

## ⚙️ Configuration

### 1. Environment Variables

Alle sync parameters zijn configureerbaar via `.env` of GitHub Secrets:

```bash
# Sync Timing (configureerbaar)
SYNC_INTERVAL_HOURS=1              # Elke N uur
SYNC_CRON_SCHEDULE="0 * * * *"     # Cron format (hourly)
ENABLE_AUTO_SYNC=false             # Auto-sync on server start

# Event Scraping (MVP feature)
EVENT_SCRAPING_ENABLED=true        # Enable/disable event scraping
EVENT_SCRAPING_DAYS=90             # Scrape events from last N days

# Rate Limiting
MAX_RETRIES=3                      # Max retries on API failure
```

### 2. Cron Schedule Examples

Wijzig `SYNC_CRON_SCHEDULE` in `.github/workflows/autonomous-sync.yml`:

```yaml
# Every hour at :00
- cron: '0 * * * *'

# Every 2 hours
- cron: '0 */2 * * *'

# Every 6 hours (00:00, 06:00, 12:00, 18:00)
- cron: '0 0,6,12,18 * * *'

# Daily at 08:00 UTC
- cron: '0 8 * * *'

# Twice daily (08:00 and 20:00 UTC)
- cron: '0 8,20 * * *'
```

**Note**: GitHub Actions cron gebruikt UTC timezone.

## 🚀 Setup (One-time)

### Step 1: GitHub Secrets

Ga naar repo Settings → Secrets and variables → Actions → New repository secret:

```bash
SUPABASE_URL                = https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_KEY        = eyJ... (service_role key)
SUPABASE_ANON_KEY           = eyJ... (anon public key)
SUPABASE_DATABASE_URL       = postgresql://postgres:[password]@db.bktbeefdmrpxhsyyalvc.supabase.co:5432/postgres
ZWIFT_API_KEY               = (your ZwiftRacing.app API key)
```

### Step 2: Enable GitHub Actions

1. Ga naar repo → Actions tab
2. Workflow "Autonomous Sync - Zero Cost Cloud Workflow" zou zichtbaar moeten zijn
3. Klik "Enable workflow" als disabled

### Step 3: Test Manual Run

1. Actions tab → "Autonomous Sync" workflow
2. Klik "Run workflow" dropdown
3. Configureer parameters:
   - **clubId**: `11818` (TeamNL Cloud9)
   - **riderIds**: Leeg (of comma-separated IDs)
   - **enableEventScraping**: `true` of `false`
4. Klik "Run workflow"

### Step 4: Monitor First Run

Check logs in Actions tab:
- ✅ Dependencies installed
- ✅ Prisma client generated
- ✅ Migrations applied
- ✅ Supabase connected
- ✅ Club synced (N members)
- ✅ Events scraped (if enabled)
- ✅ Final stats printed

## 📊 Workflow Scripts

Alle scripts draaien direct in GitHub Actions runner:

### `scripts/sync-club.ts`

Synct club info + alle members:

```bash
npx tsx scripts/sync-club.ts 11818
```

**Output**:
```
🔄 Syncing club 11818...
  📋 Club: TeamNL Cloud9 (348 members)
✅ Club sync complete: 348 members
```

### `scripts/sync-rider.ts`

Synct detailed rider info:

```bash
npx tsx scripts/sync-rider.ts 150437
```

**Output**:
```
🔄 Syncing rider 150437...
  👤 Rider: John Doe (TeamNL Cloud9)
✅ Rider sync complete
```

### `scripts/scrape-events.ts`

Scrapet events van alle riders:

```bash
npx tsx scripts/scrape-events.ts
```

**Output**:
```
🕷️  Starting event scraping (last 90 days)...
  📋 Found 348 riders to scrape
  🔄 Scraping rider John Doe (150437)...
    ✅ 12 new events, 12 new results
═══════════════════════════════════════
✅ Event scraping complete
  Riders processed: 348/348
  New events: 4,216
  New results: 4,216
  Failed: 0
═══════════════════════════════════════
```

**Rate Limiting**: 2 seconden delay tussen requests om ZwiftRacing.app niet te overbelasten.

### `scripts/get-stats.ts`

Toont database statistieken:

```bash
npx tsx scripts/get-stats.ts
```

**Output**:
```
📊 DATABASE STATISTICS
═══════════════════════════════════════
  Riders: 348
  Clubs: 1
  Events: 4,216
  Race Results: 4,216
═══════════════════════════════════════
```

## 🔧 Customization

### 1. Change Sync Frequency

Edit `.github/workflows/autonomous-sync.yml`:

```yaml
on:
  schedule:
    - cron: '0 */2 * * *'  # Change to every 2 hours
```

### 2. Disable Event Scraping

Set in workflow env vars:

```yaml
env:
  EVENT_SCRAPING_ENABLED: false
```

Of via manual trigger input.

### 3. Sync Multiple Clubs

Edit workflow om meerdere clubs te syncen:

```yaml
- name: Sync multiple clubs
  run: |
    npx tsx scripts/sync-club.ts 11818  # TeamNL Cloud9
    npx tsx scripts/sync-club.ts 2281   # Andere club
```

### 4. Custom Rider List

Manual trigger met `riderIds` input:

```
150437,234567,345678
```

Workflow parsed dit automatisch naar array en synct elke rider.

## 📈 Monitoring

### GitHub Actions Logs

- Actions tab → Latest workflow run
- Check alle steps voor errors
- Download logs via "Download log archive"

### Supabase Dashboard

- https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc
- Table Editor → riders, clubs, events, race_results
- SQL Editor voor custom queries:

```sql
-- Laatste synced riders
SELECT name, updated_at 
FROM riders 
ORDER BY updated_at DESC 
LIMIT 10;

-- Event count per rider
SELECT r.name, COUNT(rr.id) as race_count
FROM riders r
JOIN race_results rr ON r.id = rr.rider_id
GROUP BY r.name
ORDER BY race_count DESC;
```

### Workflow History

- Actions tab → Workflow runs
- Filter by status: success, failure, cancelled
- Check run duration (should be < 10 min for 348 riders)

## 💡 Best Practices

### 1. Rate Limiting

ZwiftRacing.app heeft rate limits:
- **Club members**: 1 request/60min
- **Individual riders**: 5 requests/min
- **Event scraping**: 2 sec delay tussen requests

**Recommendation**: Sync club members elk uur, event scraping max 1x per dag.

### 2. Data Usage

Supabase free tier: **2GB bandwidth/maand**

Geschatte usage:
- Club sync (348 members): ~500KB
- Event scraping (90 days): ~5MB per run
- Monthly (hourly club sync + daily events): ~400MB

**Safe margin**: Blijf onder 1GB/maand voor buffer.

### 3. GitHub Actions Minutes

Free tier (GitHub Pro): **3000 minuten/maand**

Geschatte usage:
- 1 workflow run: ~5 minuten (met event scraping)
- Hourly runs: 24 runs/dag × 5 min = 120 min/dag = 3600 min/maand

**Recommendation**: 
- Run club sync elke 2 uur (1800 min/maand)
- Event scraping 1x per dag (150 min/maand)
- Total: ~2000 min/maand (binnen limits)

### 4. Error Recovery

Workflow heeft built-in error handling:
- API failures worden gelogd maar stoppen workflow niet
- Rider sync failures: continue met volgende rider
- Event scraping failures: non-critical, log warning

## 🐛 Troubleshooting

### Workflow fails: "Supabase connection failed"

**Check**:
1. GitHub Secrets correct ingesteld
2. Supabase project actief (niet paused)
3. Database migrations up-to-date

**Fix**:
```bash
# Lokaal migrations checken
npx prisma migrate status
npx prisma migrate deploy
```

### Event scraping: "Rate limit exceeded"

**Symptoom**: 429 errors in logs

**Fix**: Verhoog delay in `scripts/scrape-events.ts`:
```typescript
await new Promise(resolve => setTimeout(resolve, 5000)); // 5 sec
```

### Club sync: "No members found"

**Check**:
1. Club ID correct (11818 voor TeamNL Cloud9)
2. ZwiftRacing.app API bereikbaar
3. API key valid

**Debug**:
```bash
# Test API direct
curl "https://zwift-ranking.herokuapp.com/public/clubs/11818"
```

### Workflow never triggers

**Check**:
1. Workflow enabled in Actions tab
2. Cron schedule correct (UTC timezone!)
3. Repo has recent commits (workflows paused na 60 dagen inactiviteit)

## 🎉 Success Criteria

Workflow is succesvol als:

✅ **Club sync**: Alle members in `clubs` + `club_roster` tables  
✅ **Rider sync**: Detailed data in `riders` table  
✅ **Event scraping**: Events in `events` table + results in `race_results`  
✅ **Stats**: Counts kloppen met verwachting  
✅ **No errors**: Alle steps green in Actions logs  
✅ **Within limits**: GitHub Actions minutes + Supabase bandwidth onder quota

## 📚 Resources

- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Supabase Pricing](https://supabase.com/pricing) - Free tier limits
- [ZwiftRacing.app API Docs](https://github.com/andiOxaa/zwift-racing-api-docs)
- Cron generator: [crontab.guru](https://crontab.guru/)

---

**Gebouwd**: November 2025  
**Status**: ✅ Production Ready  
**Cost**: €0/maand  
**Maintenance**: Geen server onderhoud nodig
