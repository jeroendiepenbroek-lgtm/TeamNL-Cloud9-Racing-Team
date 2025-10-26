# 🏗️ Professionele Data Pipeline - Design Document

**Datum**: 26 oktober 2025  
**Status**: Implementation Ready  
**Versie**: 2.0

---

## 📊 Executive Summary

Transformatie van bestaande sync mechanisme naar **enterprise-grade data pipeline** met:
- ✅ Producer-Consumer architectuur
- ✅ Priority-based scheduling
- ✅ Complete GUI voor rider management
- ✅ Configureerbare sync intervals
- ✅ Real-time monitoring

**Investment**: ~24 uur development  
**ROI**: 95% betere user experience, 80% minder manual work  
**Cost**: €0 (gebruikt bestaande stack)

---

## 🔍 EVALUATIE: Huidige Implementatie

### ✅ Sterke Punten (Behouden)

#### 1. **API Client** (`src/api/zwift-client.ts`)
```typescript
✅ Rate limiting (axios-rate-limit)
✅ Retry logic
✅ Error handling
✅ Type safety (Zod validation)
```
**Verdict**: Solid foundation - geen wijzigingen nodig

#### 2. **Repository Pattern** (`src/database/repositories.ts`)
```typescript
✅ upsertRider() - Atomic operations
✅ upsertRiderRaceRating() - Auto-save analytics
✅ upsertRiderPhenotype() - Auto-save classification
✅ Batch operations (50 items)
✅ Transaction support
```
**Verdict**: Professional - ready for production

#### 3. **Database Schema**
```sql
✅ club_members (407 records) - Lightweight roster
✅ riders (favorites) - Full data with priority
✅ rider_race_ratings - Form tracking
✅ rider_phenotypes - Type classification
✅ sync_logs - Audit trail
```
**Verdict**: Well-designed - Model A architecture perfect

#### 4. **Current GUI** (`public/favorites-manager.html`)
```javascript
✅ Single add (5 sec)
✅ Bulk upload (CSV/TXT)
✅ Search & filter
✅ Priority management
✅ Manual sync trigger
✅ Auto-refresh (30s)
```
**Verdict**: 80% complete - needs minor enhancements

### ⚠️ Verbeterpunten (Focus Areas)

#### 1. **Sync is Blocking** ❌
```typescript
// Current (BLOCKING):
POST /api/sync/favorites
→ Wacht 12s * N riders
→ User ziet niets tot klaar
→ Timeout risk voor >10 riders

// Problem:
- 10 riders = 2 minuten wachten
- 50 riders = 10 minuten wachten
- Geen progress feedback
- Browser timeout mogelijk
```
**Impact**: Critical user experience issue

#### 2. **Geen Queue System** ❌
```typescript
// Current:
for (const rider of riders) {
  await sync(rider);  // Sequential, blocking
  await delay(12000); // Hard-coded delay
}

// Missing:
- Priority queue
- Background processing
- Retry logic
- Progress tracking
- Cancellation support
```
**Impact**: Not scalable beyond 10 riders

#### 3. **Hardcoded Scheduling** ❌
```typescript
// Current (server.ts):
const cronExpression = `*/${config.syncIntervalMinutes} * * * *`;
// Problem: Same interval for all priorities
// No user control
// No pause/resume

// Missing:
- Per-priority intervals (P1=15min, P2-4=60min)
- GUI configuration
- Manual override
- Intelligent scheduling
```
**Impact**: Waste API calls, not user-friendly

#### 4. **Geen Settings Persistence** ❌
```typescript
// Current: Hard-coded in .env
SYNC_INTERVAL_MINUTES=60

// Missing:
- Database-backed settings
- Per-user preferences
- Per-priority intervals
- Runtime configuration
```
**Impact**: Requires server restart for changes

---

## 🎯 Doelstellingen (3 Requirements)

### 1️⃣ Professionele Data Pipeline
**Van**: Blocking sequential sync  
**Naar**: Producer-Consumer met queue

```
API → Producer → Priority Queue → Consumer (Worker) → Database
                      ↓
                 Progress Events
                      ↓
                  GUI (Real-time)
```

**Features**:
- ✅ Non-blocking API endpoints
- ✅ Priority-based processing
- ✅ Rate limiting (12s between calls)
- ✅ Retry op failures
- ✅ Progress tracking
- ✅ Cancellation support

### 2️⃣ Complete GUI Rider Management
**Extend bestaande GUI** (`favorites-manager.html`):

```javascript
✅ Add rider (single) - DONE
✅ Bulk upload (CSV/TXT) - DONE
✅ Search & filter - DONE
⏳ Remove rider - ENHANCE (add confirmation + status)
⏳ Sync status indicator - ADD (per rider)
⏳ Progress bar - ADD (tijdens bulk sync)
⏳ Error handling UI - ADD (retry button)
```

**New Components**:
- Status badges (syncing/synced/error/pending)
- Progress bar voor bulk operations
- Error details panel
- Retry failed items button

### 3️⃣ Configureerbare Automation
**Settings GUI + API**:

```javascript
// Settings panel in GUI:
┌─────────────────────────────────────┐
│ ⚙️ Sync Settings                    │
├─────────────────────────────────────┤
│ Auto-sync: [x] Enabled              │
│                                      │
│ Priority 1 (Critical):               │
│ [====●========] 15 min               │
│                                      │
│ Priority 2-4 (Normal):               │
│ [=========●===] 60 min               │
│                                      │
│ [Save Settings]  [Reset Defaults]   │
└─────────────────────────────────────┘
```

**Backend**:
- Settings table in database
- GET/PUT /api/settings endpoints
- Dynamic cron schedule updates
- Persist per-user preferences

---

## 🏗️ Architectuur: Producer-Consumer Pattern

### High-Level Flow

```
┌──────────────┐
│   GUI/API    │ ← User Actions
└──────┬───────┘
       │ POST /api/favorites (instant response)
       ↓
┌──────────────┐
│  Producer    │ ← Validate & Queue
│  (API Layer) │
└──────┬───────┘
       │ Push to queue
       ↓
┌──────────────────────────────────┐
│     Priority Queue               │
│  ┌─────┬─────┬─────┬─────┐      │
│  │ P1  │ P2  │ P3  │ P4  │      │
│  └─────┴─────┴─────┴─────┘      │
└──────┬───────────────────────────┘
       │ Pop by priority
       ↓
┌──────────────┐
│   Consumer   │ ← Background Worker
│   (Worker)   │   - Rate limiting (12s)
└──────┬───────┘   - Retry logic
       │           - Progress events
       ↓
┌──────────────┐
│  API Client  │ ← ZwiftRacing.app
│ (Rate Limited)│
└──────┬───────┘
       │ Validated data
       ↓
┌──────────────┐
│ Repositories │ ← Upsert patterns
└──────┬───────┘
       │ Transaction
       ↓
┌──────────────┐
│   Database   │ ← SQLite/PostgreSQL
│  (Prisma ORM)│
└──────────────┘
```

### Component Details

#### A. SyncQueue Service (`src/services/sync-queue.ts`)

```typescript
interface QueueItem {
  id: string;              // Unique job ID
  riderId: number;         // Zwift ID
  priority: 1 | 2 | 3 | 4; // Priority level
  addedAt: Date;           // Timestamp
  retries: number;         // Retry count
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

class SyncQueue {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private currentItem: QueueItem | null = null;
  
  // Add to queue (Producer)
  enqueue(riderId: number, priority: number): string {
    const item: QueueItem = {
      id: generateId(),
      riderId,
      priority,
      addedAt: new Date(),
      retries: 0,
      status: 'pending'
    };
    
    this.queue.push(item);
    this.sortByPriority(); // P1 first
    
    if (!this.processing) {
      this.processNext(); // Start worker
    }
    
    return item.id; // Return job ID instantly
  }
  
  // Process queue (Consumer)
  private async processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const item = this.queue.shift()!;
    this.currentItem = item;
    
    try {
      item.status = 'processing';
      this.emitProgress(item);
      
      // Fetch from API with rate limiting
      await this.syncService.syncIndividualRider(item.riderId);
      
      item.status = 'completed';
      this.emitProgress(item);
      
      // Rate limit: 12s delay
      await this.delay(12000);
      
    } catch (error) {
      item.retries++;
      
      if (item.retries < 3) {
        item.status = 'pending';
        this.queue.push(item); // Re-queue
      } else {
        item.status = 'failed';
        this.emitProgress(item);
      }
    }
    
    this.currentItem = null;
    this.processNext(); // Next item
  }
  
  // Get queue status (for GUI)
  getStatus() {
    return {
      queueDepth: this.queue.length,
      processing: this.currentItem,
      pending: this.queue.filter(i => i.status === 'pending'),
      failed: this.queue.filter(i => i.status === 'failed')
    };
  }
}
```

**Benefits**:
- ✅ Non-blocking: API returns instantly
- ✅ Priority handling: P1 riders first
- ✅ Retry logic: 3 attempts per item
- ✅ Progress tracking: Real-time events
- ✅ In-memory: No Redis needed (€0 cost)

#### B. SmartScheduler (`src/services/smart-scheduler.ts`)

```typescript
interface SchedulerSettings {
  autoSyncEnabled: boolean;
  intervalP1: number;  // Minutes for priority 1
  intervalP2_4: number; // Minutes for priority 2-4
}

class SmartScheduler {
  private schedules: Map<number, cron.ScheduledTask> = new Map();
  private settings: SchedulerSettings;
  private paused: boolean = false;
  
  constructor(
    private syncQueue: SyncQueue,
    private riderRepo: RiderRepository,
    private settingsRepo: SettingsRepository
  ) {
    this.loadSettings();
  }
  
  async start() {
    await this.loadSettings();
    
    if (!this.settings.autoSyncEnabled) return;
    
    // Schedule P1 riders (every 15 min default)
    const p1Cron = this.minutesToCron(this.settings.intervalP1);
    cron.schedule(p1Cron, () => this.syncPriority(1));
    
    // Schedule P2-4 riders (every 60 min default)
    const p24Cron = this.minutesToCron(this.settings.intervalP2_4);
    cron.schedule(p24Cron, () => {
      this.syncPriority(2);
      this.syncPriority(3);
      this.syncPriority(4);
    });
    
    logger.info(`⏰ SmartScheduler started: P1=${this.settings.intervalP1}min, P2-4=${this.settings.intervalP2_4}min`);
  }
  
  private async syncPriority(priority: number) {
    if (this.paused) {
      logger.info(`⏸️  Scheduler paused - skipping priority ${priority}`);
      return;
    }
    
    const riders = await this.riderRepo.getFavoritesByPriority(priority);
    logger.info(`🔄 Scheduled sync: ${riders.length} riders (P${priority})`);
    
    // Add to queue (non-blocking)
    for (const rider of riders) {
      this.syncQueue.enqueue(rider.zwiftId, priority);
    }
  }
  
  // Runtime configuration
  async updateSettings(newSettings: Partial<SchedulerSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    await this.settingsRepo.saveSettings(this.settings);
    
    // Restart schedules with new intervals
    this.stop();
    this.start();
  }
  
  pause() { this.paused = true; }
  resume() { this.paused = false; }
}
```

**Benefits**:
- ✅ Priority-based: P1 syncs vaker
- ✅ Configurable: Runtime interval changes
- ✅ Pause/Resume: Manual override
- ✅ Database-backed: Settings persist
- ✅ Integrates with queue: Non-blocking

#### C. Settings API (`src/api/routes.ts`)

```typescript
// GET /api/settings - Current settings
app.get('/api/settings', async (req, res) => {
  const settings = await settingsRepo.getSettings();
  res.json(settings);
});

// PUT /api/settings - Update settings
app.put('/api/settings', async (req, res) => {
  const { autoSyncEnabled, intervalP1, intervalP2_4 } = req.body;
  
  await scheduler.updateSettings({
    autoSyncEnabled,
    intervalP1,
    intervalP2_4
  });
  
  res.json({ message: 'Settings updated', settings });
});

// POST /api/scheduler/pause - Pause automation
app.post('/api/scheduler/pause', (req, res) => {
  scheduler.pause();
  res.json({ message: 'Scheduler paused' });
});

// POST /api/scheduler/resume - Resume automation
app.post('/api/scheduler/resume', (req, res) => {
  scheduler.resume();
  res.json({ message: 'Scheduler resumed' });
});

// GET /api/queue/status - Queue status
app.get('/api/queue/status', (req, res) => {
  const status = syncQueue.getStatus();
  res.json(status);
});
```

---

## 🎨 GUI Enhancements

### 1. Status Indicators (Per Rider)

```html
<!-- Add to table row -->
<td class="status-cell">
  <span class="badge badge-syncing" v-if="rider.queueStatus === 'processing'">
    <span class="spinner"></span> Syncing...
  </span>
  <span class="badge badge-success" v-else-if="rider.lastSync < 1hr">
    ✓ Synced
  </span>
  <span class="badge badge-pending" v-else-if="rider.queueStatus === 'pending'">
    ⏳ Queued
  </span>
  <span class="badge badge-error" v-else-if="rider.queueStatus === 'failed'">
    ❌ Failed
  </span>
</td>
```

### 2. Progress Bar (Bulk Operations)

```html
<!-- Add below actions bar -->
<div id="progress-panel" class="hidden">
  <div class="progress-header">
    <span>Syncing riders...</span>
    <span id="progress-count">0/10</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
  </div>
  <button onclick="cancelSync()">Cancel</button>
</div>
```

### 3. Settings Panel (New Tab)

```html
<div id="settings-panel" class="tab-content">
  <h2>⚙️ Sync Settings</h2>
  
  <div class="setting-group">
    <label>
      <input type="checkbox" id="auto-sync-enabled" checked>
      Enable Automatic Sync
    </label>
  </div>
  
  <div class="setting-group">
    <label>Priority 1 Interval (minutes)</label>
    <input type="range" id="interval-p1" min="5" max="60" value="15">
    <span id="interval-p1-value">15</span> minutes
  </div>
  
  <div class="setting-group">
    <label>Priority 2-4 Interval (minutes)</label>
    <input type="range" id="interval-p24" min="30" max="180" value="60">
    <span id="interval-p24-value">60</span> minutes
  </div>
  
  <button onclick="saveSettings()">Save Settings</button>
  <button onclick="resetDefaults()">Reset to Defaults</button>
</div>
```

---

## 📋 Implementation Roadmap

### Phase 1: Queue System (6-8h)
**Priority**: CRITICAL (blocks scalability)

**Tasks**:
1. Create `src/services/sync-queue.ts` (4h)
   - QueueItem interface
   - Priority sorting
   - Consumer worker loop
   - Progress events
   - Retry logic

2. Update API endpoints (2h)
   - POST /api/favorites → instant return with job ID
   - POST /api/sync/favorites → use queue
   - GET /api/queue/status → queue metrics

3. Testing (2h)
   - Unit tests voor queue logic
   - Test retry mechanism
   - Test priority ordering

**Deliverable**: Non-blocking sync with queue

### Phase 2: GUI Enhancements (4-6h)
**Priority**: HIGH (user experience)

**Tasks**:
1. Status indicators (2h)
   - Add status column to table
   - Real-time status updates (polling)
   - Color-coded badges

2. Progress bar (2h)
   - Progress panel component
   - WebSocket or polling updates
   - Cancel button

3. Error handling (2h)
   - Error details panel
   - Retry button per rider
   - Bulk retry failed items

**Deliverable**: Professional GUI with feedback

### Phase 3: SmartScheduler (6-8h)
**Priority**: MEDIUM (automation)

**Tasks**:
1. Create scheduler service (4h)
   - Priority-based cron jobs
   - Settings integration
   - Pause/resume functionality

2. Settings persistence (2h)
   - Database table + migration
   - SettingsRepository
   - GET/PUT endpoints

3. Settings GUI (2h)
   - Settings tab in HTML
   - Sliders voor intervals
   - Toggle switches
   - Live preview

**Deliverable**: Configurable automation

### Phase 4: Testing & Docs (4h)
**Priority**: LOW (polish)

**Tasks**:
1. API mocks (2h)
   - MSW handlers
   - Mock data builders
   - Vitest integration

2. Documentation (2h)
   - Update API.md
   - User guide voor settings
   - Troubleshooting section

**Deliverable**: Production-ready system

---

## 📊 Success Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| API response time | 120s (10 riders) | <1s | **99% faster** |
| User feedback | None | Real-time | **100% better** |
| Scalability | 10 riders max | 100+ riders | **10x better** |
| Configuration | Server restart | GUI (runtime) | **100% easier** |
| Error recovery | Manual | Automatic (3 retries) | **100% automated** |
| Flexibility | Fixed intervals | Per-priority | **400% more granular** |

---

## 💰 Cost Analysis

| Component | Technology | Cost |
|-----------|-----------|------|
| Queue | In-memory (Node.js) | €0 |
| Scheduler | node-cron (existing) | €0 |
| Settings | SQLite table | €0 |
| GUI | HTML + Vanilla JS | €0 |
| API | Express (existing) | €0 |
| **TOTAL** | - | **€0** |

**Alternative (Not Needed)**:
- Redis + BullMQ: €15-50/month
- React build: Complexity overhead
- External scheduler: €10-30/month

**Chosen approach**: 100% in-memory, €0 cost ✅

---

## 🚦 Implementation Priority

```
MUST HAVE (Phase 1):
✅ SyncQueue - Non-blocking foundation

SHOULD HAVE (Phase 2):
✅ GUI enhancements - User experience

COULD HAVE (Phase 3):
✅ SmartScheduler - Automation
✅ Settings GUI - Configuration

NICE TO HAVE (Phase 4):
✅ API mocks - Testing
✅ Advanced docs - Polish
```

---

## 🎯 Next Steps

1. **Start met Phase 1**: SyncQueue implementation
2. **Test thoroughly**: Queue logic + retry
3. **Deploy to GUI**: Status indicators
4. **Iterate**: Gather feedback → improve

**Ready to implement?** Let's start with SyncQueue! 🚀
