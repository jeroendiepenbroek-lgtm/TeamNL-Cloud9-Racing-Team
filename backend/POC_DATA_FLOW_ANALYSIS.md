# POC Data Flow Analysis - Rider 150437

## Status: ✅ PARTIALLY COMPLETE

### 1. API → riders_unified: ✅ WORKING

**Source**: ZwiftRacing.app `/public/riders/150437`
**Destination**: `riders_unified` table

**Mapping verified**:
```
API Field              → DB Column
─────────────────────────────────────
riderId                → rider_id
name                   → name
zpFTP                  → ftp
power.w1200            → power_20m_w  
race.current.rating    → velo_rating
race.wins              → race_wins
```

**Verification**:
```sql
SELECT rider_id, name, ftp, power_20m_w, velo_rating, race_wins 
FROM riders_unified 
WHERE rider_id = 150437;
```

**Result**:
```
rider_id: 150437
name: "JRøne CloudRacer-9 @YT (TeamNL)"
ftp: 234
power_20m_w: 258
velo_rating: 1398.783
race_wins: 0
```

✅ **SUCCESS** - Complete mapping with 61 fields


### 2. riders_unified → view_my_team: ⚠️ SCHEMA MISMATCH

**Source**: `riders_unified` (new schema with correct names)
**Destination**: `view_my_team` (uses old legacy names)

**Schema Conflict**:
```
riders_unified Column  ↔️  view_my_team Column
─────────────────────────────────────────────
ftp                   →  zp_ftp
power_20m_w           →  power_w1200
velo_rating           →  race_last_rating
```

**Root Cause**: 
- `riders_unified` = clean 1:1 API mapping (NEW)
- `view_my_team` = legacy view expecting old column names (OLD)
- Backend queries via `/api/riders/team` expect old names

**Impact**: 
- Frontend Racing Matrix Dashboard expects:
  - `zp_ftp` (not `ftp`)
  - `power_w1200` (not `power_20m_w`)
  - `race_last_rating` (not `velo_rating`)

⚠️ **ACTION REQUIRED** - Update view_my_team definition OR create column aliases


### 3. Event Results: ⏸️ BLOCKED (Rate Limit)

**Attempted**: Sync event 5229579 results to `zwift_api_race_results`
**Status**: Rate limited by ZwiftRacing API (48s cooldown)
**Error**: `"Too many requests, please try again later."`

**Next Steps**:
1. Wait 60s before retry
2. Verify `zwift_api_race_results` schema matches API response
3. Insert event 5229579 results (including rider 150437)


## Database State

### riders_unified table: ✅ CLEAN
- 1 rider (150437)
- 61 columns, pure 1:1 API mapping
- Column names match ZwiftRacing API structure

### my_team_members table: ✅ CLEAN  
- 76 riders (includes 150437)
- Simple join table: `rider_id` only

### view_my_team: ❌ LEGACY SCHEMA
- Joins `my_team_members` + `riders_unified`
- **USES OLD COLUMN NAMES** (zp_ftp, power_w1200, race_last_rating)
- Breaks compatibility with new `riders_unified` schema


## Sourcing Strategy (POC Validated)

### Primary Source: ZwiftRacing.app ✅
- Endpoint: `/public/riders/:id`
- Rate limit: 5/min (individual), 1/15min (bulk)
- Coverage: 61 fields (power curves, vELO, phenotype, race stats)
- Status: **VERIFIED** - rider 150437 synced successfully

### Database Design: 
```
ZwiftRacing API
    ↓
riders_unified (1:1 mapping, clean schema)
    ↓
my_team_members (join table)
    ↓
view_my_team (⚠️ needs schema update)
    ↓
GET /api/riders/team
    ↓
Racing Matrix Dashboard
```


## Critical Issues

### Issue 1: view_my_team Column Names
**Problem**: View uses legacy names, `riders_unified` uses new API-aligned names

**Options**:
A. Update `view_my_team` to use new column names → **breaks frontend**
B. Add column aliases in view → `ftp AS zp_ftp, power_20m_w AS power_w1200`
C. Rename `riders_unified` columns back to legacy names → **loses clean mapping**

**Recommendation**: **Option B** - Add aliases in view, preserve both schemas


### Issue 2: Frontend Expectations
**File**: `backend/frontend/src/pages/RacingDataMatrixModern.tsx`

**Expected fields** (from MatrixRider interface):
```typescript
interface MatrixRider {
  rider_id: number;
  name: string;
  zp_ftp: number;          // Not ftp!
  power_w1200: number;     // Not power_20m_w!
  race_last_rating: number; // Not velo_rating!
  // ... 30+ more fields
}
```

**Impact**: If view column names change, frontend breaks

**Solution**: Create migration to add column aliases:
```sql
CREATE OR REPLACE VIEW view_my_team AS
SELECT 
  tm.rider_id,
  r.name,
  r.ftp AS zp_ftp,              -- Alias for compatibility
  r.power_20m_w AS power_w1200, -- Alias for compatibility
  r.velo_rating AS race_last_rating, -- Alias for compatibility
  -- ... all other fields
FROM my_team_members tm
JOIN riders_unified r ON tm.rider_id = r.rider_id;
```


## Next Steps

1. **Fix view_my_team schema** (add column aliases) - **URGENT**
2. Wait for rate limit cooldown, sync event 5229579 results
3. Test Racing Matrix Dashboard with rider 150437
4. Validate Results Dashboard with event data
5. Document final sourcing strategy
6. Create database cleanup migration (remove legacy tables)


## POC Conclusion

✅ **ZwiftRacing.app integration works perfectly**
✅ **riders_unified table has clean 1:1 API mapping**
⚠️ **view_my_team needs schema migration for backward compatibility**
⏸️ **Event results sync blocked by rate limit (temporary)**

**Overall**: POC validates the sourcing strategy. One schema migration needed to maintain frontend compatibility while using clean database design.
