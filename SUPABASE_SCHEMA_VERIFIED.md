# ✅ Supabase Schema Verificatie

## Riders Tabel Schema (Verified 2025-11-05)

```json
[
  {"column_name": "id", "data_type": "bigint", "is_nullable": "NO"},
  {"column_name": "zwift_id", "data_type": "bigint", "is_nullable": "NO"},
  {"column_name": "name", "data_type": "text", "is_nullable": "NO"},
  {"column_name": "club_id", "data_type": "bigint", "is_nullable": "YES"},
  {"column_name": "club_name", "data_type": "text", "is_nullable": "YES"},
  {"column_name": "ranking", "data_type": "integer", "is_nullable": "YES"},
  {"column_name": "ranking_score", "data_type": "numeric", "is_nullable": "YES"},
  {"column_name": "ftp", "data_type": "integer", "is_nullable": "YES"},
  {"column_name": "weight", "data_type": "numeric", "is_nullable": "YES"},
  {"column_name": "watts_per_kg", "data_type": "numeric", "is_nullable": "YES"},
  {"column_name": "category_racing", "data_type": "text", "is_nullable": "YES"},
  {"column_name": "category_zftp", "data_type": "text", "is_nullable": "YES"},
  {"column_name": "age", "data_type": "integer", "is_nullable": "YES"},
  {"column_name": "gender", "data_type": "text", "is_nullable": "YES"},
  {"column_name": "country", "data_type": "text", "is_nullable": "YES"},
  {"column_name": "total_races", "data_type": "integer", "is_nullable": "YES"},
  {"column_name": "total_wins", "data_type": "integer", "is_nullable": "YES"},
  {"column_name": "total_podiums", "data_type": "integer", "is_nullable": "YES"},
  {"column_name": "last_synced", "data_type": "timestamp with time zone", "is_nullable": "YES"},
  {"column_name": "created_at", "data_type": "timestamp with time zone", "is_nullable": "YES"},
  {"column_name": "updated_at", "data_type": "timestamp with time zone", "is_nullable": "YES"}
]
```

## Clubs Tabel Schema (Verified 2025-11-05)

```json
[
  {"column_name": "id", "data_type": "bigint", "is_nullable": "NO"},
  {"column_name": "club_id", "data_type": "bigint", "is_nullable": "NO"},
  {"column_name": "club_name", "data_type": "text", "is_nullable": "NO"},
  {"column_name": "description", "data_type": "text", "is_nullable": "YES"},
  {"column_name": "member_count", "data_type": "integer", "is_nullable": "YES"},
  {"column_name": "country", "data_type": "text", "is_nullable": "YES"},
  {"column_name": "created_date", "data_type": "timestamp with time zone", "is_nullable": "YES"},
  {"column_name": "last_synced", "data_type": "timestamp with time zone", "is_nullable": "YES"},
  {"column_name": "created_at", "data_type": "timestamp with time zone", "is_nullable": "YES"},
  {"column_name": "updated_at", "data_type": "timestamp with time zone", "is_nullable": "YES"}
]
```

## Belangrijke Kenmerken

### ✅ Denormalized Structure
- `club_name` zit **direct** in riders tabel (geen JOIN met clubs nodig!)
- `watts_per_kg` is **al berekend** en opgeslagen (geen berekening nodig!)

### ✅ Column Names (Verified)
- ✅ `country` (NOT `country_code`)
- ✅ `club_name` (NOT `club.name`)
- ✅ `watts_per_kg` (stored, not computed)
- ❌ `total_dnfs` (DOES NOT EXIST)

### ✅ Data Types
- `id`: bigint (serial primary key)
- `zwift_id`: bigint (unique, NOT NULL)
- `club_id`: bigint (nullable FK naar clubs.club_id)
- Numeric fields: `ranking_score`, `weight`, `watts_per_kg` (numeric)
- Integer fields: `ranking`, `ftp`, `age`, `total_*` (integer)
- Text fields: `name`, `club_name`, `category_*`, `gender`, `country` (text)
- Timestamps: `last_synced`, `created_at`, `updated_at` (timestamptz)

## SQL Migration Status

**File**: `supabase/migrations/005_my_team_clean.sql`

**Status**: ✅ **READY TO EXECUTE** - Schema matches perfectly!

### What the SQL does:
1. Creates `my_team_members` table:
   - `zwift_id` INTEGER PRIMARY KEY (FK → riders.zwift_id)
   - `added_at` TIMESTAMPTZ
   - `is_favorite` BOOLEAN

2. Creates `view_my_team` VIEW:
   - JOINs `my_team_members` + `riders`
   - NO clubs JOIN (club_name already in riders!)
   - Uses correct column names (country, club_name, watts_per_kg)
   - Excludes non-existent columns (total_dnfs)

3. Sets up:
   - Foreign key constraint (with conditional DO block)
   - Indexes on added_at and is_favorite
   - RLS policy for service_role
   - Grants for service_role, authenticated, anon

## Next Steps

### 1. Execute SQL in Supabase
```bash
# Open Supabase Dashboard → SQL Editor
# Copy entire content of supabase/migrations/005_my_team_clean.sql
# Click "Run" button
# Verify in Table Editor: my_team_members table appears
```

### 2. Verify VIEW
```sql
-- Check view exists
SELECT * FROM view_my_team LIMIT 1;

-- Should return: "no rows" (empty team initially)
```

### 3. Test Backend Endpoints
```bash
npm run dev
curl http://localhost:4000/api/riders/team
# Expected: []
```

## Schema Verification Queries

### Check riders table structure
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'riders'
ORDER BY ordinal_position;
```

### Check clubs table structure
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'clubs'
ORDER BY ordinal_position;
```

### Check existing data count
```sql
SELECT 
  (SELECT COUNT(*) FROM riders) as riders_count,
  (SELECT COUNT(*) FROM clubs) as clubs_count,
  (SELECT COUNT(*) FROM events) as events_count;
```

## Architecture Confirmed

```
┌─────────────────────────────────────────────────────────────┐
│ ZwiftRacing API (External)                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase PostgreSQL                                         │
│                                                             │
│  SOURCE TABLES (6):                                         │
│  ├─ clubs           (club data)                            │
│  ├─ riders          (rider data + club_name denormalized!) │
│  ├─ events          (event data)                           │
│  ├─ results         (race results - NOT YET CREATED)       │
│  ├─ rider_history   (historical snapshots - NOT YET)       │
│  └─ sync_logs       (sync monitoring)                      │
│                                                             │
│  RELATION TABLE (1):                                        │
│  └─ my_team_members (zwift_id, added_at, is_favorite)     │
│                                                             │
│  VIEWS (1):                                                 │
│  └─ view_my_team    (JOIN my_team_members + riders)       │
│                     NO clubs JOIN needed!                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend API (Railway Node.js)                              │
│  GET    /api/riders/team           → Query view_my_team    │
│  POST   /api/riders/team           → Insert my_team_members│
│  POST   /api/riders/team/bulk      → Bulk insert          │
│  DELETE /api/riders/team/:zwiftId  → Remove from team     │
│  PUT    /api/riders/team/:id/fav   → Toggle favorite      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend React (Railway Static)                            │
│  Riders.tsx → TanStack Table met view_my_team data        │
└─────────────────────────────────────────────────────────────┘
```

## Summary

✅ **Schema Verified**: riders tabel heeft exact de verwachte kolommen  
✅ **SQL Ready**: 005_my_team_clean.sql matcht perfect met schema  
✅ **No Clubs JOIN**: club_name zit al in riders (denormalized)  
✅ **watts_per_kg**: Already stored, no computation needed  
✅ **Backend Code**: Already implemented and correct  
⏳ **Action Required**: Execute SQL in Supabase SQL Editor  

**Status**: Klaar voor deployment! 🚀
