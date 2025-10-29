# Historical Snapshots - Implementation Guide

## 📸 Overzicht

Historical snapshots slaan periodiek rider data op voor trend analyse. Elke snapshot bevat een momentopname van belangrijke metrics zoals FTP, weight, ranking en category.

## ✅ Geïmplementeerde Features

### 1. Database Schema
**Tabel**: `rider_history`

| Veld | Type | Beschrijving |
|------|------|--------------|
| id | String (CUID) | Unieke snapshot ID |
| riderId | Int | Link naar rider |
| ftp | Float | FTP op moment van snapshot |
| powerToWeight | Float | W/kg ratio |
| ranking | Int | Global ranking positie |
| rankingScore | Float | Ranking score |
| weight | Float | Gewicht in kg |
| categoryRacing | String | Race categorie (A/B/C/D) |
| zPoints | Int | Zwift racing points |
| snapshotType | String | "daily", "weekly", "post_race", "manual" |
| triggeredBy | String | "scheduler", "sync-script", "manual", "race_finish" |
| recordedAt | DateTime | Timestamp van snapshot |

**Indexes**:
- `[riderId, recordedAt]` - Voor trend queries
- `[recordedAt]` - Voor datum-based queries

### 2. Repository Function
**Locatie**: `src/database/repositories.ts`

```typescript
async saveRiderHistory(riderId: number, options?: {
  snapshotType?: string;
  triggeredBy?: string;
})
```

**Features**:
- ✅ Duplicate detection (max 1 daily snapshot per dag)
- ✅ Automatic metadata extraction
- ✅ Race rating inclusion
- ✅ Logging van snapshot creation
- ✅ Retourneert bestaande snapshot bij duplicate

**Gebruik**:
```typescript
// Manual snapshot
await riderRepo.saveRiderHistory(riderId, {
  snapshotType: 'manual',
  triggeredBy: 'admin',
});

// Daily snapshot (via scheduler)
await riderRepo.saveRiderHistory(riderId, {
  snapshotType: 'daily',
  triggeredBy: 'scheduler',
});

// Post-race snapshot
await riderRepo.saveRiderHistory(riderId, {
  snapshotType: 'post_race',
  triggeredBy: 'race_finish',
});
```

### 3. Sync Script
**Locatie**: `scripts/sync-rider-with-snapshot.ts`

Complete workflow voor rider sync + snapshot:

```bash
# Sync rider + create snapshot
npx tsx scripts/sync-rider-with-snapshot.ts <zwiftId>

# Example
npx tsx scripts/sync-rider-with-snapshot.ts 150437
```

**Workflow**:
1. Haal rider data op van API
2. Sla rider + phenotype + race rating op
3. Maak historical snapshot
4. Verifieer data in database
5. Toon trend analyse (als >1 snapshots)

### 4. SmartScheduler Integration
**Locatie**: `src/services/smart-scheduler.ts`

**Daily Snapshot Job**:
- ⏰ Runs elke dag om **03:00** (Europe/Amsterdam timezone)
- 🎯 Maakt snapshots van **alle favorite riders**
- 📊 Batch processing met error handling
- 📝 Detailed logging (success/skipped/failed counts)

**Status Endpoint**: `GET /api/scheduler/status`

```json
{
  "enabled": true,
  "isRunning": true,
  "intervals": { "1": 15, "2": 30, "3": 60, "4": 120 },
  "activePriorities": [1, 2, 3, 4],
  "dailySnapshotEnabled": true,
  "dailySnapshotTime": "03:00 (Europe/Amsterdam)",
  "nextRuns": {
    "1": "2025-10-27T10:15:00.000Z",
    ...
  }
}
```

## 📈 Trend Analysis

### Voorbeeld Query (7 dagen)
```typescript
const history = await riderRepo.getRiderHistory(riderId, 7);

// Calculate FTP trend
const ftpChange = history[0].ftp - history[history.length - 1].ftp;
const ftpChangePercent = (ftpChange / history[history.length - 1].ftp) * 100;

console.log(`FTP verandering laatste 7 dagen: ${ftpChange}w (${ftpChangePercent.toFixed(1)}%)`);
```

### Voorbeeld Query (30 dagen weight tracking)
```typescript
const history = await riderRepo.getRiderHistory(riderId, 30);

const weights = history.map(h => h.weight).filter(w => w !== null);
const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
const minWeight = Math.min(...weights);
const maxWeight = Math.max(...weights);

console.log(`Weight stats laatste 30 dagen:`);
console.log(`  Gemiddeld: ${avgWeight.toFixed(1)}kg`);
console.log(`  Min: ${minWeight}kg, Max: ${maxWeight}kg`);
console.log(`  Range: ${(maxWeight - minWeight).toFixed(1)}kg`);
```

## 🎯 Use Cases

### 1. Performance Tracking
Track FTP/power development over tijd:
```sql
SELECT 
  date(recordedAt) as date,
  ftp,
  powerToWeight as wkg,
  weight
FROM rider_history
WHERE riderId = 680
ORDER BY recordedAt DESC
LIMIT 30;
```

### 2. Weight Management
Monitor gewichtsveranderingen:
```sql
SELECT 
  date(recordedAt) as date,
  weight,
  ftp,
  ROUND(ftp / weight, 2) as ftp_wkg
FROM rider_history
WHERE riderId = 680
  AND weight IS NOT NULL
ORDER BY recordedAt DESC;
```

### 3. Ranking Progress
Volg ranking ontwikkeling:
```sql
SELECT 
  date(recordedAt) as date,
  ranking,
  rankingScore,
  categoryRacing
FROM rider_history
WHERE riderId = 680
  AND ranking IS NOT NULL
ORDER BY recordedAt DESC;
```

### 4. Category Changes
Detecteer categorie wissels:
```sql
SELECT 
  date(recordedAt) as date,
  categoryRacing,
  ftp,
  powerToWeight as wkg
FROM rider_history
WHERE riderId = 680
ORDER BY recordedAt DESC;
```

## 🔄 Data Lifecycle

### Daily Flow
```
03:00 → SmartScheduler triggers daily snapshot job
     ↓
Fetch all favorite riders
     ↓
For each rider:
  - Check if snapshot today exists
  - If not: create snapshot
  - Log result (success/skipped/failed)
     ↓
Report batch results
```

### Retention Policy
**Current**: Geen automatische cleanup (alle snapshots blijven bewaard)

**Future**: Optioneel retention beleid:
- Daily snapshots: 90 dagen
- Weekly aggregates: 1 jaar  
- Yearly aggregates: onbeperkt

## 📊 Statistics & Insights

### Mogelijk met huidige data:
- ✅ FTP progression over tijd
- ✅ Weight trends
- ✅ W/kg development
- ✅ Ranking changes
- ✅ Category movements
- ✅ Performance consistency

### Future enhancements:
- ⏳ Weekly/monthly aggregates
- ⏳ Rider comparisons (peer group analysis)
- ⏳ Season-over-season trends
- ⏳ Performance predictions (ML)
- ⏳ Auto-alerts (FTP drops, weight changes)

## 🧪 Testing

### Test snapshot creation
```bash
# Via sync script
npx tsx scripts/sync-rider-with-snapshot.ts 150437

# Check database
echo "SELECT * FROM rider_history WHERE riderId = 680;" | sqlite3 prisma/dev.db
```

### Test duplicate detection
```bash
# Run twice - tweede keer moet skipped worden
npx tsx scripts/sync-rider-with-snapshot.ts 150437
npx tsx scripts/sync-rider-with-snapshot.ts 150437
```

### Test scheduler status
```bash
curl http://localhost:3000/api/scheduler/status | jq
```

## 📝 Best Practices

### 1. Snapshot Timing
- **Daily snapshots**: 03:00 (laag server load, consistent data)
- **Post-race**: Direct na race voor nauwkeurige pre/post vergelijking
- **Manual**: Voor specifieke milestones (nieuwe FTP test, category upgrade)

### 2. Data Quality
- Alleen snapshot maken als rider recent gesynced is (< 24h)
- Check for NULL values voordat trend analysis
- Filter outliers (bijv. weight > 150kg = error)

### 3. Performance
- Batch processing in scheduler (alle riders in één run)
- Indexes op riderId + recordedAt voor snelle queries
- Limit history queries (max 365 dagen tenzij nodig)

### 4. Monitoring
- Log daily snapshot job results
- Alert als < 80% success rate
- Track database growth (snapshots = continuous data)

## 🚀 Next Steps

1. ✅ **Basis implementatie compleet**
2. ⏳ **GUI integration**: Toon trend charts per rider
3. ⏳ **Bulk analysis**: Export snapshots voor externe analyse
4. ⏳ **Alerts**: Email notifications bij significante changes
5. ⏳ **Retention**: Auto-cleanup van oude snapshots
6. ⏳ **Aggregates**: Weekly/monthly summary snapshots

---

**Status**: ✅ Volledig geïmplementeerd en productie-ready
**Versie**: 1.0
**Laatst geupdate**: 27 oktober 2025
