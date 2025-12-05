# 🏁 RACING MATRIX DASHBOARD - Frontend Data Specification

**Versie**: 1.0 Definitief  
**Datum**: 5 december 2025  
**Status**: Ready for Implementation

---

## 📊 OVERZICHT

**Data Source**: Supabase `riders_unified` via Backend API  
**Update Frequency**: Real-time (via polling of websockets)  
**Primary Metric**: vELO Rating + Power Curves

```
┌────────────────────────────────────────────────────────────────────┐
│                    RACING MATRIX DASHBOARD                         │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  TEAM OVERVIEW (Header Stats)                                │ │
│  │  • Total Team Members: 75                                    │ │
│  │  • Average vELO: 1450.3                                      │ │
│  │  • Average FTP: 245W (3.2 w/kg)                              │ │
│  │  • Last Sync: 5 dec 2025, 22:05                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  RIDER LIST (Sortable Table)                                 │ │
│  │  ┌────────────────────────────────────────────────────────┐  │ │
│  │  │ Name  │ vELO │ Cat │ FTP │ 20m │ 5m │ 1m │ 15s │ 5s   │  │ │
│  │  ├────────────────────────────────────────────────────────┤  │ │
│  │  │ Rider │ 1450 │ B   │ 250 │ 270 │ 330│ 450│ 650 │ 850  │  │ │
│  │  │ ...   │ ...  │ ... │ ... │ ... │ ...│ ...│ ... │ ...  │  │ │
│  │  └────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  DETAILED VIEW (Click on rider)                              │ │
│  │  • Power Curve Chart (5s → 20min)                            │ │
│  │  • vELO Trend (30d)                                          │ │
│  │  • Phenotype Radar (Sprinter/Climber/Pursuiter/Puncheur)    │ │
│  │  • Race Stats (Wins/Podiums)                                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 DATA REQUIREMENTS

### 1. BACKEND API ENDPOINT

**Endpoint**: `GET /api/racing-matrix`  
**Method**: GET  
**Auth**: Optional (team members zijn public binnen app)

**Response Schema**:
```typescript
interface RacingMatrixResponse {
  success: boolean;
  data: {
    team_stats: TeamStats;
    riders: RiderMatrixData[];
  };
  meta: {
    total_riders: number;
    synced_riders: number;
    last_sync: string; // ISO timestamp
  };
}

interface TeamStats {
  total_members: number;
  average_velo: number;
  average_ftp: number;
  average_ftp_wkg: number;
  category_breakdown: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
}

interface RiderMatrixData {
  // Identity
  rider_id: number;
  name: string;
  
  // Categories
  zp_category: string;           // "A", "B", "C", "D", "E"
  age_category: string | null;   // "Vet", "Junior", "Senior"
  
  // vELO Stats
  velo_rating: number;
  velo_max_30d: number | null;
  velo_max_90d: number | null;
  velo_rank: string | null;
  
  // FTP
  ftp: number;
  weight_kg: number;
  ftp_wkg: number;               // Calculated: ftp / weight_kg
  
  // Power Curve (Watts)
  power_5s_w: number;
  power_15s_w: number;
  power_30s_w: number;
  power_1m_w: number;
  power_2m_w: number;
  power_5m_w: number;
  power_20m_w: number;
  
  // Power Curve (W/kg)
  power_5s_wkg: number;
  power_15s_wkg: number;
  power_30s_wkg: number;
  power_1m_wkg: number;
  power_2m_wkg: number;
  power_5m_wkg: number;
  power_20m_wkg: number;
  
  // Power Metrics
  critical_power: number | null;
  anaerobic_work_capacity: number | null;
  compound_score: number | null;
  
  // Phenotype Scores (0-100)
  phenotype_sprinter: number | null;
  phenotype_pursuiter: number | null;
  phenotype_puncheur: number | null;
  // phenotype_climber: number | null; // ❌ NOT YET IN DB
  
  // Race Stats
  race_wins: number;
  race_podiums: number;
  race_count_90d: number;
  
  // Profile
  avatar_url: string | null;
  club_name: string | null;
  
  // Meta
  last_synced: string; // ISO timestamp
}
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "team_stats": {
      "total_members": 75,
      "average_velo": 1450.3,
      "average_ftp": 245,
      "average_ftp_wkg": 3.2,
      "category_breakdown": {
        "A": 5,
        "B": 22,
        "C": 35,
        "D": 10,
        "E": 3
      }
    },
    "riders": [
      {
        "rider_id": 150437,
        "name": "JRøne  CloudRacer-9 @YT (TeamNL)",
        "zp_category": "C",
        "age_category": "Vet",
        "velo_rating": 1398.783,
        "velo_max_30d": null,
        "velo_max_90d": null,
        "velo_rank": "5",
        "ftp": 234,
        "weight_kg": 74,
        "ftp_wkg": 3.16,
        "power_5s_w": 650,
        "power_15s_w": 550,
        "power_30s_w": 480,
        "power_1m_w": 400,
        "power_2m_w": 340,
        "power_5m_w": 290,
        "power_20m_w": 258,
        "power_5s_wkg": 8.78,
        "power_15s_wkg": 7.43,
        "power_30s_wkg": 6.49,
        "power_1m_wkg": 5.41,
        "power_2m_wkg": 4.59,
        "power_5m_wkg": 3.92,
        "power_20m_wkg": 3.49,
        "critical_power": 290,
        "anaerobic_work_capacity": 18500,
        "compound_score": 85.3,
        "phenotype_sprinter": 92.8,
        "phenotype_pursuiter": 39.2,
        "phenotype_puncheur": 30.4,
        "race_wins": 0,
        "race_podiums": 4,
        "race_count_90d": 25,
        "avatar_url": null,
        "club_name": "TeamNL Cloud9",
        "last_synced": "2025-12-05T09:20:56.279Z"
      }
    ]
  },
  "meta": {
    "total_riders": 75,
    "synced_riders": 75,
    "last_sync": "2025-12-05T22:05:00Z"
  }
}
```

---

## 🗄️ DATABASE QUERY

### SQL Query (Backend Implementation)
```sql
-- Query voor Racing Matrix data
SELECT 
  -- Identity
  r.rider_id,
  r.name,
  
  -- Categories
  r.zp_category,
  r.age_category,
  
  -- vELO Stats
  r.velo_rating,
  r.velo_max_30d,
  r.velo_max_90d,
  r.velo_rank,
  
  -- FTP
  r.ftp,
  r.weight_kg,
  ROUND(r.ftp::numeric / r.weight_kg::numeric, 2) AS ftp_wkg,
  
  -- Power Curve (Watts)
  r.power_5s_w,
  r.power_15s_w,
  r.power_30s_w,
  r.power_1m_w,
  r.power_2m_w,
  r.power_5m_w,
  r.power_20m_w,
  
  -- Power Curve (W/kg)
  r.power_5s_wkg,
  r.power_15s_wkg,
  r.power_30s_wkg,
  r.power_1m_wkg,
  r.power_2m_wkg,
  r.power_5m_wkg,
  r.power_20m_wkg,
  
  -- Power Metrics
  r.critical_power,
  r.anaerobic_work_capacity,
  r.compound_score,
  
  -- Phenotype
  r.phenotype_sprinter,
  r.phenotype_pursuiter,
  r.phenotype_puncheur,
  
  -- Race Stats
  r.race_wins,
  r.race_podiums,
  r.race_count_90d,
  
  -- Profile
  r.avatar_url,
  r.club_name,
  
  -- Meta
  r.last_synced_zwift_racing AS last_synced

FROM riders_unified r
INNER JOIN my_team_members t ON t.rider_id = r.rider_id
WHERE r.is_team_member = true
ORDER BY r.velo_rating DESC NULLS LAST;
```

### Alternative: Use Existing View
```sql
-- Als view_my_team correcte JOIN heeft:
SELECT * FROM view_my_team
ORDER BY velo_rating DESC NULLS LAST;
```

---

## 🎨 FRONTEND COMPONENTS

### Component Hierarchy
```
RacingMatrixDashboard/
├── TeamStatsHeader.tsx          (Team overview stats)
├── RiderTable/
│   ├── RiderTableRow.tsx        (Single rider row)
│   ├── RiderTableHeader.tsx     (Sortable columns)
│   └── RiderTableFilters.tsx    (Category/name filters)
├── RiderDetailModal/
│   ├── PowerCurveChart.tsx      (7-point power curve)
│   ├── VeloTrendChart.tsx       (30d vELO trend)
│   ├── PhenotypeRadar.tsx       (4-axis radar chart)
│   └── RaceStatsCard.tsx        (Wins/podiums/races)
└── SyncStatusIndicator.tsx      (Last sync + refresh button)
```

---

## 📋 COMPONENT SPECIFICATIONS

### 1. TeamStatsHeader Component

**Props**:
```typescript
interface TeamStatsHeaderProps {
  stats: TeamStats;
  lastSync: string;
}
```

**Display**:
```
┌────────────────────────────────────────────────────────────┐
│  TEAM OVERVIEW                    Last Sync: 22:05 🔄      │
├────────────────────────────────────────────────────────────┤
│  👥 75 Members    📊 Avg vELO: 1450    ⚡ Avg FTP: 245W   │
│                                                            │
│  Categories:  A: 5  |  B: 22  |  C: 35  |  D: 10  |  E: 3 │
└────────────────────────────────────────────────────────────┘
```

**Data Fields**:
- `total_members` → "75 Members"
- `average_velo` → "Avg vELO: 1450"
- `average_ftp` → "Avg FTP: 245W"
- `average_ftp_wkg` → "(3.2 w/kg)"
- `category_breakdown` → Horizontal bar chart
- `last_sync` → "Last Sync: 22:05" + refresh button

---

### 2. RiderTable Component

**Props**:
```typescript
interface RiderTableProps {
  riders: RiderMatrixData[];
  onRiderClick: (riderId: number) => void;
  sortBy: SortColumn;
  sortDirection: 'asc' | 'desc';
  filters: {
    category?: string[];
    search?: string;
  };
}

type SortColumn = 'name' | 'velo_rating' | 'ftp' | 'power_20m_w' | 'power_5s_w';
```

**Table Columns** (Desktop):
| Column | Field | Width | Sortable | Format |
|--------|-------|-------|----------|--------|
| Avatar | `avatar_url` | 40px | ❌ | Image thumbnail |
| Name | `name` | 200px | ✅ | Text + club name subtitle |
| vELO | `velo_rating` | 80px | ✅ | `1450` |
| Cat | `zp_category` | 50px | ✅ | Badge (colored A/B/C/D/E) |
| FTP | `ftp` | 70px | ✅ | `245W` |
| FTP/kg | `ftp_wkg` | 70px | ✅ | `3.2 w/kg` |
| 20m | `power_20m_w` | 70px | ✅ | `270W` |
| 5m | `power_5m_w` | 70px | ✅ | `330W` |
| 1m | `power_1m_w` | 70px | ✅ | `450W` |
| 15s | `power_15s_w` | 70px | ✅ | `650W` |
| 5s | `power_5s_w` | 70px | ✅ | `850W` |
| Wins | `race_wins` | 60px | ✅ | `5 🏆` |
| Actions | - | 80px | ❌ | View Details button |

**Mobile Columns** (Responsive):
- Name + Avatar
- vELO + Category badge
- FTP (w + w/kg)
- View Details button

**Row Styling**:
```css
/* Category badge colors */
.category-A { background: #FF4444; } /* Red */
.category-B { background: #FFA500; } /* Orange */
.category-C { background: #FFD700; } /* Gold */
.category-D { background: #4CAF50; } /* Green */
.category-E { background: #2196F3; } /* Blue */

/* Row hover effect */
.rider-row:hover {
  background: rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

/* vELO trend indicator */
.velo-up { color: #4CAF50; } /* Green arrow ↑ */
.velo-down { color: #FF4444; } /* Red arrow ↓ */
```

**Filters**:
1. **Category Filter**: Multi-select checkboxes (A/B/C/D/E)
2. **Search**: Input field (filter by name, case-insensitive)
3. **Age Category**: Dropdown (All/Vet/Junior/Senior)

---

### 3. RiderDetailModal Component

**Props**:
```typescript
interface RiderDetailModalProps {
  rider: RiderMatrixData;
  onClose: () => void;
}
```

**Layout**:
```
┌────────────────────────────────────────────────────────────┐
│  [X] Close                                                 │
│                                                            │
│  👤 JRøne CloudRacer-9 @YT (TeamNL)                       │
│  Category: C  |  vELO: 1398  |  FTP: 234W (3.16 w/kg)    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  POWER CURVE CHART (Line Graph)                    │   │
│  │  X-axis: 5s, 15s, 30s, 1m, 2m, 5m, 20m            │   │
│  │  Y-axis: Watts                                      │   │
│  │  Legend: Absolute (W) + Relative (w/kg)            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌───────────────────┐  ┌───────────────────────────┐    │
│  │ PHENOTYPE RADAR   │  │  RACE STATS               │    │
│  │  4-axis:          │  │  🏆 Wins: 0               │    │
│  │  - Sprinter: 92.8 │  │  🥈 Podiums: 4            │    │
│  │  - Pursuiter: 39.2│  │  📊 Races (90d): 25       │    │
│  │  - Puncheur: 30.4 │  │  📈 vELO Rank: #5         │    │
│  │  - Climber: N/A   │  │                           │    │
│  └───────────────────┘  └───────────────────────────┘    │
│                                                            │
│  Last Synced: 5 dec 2025, 09:20                           │
└────────────────────────────────────────────────────────────┘
```

#### 3.1 PowerCurveChart (Line Chart)

**Library**: Recharts / Chart.js / D3.js

**Data Points**:
```typescript
const powerCurveData = [
  { duration: '5s', watts: rider.power_5s_w, wkg: rider.power_5s_wkg },
  { duration: '15s', watts: rider.power_15s_w, wkg: rider.power_15s_wkg },
  { duration: '30s', watts: rider.power_30s_w, wkg: rider.power_30s_wkg },
  { duration: '1m', watts: rider.power_1m_w, wkg: rider.power_1m_wkg },
  { duration: '2m', watts: rider.power_2m_w, wkg: rider.power_2m_wkg },
  { duration: '5m', watts: rider.power_5m_w, wkg: rider.power_5m_wkg },
  { duration: '20m', watts: rider.power_20m_w, wkg: rider.power_20m_wkg },
];
```

**Chart Config**:
- X-axis: Duration labels (5s → 20m)
- Y-axis (left): Watts (0-1000)
- Y-axis (right): W/kg (0-15)
- Lines: 2 lines (Watts in blue, W/kg in green)
- Tooltip: Show both values on hover
- Smooth curve interpolation

#### 3.2 PhenotypeRadar (Radar Chart)

**Library**: Recharts / Chart.js

**Data Points**:
```typescript
const phenotypeData = [
  { trait: 'Sprinter', value: rider.phenotype_sprinter || 0, fullMark: 100 },
  { trait: 'Pursuiter', value: rider.phenotype_pursuiter || 0, fullMark: 100 },
  { trait: 'Puncheur', value: rider.phenotype_puncheur || 0, fullMark: 100 },
  // { trait: 'Climber', value: rider.phenotype_climber || 0, fullMark: 100 }, // ❌ NOT YET
];
```

**Chart Config**:
- 3 axes (Sprinter, Pursuiter, Puncheur)
- Scale: 0-100
- Fill: Semi-transparent blue
- Grid lines: Every 25 points
- ⚠️ **NOTE**: Climber axis DISABLED tot database migration

#### 3.3 RaceStatsCard (Info Card)

**Display**:
```
┌─────────────────────────┐
│  RACE STATISTICS        │
├─────────────────────────┤
│  🏆 Wins: 0             │
│  🥈 Podiums: 4          │
│  🏁 Races (90d): 25     │
│  📈 vELO: 1398          │
│  🔝 Max (30d): -        │
│  🔝 Max (90d): -        │
│  📊 Rank: #5            │
└─────────────────────────┘
```

**Data Fields**:
- `race_wins` → "Wins: 0"
- `race_podiums` → "Podiums: 4"
- `race_count_90d` → "Races (90d): 25"
- `velo_rating` → "vELO: 1398"
- `velo_max_30d` → "Max (30d): 1420" (or "-" if null)
- `velo_max_90d` → "Max (90d): 1450" (or "-" if null)
- `velo_rank` → "Rank: #5"

---

### 4. SyncStatusIndicator Component

**Props**:
```typescript
interface SyncStatusProps {
  lastSync: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}
```

**Display**:
```
┌──────────────────────────────────┐
│  Last Sync: 5 dec 2025, 22:05   │
│  [🔄 Refresh]                    │
└──────────────────────────────────┘
```

**States**:
1. **Idle**: Gray 🔄 icon, clickable
2. **Refreshing**: Spinning 🔄 icon, disabled
3. **Success**: Green ✅ icon for 3s, then back to idle
4. **Error**: Red ❌ icon, show error message

**Behavior**:
- Click "Refresh" → Call `GET /api/racing-matrix` again
- Update timestamp when data refreshes
- Show toast notification on success/error

---

## 🔄 DATA FLOW & STATE MANAGEMENT

### React Query Implementation (Recommended)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch racing matrix data
export function useRacingMatrix() {
  return useQuery({
    queryKey: ['racing-matrix'],
    queryFn: async () => {
      const response = await fetch('/api/racing-matrix');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json() as Promise<RacingMatrixResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
  });
}

// Manual refresh mutation
export function useRefreshMatrix() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Trigger backend sync
      const response = await fetch('/api/team/sync/all', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate query to refetch data
      queryClient.invalidateQueries({ queryKey: ['racing-matrix'] });
    },
  });
}
```

### Component Usage

```typescript
function RacingMatrixDashboard() {
  const { data, isLoading, error } = useRacingMatrix();
  const { mutate: refresh, isLoading: isRefreshing } = useRefreshMatrix();
  const [selectedRider, setSelectedRider] = useState<number | null>(null);
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.success) return <ErrorMessage error="No data" />;
  
  const { team_stats, riders } = data.data;
  const { last_sync } = data.meta;
  
  return (
    <div className="racing-matrix-dashboard">
      <TeamStatsHeader stats={team_stats} lastSync={last_sync} />
      
      <SyncStatusIndicator 
        lastSync={last_sync}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />
      
      <RiderTable 
        riders={riders}
        onRiderClick={(id) => setSelectedRider(id)}
        sortBy="velo_rating"
        sortDirection="desc"
      />
      
      {selectedRider && (
        <RiderDetailModal
          rider={riders.find(r => r.rider_id === selectedRider)!}
          onClose={() => setSelectedRider(null)}
        />
      )}
    </div>
  );
}
```

---

## 🎨 STYLING & UX

### Color Palette (Category-based)
```css
:root {
  /* Category colors */
  --cat-a: #FF4444; /* Red - Elite */
  --cat-b: #FFA500; /* Orange - Strong */
  --cat-c: #FFD700; /* Gold - Intermediate */
  --cat-d: #4CAF50; /* Green - Developing */
  --cat-e: #2196F3; /* Blue - Beginner */
  
  /* Status colors */
  --velo-up: #4CAF50; /* Green */
  --velo-down: #FF4444; /* Red */
  --velo-neutral: #9E9E9E; /* Gray */
  
  /* Power curve colors */
  --power-watts: #2196F3; /* Blue */
  --power-wkg: #4CAF50; /* Green */
}
```

### Responsive Breakpoints
```css
/* Mobile: < 768px */
@media (max-width: 767px) {
  .rider-table {
    /* Show only: Avatar, Name, vELO, Cat, Actions */
  }
}

/* Tablet: 768px - 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .rider-table {
    /* Show: Avatar, Name, vELO, Cat, FTP, 20m, Actions */
  }
}

/* Desktop: > 1024px */
@media (min-width: 1025px) {
  .rider-table {
    /* Show all columns */
  }
}
```

### Loading States
1. **Initial Load**: Full-page skeleton loader
2. **Refresh**: Spinner on refresh button, table remains visible
3. **Sorting**: Instant (client-side, no loader)
4. **Filtering**: Instant (client-side, no loader)

### Error States
1. **Network Error**: Show retry button + error message
2. **No Data**: Show "No team members found" + add riders button
3. **Partial Data**: Show available data + warning banner
4. **Stale Data**: Show warning if `last_sync` > 24 hours

---

## ✅ IMPLEMENTATION CHECKLIST

### Backend (Node.js + Express)
- [ ] Create `GET /api/racing-matrix` endpoint
- [ ] Implement SQL query met JOIN op `my_team_members`
- [ ] Add calculated field `ftp_wkg`
- [ ] Add team stats aggregation (avg vELO, avg FTP, category breakdown)
- [ ] Add error handling (no riders, database down)
- [ ] Add caching (5 min cache)
- [ ] Test with rider 150437 data

### Frontend (React + TypeScript)
- [ ] Setup React Query
- [ ] Create `TeamStatsHeader` component
- [ ] Create `RiderTable` component
  - [ ] Sortable columns
  - [ ] Category filter
  - [ ] Search filter
- [ ] Create `RiderDetailModal` component
  - [ ] Power curve chart (Recharts)
  - [ ] Phenotype radar chart (Recharts)
  - [ ] Race stats card
- [ ] Create `SyncStatusIndicator` component
- [ ] Add responsive styling (mobile/tablet/desktop)
- [ ] Add loading/error states
- [ ] Test with 75 team members

### Testing
- [ ] Unit tests: Data transformations
- [ ] Integration tests: API endpoint
- [ ] E2E tests: Full dashboard flow
- [ ] Performance test: 75+ riders rendering
- [ ] Mobile responsiveness test
- [ ] Cross-browser test (Chrome, Firefox, Safari)

---

## 📊 PERFORMANCE CONSIDERATIONS

### Frontend Optimizations
1. **Virtualized Table**: Use `react-virtual` for 100+ riders
2. **Memoization**: Memoize sorted/filtered rider arrays
3. **Lazy Loading**: Load detail modal components on-demand
4. **Image Optimization**: Lazy-load avatars, use thumbnail sizes
5. **Debounced Search**: 300ms delay on search input

### Backend Optimizations
1. **Database Indexes**: Index on `velo_rating`, `zp_category`, `is_team_member`
2. **Response Caching**: 5-minute cache on `/api/racing-matrix`
3. **Pagination**: Support `?limit=20&offset=0` for large teams
4. **Compression**: Enable gzip compression
5. **CDN**: Serve static assets via CDN

### Database Query Performance
```sql
-- Add indexes voor snelle queries
CREATE INDEX IF NOT EXISTS idx_riders_velo ON riders_unified(velo_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_riders_category ON riders_unified(zp_category);
CREATE INDEX IF NOT EXISTS idx_riders_team ON riders_unified(is_team_member) WHERE is_team_member = true;
CREATE INDEX IF NOT EXISTS idx_team_members_rider ON my_team_members(rider_id);
```

---

## ✅ CONCLUSIE

**Data Source**: ✅ `riders_unified` heeft alle benodigde velden  
**API Endpoint**: ⏳ Te implementeren (`GET /api/racing-matrix`)  
**Frontend Components**: ⏳ Te implementeren (React + Recharts)  

**Coverage**:
- Power Curves: 100% ✅ (7 punten: 5s → 20min)
- vELO Stats: 100% ✅ (current, max 30d, max 90d)
- Phenotypes: 75% ⚠️ (3 van 4 scores, climber ontbreekt)
- Race Stats: 100% ✅ (wins, podiums, race count)
- Profile: 90% ✅ (avatar optional via Zwift Official API)

**Next Steps**:
1. Implementeer backend endpoint `GET /api/racing-matrix`
2. Test met rider 150437 + 75 team members
3. Bouw frontend components (React + Recharts)
4. Deploy + test in productie

**ETA**: 2-3 dagen voor volledige implementatie + testing
