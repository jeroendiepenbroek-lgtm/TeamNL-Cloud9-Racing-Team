# Frontend Roadmap - Favorites Management GUI

## 🎯 Doel
Eenvoudige web interface voor het beheren van favorite riders zonder CLI kennis.

## 📊 Opties Analyse

### Optie A: Simple HTML Dashboard (Aanbevolen voor Quick Win)

**Technologie:** Vanilla HTML + JavaScript + Tailwind CSS  
**Implementatie tijd:** 4-6 uur  
**Complexiteit:** Laag  

**Voordelen:**
- ✅ Snel te implementeren
- ✅ Geen build process nodig
- ✅ Werkt direct in browser
- ✅ Geen extra dependencies
- ✅ Lichtgewicht

**Features:**
```
┌─────────────────────────────────────────────────────┐
│  TeamNL Cloud9 - Favorites Manager                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [➕ Add Favorite]  [📤 Upload File]  [🔄 Sync All] │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Zwift ID: [_________]  Priority: [1▼]         │ │
│  │ [Add Single Rider]                             │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Current Favorites (3):                              │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🏆 Onno Aphinan (1495)        Priority: 1  ❌ │ │
│  │    FTP: 294W | Rating: 1598 | Type: Sprinter  │ │
│  ├────────────────────────────────────────────────┤ │
│  │ 🚴 Marcel v Esch (10795)      Priority: 2  ❌ │ │
│  │    FTP: 243W | Rating: -    | Type: -         │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Recent Sync: 2 mins ago | Next: in 13 mins         │
└─────────────────────────────────────────────────────┘
```

**Implementatie:**
```javascript
// public/favorites-manager.html
// Direct fetch() calls naar /api/favorites
// Drag & drop voor CSV upload
// Real-time status updates
```

---

### Optie B: React Single Page App (Beste UX)

**Technologie:** React 18 + Vite + TypeScript + Tailwind  
**Implementatie tijd:** 2-3 dagen  
**Complexiteit:** Medium  

**Voordelen:**
- ✅ Professional UX
- ✅ Component reusability
- ✅ Type safety (TypeScript)
- ✅ Makkelijk uitbreidbaar
- ✅ State management

**Nadelen:**
- ⚠️ Build process nodig
- ⚠️ Meer dependencies
- ⚠️ Langere dev tijd

**Features:**
- Advanced filtering/sorting
- Bulk operations UI
- Real-time sync progress
- Charts voor race ratings
- Export functionaliteit

---

### Optie C: Next.js Full Stack (Toekomstbestendig)

**Technologie:** Next.js 14 + App Router + Server Components  
**Implementatie tijd:** 1-2 weken  
**Complexiteit:** Hoog  

**Voordelen:**
- ✅ SSR/SSG voor performance
- ✅ API routes + frontend in één
- ✅ Beste SEO
- ✅ Production-ready scaling
- ✅ Edge deployment

**Nadelen:**
- ⚠️ Steep learning curve
- ⚠️ Overkill voor huidige use case
- ⚠️ Meer infra nodig

---

## 🎯 Aanbeveling voor Nu: **Optie A + B Hybrid**

### Fase 1: Quick Win (Deze week)
**Simple HTML Dashboard** (`public/favorites.html`)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Favorites Manager</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
  <!-- Single file, no build, instant deploy -->
  <div id="app" class="container mx-auto p-4">
    <!-- Add/Upload/List UI hier -->
  </div>
  
  <script>
    // Vanilla JS met fetch API
    async function loadFavorites() {
      const res = await fetch('/api/favorites');
      const favorites = await res.json();
      renderFavorites(favorites);
    }
    
    async function addFavorite(zwiftId, priority) {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({zwiftId, priority})
      });
      loadFavorites(); // Refresh
    }
    
    // File upload handler
    document.getElementById('upload').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      const text = await file.text();
      const ids = text.split('\n').filter(id => id.trim());
      
      for (const id of ids) {
        await addFavorite(id, 2);
        await new Promise(r => setTimeout(r, 500)); // UI feedback
      }
    });
  </script>
</body>
</html>
```

**Deployment:**
- Kopieer naar `public/` folder
- Express serveert static files
- Klaar! Geen build nodig

**Use Case:**
- Snel 5-10 favorites toevoegen
- Status checken
- Handmatige sync triggeren

---

### Fase 2: Professional UI (Over 2-4 weken)
**React Dashboard** wanneer je meer features nodig hebt:

```bash
# Aanmaken React app
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install axios @tanstack/react-query tailwindcss

# Proxy naar backend in vite.config.ts
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
}
```

**Features:**
- Advanced table met sorting/filtering
- Bulk edit priorities
- Sync progress bar
- Race history charts
- Export to CSV

---

## 2. Automations & Manual Triggers

### Huidige Situatie Analyse

**Bestaande Automations:**
```typescript
// src/server.ts
// ✅ Club sync: Elke 60 min
cron.schedule('0 * * * *', syncClubMembers);

// ❌ Favorites sync: NOG NIET GEACTIVEERD
// cron.schedule('*/15 * * * *', syncFavoriteRiders);
```

**Manual Triggers:**
```bash
# ✅ CLI (werkt)
npm run sync:favorites

# ✅ API (werkt)
curl -X POST http://localhost:3000/api/sync/favorites
```

---

### Advies: Hybrid Approach

#### **Strategie A: Smart Automation met Override**

```typescript
// src/services/scheduler.ts - NIEUW
export class SmartScheduler {
  private isManualOverride = false;
  private lastManualSync: Date | null = null;
  
  // Automatische sync met intelligente timing
  async autoSync() {
    if (this.isManualOverride) {
      logger.info('⏸️  Auto-sync paused - manual override active');
      return;
    }
    
    const favorites = await riderRepo.getFavoriteRiders();
    
    if (favorites.length === 0) {
      logger.info('⏭️  No favorites - skipping auto-sync');
      return;
    }
    
    // Priority-based scheduling
    const priority1 = favorites.filter(f => f.syncPriority === 1);
    const priority2 = favorites.filter(f => f.syncPriority === 2);
    
    // Priority 1: Elke 15 min
    if (priority1.length > 0) {
      await syncService.syncFavoriteRiders();
    }
    // Priority 2-4: Elke uur
    else if (priority2.length > 0 && isHourMark()) {
      await syncService.syncFavoriteRiders();
    }
  }
  
  // Manual trigger met auto-pause
  async manualSync(pauseAutoForMinutes: number = 30) {
    logger.info('🔧 Manual sync triggered - pausing auto-sync');
    
    this.isManualOverride = true;
    this.lastManualSync = new Date();
    
    await syncService.syncFavoriteRiders();
    
    // Resume auto-sync na X minuten
    setTimeout(() => {
      this.isManualOverride = false;
      logger.info('▶️  Auto-sync resumed');
    }, pauseAutoForMinutes * 60 * 1000);
  }
}
```

**Voordelen:**
- ✅ Voorkomt dubbele syncs
- ✅ Respecteert rate limits
- ✅ Automatische resume
- ✅ Minder API calls = sneller

---

#### **Strategie B: Queue-based met Priority**

```typescript
// src/services/sync-queue.ts - NIEUW
export class SyncQueue {
  private queue: Array<{id: number, priority: number}> = [];
  private processing = false;
  
  // Auto-sync voegt toe aan queue
  async scheduleFavorite(zwiftId: number, priority: number) {
    this.queue.push({id: zwiftId, priority});
    this.queue.sort((a, b) => a.priority - b.priority);
    
    if (!this.processing) {
      this.process();
    }
  }
  
  // Manual sync: skip queue, direct processing
  async syncNow(zwiftId: number) {
    logger.info(`🚀 Manual sync: ${zwiftId} - bypassing queue`);
    await apiClient.getRider(zwiftId);
    await riderRepo.upsertRider(...);
  }
  
  // Queue processor (background)
  private async process() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      await this.syncNow(item.id);
      await delay(12000); // Rate limit
    }
    
    this.processing = false;
  }
}
```

**Voordelen:**
- ✅ Geen race conditions
- ✅ Manual sync heeft voorrang
- ✅ Efficiency (background processing)
- ✅ Transparantie (queue status zichtbaar)

---

### **Aanbevolen Setup:**

```typescript
// src/server.ts - UPDATE
import { SmartScheduler } from './services/scheduler.js';

const scheduler = new SmartScheduler();

// Auto-sync: Smart scheduling
cron.schedule('*/15 * * * *', async () => {
  await scheduler.autoSync(); // Checks priority, skips if manual active
});

// API endpoint voor manual trigger
router.post('/api/sync/favorites/manual', asyncHandler(async (req, res) => {
  const { pauseAutoMinutes = 30 } = req.body;
  
  await scheduler.manualSync(pauseAutoMinutes);
  
  res.json({
    message: 'Manual sync started',
    autoSyncPausedFor: `${pauseAutoMinutes} minutes`
  });
}));

// Status endpoint
router.get('/api/sync/status', asyncHandler(async (req, res) => {
  res.json({
    autoSyncActive: !scheduler.isManualOverride,
    lastManualSync: scheduler.lastManualSync,
    nextAutoSync: scheduler.getNextAutoSyncTime(),
    queueLength: syncQueue.queue.length
  });
}));
```

---

## 🎯 Concrete Implementatie Plan

### Week 1: Quick Wins
**Dag 1-2: Simple HTML GUI**
```bash
✅ Maak public/favorites.html
✅ Add single rider form
✅ Upload CSV/TXT file
✅ List favorites table
✅ Delete button per rider
✅ Manual sync button
```

**Dag 3: Smart Scheduler**
```bash
✅ Implementeer SmartScheduler class
✅ Update cron jobs
✅ Add API endpoints voor status
✅ Test manual override
```

### Week 2-3: Enhanced Features
**React Dashboard** (optioneel, als je meer wilt)
```bash
⏳ Setup Vite + React
⏳ Component library (shadcn/ui?)
⏳ Advanced filtering
⏳ Charts (race ratings over tijd)
⏳ Bulk operations UI
```

---

## 💡 Mijn Advies (Samenvatting)

### Voor **GUI (Vraag 1)**:
**Start met Optie A (HTML Dashboard)**
- ✅ Snel (4-6 uur)
- ✅ Geen dependencies
- ✅ Direct bruikbaar
- ✅ 80% van use cases gedekt

Later upgraden naar React als je:
- Complexere workflows nodig hebt
- Charts/visualisaties wilt
- Team van meerdere users heeft

### Voor **Automations (Vraag 2)**:
**Implementeer SmartScheduler (Hybrid)**
- ✅ Auto-sync met intelligente timing
- ✅ Manual trigger met auto-pause
- ✅ Voorkomt dubbele syncs
- ✅ Status endpoint voor monitoring

**Config in .env:**
```bash
# Automation settings
AUTO_SYNC_ENABLED=true
AUTO_SYNC_INTERVAL_MINUTES=15
MANUAL_SYNC_PAUSE_MINUTES=30
PRIORITY1_SYNC_INTERVAL_MINUTES=15
PRIORITY2_SYNC_INTERVAL_MINUTES=60
```

---

## 🚀 Volgende Stap

Wil je dat ik:
1. **Optie A implementeer** (HTML dashboard - klaar in 1 sessie)
2. **SmartScheduler implementeer** (intelligent automation - klaar in 1 sessie)
3. **Beide** (complete oplossing - klaar vandaag)
4. **React setup** (voor later, meer tijd nodig)

Wat heeft je voorkeur?
