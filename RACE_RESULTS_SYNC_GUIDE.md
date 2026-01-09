# Race Results Sync - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install zpdatafetch keyring supabase
```

### 2. Set Environment Variables

```bash
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_SERVICE_KEY='your-service-role-key'
```

### 3. Run Sync

```bash
python sync-race-results.py
```

## 📊 What It Does

1. **Fetches TeamNL Riders** - Haalt alle riders uit `zwift_racing_riders` tabel (club_id=2281)
2. **Gets Race History** - Voor elke rider: haal race history op (laatste 90 dagen)
3. **Fetches Event Results** - Voor elk uniek event: haal volledige results op
4. **Saves to Database** - Schrijft naar `race_events` en `race_results` tabellen

## 🗄️ Database Structure

### Tables Created (from migration 015)

- **race_events** - Event metadata (event_id, name, date)
- **race_results** - Individual race results (event_id, rider_id, position, power, etc.)
- **race_results_sync_log** - Sync history en status

### Views Created

- **v_recent_race_results** - Results van laatste 30 dagen
- **v_teamnl_race_results** - Alleen TeamNL riders (JOIN met zwift_racing_riders)
- **v_rider_race_stats** - Aggregated statistics per rider

## ⚙️ Configuration

Edit in `sync-race-results.py`:

```python
CLUB_ID = 2281  # TeamNL club ID
DAYS_BACK = 90  # Haal laatste X dagen op
```

## 🔄 Automation

### Option 1: Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Run elke 6 uur
0 */6 * * * cd /path/to/project && python sync-race-results.py >> sync.log 2>&1
```

### Option 2: Railway

1. Add environment variables in Railway dashboard
2. Add to `railway.toml`:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "python sync-race-results.py"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### Option 3: GitHub Actions

Create `.github/workflows/sync-race-results.yml`:

```yaml
name: Sync Race Results
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - run: pip install zpdatafetch keyring supabase
      - run: python sync-race-results.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

## 📝 Logging

Sync details worden opgeslagen in `race_results_sync_log` tabel:

```sql
SELECT * FROM race_results_sync_log ORDER BY started_at DESC LIMIT 5;
```

## 🧹 Database Cleanup

Run cleanup script om oude/ongebruikte tabellen te verwijderen:

```sql
-- In Supabase SQL Editor
-- Voer uit: migrations/016_cleanup_unused_tables.sql
```

## 🔍 Verification Queries

```sql
-- Check recent syncs
SELECT 
    started_at,
    status,
    riders_processed,
    events_processed,
    results_saved,
    EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM race_results_sync_log
ORDER BY started_at DESC
LIMIT 10;

-- Check race results count
SELECT 
    COUNT(*) as total_results,
    COUNT(DISTINCT event_id) as unique_events,
    COUNT(DISTINCT rider_id) as unique_riders,
    MIN(event_date) as earliest_race,
    MAX(event_date) as latest_race
FROM race_results rr
JOIN race_events re ON rr.event_id = re.event_id;

-- Check TeamNL results
SELECT 
    r.rider_name,
    COUNT(*) as total_races,
    AVG(r.avg_power) as avg_power,
    AVG(r.position) as avg_position
FROM v_teamnl_race_results r
GROUP BY r.rider_name
ORDER BY total_races DESC
LIMIT 10;
```

## ⚠️ Rate Limits

- **ZwiftPower Cyclist API**: 5 calls per minute
- **Result API**: 1 call per minute per event
- Script includes automatic rate limiting

## 🐛 Troubleshooting

### No riders found
```bash
# Check database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM zwift_racing_riders WHERE club_id=2281;"
```

### API errors
```bash
# Verify credentials
python -c "import keyring; print(keyring.get_password('zpdatafetch', 'username'))"
```

### Duplicate results
```bash
# Already handled - script checks existing results before inserting
```

## 📈 Performance

- ~100 riders: ~10-15 minutes (met rate limiting)
- ~50 unique events: ~5 minutes
- Total: ~20 minutes voor volledige sync

## 🔐 Security

- Service key wordt alleen server-side gebruikt
- Credentials worden opgeslagen in system keyring
- Nooit credentials committen naar Git!
