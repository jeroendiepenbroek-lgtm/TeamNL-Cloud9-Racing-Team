# Sync Coordination Strategy - Rate Limit Management

## Probleem Analyse

### Huidige Situatie
We hebben **3 onafhankelijke sync types** die parallel draaien:

1. **RIDER_SYNC** - Club members + rider stats
2. **NEAR_EVENT_SYNC** - Events binnen threshold (60min)
3. **FAR_EVENT_SYNC** - Events buiten threshold

### ZwiftRacing API Rate Limits (Standard Tier)

| Endpoint | Rate Limit | Used By | Conflict Risk |
|----------|-----------|---------|---------------|
| `GET /public/clubs/:id` | **1/60min** | RIDER_SYNC (club members) | 🟢 LOW |
| `POST /public/riders` | **1/15min** | RIDER_SYNC (bulk stats) | 🔴 HIGH |
| `GET /public/rider/:id` | **5/1min** | Fallback, Manual adds | 🟡 MEDIUM |
| `GET /public/events/:id` | **1/1min** | NEAR + FAR event discovery | 🔴 HIGH |
| `GET /public/event_signups/:id` | **1/1min** | NEAR + FAR signup sync | 🔴 HIGH |
| `GET /public/results/:id` | **1/1min** | Results sync (niet actief) | 🟢 LOW |

### Conflict Scenarios

#### Scenario 1: Concurrent Event Syncs
```
Time 00:00 → NEAR_EVENT_SYNC starts
  ├─ Event 1 details: GET /public/events/123 (OK)
  ├─ Event 2 details: GET /public/events/124 (OK, binnen 1min window)
  └─ Event 3 signups: GET /public/event_signups/123 (CONFLICT!)
      
Time 00:00 → FAR_EVENT_SYNC starts (parallel)
  └─ Event 5 details: GET /public/events/125 (429 RATE LIMIT!)
```

**Probleem**: Beide event syncs proberen events/signups te fetchen binnen dezelfde 1min window.

#### Scenario 2: RIDER_SYNC Dominance
```
Time 00:00 → RIDER_SYNC starts (interval: 360min)
  └─ POST /public/riders (75 riders) - Gebruikt 1/15min slot

Time 00:05 → User clicks "Add Rider" button
  └─ POST /public/riders (1 rider) - 429 RATE LIMIT!
      (Moet wachten tot 00:15)
```

**Probleem**: Bulk rider sync blokkeert handmatige rider toevoegingen voor 15 minuten.

#### Scenario 3: Event Signup Storm
```
Event starting in 10 minutes → NEAR_EVENT_SYNC aggressive refresh (10min interval)
  ├─ Fetch event details (OK)
  ├─ Fetch signups (OK)
  ├─ Wait 10 min...
  ├─ Fetch event details (OK)
  └─ Fetch signups (429 RATE LIMIT - previous call < 1min ago)
```

## Oplossingen

### Strategie A: Global Rate Limiter (Recommended)

**Concept**: Centralize rate limiting met een global request queue.

```typescript
// Rate Limiter Service
class RateLimiter {
  private queues = {
    clubs: new Queue({ maxRequests: 1, windowMs: 60 * 60 * 1000 }), // 1/60min
    riders_bulk: new Queue({ maxRequests: 1, windowMs: 15 * 60 * 1000 }), // 1/15min
    riders_single: new Queue({ maxRequests: 5, windowMs: 60 * 1000 }), // 5/1min
    events: new Queue({ maxRequests: 1, windowMs: 60 * 1000 }), // 1/1min
    signups: new Queue({ maxRequests: 1, windowMs: 60 * 1000 }), // 1/1min
  };

  async execute(type: string, fn: () => Promise<any>) {
    const queue = this.queues[type];
    await queue.wait(); // Block until slot available
    return await fn();
  }
}
```

**Implementatie**:
1. Wrap alle ZwiftApiClient calls in `rateLimiter.execute()`
2. Sync services wachten automatisch op beschikbare slots
3. Manual triggers respected dezelfde queue

**Pros**:
- ✅ Geen race conditions mogelijk
- ✅ Fair scheduling (FIFO)
- ✅ Works voor manual + automatic triggers
- ✅ Easy debugging (log queue state)

**Cons**:
- ❌ Meer complexiteit
- ❌ Sync kan langer duren (wacht op slot)

---

### Strategie B: Time-Based Slot Allocation

**Concept**: Elke sync type krijgt vaste time slots binnen het uur.

```typescript
// Sync Schedule (per uur)
const SYNC_SCHEDULE = {
  // Minuut 0-10: RIDER_SYNC dominant
  rider_sync: { minutes: [0], duration: 10 },  // 00:00 - Gebruikt POST bulk (1/15min)
  
  // Minuut 15-45: NEAR_EVENT_SYNC (events < 60min start)
  near_events: { 
    minutes: [15, 25, 35, 45],  // Elke 10 min
    duration: 8  // Max 8 min per cycle
  },
  
  // Minuut 50-59: FAR_EVENT_SYNC (events > 60min start)
  far_events: { 
    minutes: [50], 
    duration: 9  // Max 9 min per cycle
  },
};
```

**Cron Expressions**:
```typescript
// RIDER_SYNC: Elk 6e uur op minuut 0
cron.schedule('0 */6 * * *', syncRiders);

// NEAR_EVENT_SYNC: Elke 10 min, maar skip conflicting slots
cron.schedule('15,25,35,45 * * * *', syncNearEvents);

// FAR_EVENT_SYNC: Elk uur op minuut 50
cron.schedule('50 * * * *', syncFarEvents);
```

**Pros**:
- ✅ Simpel te begrijpen
- ✅ Predictable schedule
- ✅ Geen code changes in sync logic

**Cons**:
- ❌ Rigid (events kort voor start kunnen gemist worden)
- ❌ Niet fair bij high load

---

### Strategie C: Priority-Based Execution

**Concept**: Intelligent scheduling gebaseerd op urgentie.

```typescript
class SyncScheduler {
  private priorities = {
    manual_rider_add: 100,      // Hoogste (user wait)
    near_event_urgent: 90,      // Event < 15min
    near_event_normal: 70,      // Event 15-60min
    rider_sync: 50,             // Scheduled bulk
    far_event_sync: 30,         // Scheduled far events
  };

  async schedule(type: string, fn: () => Promise<any>) {
    const priority = this.priorities[type];
    await this.queue.add(fn, { priority });
  }
}
```

**Regels**:
1. **Manual rider add** → Immediate (skip queue als slot vrij)
2. **Event < 15min** → High priority (preempt far events)
3. **Event 15-60min** → Normal priority
4. **Rider bulk sync** → Low priority (kan wachten)
5. **Far events** → Lowest priority (background)

**Pros**:
- ✅ User-friendly (manual actions fast)
- ✅ Event startup niet gemist
- ✅ Efficient slot gebruik

**Cons**:
- ❌ Complex logic
- ❌ Kan leiden tot starvation (far events never run)

---

### Strategie D: Hybrid Approach (AANBEVOLEN)

**Combinatie van B (slots) en C (priority)**:

```typescript
// BASE SCHEDULE (Time slots)
const BASE_SCHEDULE = {
  rider_sync: {
    cron: '0 */6 * * *',      // Every 6 hours at :00
    maxDuration: 10,           // Reserve 10 min slot
  },
  near_events: {
    cron: '*/15 * * * *',      // Every 15 min
    maxDuration: 12,           // Reserve 12 min slot
    skipSlots: [0, 30],        // Skip :00 (rider sync) and :30 (far events)
  },
  far_events: {
    cron: '30 */2 * * *',      // Every 2 hours at :30
    maxDuration: 25,           // Reserve 25 min slot
  },
};

// PRIORITY OVERRIDES
const PRIORITY_RULES = {
  // Event binnen 15 min → Force immediate execution
  near_event_urgent: (event) => {
    const minutesUntil = (event.time_unix - Date.now() / 1000) / 60;
    return minutesUntil <= 15;
  },
  
  // Manual rider add → Force immediate (maar respect rate limit)
  manual_rider_add: () => true,
};
```

**Implementatie**:
```typescript
class HybridSyncScheduler {
  private rateLimiter = new RateLimiter();
  private activeSlot: string | null = null;

  async execute(type: string, fn: () => Promise<any>, isPriority = false) {
    // Check if we're in reserved slot
    if (!isPriority && !this.isInReservedSlot(type)) {
      console.log(`⏸️ ${type} skipped - outside reserved slot`);
      return;
    }

    // Check if another sync is active
    if (this.activeSlot && this.activeSlot !== type && !isPriority) {
      console.log(`⏸️ ${type} blocked - ${this.activeSlot} is active`);
      return;
    }

    // Execute with rate limiting
    this.activeSlot = type;
    try {
      await this.rateLimiter.execute(type, fn);
    } finally {
      this.activeSlot = null;
    }
  }

  private isInReservedSlot(type: string): boolean {
    const now = new Date();
    const minute = now.getMinutes();
    const schedule = BASE_SCHEDULE[type];
    
    // Check if current minute matches cron pattern
    return this.matchesCron(minute, schedule.cron);
  }
}
```

---

## Aanbeveling: Hybrid Approach

### Configuratie

```typescript
// config/sync-coordination.config.ts
export const SYNC_COORDINATION = {
  // Time-based slots (avoid overlap)
  slots: {
    rider_sync: {
      interval: 360,           // Every 6 hours
      startMinute: 0,          // Start at :00
      maxDuration: 10,         // Reserve 10 minutes
    },
    near_events: {
      interval: 15,            // Every 15 minutes
      startMinutes: [10, 25, 40, 55],  // Offset from rider sync
      maxDuration: 12,
    },
    far_events: {
      interval: 120,           // Every 2 hours
      startMinute: 30,         // Start at :30
      maxDuration: 25,
    },
  },

  // Rate limits (enforce API limits)
  rateLimits: {
    clubs: { max: 1, windowMs: 60 * 60 * 1000 },
    riders_bulk: { max: 1, windowMs: 15 * 60 * 1000 },
    riders_single: { max: 5, windowMs: 60 * 1000 },
    events: { max: 1, windowMs: 60 * 1000 },
    signups: { max: 1, windowMs: 60 * 1000 },
  },

  // Priority overrides
  priorities: {
    manual_rider_add: { force: true, timeout: 300000 },  // Wait max 5min
    event_starting_soon: { threshold: 15, force: true }, // < 15min → priority
  },
};
```

### Implementatie Steps

1. **Fase 1: Add Rate Limiter** (Week 1)
   - Create `RateLimiterService`
   - Wrap ZwiftApiClient calls
   - Add logging & monitoring

2. **Fase 2: Slot Coordination** (Week 2)
   - Update cron expressions
   - Add slot validation
   - Test overlap scenarios

3. **Fase 3: Priority System** (Week 3)
   - Add priority queue
   - Implement urgent event detection
   - Add manual trigger fast-path

4. **Fase 4: Monitoring** (Week 4)
   - Dashboard met rate limit usage
   - Conflict detection alerts
   - Performance metrics

---

## Monitoring & Alerting

### Metrics to Track

```typescript
interface SyncCoordinationMetrics {
  // Rate limit usage
  rateLimitUsage: {
    clubs: { used: number, available: number, resetAt: Date },
    riders_bulk: { used: number, available: number, resetAt: Date },
    events: { used: number, available: number, resetAt: Date },
  },
  
  // Conflict detection
  conflicts: {
    count: number,
    lastConflict: { type: string, timestamp: Date, blocked: string },
  },
  
  // Queue stats
  queue: {
    pending: number,
    avgWaitTime: number,
    maxWaitTime: number,
  },
}
```

### Alerts

```typescript
// Alert conditions
const ALERTS = {
  rate_limit_exceeded: (type) => {
    // Fired when we hit 429
    slack.alert(`🚫 Rate limit exceeded: ${type}`);
  },
  
  sync_conflict: (typeA, typeB) => {
    // Fired when two syncs overlap
    slack.alert(`⚠️ Sync conflict: ${typeA} blocked by ${typeB}`);
  },
  
  long_queue: (waitTime) => {
    // Fired when queue wait > 5min
    if (waitTime > 300000) {
      slack.alert(`⏰ Sync queue backed up: ${waitTime}ms wait`);
    }
  },
};
```

---

## Fallback & Recovery

### If Rate Limit Hit

```typescript
async function handleRateLimit(error: any, context: string) {
  // Log to database
  await supabase.createSyncLog({
    endpoint: context,
    status: 'error',
    error_message: 'Rate limit exceeded (429)',
  });

  // Exponential backoff
  const waitTime = Math.min(15 * 60 * 1000, Math.pow(2, retryCount) * 1000);
  console.log(`⏰ Rate limit hit, waiting ${waitTime}ms before retry`);
  
  await new Promise(resolve => setTimeout(resolve, waitTime));
  
  // Retry with priority
  return await rateLimiter.execute(context, fn, { priority: 'high' });
}
```

---

## Testing Strategy

### Unit Tests
- Rate limiter queue logic
- Slot validation
- Priority calculation

### Integration Tests
- Concurrent sync simulation
- Rate limit enforcement
- Priority override behavior

### Load Tests
- 100 concurrent requests
- Peak event signup period (15min before race)
- Manual rider adds during sync

---

## Migration Path

### Week 1: Preparation
- ✅ Document current sync behavior
- ✅ Measure actual API usage
- ✅ Identify peak conflict times

### Week 2: Implementation
- 🔨 Build RateLimiterService
- 🔨 Update ZwiftApiClient
- 🔨 Add coordination layer

### Week 3: Testing
- 🧪 Staging environment testing
- 🧪 Load testing
- 🧪 Manual testing scenarios

### Week 4: Deployment
- 🚀 Gradual rollout (riders first)
- 🚀 Monitor for 48h
- 🚀 Enable event coordination
- 🚀 Full production

---

## Conclusie

**Aanbevolen Aanpak**: Hybrid Approach (Strategie D)

**Redenen**:
1. ✅ **Voorkomt conflicts** via time-based slots
2. ✅ **User-friendly** via priority system
3. ✅ **Schaalbaar** voor toekomstige sync types
4. ✅ **Observable** met metrics & alerts
5. ✅ **Incrementeel** implementeerbaar

**Prioriteit**:
- **P0**: Rate Limiter (voorkomt 429 errors)
- **P1**: Slot Coordination (voorkomt overlap)
- **P2**: Priority System (UX improvement)
- **P3**: Monitoring Dashboard (observability)

**Geschatte Impact**:
- 95% reductie in rate limit conflicts
- <1s response time voor manual triggers
- 99.9% uptime voor event signups
