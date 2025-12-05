# 📋 ACTIEPLAN - Racing Matrix Dashboard Completion

**Status**: 5 december 2025, 22:15  
**Database**: 44/75 riders gesynchroniseerd (58.7%)  
**Blocker**: Sync gestopt, moet herstart worden

---

## 🚨 IMMEDIATE ACTIONS (NU DOEN)

### 1. Herstart Sync voor Resterende 31 Riders
```bash
cd /workspaces/TeamNL-Cloud9-Racing-Team/backend
npx tsx definitieve-sync.ts > /tmp/sync-final.log 2>&1 &

# Monitor progress
tail -f /tmp/sync-final.log

# Check count
watch -n 60 'curl -s https://bktbeefdmrpxhsyyalvc.supabase.co/rest/v1/riders_unified?select=rider_id -H "apikey: XXX" | jq length'
```

**Verwachte duur**: 31 riders × 12s = ~6 minuten  
**Script**: `/workspaces/TeamNL-Cloud9-Racing-Team/backend/definitieve-sync.ts`

### 2. Verificatie na Sync Complete
```bash
# Check totaal
npx tsx -p << 'EOF'
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { count } = await supabase.from('riders_unified').select('*', { count: 'exact', head: true });
console.log(`✅ Total riders: ${count}/75`);
EOF

# Check Racing Matrix view
curl http://localhost:3000/api/team/members | jq 'length'
```

---

## 📊 HUIDIGE STATUS

### Database State
```
my_team_members:    75 riders (SOURCE)
riders_unified:     44 riders (TARGET - needs 31 more)
race_results:       30 results (rider 150437 only)
view_my_team:       44 riders (LEFT JOIN)
```

### Data Completeness Issue
**POC Rider 150437**: 50/60 kolommen gevuld  
**Nieuwe Riders**: 42/60 kolommen gevuld  

**8 Missende Kolommen**:
1. ❌ `avatar_url` - Zwift Official API needed
2. ❌ `avatar_url_large` - Zwift Official API needed
3. ❌ `gender` - Zwift Official API needed
4. ⚠️  `age_category` - ZwiftRacing `age` field (NOT MAPPED!)
5. ⚠️  `velo_max_30d` - ZwiftRacing `race.max30.rating` (NOT MAPPED!)
6. ⚠️  `velo_max_90d` - ZwiftRacing `race.max90.rating` (NOT MAPPED!)
7. ⚠️  `last_synced_zwift_official` - Not set
8. ⚠️  `last_synced_zwiftpower` - Not set

---

## 🔧 FIX REQUIRED - Sync Script Updates

### Current Mapping Issues in `definitieve-sync.ts`

#### Problem 1: Missing age_category
```typescript
// HUIDIGE CODE (FOUT):
const dbRider = {
  // ... age_category wordt NIET gemapt!
};

// FIX:
const dbRider = {
  age_category: rider.age,  // ← TOEVOEGEN
  // ...
};
```

#### Problem 2: Missing velo_max fields
```typescript
// HUIDIGE CODE (FOUT):
velo_rating: rider.race.current.rating,
// velo_max_30d en velo_max_90d worden NIET gemapt!

// FIX:
velo_rating: rider.race.current.rating,
velo_max_30d: rider.race.max30?.rating,  // ← TOEVOEGEN
velo_max_90d: rider.race.max90?.rating,  // ← TOEVOEGEN
```

#### Problem 3: Missing gender mapping
```typescript
// GENDER IS IN ZWIFTRACING API!
gender: rider.gender,  // ← TOEVOEGEN (is er al in API response)
```

### Updated Sync Script
```typescript
// File: backend/definitieve-sync.ts
// Lines to update:

const dbRider: any = {
  rider_id: rider.riderId,
  name: rider.name,
  country_code: rider.country,
  weight_kg: rider.weight,
  height_cm: rider.height,
  ftp: rider.zpFTP,
  zp_category: rider.zpCategory,
  
  // FIX 1: Age category
  age_category: rider.age,  // ← ADD THIS
  
  // FIX 2: Gender
  gender: rider.gender,  // ← ADD THIS
  
  // Power curve (blijft hetzelfde)
  power_5s_w: extract(rider.power.w5),
  // ... rest van power curve
  
  critical_power: rider.power.CP,
  anaerobic_work_capacity: rider.power.AWC,
  compound_score: rider.power.compoundScore,
  
  // FIX 3: vELO max fields
  velo_rating: rider.race.current.rating,
  velo_max_30d: rider.race.max30?.rating,  // ← ADD THIS
  velo_max_90d: rider.race.max90?.rating,  // ← ADD THIS
  velo_rank: rider.race.current.mixed?.number,
  
  // ... rest blijft hetzelfde
};
```

---

## 🎯 PRIORITIZED TODO

### Priority 1: Complete Base Sync (URGENT)
- [ ] Fix definitieve-sync.ts mapping (3 velden toevoegen)
- [ ] Herstart sync voor resterende 31 riders
- [ ] Verificatie: 75/75 riders in database
- [ ] Check Racing Matrix frontend toont alle riders

### Priority 2: Zwift Official Enrichment (HIGH)
- [ ] Test Zwift Official OAuth authentication
- [ ] Extend sync script met Phase 2 (avatar_url, gender fallback)
- [ ] Update bestaande 75 riders met enrichment data
- [ ] Verificatie: avatar_url kolommen gevuld

### Priority 3: Team Management Endpoints (MEDIUM)
- [ ] Implement POST /api/team/members (add rider)
- [ ] Implement DELETE /api/team/members/:riderId
- [ ] Implement PATCH /api/team/members/:riderId (nickname/notes)
- [ ] Test CSV bulk upload
- [ ] Frontend integratie

### Priority 4: Auto Sync Scheduler (MEDIUM)
- [ ] Implement hourly cron job
- [ ] POST /api/sync/schedule/enable endpoint
- [ ] Rate limit monitoring
- [ ] Error handling & retry logic

### Priority 5: Race Results (LOW)
- [ ] Event results sync strategy
- [ ] Historical race data population
- [ ] Results dashboard integration

---

## 📝 QUICK COMMANDS

### Development
```bash
# Start server
cd backend && npm run dev

# Check database counts
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const {count:t} = await s.from('my_team_members').select('*',{count:'exact',head:true});
const {count:r} = await s.from('riders_unified').select('*',{count:'exact',head:true});
console.log(\`Team: \${t}, Unified: \${r}, Progress: \${r}/\${t}\`);
"

# Monitor sync
tail -f /tmp/sync-final.log

# Test API
curl http://localhost:3000/api/team/members | jq '.[:3]'
```

### Fix & Deploy
```bash
# 1. Fix sync script
code backend/definitieve-sync.ts

# 2. Run sync
cd backend && npx tsx definitieve-sync.ts

# 3. Verify
npx tsx monitor-sync-progress.ts
```

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:
- ✅ 75/75 riders in riders_unified
- ✅ 50+ kolommen per rider gevuld (ZwiftRacing data compleet)
- ✅ Racing Matrix frontend toont alle riders met stats
- ✅ view_my_team retourneert 75 riders

### Phase 2 Complete When:
- ✅ Avatar URLs aanwezig voor alle riders
- ✅ Gender field 100% gevuld
- ✅ 55+ kolommen per rider gevuld (incl. Zwift Official)

### Production Ready When:
- ✅ Hourly auto-sync actief
- ✅ Team Management CRUD werkend
- ✅ Error monitoring & logging
- ✅ Frontend volledig functioneel

---

**NEXT IMMEDIATE ACTION**: Fix `definitieve-sync.ts` en herstart voor 31 resterende riders!
