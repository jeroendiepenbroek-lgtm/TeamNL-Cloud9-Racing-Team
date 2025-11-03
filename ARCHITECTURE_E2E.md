# 🏗️ Architecture E2E - TeamNL Cloud9 Racing Dashboard

**Status**: Production-ready zero-cost deployment  
**Last Updated**: 1 november 2025

## 📊 Overzicht: End-to-End Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNE DATA BRONNEN                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ZwiftRacing.app API (zwift-ranking.herokuapp.com)              │
│  • Club data (11818 - TeamNL)                                   │
│  • Rider profiles & rankings                                    │
│  • Race results & events                                        │
│  Rate Limits: 1 req/60min (club), 5 req/min (riders)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND - GitHub Actions (Serverless)              │
│  Location: .github/workflows/autonomous-sync.yml                │
│  • Schedule: Cron "0 * * * *" (elk uur)                         │
│  • Scripts: sync-club.ts, sync-rider.ts, scrape-events.ts      │
│  • Rate limiting: Built-in delays                               │
│  Cost: €0/maand (3000 min/maand met GitHub Pro)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               DATABASE - Supabase (PostgreSQL)                  │
│  URL: https://bktbeefdmrpxhsyyalvc.supabase.co                  │
│  • Tables: riders, clubs, events, race_results, etc.           │
│  • Row Level Security (RLS): Enabled                            │
│  • Realtime: Disabled (niet nodig)                              │
│  Cost: €0/maand (500MB storage, 2GB bandwidth)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            FRONTEND - Vercel (React + Vite)                     │
│  URL: https://team-nl-cloud9-racing-team.vercel.app             │
│  • Dashboard: Rider rankings & club stats                       │
│  • Data Viewer: Supabase Studio links                           │
│  • Upload: CSV/TXT rider ID import                              │
│  • Sync Settings: GitHub Actions configuratie                   │
│  Cost: €0/maand (100GB bandwidth)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GEBRUIKERS (Browsers)                        │
│  • TeamNL leden (view rankings)                                 │
│  • Admins (upload riders, view data)                            │
│  • Coaches (analyze performance)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Detailed E2E Flow

### Flow 1: Automatische Data Sync (Hourly)

```
1. GitHub Actions Trigger
   ├─ Cron: "0 * * * *" (elk uur)
   ├─ Checkout repo
   ├─ Install dependencies (npm ci)
   └─ Generate Prisma client

2. Database Migration
   ├─ Run: npx prisma migrate deploy
   └─ Ensure schema up-to-date

3. Sync Club Members
   ├─ Script: scripts/sync-club.ts
   ├─ API Call: GET /public/clubs/11818
   ├─ Rate Limit: 1 req/60min
   ├─ Upsert: clubs table
   └─ Upsert: club_roster table

4. Sync Individual Riders (Batch)
   ├─ Script: scripts/sync-rider.ts
   ├─ Get: All rider IDs from club_roster
   ├─ Batch: 50 riders per run (rate limit safe)
   ├─ API Call: GET /public/rider/{id} (5 req/min max)
   ├─ Delay: 2 seconds tussen requests
   └─ Upsert: riders table (profile, ranking, category)

5. Scrape Events (Optional)
   ├─ Script: scripts/scrape-events.ts
   ├─ Enabled: EVENT_SCRAPING_ENABLED=true
   ├─ Days: EVENT_SCRAPING_DAYS=90 (default)
   ├─ Per Rider: Scrape ZwiftRacing.app HTML
   ├─ Parse: Event ID, name, date, results
   ├─ Upsert: events table
   └─ Upsert: race_results table (position, watts, time)

6. Statistics Output
   ├─ Script: scripts/get-stats.ts
   ├─ Count: riders, clubs, events, race_results
   └─ Log: JSON output naar GitHub Actions logs

7. Success/Failure
   ├─ Success: Green checkmark in Actions tab
   ├─ Failure: Email notificatie (GitHub settings)
   └─ Logs: Viewable in Actions → Workflow run
```

**Cost per Run**: €0 (gratis binnen GitHub Pro limits)  
**Execution Time**: ~5-10 minuten (afhankelijk van rider count)  
**Data Freshness**: Max 1 uur oud

---

### Flow 2: Handmatige Upload via Frontend

```
1. User Action (Browser)
   ├─ Navigeer: https://team-nl-cloud9-racing-team.vercel.app
   ├─ Tab: "Upload"
   ├─ Paste: Rider IDs (newline-separated)
   │   Example:
   │   150437
   │   123456
   │   789012
   └─ Click: "Upload Riders"

2. Frontend Processing
   ├─ Parse: Split by newline, trim whitespace
   ├─ Validate: Check numeric IDs only
   └─ Batch: Group in chunks of 50

3. Direct Supabase Calls (No Backend!)
   ├─ For each rider ID:
   │   ├─ Fetch: ZwiftRacing API /public/rider/{id}
   │   ├─ Transform: Map API response to DB schema
   │   └─ Upsert: supabase.from('riders').upsert(...)
   ├─ Rate Limiting: 2 second delay tussen calls
   └─ Progress: UI toont "Syncing 3/50..."

4. Multi-Club Detection
   ├─ Extract: Club ID from rider data
   ├─ If new club:
   │   ├─ Fetch: /public/clubs/{clubId}
   │   ├─ Upsert: clubs table
   │   └─ Upsert: club_roster table
   └─ Update: Rider's clubId field

5. UI Feedback
   ├─ Success: "Synced 50 riders across 3 clubs"
   ├─ Error: "Failed: Invalid rider ID 999999"
   └─ Auto-refresh: Dashboard updates met nieuwe data
```

**Cost per Upload**: €0 (Supabase free tier: 2GB bandwidth/maand)  
**Execution Time**: ~2 minuten voor 50 riders  
**Concurrency**: 1 request tegelijk (rate limit safe)

---

### Flow 3: Data Viewing via Supabase Studio

```
1. User Action (Browser)
   ├─ Tab: "Data"
   └─ Click: "Table Editor" link

2. Redirect to Supabase Studio
   ├─ URL: https://bktbeefdmrpxhsyyalvc.supabase.co/project/.../editor
   ├─ Authentication: Email login (admin access)
   └─ Tables: riders, clubs, events, race_results, etc.

3. Table Operations (Supabase UI)
   ├─ View: All rows met filters & sorting
   ├─ Edit: Inline editing (double-click cel)
   ├─ Add: New row via "Insert row" button
   ├─ Delete: Select rows → Delete
   ├─ Export: CSV download (hele tabel)
   └─ SQL Editor: Custom queries

4. Common Queries (Frontend "Data" Tab)
   ├─ Top 20 riders: SELECT * FROM riders ORDER BY ranking ASC LIMIT 20
   ├─ Recent events: SELECT * FROM events WHERE event_date > NOW() - INTERVAL '30 days'
   ├─ Club stats: SELECT club_name, COUNT(*) FROM riders GROUP BY club_id
   └─ Race results: SELECT * FROM race_results WHERE rider_id = 150437
```

**Cost**: €0 (Supabase Studio gratis included)  
**Features**: Full CRUD, SQL editor, CSV export, API docs  
**Alternative**: Frontend "Dashboard" tab voor user-friendly view

---

### Flow 4: Sync Configuration via Frontend

```
1. User Action (Browser)
   ├─ Tab: "Sync"
   └─ Configure:
       ├─ Sync Interval: 1-24 hours (default: 1)
       ├─ Cron Schedule: "0 * * * *" (examples provided)
       ├─ Event Scraping: true/false (default: false)
       └─ Scraping Days: 7-365 (default: 90)

2. Generate GitHub Secrets Format
   ├─ Click: "Save Configuration"
   └─ Output:
       SYNC_INTERVAL_HOURS=2
       SYNC_CRON_SCHEDULE="0 */2 * * *"
       EVENT_SCRAPING_ENABLED=true
       EVENT_SCRAPING_DAYS=90

3. Manual GitHub Setup
   ├─ Copy: Output to clipboard
   ├─ GitHub: Settings → Secrets → Actions
   ├─ Update: Each secret individually
   └─ Workflow: Auto-picks up new values on next run

4. Verification
   ├─ GitHub Actions: Check next scheduled run
   ├─ Logs: Verify new settings applied
   └─ Frontend: "Data" tab shows updated timestamps
```

**Cost**: €0 (GitHub Secrets gratis)  
**Update Time**: Instant (next workflow run)  
**Rollback**: Edit secrets terug naar oude waarden

---

## 🎯 Best Practices per Applicatie

### 1. Backend (GitHub Actions)

#### ✅ Do's
```yaml
# Rate limiting - ALWAYS delay tussen API calls
await new Promise(resolve => setTimeout(resolve, 2000)); // 2 sec

# Error handling - Continue bij fout (1 rider fail ≠ hele batch fail)
try {
  await syncRider(riderId);
} catch (error) {
  console.error(`Failed ${riderId}:`, error.message);
  // Continue to next rider
}

# Idempotency - Upserts i.p.v. inserts
await prisma.rider.upsert({
  where: { zwiftId: riderId },
  update: { ...newData },
  create: { ...newData }
});

# Batch processing - Kleine chunks voor rate limits
const BATCH_SIZE = 50;
for (let i = 0; i < riderIds.length; i += BATCH_SIZE) {
  const batch = riderIds.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}

# Logging - Structured output voor debugging
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  action: 'sync_club',
  clubId: 11818,
  riderCount: 150,
  duration: 45.2
}));

# Secrets - Gebruik GitHub Secrets (NEVER hardcode)
const SUPABASE_URL = process.env.SUPABASE_URL;
const API_KEY = process.env.ZWIFT_API_KEY;
```

#### ❌ Don'ts
```yaml
# ❌ Blocking API calls zonder delays
await Promise.all(riderIds.map(id => syncRider(id))); // Rate limit breach!

# ❌ Throw errors die hele workflow stoppen
if (!rider) throw new Error('Rider not found'); // ❌

# ❌ Hardcoded secrets in code
const API_KEY = '650c6d2fc4ef6858d74cbef1'; // ❌ SECURITY RISK

# ❌ Lange workflows zonder checkpoints
// ✅ Better: Split in meerdere jobs met dependencies
jobs:
  sync-clubs:
    runs-on: ubuntu-latest
    steps: [...]
  
  sync-riders:
    needs: sync-clubs # Wait for clubs to finish
    runs-on: ubuntu-latest
    steps: [...]

# ❌ Ignore API response validation
const data = await response.json(); // ❌ Kan crash geven
const data = RiderSchema.parse(await response.json()); // ✅ Zod validation
```

#### 🚀 Performance Tips
```typescript
// Parallel processing (safe binnen rate limits)
const CONCURRENT_REQUESTS = 3; // Max 5/min = 1 per 12 sec, so 3 is safe
const chunks = chunk(riderIds, CONCURRENT_REQUESTS);

for (const chunk of chunks) {
  await Promise.all(chunk.map(id => syncRider(id)));
  await sleep(15000); // 15 sec tussen chunks
}

// Incremental sync - Only sync changed data
const lastSync = await getLastSyncTimestamp();
const recentRiders = await prisma.rider.findMany({
  where: { updatedAt: { gt: lastSync } }
});

// Caching - Store frequently accessed data
const clubs = new Map<number, Club>();
async function getClub(clubId: number) {
  if (!clubs.has(clubId)) {
    clubs.set(clubId, await fetchClubFromAPI(clubId));
  }
  return clubs.get(clubId);
}
```

---

### 2. Database (Supabase PostgreSQL)

#### ✅ Do's
```sql
-- Indexes - Voor vaak-gebruikte queries
CREATE INDEX idx_riders_ranking ON riders(ranking);
CREATE INDEX idx_riders_club ON riders(club_id);
CREATE INDEX idx_events_date ON events(event_date DESC);

-- Constraints - Data integriteit
ALTER TABLE riders 
  ADD CONSTRAINT fk_riders_club 
  FOREIGN KEY (club_id) REFERENCES clubs(id);

-- Partitioning - Voor grote event tables (> 1M rows)
CREATE TABLE race_results_2024 PARTITION OF race_results
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Views - Vaak-gebruikte joins
CREATE VIEW rider_stats AS
SELECT 
  r.zwift_id,
  r.name,
  r.ranking,
  c.club_name,
  COUNT(rr.id) as race_count,
  AVG(rr.watts_per_kg) as avg_watts
FROM riders r
LEFT JOIN clubs c ON r.club_id = c.id
LEFT JOIN race_results rr ON r.zwift_id = rr.rider_id
GROUP BY r.zwift_id, r.name, r.ranking, c.club_name;

-- Row Level Security - Alleen reads publiek
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON riders
  FOR SELECT USING (true);

CREATE POLICY "Allow service role write" ON riders
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

#### ❌ Don'ts
```sql
-- ❌ SELECT * zonder LIMIT (kan OOM geven)
SELECT * FROM race_results; -- 500K+ rows!

-- ✅ Better: Pagination
SELECT * FROM race_results 
ORDER BY event_date DESC 
LIMIT 100 OFFSET 0;

-- ❌ N+1 queries (slow)
-- Bad: For each rider, fetch club separately
FOR rider IN (SELECT * FROM riders) LOOP
  SELECT * FROM clubs WHERE id = rider.club_id;
END LOOP;

-- ✅ Better: JOIN
SELECT r.*, c.club_name 
FROM riders r
LEFT JOIN clubs c ON r.club_id = c.id;

-- ❌ Cascade DELETE zonder foreign keys
DELETE FROM clubs WHERE id = 11818; 
-- Orphaned riders blijven!

-- ✅ Better: Foreign key met ON DELETE CASCADE
ALTER TABLE riders
  ADD CONSTRAINT fk_riders_club
  FOREIGN KEY (club_id) REFERENCES clubs(id)
  ON DELETE CASCADE;

-- ❌ Store JSON als TEXT
ALTER TABLE events ADD COLUMN metadata TEXT; -- ❌

-- ✅ Better: Use JSONB
ALTER TABLE events ADD COLUMN metadata JSONB;
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
```

#### 🚀 Performance Tips
```sql
-- Materialized views voor expensive queries
CREATE MATERIALIZED VIEW rider_leaderboard AS
SELECT 
  r.*,
  ROW_NUMBER() OVER (ORDER BY r.ranking ASC) as position,
  COUNT(rr.id) as total_races
FROM riders r
LEFT JOIN race_results rr ON r.zwift_id = rr.rider_id
GROUP BY r.id;

-- Refresh hourly (via cron of GitHub Actions)
REFRESH MATERIALIZED VIEW CONCURRENTLY rider_leaderboard;

-- Partial indexes - Alleen actieve riders
CREATE INDEX idx_active_riders 
ON riders(ranking) 
WHERE is_active = true AND ranking IS NOT NULL;

-- EXPLAIN ANALYZE - Check query performance
EXPLAIN ANALYZE
SELECT * FROM riders 
WHERE club_id = 11818 
ORDER BY ranking ASC;

-- Vacuum - Cleanup deleted rows (weekly)
VACUUM ANALYZE riders;
```

---

### 3. Frontend (React + Vite)

#### ✅ Do's
```typescript
// Component structuur - Kleine, herbruikbare components
// ✅ Good
const RiderCard = ({ rider }: { rider: Rider }) => (
  <div className="rider-card">
    <h3>{rider.name}</h3>
    <p>Ranking: {rider.ranking}</p>
  </div>
);

// ❌ Bad: Monolithic component
const Dashboard = () => {
  // 500 lines of code...
};

// State management - Gebruik Supabase realtime (optional)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const [riders, setRiders] = useState<Rider[]>([]);

useEffect(() => {
  // Initial fetch
  supabase.from('riders').select('*').then(({ data }) => setRiders(data));

  // Subscribe to changes (optional - not recommended voor large tables)
  const channel = supabase
    .channel('riders-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'riders' },
      (payload) => {
        console.log('Change:', payload);
        // Update local state
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, []);

// Error boundaries - Catch component crashes
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <Dashboard />
</ErrorBoundary>

// Lazy loading - Code splitting
const AdminPanel = lazy(() => import('./components/AdminPanel'));

<Suspense fallback={<div>Loading...</div>}>
  <AdminPanel />
</Suspense>

// Environment variables - Prefix met VITE_
// .env
VITE_SUPABASE_URL=https://...
VITE_API_KEY=secret123

// Code
const url = import.meta.env.VITE_SUPABASE_URL;
```

#### ❌ Don'ts
```typescript
// ❌ Direct API calls zonder error handling
const data = await fetch('/api/riders').then(r => r.json());
// Crash if network error!

// ✅ Better: Try-catch + loading state
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

try {
  setLoading(true);
  const data = await fetch('/api/riders').then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
  setRiders(data);
} catch (err) {
  setError(err as Error);
} finally {
  setLoading(false);
}

// ❌ Props drilling (passing props 5 levels deep)
<Dashboard>
  <Stats user={user}>
    <RiderList user={user}>
      <RiderCard user={user} /> {/* ❌ user prop passed 3 levels */}
    </RiderList>
  </Stats>
</Dashboard>

// ✅ Better: Context API
const UserContext = createContext<User | null>(null);

<UserContext.Provider value={user}>
  <Dashboard />
</UserContext.Provider>

// In RiderCard:
const user = useContext(UserContext);

// ❌ Inline styles (no reusability)
<div style={{ color: 'red', fontSize: '16px' }}>...</div>

// ✅ Better: CSS classes of styled-components
<div className="error-text">...</div>
// or
const ErrorText = styled.div`
  color: red;
  font-size: 16px;
`;

// ❌ useEffect zonder dependency array
useEffect(() => {
  fetchRiders(); // Runs on EVERY render!
});

// ✅ Better: Specify dependencies
useEffect(() => {
  fetchRiders();
}, []); // Only on mount

// ❌ Store secrets in frontend code
const API_KEY = 'secret123'; // ❌ EXPOSED IN BUNDLE!

// ✅ Better: Use public/anon keys only
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY; // ✅ Safe
```

#### 🚀 Performance Tips
```typescript
// Memoization - Cache expensive calculations
import { useMemo } from 'react';

const sortedRiders = useMemo(() => {
  return riders.sort((a, b) => a.ranking - b.ranking);
}, [riders]); // Only recalculate when riders change

// Debouncing - Limit API calls tijdens typing
import { useState, useEffect } from 'react';

const [searchTerm, setSearchTerm] = useState('');
const [debouncedTerm, setDebouncedTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
  return () => clearTimeout(timer);
}, [searchTerm]);

useEffect(() => {
  if (debouncedTerm) {
    searchRiders(debouncedTerm);
  }
}, [debouncedTerm]);

// Virtual scrolling - Render only visible rows
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={riders.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <RiderCard rider={riders[index]} />
    </div>
  )}
</FixedSizeList>

// Image optimization - Lazy load + compression
<img 
  src={rider.avatar} 
  loading="lazy" 
  alt={rider.name}
  width={50}
  height={50}
/>

// Bundle size - Check met Vite
// npm run build
// Check dist/assets/*.js size
// Use dynamic imports for large dependencies
const Recharts = lazy(() => import('recharts'));
```

---

## 🤔 Is Dit de Beste Oplossing?

### ✅ Voordelen Huidige Architectuur

#### 1. **Zero-Cost** (€0/maand)
- GitHub Actions: Gratis met GitHub Pro (3000 min/maand)
- Supabase: Gratis tier (500MB DB, 2GB bandwidth)
- Vercel: Gratis hobby tier (100GB bandwidth)
- **Total**: €0 vs €50+/maand voor Railway/Render/AWS

#### 2. **Serverless = Schaalbaar**
- Backend: GitHub Actions schaalt automatisch
- Database: Supabase schaalt met je (gratis → paid seamless)
- Frontend: Vercel CDN wereldwijd
- **Geen** servers om te beheren/patchen/monitoren

#### 3. **Git-Native Workflow**
- Code + deployment in 1 repo
- PR previews automatisch (Vercel)
- Rollback = `git revert` + push
- CI/CD ingebouwd

#### 4. **Modulair & Incrementeel**
```
├── Backend (GitHub Actions)
│   ├── scripts/sync-club.ts       ← Standalone
│   ├── scripts/sync-rider.ts      ← Standalone
│   ├── scripts/scrape-events.ts   ← MVP feature (toggle on/off)
│   └── scripts/get-stats.ts       ← Monitoring
│
├── Database (Supabase)
│   ├── Schema migrations (Prisma) ← Version controlled
│   └── Seed data (SQL scripts)    ← Reproducible
│
└── Frontend (React)
    ├── components/Dashboard.tsx   ← Feature 1
    ├── components/DataViewer.tsx  ← Feature 2
    ├── components/AdminPanel.tsx  ← Feature 3
    └── components/SyncSettings.tsx← Feature 4
```

Elke component/script is **onafhankelijk** - je kunt features toevoegen zonder bestaande code te breken.

#### 5. **Type-Safe End-to-End**
```typescript
// Database schema → TypeScript types (auto-generated)
import { Rider, Club, Event } from '@prisma/client';

// API responses → Zod validation
const RiderSchema = z.object({
  riderId: z.number(),
  name: z.string(),
  // ...
});

// Frontend → TypeScript components
const RiderCard = ({ rider }: { rider: Rider }) => { /*...*/ };
```

**Geen runtime errors** door type mismatches!

---

### ❌ Nadelen & Trade-offs

#### 1. **GitHub Actions Limitations**
```yaml
Limits:
  - Max execution time: 6 uur per job
  - Max concurrent jobs: 20 (free) / 180 (Pro)
  - Max monthly minutes: 3000 (Pro)
  
Impact:
  - Niet geschikt voor real-time sync (alleen scheduled)
  - Niet geschikt voor user-triggered workflows (use frontend direct calls)
  - Niet geschikt voor > 1000 riders (execution time)

Solution:
  - Voor real-time: Gebruik Vercel Serverless Functions (€0 tot 100K invocations/maand)
  - Voor large datasets: Split in meerdere jobs (parallel)
```

#### 2. **Supabase Free Tier Limits**
```yaml
Limits:
  - 500MB database storage
  - 2GB bandwidth/maand
  - 1GB file storage
  - No backups (paid feature)
  
Impact:
  - ~5000 riders met history = ~300MB
  - 10K API requests/maand = ~1GB bandwidth
  - Geen automatic daily backups
  
Solution:
  - Export data weekly via Supabase Studio (CSV)
  - Upgrade naar Pro ($25/maand) als limits bereikt
  - Archive oude race_results (> 1 jaar oud)
```

#### 3. **Frontend Direct Database Access**
```yaml
Security Concern:
  - Frontend heeft SUPABASE_ANON_KEY (public)
  - Users kunnen direct database queries runnen (via browser DevTools)
  
Mitigation:
  - Row Level Security (RLS) policies enabled
  - Anon key heeft alleen read access (via RLS)
  - Writes via service_role key (GitHub Actions only)
  
Trade-off:
  - Upload feature vereist anon key write access
  - Solution: Custom endpoint via Vercel Serverless Function met rate limiting
```

#### 4. **Geen Backend API Endpoints**
```yaml
Missing:
  - REST API voor externe integraties
  - Authentication/Authorization middleware
  - Custom business logic endpoints
  
Impact:
  - Andere apps kunnen niet integreren
  - Geen API docs (Swagger/OpenAPI)
  
Solution (indien nodig):
  - Voeg Vercel Serverless Functions toe (api/*)
  - Of: Bouw Express backend op Railway (add €5/maand)
```

---

### 🏆 Alternatieven Vergelijking

#### Optie A: Huidige Setup (Zero-Cost)
```yaml
Stack:
  Backend: GitHub Actions (Serverless)
  Database: Supabase (PostgreSQL)
  Frontend: Vercel (React + Vite)

Cost: €0/maand

Pros:
  ✅ Zero cost tot 5K+ riders
  ✅ Git-native deployment
  ✅ Schaalbaar (pay-as-you-grow)
  ✅ Type-safe (Prisma + TypeScript)
  ✅ Modulair (scripts + components)

Cons:
  ❌ Scheduled sync only (no realtime)
  ❌ Geen API endpoints
  ❌ Geen auth (publiek viewable)
  ❌ Limited to 3000 min/maand (GitHub)

Best For:
  ✅ MVP/prototype
  ✅ Personal projects
  ✅ Small teams (< 100 users)
  ✅ Read-heavy workloads
```

#### Optie B: Serverless Functions (Low-Cost)
```yaml
Stack:
  Backend: Vercel Serverless Functions (Node.js)
  Database: Supabase (PostgreSQL)
  Frontend: Vercel (React + Vite)

Cost: €0-€20/maand (100K-1M invocations)

Changes vs Current:
  + Add: api/sync-rider.ts (Vercel Function)
  + Add: api/upload-riders.ts (rate limited)
  + Add: api/get-stats.ts (cached response)
  - Remove: GitHub Actions workflows

Pros:
  ✅ Real-time sync (user-triggered)
  ✅ API endpoints available
  ✅ Better rate limiting
  ✅ Same zero-cost tier voor MVP

Cons:
  ❌ Scheduled sync vereist Vercel Cron (paid)
  ❌ Cold start latency (~1 sec)
  ❌ Execution time limit (10 sec free, 60 sec paid)

Best For:
  ✅ User-triggered actions (upload, search)
  ✅ API integrations nodig
  ✅ < 100K requests/maand (gratis)
```

#### Optie C: Traditional Backend (Medium-Cost)
```yaml
Stack:
  Backend: Express.js op Railway (Always-on server)
  Database: Railway PostgreSQL (or Supabase)
  Frontend: Vercel (React + Vite)

Cost: €5-€10/maand (Railway Hobby tier)

Changes vs Current:
  + Add: Express server (src/server.ts)
  + Add: REST API routes (src/api/routes.ts)
  + Add: Cron jobs (node-cron in server)
  + Add: Authentication middleware
  - Remove: GitHub Actions
  - Remove: Direct Supabase calls from frontend

Pros:
  ✅ Full-featured REST API
  ✅ Real-time sync (cron + webhooks)
  ✅ Authentication/Authorization
  ✅ No execution time limits
  ✅ Stateful (websockets, sessions)

Cons:
  ❌ €5-€10/maand cost
  ❌ Server maintenance (patches, monitoring)
  ❌ Scaling vereist manual intervention
  ❌ Not serverless (always-on)

Best For:
  ✅ Production apps (> 1000 users)
  ✅ Complex business logic
  ✅ Requires authentication
  ✅ Requires webhooks/websockets
```

#### Optie D: Monolithic Next.js (Balanced)
```yaml
Stack:
  Backend: Next.js API Routes + Server Components (Vercel)
  Database: Supabase (PostgreSQL)
  Frontend: Next.js (React)

Cost: €0-€20/maand (same as Optie B)

Changes vs Current:
  + Migrate: Vite → Next.js 14
  + Add: Server Components (SSR)
  + Add: app/api/* routes (API endpoints)
  + Add: Server Actions (form submissions)
  - Remove: Separate frontend/backend repos

Pros:
  ✅ Single codebase (frontend + backend)
  ✅ Server-side rendering (SEO)
  ✅ API routes built-in
  ✅ Type-safe tRPC integration (optional)
  ✅ Same Vercel zero-cost tier

Cons:
  ❌ Steeper learning curve (App Router)
  ❌ Vendor lock-in (Vercel-specific features)
  ❌ Harder to test (SSR components)
  ❌ Migration effort (Vite → Next.js)

Best For:
  ✅ New projects (not migration)
  ✅ SEO-critical apps
  ✅ Prefer single framework
  ✅ Want type-safe API (tRPC)
```

---

## 🎯 Aanbeveling: Hybride Aanpak (Incrementeel)

### Phase 1: MVP (Current - €0/maand) ✅
```yaml
Focus: Proof of concept, basic features
Stack: GitHub Actions + Supabase + Vercel

Keep:
  ✅ GitHub Actions voor scheduled sync (hourly)
  ✅ Supabase direct access (RLS policies)
  ✅ Frontend upload (direct Supabase calls)

Timeline: Done! (current state)
```

### Phase 2: Add Serverless API (€0-€5/maand)
```yaml
Focus: User-triggered actions, rate limiting
Stack: + Vercel Serverless Functions

Add:
  + api/upload-riders.ts (rate limited, max 50/day per user)
  + api/sync-rider.ts (on-demand sync voor 1 rider)
  + api/get-leaderboard.ts (cached, refresh elke 5 min)

Keep:
  ✅ GitHub Actions voor bulk sync (hourly)
  ✅ Supabase direct access voor reads

Changes:
  - Upload feature: Frontend → API route (betere rate limiting)
  - Leaderboard: Cached API response (sneller)

Timeline: 1-2 dagen development
Cost: €0 (< 100K invocations/maand)
```

### Phase 3: Add Authentication (€0-€10/maand)
```yaml
Focus: Private features, admin panel
Stack: + Supabase Auth (or Clerk.com)

Add:
  + Supabase Auth (email/password, GitHub OAuth)
  + Admin dashboard (alleen voor coaches)
  + Private rider profiles
  + User favorites/watchlist

Keep:
  ✅ Public leaderboard (no auth required)
  ✅ GitHub Actions scheduled sync

Changes:
  - RLS policies: Auth-based (users can only edit own data)
  - Frontend: Login page, protected routes

Timeline: 2-3 dagen development
Cost: €0 (Supabase Auth gratis tot 10K users)
```

### Phase 4: Advanced Features (€10-€25/maand)
```yaml
Focus: Real-time updates, webhooks, analytics
Stack: + Supabase Realtime, Vercel Analytics

Add:
  + Realtime leaderboard (live updates)
  + Webhook endpoints (Zwift event triggers)
  + Performance analytics (Vercel Analytics)
  + Custom domain (teamnl-racing.nl)

Keep:
  ✅ All previous features

Changes:
  - Upgrade Supabase → Pro ($25/maand) voor realtime + backups
  - Upgrade Vercel → Pro ($20/maand) voor analytics + team features

Timeline: 1 week development
Cost: €25-€45/maand (Supabase Pro + Vercel Pro)
```

---

## 📝 Conclusie: Is Dit de Beste Oplossing?

### Voor MVP/Prototyping: **JA! ✅**
```yaml
Redenen:
  ✅ Zero cost = geen risico
  ✅ Snel deployed (vandaag live!)
  ✅ Modulair = makkelijk te extenden
  ✅ Type-safe = minder bugs
  ✅ Git-native = easy rollback

Limitaties:
  ⚠️ Scheduled sync only (no realtime)
  ⚠️ Publiek viewable (no auth)
  ⚠️ Basis features (no advanced analytics)
```

### Voor Productie (> 1000 users): **Overweeg Optie B of C**
```yaml
Waarom:
  - Real-time sync vereist (Optie B: Serverless Functions)
  - Authentication vereist (Optie C: Backend + Auth)
  - Advanced features (Optie D: Next.js)

Migratie Path:
  Phase 1 → Phase 2 → Phase 3 → Phase 4 (incrementeel)
  
Cost Evolution:
  €0 → €5 → €10 → €25/maand
```

### Modulair & Incrementeel Ontwikkelen: **PERFECT! ✅**
```yaml
Huidige Setup Ondersteunt:
  ✅ Feature toggles (EVENT_SCRAPING_ENABLED)
  ✅ Standalone scripts (scripts/*.ts)
  ✅ Component-based frontend (src/components/*)
  ✅ Database migrations (prisma/migrations/*)
  ✅ Environment-based config (.env.*)

Toevoegen van Features:
  1. Create new script (scripts/new-feature.ts)
  2. Add to workflow (.github/workflows/autonomous-sync.yml)
  3. Add environment toggle (NEW_FEATURE_ENABLED=false)
  4. Test locally (npx tsx scripts/new-feature.ts)
  5. Push to GitHub (auto-deployed)
  
Verwijderen van Features:
  1. Set toggle to false (NEW_FEATURE_ENABLED=false)
  2. Or: Remove from workflow
  3. Or: Delete script (git rm scripts/old-feature.ts)
```

---

## 🚀 Next Steps (Aanbevolen)

### Week 1: Test & Monitor
```bash
1. Test upload feature (50 riders)
2. Monitor GitHub Actions logs (check succes rate)
3. Check Supabase usage (storage + bandwidth)
4. Collect user feedback
```

### Week 2: Optimalisaties
```bash
1. Add caching voor leaderboard (Vercel Edge Config)
2. Optimize database queries (add indexes)
3. Add error boundaries in frontend
4. Setup monitoring (Sentry or LogRocket)
```

### Week 3-4: Feature Development
```bash
1. Add rider detail pages (click on name → full profile)
2. Add filters (by club, category, ranking range)
3. Add search (autocomplete rider names)
4. Add export feature (CSV download)
```

### Month 2+: Scale & Enhance
```bash
1. Migrate to Optie B (Serverless API) als needed
2. Add authentication (Supabase Auth)
3. Add advanced analytics (performance trends)
4. Custom domain (teamnl-racing.nl)
```

---

**TL;DR**: Huidige setup is **perfect voor MVP en incrementele ontwikkeling**. Zero-cost, modulair, type-safe, en makkelijk te extenden. Start hier, scale later naar Serverless Functions (Optie B) of Backend (Optie C) als je meer features nodig hebt. 🎯
