# Quick Reference - TeamNL Cloud9 POC

## Huidige Status (3 dec 2024, 16:00)

✅ **OPERATIONAL**
- riders_unified: 1 rider (150437) - 45 fields
- my_team_members: 1 rider
- view_my_team: FIXED & working
- Racing Matrix API: `/api/riders/team` → ✅

⏳ **PENDING** (Rate limit)
- Event 5229579 sync - wacht 60-90s
- 107 race results - via sync-poc-complete.ts

---

## Snelle Sync (Na Rate Limit Reset)

```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend

# Wacht rate limit reset
sleep 90

# Run complete sync
npx tsx sync-poc-complete.ts

# Output verwacht:
# ✅ Found 107 results
# ✅ Event inserted
# ✅ Inserted 107 race results
```

---

## Test Commands

```bash
# 1. Racing Matrix (werkend)
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/riders/team | jq

# 2. Rider results (na sync)
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/results/rider/150437?days=30 | jq

# 3. Team results (na sync)
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/results/team/recent?days=90 | jq

# 4. Events (na sync)
curl https://teamnl-cloud9-racing-team-production.up.railway.app/api/events/upcoming?hours=168 | jq
```

---

## Multi-Source API Test

```bash
cd backend
npx tsx test-multi-source.ts

# Verwacht:
# ✅ ZwiftRacing.app: 200 OK
# ✅ ZwiftPower.com: Cookie auth
# ✅ Zwift.com: OAuth token
```

---

## Database Direct Access

```bash
PGPASSWORD="postgres.bktbeefdmrpxhsyyalvc.pooler.aws" \
psql -h aws-0-eu-central-1.pooler.supabase.com \
     -p 6543 \
     -U postgres.bktbeefdmrpxhsyyalvc \
     -d postgres

-- Check riders
SELECT rider_id, name, zp_ftp FROM riders_unified;

-- Check team members
SELECT * FROM my_team_members;

-- Check view
SELECT * FROM view_my_team;

-- Check events (na sync)
SELECT event_id, title FROM zwift_api_events;

-- Check results (na sync)
SELECT COUNT(*) FROM zwift_api_race_results;
```

---

## Belangrijke Files

- **Sync script**: `backend/sync-poc-complete.ts`
- **Multi-source test**: `backend/test-multi-source.ts`
- **View fix SQL**: `/tmp/fix-view.sql`
- **Strategy doc**: `CLEAN_SOURCING_STRATEGY_V2.md`
- **Status doc**: `POC_SYNC_STATUS.md`

---

## Rate Limits

| Endpoint | Limit | Wait Time |
|----------|-------|-----------|
| `/public/rider/:id` | 5/min | 12s |
| `/public/riders` (bulk) | 1/15min | 15min |
| `/public/results/:eventId` | 1/min | 60s |
| `/public/club/:id/members` | 1/60min | 60min |

**Tip**: Gebruik background scheduler voor production sync.

---

## Credentials (.env)

```bash
# Supabase
SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# ZwiftRacing API
ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1

# ZwiftPower (added)
ZWIFTPOWER_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFTPOWER_PASSWORD=CloudRacer-9

# Zwift.com (added)
ZWIFT_USERNAME=jeroen.diepenbroek@gmail.com
ZWIFT_PASSWORD=CloudRacer-9
```

---

## Issues Opgelost Vandaag

1. ✅ view_my_team broken → Fixed (riders_computed → riders_unified)
2. ✅ Env vars not loading → Fixed (lazy loading pattern)
3. ✅ API field mismatch → Fixed (nested access paths)
4. ✅ Multi-source auth → All 3 APIs working

---

## Volgende Sessie

1. Run `sync-poc-complete.ts` (event + results)
2. Test alle 4 dashboards
3. Database cleanup (legacy tables)
4. Document production sync workflow
