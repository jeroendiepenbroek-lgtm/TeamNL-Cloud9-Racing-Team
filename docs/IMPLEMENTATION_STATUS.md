# Implementation Status - Workflow v2
**Datum**: 27 oktober 2025  
**Project**: TeamNL Cloud9 Racing Team Dashboard

---

## ✅ Voltooid: Database Schema Updates

### Schema Wijzigingen
Migratie: `20251027130559_workflow_v2_schema_updates`

**1. Club Model - Source Tracking**
```prisma
model Club {
  source          String        @default("manual")   // NEW: "favorite_rider", "manual", "api"
  trackedSince    DateTime      @default(now())      // NEW: Wanneer club tracking begon
  
  @@index([source])  // NEW: Index voor queries
}
```

**Gebruik**:
```typescript
// Automatisch clubs toevoegen vanuit favorites (Step 3)
await prisma.club.upsert({
  where: { id: clubId },
  create: {
    id: clubId,
    name: clubName,
    source: 'favorite_rider',  // ← Herleidbaar naar workflow step
    trackedSince: new Date()
  },
  update: { name: clubName }
});

// Query: Alle clubs van subteam
const clubs = await prisma.club.findMany({
  where: { source: 'favorite_rider' }
});
```

---

**2. ClubMember Model - Favorite Linking**
```prisma
model ClubMember {
  isFavorite      Boolean       @default(false)  // NEW: Link naar Rider table
  
  @@index([isFavorite])  // NEW: Snel favorites filteren
}
```

**Gebruik**:
```typescript
// Bij sync club roster: markeer favorites (Step 4)
const favoriteZwiftIds = await getFavoriteZwiftIds();

await prisma.clubMember.updateMany({
  where: {
    clubId: 2281,
    zwiftId: { in: favoriteZwiftIds }
  },
  data: { isFavorite: true }
});

// Query: Alle tracked riders (subteam + club)
const allTracked = await prisma.clubMember.findMany({
  where: {
    club: { source: 'favorite_rider' }
  },
  orderBy: { isFavorite: 'desc' }  // Favorites eerst
});
```

---

**3. Event Model - Soft Delete (100-day Retention)**
```prisma
model Event {
  deletedAt       DateTime?                        // NEW: Soft delete
  
  @@index([deletedAt])  // NEW: Archief queries
}
```

**Gebruik**:
```typescript
// Daily cleanup (Step 5 - Forward scanning)
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 100);

// Soft delete oude events
await prisma.event.updateMany({
  where: {
    eventDate: { lt: cutoffDate },
    deletedAt: null
  },
  data: { deletedAt: new Date() }
});

// Hard delete gearchiveerde results
await prisma.raceResult.deleteMany({
  where: {
    event: {
      deletedAt: { not: null },
      deletedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  }
});

// Query: Alleen actieve events
const events = await prisma.event.findMany({
  where: { deletedAt: null }
});
```

---

## 📋 Data Model Overzicht

### Huidige Tabellen (Workflow Mapping)

| Tabel | Workflow Step | Doel | Key Velden |
|-------|---------------|------|------------|
| `riders` | **Step 1** | Subteam favorites (handmatig) | `zwiftId`, `isFavorite=true` |
| `riders` | **Step 2** | Volledige stats (66 attrs) | `ftp`, `power*`, `ranking`, `clubId` |
| `clubs` | **Step 3** | Clubs van favorites | `source='favorite_rider'` |
| `club_members` | **Step 4** | Alle club leden | `isFavorite` (link naar riders) |
| `events` | **Step 5** | Forward scanning | `deletedAt` (retention) |
| `race_results` | **Step 5** | Event deelname | `eventId`, `riderId` |

### Relaties

```
Rider (favorite)
  ├─→ clubId → Club (source='favorite_rider')
  │                 └─→ ClubMember[] (alle leden)
  │                       └─→ RaceResult[] (event deelname)
  │
  └─→ RaceResult[] (eigen results)
            └─→ Event (deletedAt voor cleanup)
```

---

## 🚧 Te Implementeren: Services & API

### Phase 1: Subteam Management (Step 1-3)

**Prioriteit**: 🔴 Hoog  
**Status**: ⏳ Schema klaar, logica nog te bouwen

#### 1.1 SubteamService
```typescript
// File: src/services/subteam.ts

export class SubteamService {
  
  // Step 1: Manage favorites
  async addFavorites(zwiftIds: number[]): Promise<AddFavoritesResult> {
    // 1. Voeg toe aan riders tabel
    // 2. Trigger Step 2 (stats sync)
    // 3. Trigger Step 3 (club extraction)
  }
  
  async removeFavorite(zwiftId: number): Promise<void> {
    // 1. Verwijder uit riders
    // 2. Update club_members.isFavorite = false
    // 3. Check: verwijder club als geen favorites meer
  }
  
  async listFavorites(): Promise<Rider[]> {
    return prisma.rider.findMany({
      where: { isFavorite: true },
      include: { club: true }
    });
  }
  
  // Step 2: Sync stats
  async syncFavoriteStats(zwiftId?: number): Promise<SyncStatsResult> {
    const riders = zwiftId 
      ? [await prisma.rider.findUnique({ where: { zwiftId } })]
      : await this.listFavorites();
    
    for (const rider of riders) {
      const apiData = await zwiftApi.getRider(rider.zwiftId);
      
      await prisma.rider.update({
        where: { zwiftId: rider.zwiftId },
        data: {
          name: apiData.name,
          ftp: apiData.ftp,
          // ... alle 66 velden
          clubId: apiData.club?.id
        }
      });
      
      // Trigger Step 3
      if (apiData.club?.id) {
        await this.extractClub(apiData.club);
      }
    }
  }
  
  // Step 3: Extract clubs
  private async extractClub(clubData: { id: number, name: string }) {
    await prisma.club.upsert({
      where: { id: clubData.id },
      create: {
        id: clubData.id,
        name: clubData.name,
        source: 'favorite_rider',
        trackedSince: new Date(),
        syncEnabled: true
      },
      update: { name: clubData.name }
    });
    
    // Trigger Step 4 (club roster sync)
    await clubService.syncRoster(clubData.id);
  }
}
```

**Status**: ⏳ Te maken  
**Tijd**: 1 dag

---

#### 1.2 API Routes - Subteam

```typescript
// File: src/api/routes.ts

// POST /api/subteam/riders
router.post('/subteam/riders', asyncHandler(async (req, res) => {
  const { zwiftIds } = req.body;
  
  if (!Array.isArray(zwiftIds) || zwiftIds.length === 0) {
    return res.status(400).json({ error: 'zwiftIds array required' });
  }
  
  const result = await subteamService.addFavorites(zwiftIds);
  
  res.json({
    added: result.added,
    failed: result.failed,
    riders: result.riders
  });
}));

// DELETE /api/subteam/riders/:zwiftId
router.delete('/subteam/riders/:zwiftId', asyncHandler(async (req, res) => {
  const zwiftId = parseInt(req.params.zwiftId);
  
  await subteamService.removeFavorite(zwiftId);
  
  res.json({ success: true, deleted: zwiftId });
}));

// GET /api/subteam/riders
router.get('/subteam/riders', asyncHandler(async (req, res) => {
  const riders = await subteamService.listFavorites();
  
  res.json({
    total: riders.length,
    riders
  });
}));

// POST /api/subteam/sync
router.post('/subteam/sync', asyncHandler(async (req, res) => {
  const result = await subteamService.syncFavoriteStats();
  
  res.json(result);
}));
```

**Status**: ⏳ Te maken  
**Tijd**: 0.5 dag

---

### Phase 2: Club Roster Sync (Step 4)

**Prioriteit**: 🔴 Hoog  
**Status**: ⏳ Schema klaar, logica herstructureren

#### 2.1 ClubService Update

```typescript
// File: src/services/club.ts (update bestaande)

export class ClubService {
  
  // Step 4: Sync complete roster
  async syncRoster(clubId: number): Promise<SyncRosterResult> {
    // Rate limit check (1/60min!)
    const lastSync = await this.getLastSync(clubId);
    if (lastSync && Date.now() - lastSync.getTime() < 60 * 60 * 1000) {
      throw new Error('Rate limit: max 1 sync per 60 min');
    }
    
    // API call
    const clubData = await zwiftApi.getClub(clubId);
    
    // Get favorite zwiftIds
    const favoriteIds = await prisma.rider.findMany({
      where: { isFavorite: true },
      select: { zwiftId: true }
    });
    const favoriteSet = new Set(favoriteIds.map(r => r.zwiftId));
    
    // Upsert members
    for (const member of clubData.riders) {
      await prisma.clubMember.upsert({
        where: {
          zwiftId_clubId: {
            zwiftId: member.riderId,
            clubId: clubId
          }
        },
        create: {
          zwiftId: member.riderId,
          clubId: clubId,
          name: member.name,
          categoryRacing: member.category,
          ftp: member.ftp,
          ranking: member.ranking,
          // ... basis velden (15 attrs)
          isFavorite: favoriteSet.has(member.riderId),  // ← Link!
          lastSynced: new Date()
        },
        update: {
          name: member.name,
          categoryRacing: member.category,
          ftp: member.ftp,
          ranking: member.ranking,
          isFavorite: favoriteSet.has(member.riderId),  // ← Update!
          lastSynced: new Date()
        }
      });
    }
    
    // Update club
    await prisma.club.update({
      where: { id: clubId },
      data: {
        memberCount: clubData.riders.length,
        lastSync: new Date()
      }
    });
    
    return {
      clubId,
      memberCount: clubData.riders.length,
      favoritesCount: clubData.riders.filter(r => favoriteSet.has(r.riderId)).length
    };
  }
}
```

**Status**: ⏳ Herstructureren bestaande logica  
**Tijd**: 0.5 dag

---

#### 2.2 Scheduled Sync (Cron)

```typescript
// File: src/server.ts (update bestaande)

// Elke 60 min: sync alle tracked clubs
cron.schedule('0 * * * *', async () => {  // Elk uur
  logger.info('Start club roster sync (scheduled)');
  
  const clubs = await prisma.club.findMany({
    where: {
      source: 'favorite_rider',  // Alleen clubs van favorites
      syncEnabled: true
    }
  });
  
  for (const club of clubs) {
    try {
      await clubService.syncRoster(club.id);
      logger.info(`Club ${club.id} roster synced`);
      
      // Wacht 61 min voor volgende (rate limit)
      if (clubs.indexOf(club) < clubs.length - 1) {
        await sleep(61 * 60 * 1000);
      }
    } catch (error) {
      logger.error(`Failed to sync club ${club.id}`, error);
    }
  }
});
```

**Status**: ⏳ Te updaten  
**Tijd**: 0.5 dag

---

### Phase 3: Forward Event Scanning (Step 5)

**Prioriteit**: 🟡 Medium  
**Status**: ⚠️ Script bestaat, herstructureren

#### 3.1 EventService

```typescript
// File: src/services/event.ts (nieuw)

export class EventService {
  
  // Step 5: Forward scan
  async forwardScan(options?: {
    maxEvents?: number,
    startEventId?: number
  }): Promise<ForwardScanResult> {
    
    // 1. Get tracked riders (favorites + club members)
    const trackedRiders = await this.getTrackedRiders();
    
    // 2. Get last known event
    const lastEventId = options?.startEventId ?? await this.getLastEventId();
    
    // 3. Scan range
    const maxEvents = options?.maxEvents ?? 1000;
    const endEventId = lastEventId + maxEvents;
    
    let scanned = 0;
    let found = 0;
    let saved = 0;
    
    for (let eventId = lastEventId + 1; eventId <= endEventId; eventId++) {
      scanned++;
      
      // Rate limit: 61 sec
      await sleep(61 * 1000);
      
      // Fetch event
      const event = await zwiftApi.getEventResults(eventId);
      if (!event) continue;
      
      // Filter: tracked riders?
      const trackedResults = event.results.filter(r => 
        trackedRiders.has(r.riderId)
      );
      
      if (trackedResults.length === 0) continue;
      
      found++;
      
      // Save event
      await prisma.event.upsert({
        where: { id: eventId },
        create: {
          id: eventId,
          name: event.name,
          eventDate: event.date,
          clubId: event.clubId,
          totalFinishers: event.results.length
        },
        update: {
          totalFinishers: event.results.length
        }
      });
      
      // Save results (alleen tracked riders!)
      for (const result of trackedResults) {
        await prisma.raceResult.upsert({
          where: {
            eventId_riderId: {
              eventId: eventId,
              riderId: result.riderId
            }
          },
          create: {
            eventId: eventId,
            riderId: result.riderId,
            position: result.position,
            time: result.time,
            category: result.category
          },
          update: {
            position: result.position,
            time: result.time
          }
        });
      }
      
      saved++;
      
      // Log progress
      if (scanned % 100 === 0) {
        logger.info(`Progress: ${scanned}/${maxEvents} scanned, ${found} relevant`);
      }
    }
    
    // Cleanup old data
    await this.cleanup100Days();
    
    return { scanned, found, saved };
  }
  
  // Get tracked riders (favorites + club members)
  private async getTrackedRiders(): Promise<Set<number>> {
    const [favorites, clubMembers] = await Promise.all([
      prisma.rider.findMany({
        where: { isFavorite: true },
        select: { zwiftId: true }
      }),
      prisma.clubMember.findMany({
        where: {
          club: { source: 'favorite_rider' }
        },
        select: { zwiftId: true }
      })
    ]);
    
    return new Set([
      ...favorites.map(r => r.zwiftId),
      ...clubMembers.map(r => r.zwiftId)
    ]);
  }
  
  // 100-day retention
  private async cleanup100Days() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 100);
    
    // Soft delete events
    const softDeleted = await prisma.event.updateMany({
      where: {
        eventDate: { lt: cutoff },
        deletedAt: null
      },
      data: { deletedAt: new Date() }
    });
    
    // Hard delete old results
    const hardDeleted = await prisma.raceResult.deleteMany({
      where: {
        event: {
          deletedAt: {
            not: null,
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // 7 days grace
          }
        }
      }
    });
    
    logger.info(`Cleanup: ${softDeleted.count} events archived, ${hardDeleted.count} results deleted`);
  }
}
```

**Status**: ⏳ Te maken (basis in `scripts/forward-tracking.ts`)  
**Tijd**: 1 dag

---

#### 3.2 Update Forward Tracking Script

```typescript
// File: scripts/forward-tracking.ts (update)

import { EventService } from '../services/event.js';

const eventService = new EventService();

// Daily forward scan
const result = await eventService.forwardScan({
  maxEvents: 1000  // ~17 uur scan tijd
});

logger.info('Forward scan completed', result);

process.exit(0);
```

**Status**: ⏳ Herstructureren  
**Tijd**: 0.5 dag

---

#### 3.3 Cron Job

```typescript
// File: src/server.ts

// Daily 04:00: forward event scan
cron.schedule('0 4 * * *', async () => {
  logger.info('Start forward event scan (scheduled)');
  
  try {
    const result = await eventService.forwardScan();
    logger.info('Forward scan completed', result);
  } catch (error) {
    logger.error('Forward scan failed', error);
  }
});
```

**Status**: ⏳ Te maken  
**Tijd**: 0.5 dag

---

## 📊 Implementatie Timeline

### Week 1: Phase 1 (Subteam + Stats + Clubs)

| Dag | Taak | Status | Tijd |
|-----|------|--------|------|
| 1 | SubteamService implementeren | ⏳ | 6u |
| 1-2 | API routes `/api/subteam/*` | ⏳ | 4u |
| 2 | RiderStats sync logica | ⏳ | 4u |
| 2-3 | Club extraction logica | ⏳ | 4u |
| 3 | Testing (5 favorites, 2 clubs) | ⏳ | 4u |

**Totaal**: 3 dagen

---

### Week 2: Phase 2 (Club Rosters)

| Dag | Taak | Status | Tijd |
|-----|------|--------|------|
| 4 | ClubService.syncRoster() update | ⏳ | 4u |
| 4-5 | isFavorite linking logica | ⏳ | 4u |
| 5 | Cron job (hourly) setup | ⏳ | 2u |
| 5 | Testing (club roster sync) | ⏳ | 4u |

**Totaal**: 2 dagen

---

### Week 2-3: Phase 3 (Forward Scanning)

| Dag | Taak | Status | Tijd |
|-----|------|--------|------|
| 6 | EventService implementeren | ⏳ | 6u |
| 7 | Forward scanning logica | ⏳ | 4u |
| 7-8 | 100-day cleanup logica | ⏳ | 4u |
| 8 | Cron job (daily 04:00) | ⏳ | 2u |
| 8 | Testing (small event range) | ⏳ | 4u |

**Totaal**: 3 dagen

---

### **Grand Total**: 8 werkdagen (~2 weken)

---

## 🧪 Testing Strategie

### Unit Tests (Per Service)

```typescript
// tests/services/subteam.test.ts

describe('SubteamService', () => {
  it('should add favorite riders', async () => {
    const result = await subteamService.addFavorites([150437]);
    expect(result.added).toBe(1);
  });
  
  it('should sync rider stats from API', async () => {
    await subteamService.syncFavoriteStats(150437);
    const rider = await prisma.rider.findUnique({ where: { zwiftId: 150437 } });
    expect(rider.ftp).toBeGreaterThan(0);
  });
  
  it('should extract club from rider', async () => {
    await subteamService.syncFavoriteStats(150437);
    const clubs = await prisma.club.findMany({ where: { source: 'favorite_rider' } });
    expect(clubs.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests (API Endpoints)

```typescript
// tests/api/subteam.test.ts

describe('POST /api/subteam/riders', () => {
  it('should add riders via API', async () => {
    const response = await request(app)
      .post('/api/subteam/riders')
      .send({ zwiftIds: [150437, 123456] });
    
    expect(response.status).toBe(200);
    expect(response.body.added).toBe(2);
  });
});
```

### End-to-End Test (Volledige Workflow)

```typescript
// tests/e2e/workflow.test.ts

describe('Complete Workflow', () => {
  it('should complete full workflow (Steps 1-5)', async () => {
    // Step 1: Add favorites
    await subteamService.addFavorites([150437]);
    
    // Step 2: Sync stats (automatic)
    await sleep(2000);
    const rider = await prisma.rider.findUnique({ where: { zwiftId: 150437 } });
    expect(rider.clubId).toBeTruthy();
    
    // Step 3: Club extracted (automatic)
    const club = await prisma.club.findUnique({ where: { id: rider.clubId } });
    expect(club.source).toBe('favorite_rider');
    
    // Step 4: Club roster synced (automatic)
    const members = await prisma.clubMember.findMany({ where: { clubId: club.id } });
    expect(members.length).toBeGreaterThan(0);
    expect(members.some(m => m.isFavorite)).toBe(true);
    
    // Step 5: Forward scan
    const result = await eventService.forwardScan({ maxEvents: 10 });
    expect(result.scanned).toBe(10);
  });
});
```

---

## 📚 Documentatie Updates

### Bestaande Docs

- ✅ `WORKFLOW_DESIGN.md` - Complete workflow beschrijving
- ✅ `IMPLEMENTATION_STATUS.md` - Dit document
- ⏳ `API.md` - Update met nieuwe endpoints
- ⏳ `README.md` - Update met workflow diagram

### Nieuwe Docs

- ⏳ `SUBTEAM_GUIDE.md` - Gebruikershandleiding voor subteam management
- ⏳ `DEPLOYMENT.md` - Production deployment guide

---

## 🚀 Volgende Acties

### Vandaag (27 oktober)
1. ✅ Schema updates (DONE)
2. ⏳ SubteamService skeleton maken
3. ⏳ Eerste API endpoint (`POST /api/subteam/riders`)

### Deze Week
1. ⏳ Phase 1 voltooien (subteam + stats + clubs)
2. ⏳ Eerste tests schrijven
3. ⏳ Lokaal testen met echte data (5 favorites)

### Volgende Week
1. ⏳ Phase 2 (club rosters)
2. ⏳ Phase 3 (forward scanning)
3. ⏳ End-to-end test
4. ⏳ Deployment voorbereiden

---

**Status**: Database schema klaar ✅  
**Next**: Services & API implementatie  
**ETA**: 2 weken voor volledige workflow

