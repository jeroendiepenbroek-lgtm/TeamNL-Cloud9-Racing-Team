# Results Dashboard - Implementation Guide

## ✅ **Status**: Backend Compleet, Frontend Te Bouwen

---

## 📊 Feature Overview

**Results Dashboard** toont race results met power metrics, vELO tracking, en performance analysis voor TeamNL Cloud9 Racing Team.

### Core Features
1. **Team Recent Results** - Laatste X races van team members, gegroepeerd per event
2. **Individual Rider Results** - Alle races van specifieke rider (90d filter)
3. **Power Curves** - 5s, 15s, 30s, 1m, 2m, 5m, 20m power data
4. **Personal Records Tracking** - Automatische PR detection en historie
5. **vELO Rating Trends** - Club Ladder vELO (1-7) met trend arrows (↑↓→)
6. **Effort Scores** - Performance % vs personal best (🟨 PR, ⬜ Near Best, 🟧 Good Effort)
7. **CSV Export** - Export team of rider results naar CSV

---

## 🗄️ Database Schema (GEREED)

### ✅ Migration: `SUPABASE_ADD_RESULTS_COLUMNS.sql`

**Locatie**: `/backend/migrations/SUPABASE_ADD_RESULTS_COLUMNS.sql`

#### Extended Columns (15 nieuwe kolommen)

**Race Metadata**:
```sql
ALTER TABLE zwift_api_race_results
  ADD COLUMN pen TEXT,                      -- A/B/C/D/E race category
  ADD COLUMN total_riders INTEGER,          -- Aantal deelnemers
  ADD COLUMN event_name TEXT,               -- Cached event naam
  ADD COLUMN event_date TIMESTAMPTZ,        -- Cached event datum
  ADD COLUMN delta_winner_seconds INTEGER;  -- Delta naar winnaar (+/- sec)
```

**vELO Tracking**:
```sql
ALTER TABLE zwift_api_race_results
  ADD COLUMN velo_rating INTEGER,           -- Huidige vELO (1-7)
  ADD COLUMN velo_previous INTEGER,         -- Vorige vELO
  ADD COLUMN velo_change INTEGER;           -- Auto-calculated via trigger
```

**Power Curves** (alle DECIMAL(6,2) in W/kg):
```sql
ALTER TABLE zwift_api_race_results
  ADD COLUMN power_5s DECIMAL(6,2),         -- 5 second peak
  ADD COLUMN power_15s DECIMAL(6,2),        -- 15 second peak
  ADD COLUMN power_30s DECIMAL(6,2),        -- 30 second peak
  ADD COLUMN power_1m DECIMAL(6,2),         -- 1 minute peak
  ADD COLUMN power_2m DECIMAL(6,2),         -- 2 minute peak
  ADD COLUMN power_5m DECIMAL(6,2),         -- 5 minute peak
  ADD COLUMN power_20m DECIMAL(6,2);        -- 20 minute peak (FTP proxy)
```

**Performance Metrics**:
```sql
ALTER TABLE zwift_api_race_results
  ADD COLUMN effort_score INTEGER,          -- 0-100 (% van PR)
  ADD COLUMN race_points DECIMAL(6,2);      -- RP scoring
```

#### New Table: `rider_personal_records`

```sql
CREATE TABLE rider_personal_records (
  id SERIAL PRIMARY KEY,
  rider_id INTEGER REFERENCES riders(rider_id),
  duration TEXT NOT NULL,                   -- '5s', '15s', '30s', '1m', '2m', '5m', '20m'
  best_wkg DECIMAL(6,2) NOT NULL,          -- Best W/kg
  event_id TEXT,                            -- Event waar PR behaald
  event_date TIMESTAMPTZ,
  previous_best DECIMAL(6,2),              -- Vorige PR (voor progression)
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(rider_id, duration)
);
```

#### Triggers (Automatisch)

**Trigger 1: vELO Change Calculation**
- Berekent `velo_change` automatisch: `rating - previous`
- Runs BEFORE INSERT/UPDATE

**Trigger 2: Personal Records Auto-Update**
- Update PRs wanneer nieuwe result hogere power heeft
- Saves previous_best voor progression tracking
- Runs AFTER INSERT/UPDATE (alleen wanneer power columns NOT NULL)

#### Views

**view_team_recent_results**: Team results gegroepeerd voor dashboard  
**view_rider_stats**: Rider statistieken samenvatting (wins, podiums, avg rank, etc.)

---

## 🔌 Backend API (GEREED)

### New Supabase Service Methods

**Locatie**: `/backend/src/services/supabase.service.ts`

```typescript
// Team Recent Results
async getTeamRecentResults(days: number = 90, limit: number = 100): Promise<any[]>

// Individual Rider Results
async getRiderResults(riderId: number, days: number = 90, limit: number = 50): Promise<any[]>

// Rider Personal Records
async getRiderPersonalRecords(riderId: number): Promise<any[]>

// Rider Stats (aggregated)
async getRiderStats(riderId: number, days: number = 90): Promise<{
  rider_id: number;
  total_races: number;
  wins: number;
  podiums: number;
  top10: number;
  avg_rank: number;
  avg_wkg: number;
  avg_effort_score: number;
  total_race_points: number;
}>
```

### API Endpoints

**Locatie**: `/backend/src/api/endpoints/results.ts`

#### 1. Team Recent Results
```
GET /api/results/team/recent?days=90&limit=100
```

**Query Parameters**:
- `days` (default: 90) - Aantal dagen terug
- `limit` (default: 100) - Max aantal results

**Response**:
```json
{
  "success": true,
  "count": 85,
  "events_count": 12,
  "events": [
    {
      "event_id": "5129235",
      "event_name": "WTRL Racing League - Round 1",
      "event_date": "2025-11-15T19:00:00Z",
      "pen": "B",
      "total_riders": 45,
      "results": [
        {
          "rider_id": 150437,
          "rider_name": "John Doe",
          "rank": 5,
          "time_seconds": 2145,
          "avg_wkg": 3.85,
          "velo_rating": 4,
          "velo_change": 1,
          "power_5s": 8.45,
          "power_15s": 7.20,
          "power_30s": 6.50,
          "power_1m": 5.80,
          "power_2m": 5.20,
          "power_5m": 4.50,
          "power_20m": 3.90,
          "effort_score": 94,
          "race_points": 85.5,
          "delta_winner_seconds": 12
        }
      ]
    }
  ]
}
```

#### 2. Individual Rider Results
```
GET /api/results/rider/:riderId?days=90&limit=50
```

**Response**:
```json
{
  "success": true,
  "rider_id": 150437,
  "count": 18,
  "days": 90,
  "results": [...],  // Array of race results met power curves
  "personal_records": [
    {
      "duration": "5s",
      "best_wkg": 8.45,
      "event_id": "5129235",
      "event_date": "2025-11-15T19:00:00Z",
      "previous_best": 8.20
    }
  ]
}
```

#### 3. Rider Statistics
```
GET /api/results/rider/:riderId/stats?days=90
```

**Response**:
```json
{
  "success": true,
  "rider_id": 150437,
  "period_days": 90,
  "total_races": 18,
  "wins": 2,
  "podiums": 7,
  "top10": 14,
  "avg_rank": 6.8,
  "avg_wkg": 3.82,
  "avg_effort_score": 91,
  "total_race_points": 1245.50
}
```

#### 4. CSV Export
```
GET /api/results/export/csv?days=90&riderId=150437
```

**Query Parameters**:
- `days` (default: 90) - Aantal dagen terug
- `riderId` (optional) - Specific rider (anders: hele team)

**Response**: CSV bestand met headers:
```
rider_id,rider_name,event_id,event_name,event_date,rank,pen,time_seconds,category,
avg_wkg,power_5s,power_15s,power_30s,power_1m,power_2m,power_5m,power_20m,
effort_score,race_points,velo_rating,velo_change,delta_winner_seconds
```

**Filename**: `teamnl_rider_150437_results_2025-11-19.csv` of `teamnl_team_results_2025-11-19.csv`

---

## 🎨 Frontend Implementation (TE BOUWEN)

### Component Structure

```
backend/frontend/src/pages/
├── ResultsDashboard.tsx           # Main dashboard (NEW)
│   ├── TeamRecentResults.tsx     # Team results view (NEW)
│   ├── RiderResultsDashboard.tsx # Individual rider view (NEW)
│   └── PowerCurveChart.tsx       # Power curve visualization (NEW)
└── components/
    ├── ResultsTable.tsx          # Reusable results table (NEW)
    ├── vELOBadge.tsx            # vELO badge with trend arrow (NEW)
    ├── EffortScoreBadge.tsx     # Effort score with color coding (NEW)
    └── ExportButton.tsx          # CSV export button (NEW)
```

### User Stories Implementation

#### US1: Team Recent Results Dashboard

**Component**: `TeamRecentResults.tsx`

**Features**:
- Dropdown: selecteer aantal races (10, 20, 50, 100)
- Event grouping: datum + event naam als section header
- Results tabel per event:
  - Pen (A/B/C/D/E badge)
  - Pos (rank / total_riders)
  - vELO badge (colored circle + rating + trend arrow)
  - Rider name (klikbaar → navigeer naar Rider Dashboard)
  - Time (MM:SS format)
  - Avg W/kg
  - Power curves: 5s, 15s, 30s, 1m, 2m, 5m, 20m
    - Color coding: 🟨 100%+ (PR), ⬜ 95%+ (Near Best), 🟧 90%+ (Good Effort)

**UI Layout**:
```tsx
┌─────────────────────────────────────────────────────────────┐
│ Team Recent Results                    [10 ▼] [Export CSV] │
├─────────────────────────────────────────────────────────────┤
│ 📅 Nov 15, 2025 - WTRL Racing League Round 1 (Pen B)       │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Pos │ vELO  │ Rider       │ Time  │ Avg  │ Power... │   │
│ │  5  │ 4 ↑   │ John Doe    │ 35:45 │ 3.85 │ 8.45... │   │
│ │ 12  │ 3 →   │ Jane Smith  │ 36:12 │ 3.62 │ 7.90... │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 📅 Nov 13, 2025 - ZRL Practice Race (Pen C)                │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

#### US2: Individual Rider Results Dashboard

**Component**: `RiderResultsDashboard.tsx`

**Features**:
- Rider selector: dropdown met alle team members (alfabetisch)
- Date range filter: 30d, 60d, 90d buttons (default: 90d)
- Stats summary card:
  - Total races, Wins, Podiums, Top 10
  - Avg rank, Avg W/kg, Avg effort score
- Results tabel:
  - vELO (rating + trend arrow)
  - Pos (rank / total_riders, bijv. "9 / 20")
  - Date (Nov 17, 2025)
  - Event (klikbaar, met category badge)
  - Effort score (90-100 range, color coded)
  - Avg W/kg
  - Power curves: 5s, 15s, 30s, 1m, 2m, 5m, 20m
  - RP (Race Points in bordered box)
- Personal Records panel:
  - Duration, Best W/kg, Date, Event
  - Highlight recent PRs (<30 dagen) met 🆕 badge

**UI Layout**:
```tsx
┌─────────────────────────────────────────────────────────────┐
│ [Select Rider ▼: John Doe]  [30d] [60d] [90d*]  [Export]  │
├─────────────────────────────────────────────────────────────┤
│ 📊 Stats (90 days):                                         │
│ Total: 18 │ Wins: 2 │ Podiums: 7 │ Avg Rank: 6.8          │
├─────────────────────────────────────────────────────────────┤
│ Results                                                      │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ vELO │ Pos  │ Date    │ Event          │ Effort │ ... │   │
│ │ 4 ↑  │ 5/45 │ Nov 15  │ WTRL R1 (B)    │   94%  │ ... │   │
│ │ 3 →  │ 9/38 │ Nov 13  │ ZRL Practice   │   89%  │ ... │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ 🏆 Personal Records                                          │
│ 5s: 8.45 W/kg (Nov 15) 🆕 │ 1m: 5.80 W/kg (Nov 10)         │
│ 5m: 4.50 W/kg (Nov 15) 🆕 │ 20m: 3.90 W/kg (Oct 28)        │
└─────────────────────────────────────────────────────────────┘
```

#### US3: Power Metrics Analysis

**Component**: `PowerCurveChart.tsx`

**Features**:
- X-axis: duration (5s, 15s, 30s, 1m, 2m, 5m, 20m)
- Y-axis: W/kg
- Lines: meerdere riders of races
- Hover tooltip: show exact values + effort score
- Comparison mode: select 2-5 riders → side-by-side
- PR highlighting: yellow background voor personal best values

**UI Layout**:
```tsx
┌─────────────────────────────────────────────────────────────┐
│ Power Curve Comparison                                       │
│ [+ Add Rider] John Doe ✓  Jane Smith ✓                     │
├─────────────────────────────────────────────────────────────┤
│     W/kg                                                     │
│ 9.0 │                                                        │
│ 8.0 │  ●────●                                               │
│ 7.0 │       ●────●                                          │
│ 6.0 │            ●────●────●                                │
│ 5.0 │                       ●────●                          │
│ 4.0 │                            ●                          │
│     └──────────────────────────────────────────            │
│       5s  15s  30s  1m   2m   5m   20m                      │
│                                                              │
│ ─── John Doe (Latest Race)  ─── Jane Smith (Latest Race)   │
└─────────────────────────────────────────────────────────────┘
```

### Result Power Colors Legend

**Implementatie**: `EffortScoreBadge.tsx`

```tsx
const getEffortColor = (effortScore: number, powerValue: number, pr: number) => {
  const percentage = (powerValue / pr) * 100;
  
  if (percentage >= 100) return 'bg-yellow-200'; // 🟨 Personal Best
  if (percentage >= 95) return 'bg-gray-100';    // ⬜ Near Best
  if (percentage >= 90) return 'bg-orange-100';  // 🟧 Good Effort
  return '';                                      // No highlight
};
```

**Legend Display**:
```tsx
<div className="flex gap-4 mb-4 text-sm">
  <div className="flex items-center gap-2">
    <div className="w-12 h-6 bg-yellow-200 border"></div>
    <span>Personal Best (100%+)</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-12 h-6 bg-gray-100 border"></div>
    <span>Near Best (95%+)</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-12 h-6 bg-orange-100 border"></div>
    <span>Good Effort (90%+)</span>
  </div>
</div>
```

### vELO Badge Component

**Implementatie**: `vELOBadge.tsx`

```tsx
const vELOColors = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
  4: '#4169E1', // Royal Blue
  5: '#32CD32', // Lime Green
  6: '#FF8C00', // Dark Orange
  7: '#DC143C', // Crimson
};

const getTrendIcon = (change: number) => {
  if (change > 0) return '↑';
  if (change < 0) return '↓';
  return '→';
};

<div className="flex items-center gap-1">
  <div 
    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
    style={{ backgroundColor: vELOColors[rating] }}
  >
    {rating}
  </div>
  <span className="text-lg">{getTrendIcon(change)}</span>
</div>
```

---

## 🚀 Deployment Checklist

### 1. Run Database Migration

```bash
# Open Supabase Dashboard
# Navigate to: SQL Editor
# Create new query
# Paste contents of: backend/migrations/SUPABASE_ADD_RESULTS_COLUMNS.sql
# Click "Run"
```

**Verificatie**:
```sql
-- Check nieuwe kolommen
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'zwift_api_race_results' 
  AND column_name IN ('power_5s', 'velo_rating', 'effort_score');

-- Check nieuwe tabel
SELECT COUNT(*) FROM rider_personal_records;

-- Check triggers
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'zwift_api_race_results';
```

### 2. Test Backend API

```bash
# Start dev server
npm run dev

# Test Team Recent Results
curl http://localhost:4000/api/results/team/recent?days=90&limit=10

# Test Rider Results
curl http://localhost:4000/api/results/rider/150437?days=90

# Test Rider Stats
curl http://localhost:4000/api/results/rider/150437/stats?days=90

# Test CSV Export
curl http://localhost:4000/api/results/export/csv?days=90 -o results.csv
```

### 3. Build Frontend Components

- [ ] Create `/backend/frontend/src/pages/ResultsDashboard.tsx`
- [ ] Create `/backend/frontend/src/pages/TeamRecentResults.tsx`
- [ ] Create `/backend/frontend/src/pages/RiderResultsDashboard.tsx`
- [ ] Create `/backend/frontend/src/components/PowerCurveChart.tsx`
- [ ] Create `/backend/frontend/src/components/vELOBadge.tsx`
- [ ] Create `/backend/frontend/src/components/EffortScoreBadge.tsx`
- [ ] Add route in `/backend/frontend/src/App.tsx`

### 4. Deploy to Railway

```bash
# Commit changes
git add .
git commit -m "feat: Results Dashboard - Backend API + DB Migration"
git push origin main

# Railway auto-deploys
# Monitor: https://railway.app/dashboard
```

### 5. E2E Testing

- [ ] Database migration succeeded (check Supabase logs)
- [ ] API endpoints return correct data
- [ ] CSV export downloads successfully
- [ ] Power curves display with color coding
- [ ] vELO badges show correct colors + trends
- [ ] Personal records update automatically
- [ ] Effort scores calculate correctly

---

## 📝 Next Steps

### Immediate (Phase 1) ✅ DONE
- [x] Database migration SQL created
- [x] Backend API endpoints implemented
- [x] Supabase Service methods added
- [x] CSV export functionality added

### Current (Phase 2) 🚧 IN PROGRESS
- [ ] **RUN DATABASE MIGRATION** ← NEXT STEP
- [ ] Test API endpoints with curl/Postman
- [ ] Verify triggers work (insert test result → check PRs update)

### Upcoming (Phase 3)
- [ ] Build Team Recent Results component
- [ ] Build Individual Rider Results component
- [ ] Build Power Curve Chart component
- [ ] Add navigation to main app

### Future (Phase 4)
- [ ] Advanced filtering (by category, pen, vELO range)
- [ ] Power duration analysis (PR trends over time)
- [ ] Team comparison (side-by-side power curves)
- [ ] Export to PDF with charts

---

## 🔗 Related Documentation

- `docs/FEATURE_IMPLEMENTATION_PLAN.md` - Original feature specs
- `docs/RESULTS_DASHBOARD_MIGRATION.md` - Database migration details
- `docs/API.md` - Complete API reference
- `docs/VERSION_2.0_SNAPSHOT.md` - Current system state

---

## 🐛 Troubleshooting

### Database Migration Issues

**Error**: `column "power_5s" already exists`
```sql
-- Check bestaande kolommen
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'zwift_api_race_results';

-- Drop kolom indien nodig
ALTER TABLE zwift_api_race_results DROP COLUMN power_5s;
```

**Error**: `trigger already exists`
```sql
-- Drop trigger
DROP TRIGGER IF EXISTS trigger_velo_change ON zwift_api_race_results;
DROP TRIGGER IF EXISTS trigger_update_prs ON zwift_api_race_results;
```

### API Issues

**Problem**: Results endpoint returns empty array  
**Solution**: Check if `event_date` column populated (oude records hebben NULL)

**Problem**: Personal records not updating  
**Solution**: Check trigger is active + insert test result with power curves

---

**Last Updated**: 2025-11-19  
**Version**: 1.0 (Backend Complete, Frontend Pending)
