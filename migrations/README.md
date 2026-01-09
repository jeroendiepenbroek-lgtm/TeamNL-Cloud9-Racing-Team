# Database Migrations

## Multi-Source Architecture

Deze migrations implementeren een robuuste multi-source database architectuur voor TeamNL Cloud9 Racing Team.

### Architectuur Overzicht

```
┌─────────────────────────────────────────────────────────────┐
│              SOURCE TABLES (Raw API Data)                   │
├─────────────────────────────────────────────────────────────┤
│ zwift_racing_riders      → 51 fields  (PRIMARY)            │
│ zwift_official_profiles  → 92 fields  (ENRICHMENT)         │
│ zwift_official_activities → Recent rides (OPTIONAL)         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  HYBRID VIEWS (Frontend)                    │
├─────────────────────────────────────────────────────────────┤
│ v_team_riders_complete  → Racing + Social (combined)       │
│ v_team_riders_racing    → Racing only (fast, no joins)     │
│ v_team_riders_social    → Social stats only (influencers)  │
└─────────────────────────────────────────────────────────────┘
```

### Voordelen

**ROBUUSTHEID**:
- ✅ Source isolation: 1 API faalt → andere data blijft beschikbaar
- ✅ Clear attribution: Weet altijd welke API welke data levert
- ✅ Easy debugging: Sync errors per source traceerbaar
- ✅ Flexible: Nieuwe sources toevoegen zonder bestaande te verstoren

**EFFICIENCY**:
- ✅ Independent sync: Racing 24h, Social 168h (optimal)
- ✅ Bulk operations: ZwiftRacing 1000 riders/call
- ✅ Fast queries: v_team_riders_racing heeft geen JOINs
- ✅ Caching ready: Materialized views voor grote teams

**DATA QUALITY**:
- ✅ FTP comparison: Detect discrepancies (241W vs 248W)
- ✅ Completeness tracking: Welke riders missen social data
- ✅ Sync monitoring: Audit log voor alle operaties
- ✅ Error handling: Per-source failures traceerbaar

## Migrations

### 001_multi_source_architecture.sql

**Status**: ✅ Ready to deploy

**Bevat**:
- Source tables: `zwift_racing_riders`, `zwift_official_profiles`, `zwift_official_activities`
- Hybrid views: `v_team_riders_complete`, `v_team_riders_racing`, `v_team_riders_social`
- Sync management: `sync_strategy`, `sync_log`
- Helper functions: `get_riders_missing_enrichment()`, `get_stale_sync_targets()`
- Performance indexes: Optimized voor Racing Matrix queries

**Deployment**:

```bash
# 1. Login to Supabase dashboard
# 2. Open SQL Editor
# 3. Copy entire 001_multi_source_architecture.sql
# 4. Execute
# 5. Run verification queries (included at bottom)
```

**Verification**:

```sql
-- Check all tables created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE 'zwift_%' OR table_name LIKE 'sync_%')
ORDER BY table_name;

-- Expected output: 5 tables
-- zwift_official_activities
-- zwift_official_profiles
-- zwift_racing_riders
-- sync_log
-- sync_strategy

-- Check all views created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'v_team_%'
ORDER BY table_name;

-- Expected output: 3 views
-- v_team_riders_complete
-- v_team_riders_racing
-- v_team_riders_social

-- Check sync strategy
SELECT * FROM sync_strategy ORDER BY sync_priority;

-- Expected output:
-- zwift_racing   | 24h  | Priority 1 | Enabled
-- zwift_official | 168h | Priority 2 | Enabled
-- zwift_power    | NULL | Priority 99 | Enabled (but skip)
```

## Sync Strategy

### ZwiftRacing.app (PRIMARY)

```
API: https://zwift-ranking.herokuapp.com
Auth: API Key (650c6d2fc4ef6858d74cbef1)
Sync: Every 24 hours
Priority: 1 (highest)
Bulk: 1000 riders per call
Rate Limit: 5/min (individual), 1/15min (bulk)
```

**Data**:
- 51 fields: vELO, power curve, phenotype, handicaps
- Racing stats: FTP, weight, category
- Performance: 5s to 20min power curve

**Usage**:
- PRIMARY source voor Racing Matrix
- Daily updates (racing data changes frequently)
- Bulk sync: All 80 TeamNL riders in 1 call

### Zwift Official (ENRICHMENT)

```
API: https://us-or-rly101.zwift.com
Auth: OAuth 2.0 (jeroen.diepenbroek@gmail.com / CloudRacer-9)
Sync: Every 168 hours (weekly)
Priority: 2 (enrichment)
Individual: 1 rider per call
Token: 24 hour expiry (86400s)
```

**Data**:
- 92 fields: Avatar URLs, social stats, connected services
- Social: 4259 followers, 132 following
- Activities: Recent 20 rides
- Services: Strava Premium, Wahoo connected

**Usage**:
- ENRICHMENT voor Racing Matrix (avatars!)
- Weekly updates (social data stable)
- Individual sync: 80 separate API calls

### ZwiftPower (DEPRECATED)

```
Status: ❌ SKIP COMPLETELY
Reason: Bot protected (nginx CAPTCHA)
Alternative: All data available via ZwiftRacing.app
```

## Frontend Integration

### Racing Matrix Dashboard

```typescript
// Query complete data (racing + social)
const { data: riders } = await supabase
  .from('v_team_riders_complete')  // ← HYBRID VIEW
  .select('*')
  .order('velo_score', { ascending: false });

// Result includes:
riders.map(rider => ({
  // Racing data (51 fields)
  name: rider.name,
  category: rider.category,
  velo_score: rider.velo_score,
  ftp_wkg: rider.racing_ftp_wkg,
  phenotype: rider.phenotype_type,
  power_5s_wkg: rider.power_5s_wkg,
  
  // Social enrichment (92 fields)
  avatar: rider.avatar_url,  // ← 300x300 high-res!
  followers: rider.followers_count,  // ← 4259!
  strava_premium: rider.strava_premium,
  
  // Data quality
  data_status: rider.data_status,  // 'complete' | 'racing_only'
  has_avatar: rider.has_avatar,
  ftp_diff: rider.ftp_difference_watts  // Racing vs Official
}));
```

### Fast Racing Query (no joins)

```typescript
// When avatars not needed (10× faster)
const { data: racing } = await supabase
  .from('v_team_riders_racing')  // ← NO JOIN
  .select('*')
  .eq('category', 'C')
  .order('velo_score', { ascending: false });
```

### Social Influencers Dashboard

```typescript
// Who's got most followers?
const { data: influencers } = await supabase
  .from('v_team_riders_social')
  .select('*')
  .order('followers_count', { ascending: false })
  .limit(10);
```

## Backend Implementation

### Sync Services

```typescript
// backend/src/services/sync-racing.service.ts
// - Fetch from ZwiftRacing.app (bulk 1000 riders)
// - Update zwift_racing_riders table
// - Run every 24 hours
// - Track in sync_log

// backend/src/services/sync-official.service.ts
// - Fetch from Zwift Official (individual riders)
// - Update zwift_official_profiles table
// - Run every 168 hours (weekly)
// - OAuth token management
// - Track in sync_log

// backend/src/services/sync-orchestrator.service.ts
// - Query get_stale_sync_targets()
// - Execute syncs by priority
// - Error recovery
// - Logging
```

### Example: Racing Sync

```typescript
import { ZwiftRacingClient } from '../api/zwift-racing-client';
import { supabase } from '../lib/supabase';

export class SyncRacingService {
  async syncAllRiders() {
    const logId = await this.startSyncLog('zwift_racing');
    
    try {
      // Bulk fetch (1000 riders)
      const riders = await ZwiftRacingClient.fetchBulkRiders([
        150437, 150438, /* ... all 80 TeamNL riders */
      ]);
      
      // Upsert to database
      const { error } = await supabase
        .from('zwift_racing_riders')
        .upsert(riders.map(r => ({
          rider_id: r.rider_id,
          name: r.name,
          category: r.category,
          ftp_watts: r.ftp_watts,
          // ... all 51 fields
          api_response_raw: r,  // Full JSON
          last_synced_at: new Date(),
          sync_status: 'success'
        })));
      
      await this.completeSyncLog(logId, 'success', riders.length);
    } catch (error) {
      await this.completeSyncLog(logId, 'failed', 0, error.message);
    }
  }
}
```

## Monitoring

### Check Sync Status

```sql
-- Sources that need syncing
SELECT * FROM get_stale_sync_targets();

-- Riders missing enrichment
SELECT * FROM get_riders_missing_enrichment();

-- Recent sync history
SELECT * FROM sync_log 
ORDER BY started_at DESC 
LIMIT 10;

-- Data completeness
SELECT 
  data_status,
  COUNT(*) as rider_count
FROM v_team_riders_complete
GROUP BY data_status;
```

### Dashboard Queries

```sql
-- FTP discrepancies (racing vs official)
SELECT 
  rider_id,
  name,
  racing_ftp_watts,
  official_ftp_watts,
  ftp_difference_watts,
  ftp_difference_percent
FROM v_team_riders_complete
WHERE ftp_difference_watts > 10
ORDER BY ftp_difference_percent DESC;

-- Social influence ranking
SELECT 
  name,
  followers_count,
  follower_ratio,
  strava_premium
FROM v_team_riders_social
ORDER BY followers_count DESC
LIMIT 10;
```

## Next Steps

1. ✅ **Deploy Migration**: Execute `001_multi_source_architecture.sql` in Supabase
2. ⏳ **Verify Tables**: Run verification queries
3. ⏳ **Implement Sync Services**: Racing + Official clients
4. ⏳ **Initial Sync**: All 80 TeamNL riders
5. ⏳ **Test Views**: Query v_team_riders_complete
6. ⏳ **Update Frontend**: Use hybrid views in Racing Matrix
7. ⏳ **Add Avatars**: Display image_src_large
8. ⏳ **Setup Scheduler**: Automated 24h/168h syncs
9. ⏳ **Monitor**: Check sync_log for errors

## Troubleshooting

### Issue: No data in views

```sql
-- Check if source tables have data
SELECT COUNT(*) FROM zwift_racing_riders;
SELECT COUNT(*) FROM zwift_official_profiles;

-- If empty: Run sync services first
```

### Issue: Slow queries

```sql
-- Check indexes exist
SELECT tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('zwift_racing_riders', 'zwift_official_profiles');

-- Consider materialized view for large teams
-- CREATE MATERIALIZED VIEW mv_team_riders_complete AS SELECT * FROM v_team_riders_complete;
```

### Issue: OAuth failures

```sql
-- Check OAuth error log
SELECT * FROM zwift_official_profiles
WHERE sync_status = 'oauth_failed'
ORDER BY oauth_last_failure DESC;

-- Token expiry: 86400s (24h)
-- Refresh tokens 60s before expiry
```

## Resources

- **API Documentation**: `API_DOCUMENTATION.md`
- **Historical Analysis**: `API_HISTORICAL_IMPLEMENTATION.md`
- **ZwiftRacing Data**: `API_DATA_FIELDS_RIDER_150437.md`
- **Zwift Official Data**: `ZWIFT_OFFICIAL_API_DATA_RIDER_150437.md`
- **Test Scripts**: `test-zwift-official-complete.ts`

## Support

Voor vragen of issues:
- Check `sync_log` table voor error details
- Review `API_HISTORICAL_IMPLEMENTATION.md` voor troubleshooting
- Test individual APIs met test scripts
- Contact: TeamNL Cloud9 Racing Team
