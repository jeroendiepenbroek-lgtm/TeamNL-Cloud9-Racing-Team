# 🚀 Geautomatiseerde E2E Workflow

## Overzicht

**Geen handmatige stappen meer!** Deploy naar Railway → Migrations auto-execute → Data auto-sync → Views auto-update.

---

## 🎯 Quick Start (1 Command)

```bash
./railway-deploy.sh
```

Dit doet automatisch:
1. ✅ Git commit & push
2. ✅ Deploy naar Railway
3. ✅ Run migrations (execute-migrations.js)
4. ✅ Sync rider 150437 data
5. ✅ Verify data in v_rider_complete

---

## 📊 Workflow Stappen

### 1. Deploy to Railway

```bash
railway up
```

**Wat gebeurt er:**
- Code wordt gedeployed naar Railway server
- Railway heeft internet → kan Supabase bereiken
- Environment variables worden geladen

---

### 2. Auto-Execute Migrations

```bash
railway run node execute-migrations.js
```

**Script:** `execute-migrations.js`
- Leest migrations/005_*.sql en migrations/006_*.sql
- Voert SQL uit via Supabase client
- DROP TABLE CASCADE → CREATE TABLE → CREATE VIEW
- Geen handmatige copy-paste meer!

---

### 3. Auto-Sync Data

```bash
railway run node fetch-zwiftracing-rider.js 150437
```

**Script:** `fetch-zwiftracing-rider.js`
- Haalt data op van ZwiftRacing API
- Transform naar database schema
- Upsert naar api_zwiftracing_riders
- Views updaten automatisch (FULL OUTER JOIN)

---

### 4. Auto-Verify

```bash
railway run node verify-data.js
```

**Verificatie:**
```sql
SELECT * FROM v_rider_complete WHERE rider_id = 150437;
```

**Verwacht resultaat:**
```
✅ velo_live: 1413.91
✅ velo_90day: 1461.01
✅ category: B
✅ data_completeness: complete
```

---

## 🔄 Continuous Sync (Automated)

### Optie 1: Railway Cron Job

```bash
# Setup in Railway dashboard
Service: backend
Cron Expression: 0 */6 * * *  (elke 6 uur)
Command: node fetch-zwiftracing-rider.js 150437
```

### Optie 2: GitHub Actions

**File:** `.github/workflows/sync-data.yml`

```yaml
name: Auto Sync Data
on:
  schedule:
    - cron: '0 */6 * * *'  # Elke 6 uur
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node fetch-zwiftracing-rider.js 150437
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## 🛠️ Environment Variables (Railway)

```bash
SUPABASE_URL=https://tfsepzumkireferencer.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ZWIFTRACING_API_KEY=650c6d2fc4ef6858d74cbef1
```

---

## 📈 Monitoring

### Check Deployment Status

```bash
railway status
```

### Check Logs

```bash
railway logs
```

### Check Data Freshness

```sql
SELECT 
  rider_id, 
  full_name,
  racing_data_updated,
  AGE(NOW(), racing_data_updated) AS data_age
FROM v_rider_complete
WHERE rider_id = 150437;
```

---

## 🚨 Troubleshooting

### Issue: Migrations Fail

**Check:**
```bash
railway run node execute-migrations.js
```

**Fallback:**
Run manual SQL in Supabase from `RUN_THIS_IN_SUPABASE.sql`

### Issue: Data Not Syncing

**Check API:**
```bash
railway run node fetch-zwiftracing-rider.js 150437
```

**Check logs:**
```bash
railway logs --tail
```

### Issue: View Empty

**Verify table:**
```sql
SELECT COUNT(*) FROM api_zwiftracing_riders;
SELECT COUNT(*) FROM api_zwift_api_profiles;
```

---

## 🎯 Next Steps

### 1. Add More Riders

Edit `railway-deploy.sh`:
```bash
railway run node fetch-zwiftracing-rider.js 150437
railway run node fetch-zwiftracing-rider.js 123456
railway run node fetch-zwiftracing-rider.js 789012
```

### 2. Batch Processing

Create `batch-sync-team.js`:
```javascript
const riders = [150437, 123456, 789012];

for (const riderId of riders) {
  await fetchZwiftRacingRider(riderId);
  await delay(12000); // Rate limit
}
```

### 3. Frontend Integration

```typescript
// Frontend queries view directly
const { data } = await supabase
  .from('v_rider_complete')
  .select('*')
  .in('rider_id', [150437, 123456, 789012]);
```

---

## ✅ Voordelen Geautomatiseerd E2E

| Handmatig | Geautomatiseerd |
|-----------|-----------------|
| ❌ Copy-paste SQL | ✅ Auto-execute migrations |
| ❌ Manual INSERT | ✅ Auto-sync from API |
| ❌ Check view manually | ✅ Auto-verify data |
| ❌ Repeat voor elke rider | ✅ Batch processing |
| ❌ Stale data | ✅ Scheduled updates |

---

## 🎉 E2E Workflow Complete!

```
API → Railway → Migrations → Sync → View → Dashboard
 ✅      ✅         ✅         ✅      ✅       ✅
```

**No manual steps required! 🚀**
