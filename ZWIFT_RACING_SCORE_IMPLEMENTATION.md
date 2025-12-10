# Zwift Racing Score Implementation ✅

## Ontdekking

Na onderzoek van de Zwift.com API heb ik het **`competitionMetrics`** object gevonden in de profile data:

```json
{
  "competitionMetrics": {
    "racingScore": 553,
    "category": "C",
    "categoryWomen": "E"
  }
}
```

## Database Changes

### 1. Nieuwe Kolommen toegevoegd aan `api_zwift_api_profiles`

```sql
ALTER TABLE api_zwift_api_profiles 
  ADD COLUMN IF NOT EXISTS competition_racing_score INTEGER,
  ADD COLUMN IF NOT EXISTS competition_category TEXT,
  ADD COLUMN IF NOT EXISTS competition_category_women TEXT;
```

**Locatie**: `migrations/002b_add_competition_metrics.sql`

### 2. Data Opgehaald voor Rider 150437

```
✅ Zwift Racing Score: 553
✅ Category: C
✅ Category Women: E
```

## Views Updated

### `v_rider_complete` - Complete Rider Profile

**Nieuw toegevoegd:**
```sql
-- Racing Metrics (combined sources)
zr.racing_score AS zwiftracing_score,           -- ZwiftRacing.app proprietary
zo.competition_racing_score AS zwift_official_racing_score,  -- Zwift Official
zo.competition_category AS zwift_official_category,
```

### `v_team_rankings` - Team Leaderboard

**Nieuw toegevoegd:**
```sql
zr.racing_score AS zwiftracing_score,
zo.competition_racing_score AS zwift_official_racing_score,
zo.competition_category AS zwift_official_category,
```

### `v_power_rankings` - Power Leaderboards

**Nieuw toegevoegd:**
```sql
racing_score AS zwiftracing_score,
(SELECT competition_racing_score FROM api_zwift_api_profiles p WHERE p.rider_id = r.rider_id) AS zwift_official_racing_score
```

## Twee Racing Scores Beschikbaar

Nu hebben we **twee racing scores** per rider:

### 1. **ZwiftRacing.app Score** (proprietary)
- **Veld**: `zwiftracing_score`
- **Bron**: `api_zwiftracing_public_clubs_riders.racing_score`
- **Type**: `DECIMAL(10,2)`
- **Beschikbaar voor**: Riders in club 11818

### 2. **Zwift Official Score** (official)
- **Veld**: `zwift_official_racing_score`
- **Bron**: `api_zwift_api_profiles.competition_racing_score`
- **Type**: `INTEGER`
- **Beschikbaar voor**: Alle riders met Zwift profile

## Frontend Gebruik

```typescript
// Rider 150437 voorbeeld
const rider = {
  rider_id: 150437,
  name: "JRøne CloudRacer-9 @YT",
  
  // ZwiftRacing.app metrics
  velo: null,  // Not in club
  zwiftracing_score: null,  // Not in club
  
  // Zwift Official metrics
  zwift_official_racing_score: 553,  // ✅ Available
  zwift_official_category: "C",  // ✅ Available
  
  // Use fallback logic
  displayScore: zwift_official_racing_score || zwiftracing_score || 'N/A',
  displayCategory: zwift_official_category || zwiftracing_category || 'N/A'
};
```

## Deployment Status

- ✅ Database schema updated (002b_add_competition_metrics.sql)
- ✅ Fetch script updated (fetch-zwift-profile-150437.js)
- ✅ Views updated (003_hybrid_views.sql)
- ✅ Data synced voor rider 150437
- ⏳ Views deployment in Supabase (manual)

## Next Steps

1. **Deploy Views in Supabase SQL Editor:**
   ```sql
   -- Copy paste migrations/003_hybrid_views.sql
   ```

2. **Test Queries:**
   ```sql
   -- Check competition metrics
   SELECT 
     rider_id,
     first_name,
     last_name,
     competition_racing_score,
     competition_category
   FROM api_zwift_api_profiles 
   WHERE rider_id = 150437;
   
   -- Check hybrid view
   SELECT 
     rider_id,
     full_name,
     zwiftracing_score,
     zwift_official_racing_score,
     zwift_official_category
   FROM v_rider_complete 
   WHERE rider_id = 150437;
   ```

3. **Sync Alle Team Members:**
   ```bash
   # Voor elke rider in club 11818
   node fetch-zwift-profile-150437.js
   # (update script voor bulk sync)
   ```

## Conclusie

Het **racing_score** veld bestaat WEL in de Zwift Official API, maar onder de naam **`competitionMetrics.racingScore`**. Dit is nu geïmplementeerd en beschikbaar naast de ZwiftRacing.app score.

**Score voor rider 150437:**
- Zwift Official: **553** (Category C) ✅
- ZwiftRacing.app: **N/A** (niet in club) ❌
