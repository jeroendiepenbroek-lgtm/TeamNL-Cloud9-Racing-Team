# 🚀 Race Results Deployment Guide

**Versie**: 2.0 - zpdatafetch  
**Datum**: 7 januari 2026  
**Status**: ✅ Klaar voor deployment

---

## ⚡ Quick Start (5 minuten)

### 1. Installeer Dependencies

```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team

# Activeer virtual environment (als je die hebt)
source .venv/bin/activate

# Installeer packages
pip install zpdatafetch keyring supabase
```

### 2. Configureer Credentials

```bash
# Optie A: Via Python (aanbevolen)
python3 << 'EOF'
import keyring
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
keyring.set_password("zrdatafetch", "authorization", "650c6d2fc4ef6858d74cbef1")
print("✅ Credentials configured!")
EOF

# Optie B: Via command line
keyring set zpdatafetch username  # Enter: jeroen.diepenbroek@gmail.com
keyring set zpdatafetch password  # Enter: CloudRacer-9
keyring set zrdatafetch authorization  # Enter: 650c6d2fc4ef6858d74cbef1
```

### 3. Test de Setup

```bash
python test-quick-race-results.py
```

Je zou moeten zien:
```
✅ Success!
   Name: JRøne | CloudRacer-9 @YouTube
   Rating: 1437.64
   Category: Amethyst
```

### 4. Database Migration

In **Supabase SQL Editor**:

```sql
-- Kopieer en plak de volledige inhoud van:
-- migrations/015_race_results_zpdatafetch.sql
```

Of via command line (als je supabase CLI hebt):

```bash
supabase db push migrations/015_race_results_zpdatafetch.sql
```

### 5. Run First Sync

```bash
# Set Supabase credentials
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key-here"

# Run sync
python race-results-db-sync.py
```

---

## 🔧 Environment Variables

Voor **Railway** / **Vercel** / **Docker**:

```bash
# ZwiftPower (optional - in keyring)
ZWIFTPOWER_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFTPOWER_PASSWORD=CloudRacer-9

# Zwiftracing (optional - in keyring)
ZWIFTRACING_API_TOKEN=650c6d2fc4ef6858d74cbef1

# Supabase (required for DB sync)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# TeamNL Club ID (optional - default 2281)
TEAMNL_CLUB_ID=2281
```

---

## 📦 Docker Deployment

### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install race results dependencies
RUN pip install --no-cache-dir zpdatafetch keyring supabase

# Copy application
COPY . .

# Run sync
CMD ["python", "race-results-db-sync.py"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  race-results-sync:
    build: .
    environment:
      - ZWIFTRACING_API_TOKEN=${ZWIFTRACING_API_TOKEN}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

---

## 🤖 Automation

### Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add line voor sync elke 6 uur
0 */6 * * * cd /path/to/project && .venv/bin/python race-results-db-sync.py >> logs/race-sync.log 2>&1
```

### Systemd Service (Linux)

Create `/etc/systemd/system/race-results-sync.service`:

```ini
[Unit]
Description=Race Results Sync Service
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/project
Environment="SUPABASE_URL=https://xxx.supabase.co"
Environment="SUPABASE_SERVICE_KEY=xxx"
ExecStart=/path/to/project/.venv/bin/python race-results-db-sync.py

[Install]
WantedBy=multi-user.target
```

Create timer `/etc/systemd/system/race-results-sync.timer`:

```ini
[Unit]
Description=Race Results Sync Timer
Requires=race-results-sync.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=6h

[Install]
WantedBy=timers.target
```

Enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable race-results-sync.timer
sudo systemctl start race-results-sync.timer
```

### Railway.app

Create `railway.toml`:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "python race-results-db-sync.py"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[services]]
name = "race-results-sync"
cronSchedule = "0 */6 * * *"
```

Set environment variables in Railway dashboard.

---

## 🔍 Verificatie

### Check Database

```sql
-- Recent results
SELECT * FROM v_recent_race_results 
ORDER BY fetched_at DESC 
LIMIT 10;

-- TeamNL results
SELECT * FROM v_teamnl_race_results 
WHERE event_date >= NOW() - INTERVAL '7 days'
ORDER BY event_date DESC;

-- Sync log
SELECT * FROM race_results_sync_log 
ORDER BY started_at DESC 
LIMIT 5;

-- Statistics
SELECT 
  COUNT(*) as total_results,
  COUNT(DISTINCT event_id) as events,
  COUNT(DISTINCT rider_id) as riders,
  MAX(fetched_at) as last_sync
FROM race_results;
```

### Check Logs

```bash
# If using file logging
tail -f logs/race-sync.log

# If using systemd
journalctl -u race-results-sync.service -f

# If using Docker
docker logs -f race-results-sync
```

---

## ⚠️ Troubleshooting

### "No module named 'zpdatafetch'"

```bash
pip install zpdatafetch keyring
```

### "No credentials found in keyring"

```bash
# Run credentials setup again
python3 << 'EOF'
import keyring
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
keyring.set_password("zrdatafetch", "authorization", "650c6d2fc4ef6858d74cbef1")
EOF
```

### "Database connection failed"

```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Test connection
python3 << 'EOF'
from supabase import create_client
import os
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
client = create_client(url, key)
print("✅ Connection successful!")
EOF
```

### "Rate limit exceeded (429)"

De API heeft rate limits:
- **Standard**: 5 GET/min, 1 POST/15min
- **Premium**: 10 GET/min, 10 POST/15min

**Oplossing**: 
- Wacht 15 minuten
- Gebruik batch endpoints waar mogelijk
- Overweeg premium tier voor hogere limits

### Keyring Backend Issues (Docker/Headless)

Als je draait zonder GUI:

```python
# In je Python script, voeg toe:
import keyring
from keyring.backends.fail import Keyring as FailKeyring

# Gebruik environment variables als fallback
import os
if not os.environ.get('DISPLAY'):
    # Headless mode - gebruik env vars
    os.environ['ZWIFTPOWER_USERNAME'] = 'jeroen.diepenbroek@gmail.com'
    os.environ['ZWIFTPOWER_PASSWORD'] = 'CloudRacer-9'
```

---

## 📊 Monitoring

### Simple Health Check

```bash
#!/bin/bash
# health-check.sh

LAST_SYNC=$(psql $DATABASE_URL -t -c "SELECT MAX(fetched_at) FROM race_results;")
NOW=$(date +%s)
LAST=$(date -d "$LAST_SYNC" +%s)
DIFF=$((NOW - LAST))

# Alert if no sync in last 12 hours
if [ $DIFF -gt 43200 ]; then
    echo "⚠️  WARNING: No sync in last 12 hours!"
    # Send alert (email, Slack, etc.)
fi
```

### Grafana Dashboard

Query voor metrics:

```sql
-- Sync success rate
SELECT 
  DATE_TRUNC('day', started_at) as date,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE success = true) as successful,
  ROUND(COUNT(*) FILTER (WHERE success = true)::numeric / COUNT(*) * 100, 2) as success_rate
FROM race_results_sync_log
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- Results per day
SELECT 
  DATE_TRUNC('day', fetched_at) as date,
  COUNT(*) as results_count,
  COUNT(DISTINCT event_id) as events_count
FROM race_results
WHERE fetched_at >= NOW() - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;
```

---

## ✅ Deployment Checklist

- [ ] Dependencies geïnstalleerd (`pip install zpdatafetch keyring supabase`)
- [ ] Credentials geconfigureerd in keyring
- [ ] Test passed (`python test-quick-race-results.py`)
- [ ] Database migration uitgevoerd
- [ ] Environment variables ingesteld
- [ ] Eerste sync succesvol (`python race-results-db-sync.py`)
- [ ] Automation opgezet (cron/systemd/Railway)
- [ ] Monitoring geconfigureerd
- [ ] Documentatie gelezen
- [ ] Backup strategie bepaald

---

## 🆘 Support

Bij problemen:
1. Check logs: `tail -f logs/race-sync.log`
2. Run test: `python test-quick-race-results.py`
3. Check database: `SELECT * FROM race_results_sync_log ORDER BY started_at DESC LIMIT 1;`
4. Check credentials: `keyring get zpdatafetch username`

---

**Happy Racing! 🚴‍♂️💨**
