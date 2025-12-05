# 🎯 ACTIEPLAN - Racing Matrix Implementation

**Datum**: 5 december 2025  
**Status**: Database Migration → Backend → Frontend

---

## ✅ VOLTOOID

- [x] Complete 3-API field mapping analyse
- [x] Racing Matrix frontend specificatie
- [x] Unified sync service (TypeScript)
- [x] POC met rider 150437 succesvol
- [x] Documentatie compleet (5 documenten)

---

## 🔴 PRIORITEIT 1: DATABASE MIGRATION (NU)

### Ontbrekende Kolommen
```sql
-- CRITICAL: phenotype_climber (voor 4-axis radar chart)
ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS phenotype_climber NUMERIC;

COMMENT ON COLUMN riders_unified.phenotype_climber IS 
  'Climber phenotype score 0-100 from ZwiftRacing API phenotype.scores.climber';

-- HIGH: power_rating (overall power metric)
ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS power_rating NUMERIC;

COMMENT ON COLUMN riders_unified.power_rating IS 
  'Overall power rating from ZwiftRacing API power.powerRating';

-- MEDIUM: last race tracking
ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS last_race_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_race_velo NUMERIC;

COMMENT ON COLUMN riders_unified.last_race_date IS 
  'Date of last race from ZwiftRacing API race.last.date';
COMMENT ON COLUMN riders_unified.last_race_velo IS 
  'vELO rating at last race from ZwiftRacing API race.last.rating';

-- OPTIONAL: phenotype_type string
ALTER TABLE riders_unified 
  ADD COLUMN IF NOT EXISTS phenotype_type TEXT;

COMMENT ON COLUMN riders_unified.phenotype_type IS 
  'Phenotype type string from ZwiftRacing API phenotype.value (e.g., "Pursuiter", "Sprinter")';
```

**Actie**: Run in Supabase SQL Editor

---

## 🟡 PRIORITEIT 2: SYNC SERVICE UPDATE (NA MIGRATION)

### Update unified-sync.service.ts
**File**: `backend/services/unified-sync.service.ts`

Uncomment deze regels in `mapToDatabase()`:
```typescript
// Line ~380 - Uncomment na database migration:
power_rating: racing.power?.powerRating || null,
last_race_date: racing.race?.last?.date || null,
last_race_velo: racing.race?.last?.rating || null,
phenotype_climber: racing.phenotype?.scores?.climber || null,
phenotype_type: racing.phenotype?.value || null,
```

**Test**:
```bash
npx tsx backend/services/unified-sync.service.ts 150437
```

---

## 🟢 PRIORITEIT 3: RE-SYNC TEAM (15 MIN)

### Sync All 75 Team Members
```bash
# Full team sync met enrichment
npx tsx backend/services/unified-sync.service.ts --all

# Expected duration: ~15 minutes (75 riders × 12s)
# Output: Success rate + field counts per rider
```

**Verify**:
```sql
-- Check phenotype_climber is gevuld
SELECT rider_id, name, 
  phenotype_sprinter, phenotype_climber, phenotype_pursuiter, phenotype_puncheur
FROM riders_unified 
WHERE is_team_member = true 
LIMIT 10;
```

---

## 🔵 PRIORITEIT 4: BACKEND API ENDPOINT (30 MIN)

### Implement GET /api/racing-matrix

**File**: `backend/api/routes.ts`

```typescript
import { asyncHandler } from '../utils/async-handler';

router.get('/racing-matrix', asyncHandler(async (req, res) => {
  // Query riders_unified
  const { data: riders, error } = await supabase
    .from('riders_unified')
    .select(`
      rider_id, name, zp_category, age_category,
      velo_rating, velo_max_30d, velo_max_90d, velo_rank,
      ftp, weight_kg,
      power_5s_w, power_15s_w, power_30s_w, power_1m_w, 
      power_2m_w, power_5m_w, power_20m_w,
      power_5s_wkg, power_15s_wkg, power_30s_wkg, power_1m_wkg,
      power_2m_wkg, power_5m_wkg, power_20m_wkg,
      critical_power, anaerobic_work_capacity, compound_score,
      phenotype_sprinter, phenotype_climber, phenotype_pursuiter, phenotype_puncheur,
      race_wins, race_podiums, race_count_90d,
      avatar_url, club_name, last_synced_zwift_racing
    `)
    .eq('is_team_member', true)
    .order('velo_rating', { ascending: false, nullsFirst: false });

  if (error) throw error;

  // Calculate team stats
  const team_stats = {
    total_members: riders.length,
    average_velo: riders.reduce((sum, r) => sum + (r.velo_rating || 0), 0) / riders.length || 0,
    average_ftp: Math.round(riders.reduce((sum, r) => sum + (r.ftp || 0), 0) / riders.length || 0),
    average_ftp_wkg: (riders.reduce((sum, r) => {
      const wkg = r.weight_kg ? r.ftp / r.weight_kg : 0;
      return sum + wkg;
    }, 0) / riders.length || 0).toFixed(2),
    category_breakdown: {
      A: riders.filter(r => r.zp_category === 'A').length,
      B: riders.filter(r => r.zp_category === 'B').length,
      C: riders.filter(r => r.zp_category === 'C').length,
      D: riders.filter(r => r.zp_category === 'D').length,
      E: riders.filter(r => r.zp_category === 'E').length,
    }
  };

  // Add calculated ftp_wkg
  const ridersWithFtpWkg = riders.map(r => ({
    ...r,
    ftp_wkg: r.weight_kg ? parseFloat((r.ftp / r.weight_kg).toFixed(2)) : null,
    last_synced: r.last_synced_zwift_racing,
  }));

  // Get last sync
  const lastSync = riders.length > 0 && riders[0].last_synced_zwift_racing
    ? riders[0].last_synced_zwift_racing 
    : new Date().toISOString();

  res.json({
    success: true,
    data: {
      team_stats,
      riders: ridersWithFtpWkg,
    },
    meta: {
      total_riders: riders.length,
      synced_riders: riders.filter(r => r.last_synced_zwift_racing).length,
      last_sync: lastSync,
    }
  });
}));
```

**Test**:
```bash
# Start server
npm run dev

# Test endpoint
curl http://localhost:3000/api/racing-matrix | jq '.'

# Expected: JSON met team_stats + 75 riders
```

---

## 🟣 PRIORITEIT 5: FRONTEND COMPONENTS (2-3 DAGEN)

### Component Structuur
```
frontend/src/
├── pages/
│   └── RacingMatrixDashboard.tsx          (Main page)
├── components/
│   ├── racing-matrix/
│   │   ├── TeamStatsHeader.tsx            (Team overview)
│   │   ├── RiderTable.tsx                 (Main table)
│   │   │   ├── RiderTableHeader.tsx       (Column headers)
│   │   │   ├── RiderTableRow.tsx          (Single row)
│   │   │   └── RiderTableFilters.tsx      (Filters)
│   │   ├── RiderDetailModal.tsx           (Detail modal)
│   │   │   ├── PowerCurveChart.tsx        (7-point chart)
│   │   │   ├── PhenotypeRadar.tsx         (4-axis radar)
│   │   │   └── RaceStatsCard.tsx          (Stats card)
│   │   └── SyncStatusIndicator.tsx        (Sync status)
├── hooks/
│   └── useRacingMatrix.ts                 (React Query hook)
└── types/
    └── racing-matrix.types.ts             (TypeScript interfaces)
```

### Dependencies
```bash
npm install @tanstack/react-query recharts
npm install -D @types/recharts
```

### Implementation Order
1. **Day 1 (4-6u)**:
   - [ ] Setup React Query
   - [ ] Create `useRacingMatrix` hook
   - [ ] Build `TeamStatsHeader` component
   - [ ] Build `RiderTable` (basic)

2. **Day 2 (6-8u)**:
   - [ ] Add table sorting/filtering
   - [ ] Build `RiderDetailModal` (basic layout)
   - [ ] Implement `PowerCurveChart` (Recharts)
   - [ ] Implement `PhenotypeRadar` (Recharts)

3. **Day 3 (4-6u)**:
   - [ ] Add responsive styling (mobile/tablet)
   - [ ] Build `SyncStatusIndicator`
   - [ ] Add loading/error states
   - [ ] Testing + bug fixes

---

## 📊 DATABASE INDICES (PERFORMANCE)

### Optionele Performance Optimalisaties
```sql
-- Index voor snelle vELO sorting
CREATE INDEX IF NOT EXISTS idx_riders_velo_team 
  ON riders_unified(velo_rating DESC NULLS LAST) 
  WHERE is_team_member = true;

-- Index voor category filtering
CREATE INDEX IF NOT EXISTS idx_riders_category_team 
  ON riders_unified(zp_category) 
  WHERE is_team_member = true;

-- Index voor name search
CREATE INDEX IF NOT EXISTS idx_riders_name_team 
  ON riders_unified(name text_pattern_ops) 
  WHERE is_team_member = true;
```

**Run**: Na frontend implementatie (indien performance issues)

---

## 🧪 TESTING CHECKLIST

### Unit Tests
- [ ] `unified-sync.service.ts` - mapToDatabase()
- [ ] `unified-sync.service.ts` - fetchZwiftRacingData()
- [ ] `unified-sync.service.ts` - fetchZwiftOfficialData()

### Integration Tests
- [ ] `/api/racing-matrix` endpoint
- [ ] Team stats calculation
- [ ] Rider data transformations

### E2E Tests
- [ ] Full dashboard load
- [ ] Table sorting (all columns)
- [ ] Category filtering
- [ ] Search filtering
- [ ] Modal open/close
- [ ] Charts rendering

### Performance Tests
- [ ] 75 riders rendering time < 1s
- [ ] API response time < 500ms
- [ ] Chart rendering < 200ms

---

## 📝 DOCUMENTATIE REFERENTIES

| Document | Doel |
|----------|------|
| `COMPLETE_3API_MAPPING.md` | Complete field mapping (3 APIs → DB) |
| `RACING_MATRIX_FRONTEND_SPEC.md` | Frontend specs + component designs |
| `backend/services/unified-sync.service.ts` | Production-ready sync service |
| `DELIVERY_3API_RACING_MATRIX.md` | Complete delivery overzicht |
| `FIELD_MAPPING_ANALYSIS.md` | Field coverage analyse |
| `POC_SUCCESS_RIDER_150437.md` | POC resultaten |

---

## ⏱️ TOTALE ETA

| Fase | Tijd | Status |
|------|------|--------|
| Database Migration | 5 min | 🔴 NU |
| Sync Service Update | 10 min | 🟡 Na migration |
| Re-sync Team (75 riders) | 15 min | 🟢 Na update |
| Backend API Endpoint | 30 min | 🔵 Na sync |
| Frontend Components | 2-3 dagen | 🟣 Na backend |
| Testing + Bug Fixes | 1 dag | ⚪ Na frontend |
| **TOTAAL** | **3-4 dagen** | |

---

## ✅ SUCCESS CRITERIA

Racing Matrix Dashboard is succesvol wanneer:

1. ✅ Database heeft alle benodigde kolommen (incl. phenotype_climber)
2. ✅ Alle 75 team members zijn gesynchroniseerd
3. ✅ Backend endpoint retourneert correcte data
4. ✅ Frontend toont:
   - Team stats (avg vELO, avg FTP, category breakdown)
   - Sortable rider table (vELO, FTP, power curves)
   - Filterable table (category, search)
   - Detail modal met:
     - 7-point power curve chart
     - 4-axis phenotype radar (incl. climber!)
     - Race stats card
5. ✅ Data wordt elke 5 min automatisch refreshed
6. ✅ Mobile responsive (< 768px)
7. ✅ Performance < 1s load time (75 riders)

---

## 🚀 START HIER

```bash
# STEP 1: Database Migration (5 min)
# → Open Supabase SQL Editor
# → Copy-paste SQL van "PRIORITEIT 1"
# → Execute

# STEP 2: Update Sync Service (5 min)
# → Open backend/services/unified-sync.service.ts
# → Uncomment 5 regels in mapToDatabase()
# → Save

# STEP 3: Test Single Rider (1 min)
npx tsx backend/services/unified-sync.service.ts 150437
# → Verify phenotype_climber is filled

# STEP 4: Sync All Team (15 min)
npx tsx backend/services/unified-sync.service.ts --all
# → Wait for completion
# → Check success rate

# STEP 5: Backend Endpoint (30 min)
# → Add code to backend/api/routes.ts
# → npm run dev
# → Test: curl http://localhost:3000/api/racing-matrix

# STEP 6: Frontend (3 dagen)
# → Follow RACING_MATRIX_FRONTEND_SPEC.md
# → Build components day by day
# → Test continuously
```

---

**LET'S GO! 🚀**
