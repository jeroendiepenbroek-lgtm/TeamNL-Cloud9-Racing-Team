# Queue Monitoring Guide

## 🎯 Overzicht

De TeamNL Cloud9 dashboard heeft nu **real-time queue monitoring** geïntegreerd in de GUI. Dit document beschrijft hoe het werkt en hoe je het gebruikt.

---

## ✨ Nieuwe Features

### 1. **Real-Time Status Updates**
De GUI pollt automatisch elke **5 seconden** de queue status en toont:

- **🟡 Wachtend** - Jobs die in de queue staan
- **🔵 Bezig** - Jobs die nu worden verwerkt
- **🟢 Voltooid** - Succesvol afgeronde jobs
- **🔴 Gefaald** - Jobs met errors

### 2. **Queue Jobs Lijst**
Als er actieve jobs zijn, verschijnt automatisch een sectie met:

- **Job details**: Rider ID, priority, status
- **Progress info**: Hoeveel seconden bezig, retry count
- **Error messages**: Voor gefaalde jobs
- **Action buttons**: Cancel (pending), Retry (failed)

### 3. **Worker Control**
Direct vanuit de GUI kun je:

- **⏸️ Pauzeer Worker** - Stop verwerking (zonder queue te legen)
- **▶️ Hervat Worker** - Start verwerking weer
- **🔄 Retry Failed** - Probeer alle gefaalde jobs opnieuw
- **🗑️ Clear Completed** - Verwijder voltooide jobs uit de lijst

### 4. **Non-Blocking Flow**
Toevoegen van favorites is nu **instant**:

```
Before (Blocking):
  Add rider → Wait 5-15s → Response

Now (Non-Blocking):
  Add rider → Instant response with Job ID → Background processing
```

Geen wachttijden meer in de GUI! ⚡

---

## 📊 GUI Components

### Status Bar (Bovenkant)
```
┌─────────────────────────────────────────────────────────┐
│  Total Favorites: 407                                    │
│  🟡 Wachtend: 0   🔵 Bezig: 1   🟢 Voltooid: 5  🔴 Gefaald: 0 │
│                                                          │
│  Worker Status: ✓ Actief                                │
│  [⏸️ Pauzeer]  [🔄 Retry Failed]                        │
└─────────────────────────────────────────────────────────┘
```

### Queue Jobs Section (Verschijnt bij actieve jobs)
```
┌─────────────────────────────────────────────────────────┐
│  📋 Queue Status                    [🗑️ Clear Completed] │
│                                                          │
│  🔵  Rider #1495                                    [✕]  │
│      Priority 1 • Bezig • 3s                             │
│                                                          │
│  🟡  Rider #2387                                    [✕]  │
│      Priority 2 • Wachtend                               │
│                                                          │
│  🔴  Rider #9999                                   [🔄]  │
│      Priority 1 • Gefaald • Retry 2                      │
│      Error: Rider niet gevonden in Zwift API             │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Usage Examples

### Scenario 1: Single Rider Toevoegen

1. **User**: Vult Zwift ID in (bijv. 1495)
2. **User**: Selecteert Priority 1
3. **User**: Klikt "Toevoegen"
4. **System**: Instant response met toast:
   ```
   ✓ Rider 1495 toegevoegd! Job ID: abc-123-def
   ```
5. **GUI**: 
   - Queue status update (🟡 Wachtend +1)
   - Job verschijnt in queue lijst
6. **Worker**: Start verwerking na 12s delay
   - Status wordt 🔵 Bezig
   - Timer tikt mee (3s, 4s, 5s...)
7. **Complete**:
   - Status wordt 🟢 Voltooid
   - Rider verschijnt in favorites tabel

**Totale tijd**: Instant response, background processing ~15-20s

### Scenario 2: Bulk Upload (50 riders)

1. **User**: Upload CSV met 50 Zwift IDs
2. **System**: Instant response:
   ```
   ✓ Sync gestart! 50 rider(s) in queue. Check queue status voor voortgang.
   ```
3. **GUI**: 
   - Queue status: 🟡 Wachtend 50
   - Alle 50 jobs in lijst (scroll)
4. **Worker**: Verwerkt 1 per keer met 12s delay
   - 🔵 Bezig: 1
   - 🟡 Wachtend: 49, 48, 47...
   - 🟢 Voltooid: 0, 1, 2, 3...
5. **Progress**: Real-time updates elke 5s
6. **Complete**: Na ~10 minuten (50 × 12s)

**User ervaring**: Non-blocking, kan meteen verder werken!

### Scenario 3: Error & Retry

1. **Worker**: Probeert rider #9999 (bestaat niet)
2. **API**: Returns 404 Not Found
3. **Worker**: Auto-retry 1/3
4. **API**: Still 404
5. **Worker**: Auto-retry 2/3
6. **API**: Still 404
7. **Worker**: Auto-retry 3/3
8. **API**: Still 404
9. **Job**: Status wordt 🔴 Gefaald
10. **GUI**: Toont error message + 🔄 Retry button
11. **User**: Klikt [🔄 Retry] (indien gewenst)
12. **System**: Job terug naar queue (🟡 Wachtend)

### Scenario 4: Worker Pauzeren

**Use case**: Je wilt even geen API calls doen (rate limit management)

1. **User**: Klikt [⏸️ Pauzeer]
2. **System**: Worker stopt met nieuwe jobs
3. **GUI**: 
   - Worker Status: ⏸️ Gepauzeerd
   - Huidige job afgemaakt
   - Pending jobs blijven in queue
4. **User**: Klikt [▶️ Hervat] (wanneer ready)
5. **System**: Worker hervat verwerking

**Effect**: Geen data verlies, volledige controle!

---

## 📡 API Endpoints (Queue Management)

### GET /api/queue/status
Haal huidige queue status op.

**Response**:
```json
{
  "pending": 3,
  "processing": 1,
  "completed": 10,
  "failed": 0,
  "isPaused": false,
  "jobs": [
    {
      "id": "abc-123-def",
      "riderId": 1495,
      "priority": 1,
      "status": "processing",
      "retries": 0,
      "addedBy": "gui",
      "enqueuedAt": "2025-10-26T12:00:00.000Z",
      "processingStartedAt": "2025-10-26T12:00:12.000Z",
      "error": null
    }
  ]
}
```

### GET /api/queue/job/:jobId
Haal details van specifieke job op.

**Response**:
```json
{
  "id": "abc-123-def",
  "riderId": 1495,
  "status": "completed",
  "completedAt": "2025-10-26T12:00:20.000Z"
}
```

### POST /api/queue/pause
Pauzeer de worker (stopt verwerking).

**Response**: `200 OK`

### POST /api/queue/resume
Hervat de worker.

**Response**: `200 OK`

### POST /api/queue/cancel/:jobId
Annuleer een pending job.

**Response**: `200 OK` (job verwijderd uit queue)

### POST /api/queue/retry/:jobId
Retry een gefaalde job.

**Response**: `200 OK` (job terug naar pending)

### POST /api/queue/retry-all
Retry alle gefaalde jobs.

**Response**:
```json
{
  "retried": 5,
  "message": "5 gefaalde job(s) opnieuw in queue"
}
```

### POST /api/queue/clear-completed
Verwijder voltooide jobs uit queue.

**Response**:
```json
{
  "cleared": 10,
  "message": "10 voltooide job(s) verwijderd"
}
```

---

## 🧪 Testing

### Test 1: Basic Queue Flow

```bash
# Start server
npm run dev

# Open browser: http://localhost:3000

# In GUI:
1. Voeg rider 1495 toe (Priority 1)
2. Kijk naar queue status updates
3. Wacht 15-20s voor completion
4. Verify rider in favorites tabel

# Expected:
✓ Instant response
✓ Queue status shows pending → processing → completed
✓ Rider appears in favorites after sync
```

### Test 2: Bulk Upload Performance

```bash
# Create test file
echo "1495
2387
3254
4122
5099" > test-bulk.txt

# In GUI:
1. Upload test-bulk.txt
2. Watch queue status
3. Check progress every 5s

# Expected:
✓ Instant upload confirmation
✓ 5 jobs in queue
✓ Processing 1 by 1 with 12s delay
✓ ~1 minute total (5 × 12s)
```

### Test 3: Error Handling

```bash
# In GUI:
1. Voeg invalid Zwift ID toe (bijv. 99999999)
2. Wait for processing
3. Check error message
4. Click retry button

# Expected:
✓ Job fails after 3 auto-retries
✓ Error message shown in queue list
✓ Retry button available
✓ Manual retry works
```

### Test 4: Worker Control

```bash
# In GUI:
1. Add 3 riders
2. Immediately click [⏸️ Pauzeer]
3. Verify worker stops after current job
4. Click [▶️ Hervat]
5. Verify processing continues

# Expected:
✓ Worker pauses gracefully
✓ Pending jobs stay in queue
✓ Resume works correctly
```

---

## 🔧 Configuration

### Polling Intervals (in GUI)

```javascript
// public/favorites-manager.html

// Favorites refresh (lightweight)
setInterval(loadFavorites, 30000); // 30 seconds

// Queue status (detailed)
setInterval(fetchQueueStatus, 5000); // 5 seconds
```

**Waarom 5 seconden?**
- Real-time genoeg voor goede UX
- Niet te veel load op server
- Responsive feedback bij toevoegen

**Aanpassen?**
- Voor meer real-time: 3000 (3s)
- Voor minder load: 10000 (10s)

### Worker Rate Limiting

```typescript
// src/services/sync-queue.ts

private rateLimitDelay = 12000; // 12 seconds between API calls
```

**API Limits**:
- ZwiftRacing.app: **5 calls/min** (12s minimum delay)
- Met retry logic: Max 3 pogingen per rider
- Total capacity: ~5 riders/min

---

## 🎨 Visual Indicators

### Status Icons
- 🟡 **Geel** - Pending (wachtend op processing)
- 🔵 **Blauw** - Processing (bezig met API call)
- 🟢 **Groen** - Completed (succesvol)
- 🔴 **Rood** - Failed (error na 3 retries)

### Worker Status
- ✓ **Actief** (groen badge) - Verwerkt jobs
- ⏸️ **Gepauzeerd** (geel badge) - Gestopt

### Action Buttons
- **✕** - Cancel (pending jobs only)
- **🔄** - Retry (failed jobs only)
- **⏸️** - Pause worker
- **▶️** - Resume worker
- **🗑️** - Clear completed

---

## 🚨 Troubleshooting

### Issue: Queue status niet updaten

**Symptoms**: Counters blijven op 0

**Check**:
```bash
curl http://localhost:3000/api/queue/status
```

**Fix**: Reload page (F5), check console logs

### Issue: Jobs blijven hangen in "Processing"

**Symptoms**: Job status blijft 🔵 maar geen progress

**Check**:
```bash
# Check worker status
curl http://localhost:3000/api/queue/status | jq .isPaused
```

**Fix**: 
1. Check server logs voor errors
2. Retry job: click [🔄]
3. Restart server als laatste optie

### Issue: Teveel failed jobs

**Symptoms**: Veel 🔴 gefaalde jobs

**Cause**: Meestal invalide Zwift IDs

**Fix**:
1. Check error messages in queue lijst
2. Verify Zwift IDs via https://zwift-ranking.herokuapp.com
3. Remove invalid favorites
4. Click [🔄 Retry Failed] voor valide IDs

### Issue: Worker blijft gepauzeerd

**Symptoms**: Worker status ⏸️ Gepauzeerd, maar wil hervatten

**Fix**:
```bash
# Via API
curl -X POST http://localhost:3000/api/queue/resume

# Of in GUI: click [▶️ Hervat]
```

---

## 📈 Performance Metrics

### Queue Capacity
- **Max concurrent**: 1 job per keer (sequential)
- **Processing rate**: ~5 jobs/min (rate limit constraint)
- **Bulk upload**: 50 riders = ~10 min
- **Memory usage**: Minimal (in-memory queue)

### Response Times
- **Add favorite**: <100ms (instant)
- **Queue status**: <50ms (lightweight)
- **Worker processing**: 12s delay + API call (2-3s)
- **Total per job**: ~15-20s

### Best Practices
1. **Bulk upload** voor veel riders (niet 1-voor-1)
2. **Clear completed** regelmatig (prevent queue bloat)
3. **Monitor failed** jobs (data quality)
4. **Use pause** tijdens maintenance windows

---

## 🎓 Advanced Usage

### Custom Priority Strategy

Priority bepaalt verwerk-volgorde:

- **P1** (🔴): Top riders, daily sync
- **P2** (🟡): Regular riders, weekly sync
- **P3** (🟢): Occasional riders, monthly sync
- **P4** (🔵): Archive, on-demand sync

**Queue sorting**: P1 jobs altijd eerst!

### Error Recovery

Bij API failures:
1. Auto-retry (max 3×)
2. Exponential backoff (toekomstige feature)
3. Manual retry via GUI
4. Error logging naar database

### Integration met SmartScheduler

Toekomstige feature (in development):
- P1 riders: Auto-sync elke 15 min
- P2-4 riders: Auto-sync elke 60 min
- Queue integration: Auto-enqueue op schedule
- Conflict resolution: Skip als al in queue

---

## 📚 Related Documentation

- [AUTO-RESTART-GUIDE.md](./AUTO-RESTART-GUIDE.md) - Server stability
- [PROFESSIONAL-PIPELINE-DESIGN.md](./PROFESSIONAL-PIPELINE-DESIGN.md) - Architecture
- [GUI-QUICKSTART.md](./GUI-QUICKSTART.md) - GUI usage
- [API.md](./API.md) - Complete API reference

---

## ✅ Status Overview

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time queue status | ✅ Complete | 5s polling |
| Job detail display | ✅ Complete | Icons, timers, errors |
| Worker control (pause/resume) | ✅ Complete | GUI buttons |
| Retry logic (auto) | ✅ Complete | Max 3 attempts |
| Retry buttons (manual) | ✅ Complete | Per job + retry all |
| Cancel pending jobs | ✅ Complete | Remove from queue |
| Clear completed jobs | ✅ Complete | Cleanup |
| Non-blocking add | ✅ Complete | Instant response |
| Progress indicators | ✅ Complete | Elapsed time |
| Error messages | ✅ Complete | Shown in job details |

---

## 🎉 Summary

De GUI heeft nu **enterprise-grade queue monitoring** met:

✅ **Real-time updates** (elke 5s)
✅ **Non-blocking operations** (instant feedback)
✅ **Visual progress tracking** (status icons + timers)
✅ **Complete worker control** (pause, resume, retry)
✅ **Error transparency** (messages + retry buttons)
✅ **Zero configuration** (works out of the box)

**User experience**: Professional, responsive, production-ready! 🚀
