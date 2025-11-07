# Start Document - 1:1 API Mapping Implementation

**Datum:** 2025-11-07 (Morgen)  
**Doel:** Implementeer pure 1:1 mapping tussen ZwiftRacing API en database  
**Status:** 🟢 Ready to start

---

## 📖 Wat is Gisteren Gebeurd?

### ✅ Voltooid
1. **Authorization header fix** - API werkt nu met `Authorization:` header (was `x-api-key`)
2. **Rate limit strategie** - GET voor kleine teams, POST bulk voor grote teams
3. **Supabase upsert hardening** - Strip generated columns defensief
4. **Complete API analyse** - Rider endpoint heeft 61 velden gedocumenteerd

### 🔴 Huidige Blocker
**Sync faalt met SQL error:** `cannot insert a non-DEFAULT value into column "watts_per_kg"`

**Root cause:** Database schema heeft computed/generated columns die conflicteren met upserts.

### 🎯 Oplossing
**Pure 1:1 mapping** - Alle 61 API velden direct naar DB, geen computed columns.

---

## 📋 Plan voor Vandaag

### Stap 1: Test Missing API Endpoints (15 min)

```bash
# Test results endpoint
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/results/5129235 \
  | jq '.[0]' > /tmp/api_result.json

# Test events endpoint (find correct URL)
curl -H "Authorization: 650c6d2fc4ef6858d74cbef1" \
  https://zwift-ranking.herokuapp.com/public/events/11818 \
  | jq '.[0]' > /tmp/api_event.json
```

**Goal:** Krijg exacte response structuren voor results en events.

---

### Stap 2: Check Supabase Column Definitions (10 min)

Run in Supabase SQL Editor:

```sql
-- Check watts_per_kg definitie
SELECT 
  table_name, 
  column_name, 
  data_type, 
  column_default, 
  is_nullable,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'riders'
  AND column_name = 'watts_per_kg';
```

**Goal:** Bepaal of `watts_per_kg` een GENERATED ALWAYS kolom is.

---

### Stap 3: Create Migration Script (30 min)

File: `supabase/migrations/007_pure_api_mapping.sql`

```sql
-- ============================================================================
-- MIGRATION 007: Pure 1:1 API-to-DB Mapping
-- ============================================================================
-- Doel: Verwijder computed columns, voeg alle 61 API velden toe
-- Impact: riders tabel 21 → 64 kolommen
-- ============================================================================

BEGIN;

-- 1. BACKUP current data
CREATE TABLE IF NOT EXISTS riders_backup_20251107 AS 
SELECT * FROM riders;

-- 2. DROP computed/generated columns
ALTER TABLE riders 
  DROP COLUMN IF EXISTS watts_per_kg,
  DROP COLUMN IF EXISTS ranking,
  DROP COLUMN IF EXISTS ranking_score;

-- 3. RENAME for API consistency
ALTER TABLE riders RENAME COLUMN zwift_id TO rider_id;
ALTER TABLE riders RENAME COLUMN ftp TO zp_ftp;
ALTER TABLE riders RENAME COLUMN total_races TO race_finishes;
ALTER TABLE riders RENAME COLUMN total_wins TO race_wins;
ALTER TABLE riders RENAME COLUMN total_podiums TO race_podiums;

-- 4. ADD new API fields - Demographics
ALTER TABLE riders 
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS zp_category TEXT;

-- 5. ADD new API fields - Power Profile (18 kolommen)
ALTER TABLE riders
  ADD COLUMN IF NOT EXISTS power_wkg5 NUMERIC,
  ADD COLUMN IF NOT EXISTS power_wkg15 NUMERIC,
  ADD COLUMN IF NOT EXISTS power_wkg30 NUMERIC,
  ADD COLUMN IF NOT EXISTS power_wkg60 NUMERIC,
  ADD COLUMN IF NOT EXISTS power_wkg120 NUMERIC,
  ADD COLUMN IF NOT EXISTS power_wkg300 NUMERIC,
  ADD COLUMN IF NOT EXISTS power_wkg1200 NUMERIC,
  ADD COLUMN IF NOT EXISTS power_w5 INTEGER,
  ADD COLUMN IF NOT EXISTS power_w15 INTEGER,
  ADD COLUMN IF NOT EXISTS power_w30 INTEGER,
  ADD COLUMN IF NOT EXISTS power_w60 INTEGER,
  ADD COLUMN IF NOT EXISTS power_w120 INTEGER,
  ADD COLUMN IF NOT EXISTS power_w300 INTEGER,
  ADD COLUMN IF NOT EXISTS power_w1200 INTEGER,
  ADD COLUMN IF NOT EXISTS power_cp NUMERIC,
  ADD COLUMN IF NOT EXISTS power_awc NUMERIC,
  ADD COLUMN IF NOT EXISTS power_compound_score NUMERIC,
  ADD COLUMN IF NOT EXISTS power_rating NUMERIC;

-- 6. ADD new API fields - Race Stats (24 kolommen)
ALTER TABLE riders
  -- Last race
  ADD COLUMN IF NOT EXISTS race_last_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS race_last_date INTEGER,
  ADD COLUMN IF NOT EXISTS race_last_category TEXT,
  ADD COLUMN IF NOT EXISTS race_last_category_number INTEGER,
  
  -- Current rating
  ADD COLUMN IF NOT EXISTS race_current_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS race_current_date INTEGER,
  ADD COLUMN IF NOT EXISTS race_current_category TEXT,
  ADD COLUMN IF NOT EXISTS race_current_category_number INTEGER,
  
  -- 30 day max
  ADD COLUMN IF NOT EXISTS race_max30_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS race_max30_date INTEGER,
  ADD COLUMN IF NOT EXISTS race_max30_expires INTEGER,
  ADD COLUMN IF NOT EXISTS race_max30_category TEXT,
  ADD COLUMN IF NOT EXISTS race_max30_category_number INTEGER,
  
  -- 90 day max
  ADD COLUMN IF NOT EXISTS race_max90_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS race_max90_date INTEGER,
  ADD COLUMN IF NOT EXISTS race_max90_expires INTEGER,
  ADD COLUMN IF NOT EXISTS race_max90_category TEXT,
  ADD COLUMN IF NOT EXISTS race_max90_category_number INTEGER,
  
  -- Totals
  ADD COLUMN IF NOT EXISTS race_dnfs INTEGER;

-- 7. ADD new API fields - Handicaps (4 kolommen)
ALTER TABLE riders
  ADD COLUMN IF NOT EXISTS handicap_flat NUMERIC,
  ADD COLUMN IF NOT EXISTS handicap_rolling NUMERIC,
  ADD COLUMN IF NOT EXISTS handicap_hilly NUMERIC,
  ADD COLUMN IF NOT EXISTS handicap_mountainous NUMERIC;

-- 8. ADD new API fields - Phenotype (7 kolommen)
ALTER TABLE riders
  ADD COLUMN IF NOT EXISTS phenotype_sprinter NUMERIC,
  ADD COLUMN IF NOT EXISTS phenotype_puncheur NUMERIC,
  ADD COLUMN IF NOT EXISTS phenotype_pursuiter NUMERIC,
  ADD COLUMN IF NOT EXISTS phenotype_climber NUMERIC,
  ADD COLUMN IF NOT EXISTS phenotype_tt NUMERIC,
  ADD COLUMN IF NOT EXISTS phenotype_value TEXT,
  ADD COLUMN IF NOT EXISTS phenotype_bias NUMERIC;

-- 9. CREATE computed VIEW for frontend
CREATE OR REPLACE VIEW riders_computed AS
SELECT 
  *,
  -- Computed: watts per kg
  CASE 
    WHEN weight > 0 THEN zp_ftp::numeric / weight
    ELSE NULL
  END AS watts_per_kg,
  
  -- Computed: category display
  race_current_category || ' ' || race_current_category_number AS category_display,
  
  -- Computed: days since last race
  EXTRACT(DAY FROM NOW() - TO_TIMESTAMP(race_last_date)) AS days_since_last_race
  
FROM riders;

-- 10. UPDATE indexes
CREATE INDEX IF NOT EXISTS idx_riders_rider_id ON riders(rider_id);
CREATE INDEX IF NOT EXISTS idx_riders_club_id ON riders(club_id);
CREATE INDEX IF NOT EXISTS idx_riders_zp_category ON riders(zp_category);
CREATE INDEX IF NOT EXISTS idx_riders_race_current_rating ON riders(race_current_rating);

COMMIT;
```

**Goal:** Migration klaar om te runnen in Supabase.

---

### Stap 4: Update TypeScript Types (20 min)

File: `backend/src/types/index.ts`

```typescript
export interface DbRider {
  // Primary
  id: number;
  rider_id: number;  // Was: zwift_id
  name: string;
  
  // Demographics (5)
  gender: string | null;
  country: string | null;
  age: string | null;  // Kan "Vet" zijn!
  height: number | null;
  weight: number | null;
  
  // ZP Category (2)
  zp_category: string | null;
  zp_ftp: number | null;
  
  // Power Profile (18)
  power_wkg5: number | null;
  power_wkg15: number | null;
  power_wkg30: number | null;
  power_wkg60: number | null;
  power_wkg120: number | null;
  power_wkg300: number | null;
  power_wkg1200: number | null;
  power_w5: number | null;
  power_w15: number | null;
  power_w30: number | null;
  power_w60: number | null;
  power_w120: number | null;
  power_w300: number | null;
  power_w1200: number | null;
  power_cp: number | null;
  power_awc: number | null;
  power_compound_score: number | null;
  power_rating: number | null;
  
  // Race Stats (24)
  race_last_rating: number | null;
  race_last_date: number | null;
  race_last_category: string | null;
  race_last_category_number: number | null;
  race_current_rating: number | null;
  race_current_date: number | null;
  race_current_category: string | null;
  race_current_category_number: number | null;
  race_max30_rating: number | null;
  race_max30_date: number | null;
  race_max30_expires: number | null;
  race_max30_category: string | null;
  race_max30_category_number: number | null;
  race_max90_rating: number | null;
  race_max90_date: number | null;
  race_max90_expires: number | null;
  race_max90_category: string | null;
  race_max90_category_number: number | null;
  race_finishes: number | null;
  race_dnfs: number | null;
  race_wins: number | null;
  race_podiums: number | null;
  
  // Handicaps (4)
  handicap_flat: number | null;
  handicap_rolling: number | null;
  handicap_hilly: number | null;
  handicap_mountainous: number | null;
  
  // Phenotype (7)
  phenotype_sprinter: number | null;
  phenotype_puncheur: number | null;
  phenotype_pursuiter: number | null;
  phenotype_climber: number | null;
  phenotype_tt: number | null;
  phenotype_value: string | null;
  phenotype_bias: number | null;
  
  // Club (2)
  club_id: number | null;
  club_name: string | null;
  
  // Metadata (3)
  last_synced: string;
  created_at: string;
  updated_at: string;
}
```

**Goal:** Types exact gelijk aan nieuwe DB schema.

---

### Stap 5: Update Sync Mapping (30 min)

File: `backend/src/services/auto-sync.service.ts`

```typescript
const upsertData = ridersData.map(r => ({
  // Identity
  rider_id: r.riderId,
  name: r.name,
  
  // Demographics
  gender: r.gender,
  country: r.country,
  age: r.age,
  height: r.height,
  weight: r.weight,
  
  // ZP Category
  zp_category: r.zpCategory,
  zp_ftp: r.zpFTP,
  
  // Power Profile (18 velden)
  power_wkg5: r.power.wkg5,
  power_wkg15: r.power.wkg15,
  power_wkg30: r.power.wkg30,
  power_wkg60: r.power.wkg60,
  power_wkg120: r.power.wkg120,
  power_wkg300: r.power.wkg300,
  power_wkg1200: r.power.wkg1200,
  power_w5: r.power.w5,
  power_w15: r.power.w15,
  power_w30: r.power.w30,
  power_w60: r.power.w60,
  power_w120: r.power.w120,
  power_w300: r.power.w300,
  power_w1200: r.power.w1200,
  power_cp: r.power.CP,
  power_awc: r.power.AWC,
  power_compound_score: r.power.compoundScore,
  power_rating: r.power.powerRating,
  
  // Race Stats (24 velden)
  race_last_rating: r.race.last.rating,
  race_last_date: r.race.last.date,
  race_last_category: r.race.last.mixed.category,
  race_last_category_number: r.race.last.mixed.number,
  race_current_rating: r.race.current.rating,
  race_current_date: r.race.current.date,
  race_current_category: r.race.current.mixed.category,
  race_current_category_number: r.race.current.mixed.number,
  race_max30_rating: r.race.max30.rating,
  race_max30_date: r.race.max30.date,
  race_max30_expires: r.race.max30.expires,
  race_max30_category: r.race.max30.mixed.category,
  race_max30_category_number: r.race.max30.mixed.number,
  race_max90_rating: r.race.max90.rating,
  race_max90_date: r.race.max90.date,
  race_max90_expires: r.race.max90.expires,
  race_max90_category: r.race.max90.mixed.category,
  race_max90_category_number: r.race.max90.mixed.number,
  race_finishes: r.race.finishes,
  race_dnfs: r.race.dnfs,
  race_wins: r.race.wins,
  race_podiums: r.race.podiums,
  
  // Handicaps (4 velden)
  handicap_flat: r.handicaps.profile.flat,
  handicap_rolling: r.handicaps.profile.rolling,
  handicap_hilly: r.handicaps.profile.hilly,
  handicap_mountainous: r.handicaps.profile.mountainous,
  
  // Phenotype (7 velden)
  phenotype_sprinter: r.phenotype.scores.sprinter,
  phenotype_puncheur: r.phenotype.scores.puncheur,
  phenotype_pursuiter: r.phenotype.scores.pursuiter,
  phenotype_climber: r.phenotype.scores.climber,
  phenotype_tt: r.phenotype.scores.tt,
  phenotype_value: r.phenotype.value,
  phenotype_bias: r.phenotype.bias,
  
  // Club
  club_id: r.club?.id,
  club_name: r.club?.name,
}));
```

**Goal:** Pure 1:1 mapping zonder transformaties.

---

### Stap 6: Update Frontend (20 min)

File: `backend/frontend/src/pages/Riders.tsx`

Wijzig query van `riders` naar `riders_computed`:

```typescript
const { data: riders, isLoading } = useQuery({
  queryKey: ['myTeam'],
  queryFn: async () => {
    const res = await fetch(`${API_BASE}/api/riders/team`);
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json() as Promise<TeamRider[]>;
  },
});
```

**Backend endpoint update:**

```typescript
// backend/src/services/supabase.service.ts
async getMyTeamMembers(): Promise<any[]> {
  const { data, error } = await this.client
    .from('riders_computed')  // Was: view_my_team
    .select('*')
    .order('race_current_rating', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}
```

**Goal:** Frontend gebruikt computed view met watts_per_kg berekend.

---

### Stap 7: Deploy & Test (20 min)

1. **Run migration in Supabase**
   - Kopieer `007_pure_api_mapping.sql` naar Supabase SQL Editor
   - Execute
   - Verify: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'riders'` → Should be 64

2. **Deploy code**
   ```bash
   git add .
   git commit -m "feat: Pure 1:1 API-to-DB mapping - 61 velden"
   git push origin main
   ```

3. **Test sync**
   ```bash
   # Wacht op Railway deploy (2 min)
   sleep 120
   
   # Trigger manual sync
   curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/auto-sync/trigger \
     -s | jq '.'
   
   # Verify rider data
   curl -s https://teamnl-cloud9-racing-team-production.up.railway.app/api/riders/team \
     | jq '.[0] | {rider_id, name, zp_ftp, power_wkg5, race_current_rating}'
   ```

4. **Expected result:**
   ```json
   {
     "success": true,
     "message": "Sync voltooid",
     "result": {
       "success": 1,
       "errors": 0,
       "skipped": 0
     }
   }
   ```

**Goal:** Sync succesvol, alle 61 velden gevuld.

---

## ✅ Success Criteria

- [ ] Migration 007 succesvol gerund in Supabase
- [ ] riders tabel heeft 64 kolommen
- [ ] riders_computed view bestaat
- [ ] TypeScript types compileren zonder errors
- [ ] Backend deploy succesvol
- [ ] Manual sync returns `{"errors": 0}`
- [ ] Rider 150437 heeft alle power/race/handicap/phenotype velden gevuld
- [ ] Frontend toont data correct met watts_per_kg

---

## 📚 Reference Files

1. **Complete API mapping:** `docs/API_TO_DB_MAPPING_COMPLETE.md`
2. **Migration script:** `supabase/migrations/007_pure_api_mapping.sql` (to be created)
3. **Current types:** `backend/src/types/index.ts`
4. **Sync service:** `backend/src/services/auto-sync.service.ts`
5. **Supabase service:** `backend/src/services/supabase.service.ts`

---

## 🚨 Troubleshooting

### Migration fails
```sql
-- Rollback
ROLLBACK;
-- Check backup
SELECT * FROM riders_backup_20251107 LIMIT 1;
```

### Sync still fails
```bash
# Check Railway logs
railway logs --tail 100 | grep -A 5 "AutoSync"

# Check specific error
curl -X POST .../api/auto-sync/trigger -s | jq '.result.errorMessages'
```

### Frontend errors
```typescript
// Temporary: gebruik oude view
.from('view_my_team')  // Fallback
```

---

**Start tijd:** 09:00  
**Geschatte voltooiing:** 11:30 (2.5 uur)  
**Priority:** 🔥 HIGH - Blokkeert alle sync functionaliteit

Succes vandaag! 🚀
