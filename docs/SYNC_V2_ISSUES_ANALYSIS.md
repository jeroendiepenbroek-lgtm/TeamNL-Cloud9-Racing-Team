# Sync V2 Issues Analysis

## Datum: 21 november 2025

### 🐛 Problemen Gevonden

#### 1. ❌ Riders Tabel Vervuild (455 vs 75 riders)
**Probleem**: 
- `riders` tabel bevat 455+ riders (unknown riders)
- `my_team_members` bevat slechts 75 team riders
- Sync V2 haalt correct alleen my_team_members, maar oude data blijft staan

**Oorzaak**: 
- Legacy club sync heeft alle 455 club members geïmporteerd
- `riders` tabel wordt niet automatisch opgeschoond

**Oplossing**: 
```sql
DELETE FROM riders WHERE rider_id NOT IN (SELECT rider_id FROM my_team_members);
```

---

#### 2. ❌ Power Intervals Niet Gemapped
**Probleem**: 
- Rider sync mapt GEEN power data (5s, 15s, 30s, 1m, 2m, 5m, 20m)
- Alleen basic fields: weight, height, FTP, vELO
- Power data is beschikbaar in API: `rider.power.wkg5`, `rider.power.w5`, etc.

**Missing Fields**:
```typescript
// W/kg intervals
power_wkg5: rider.power?.wkg5       // ❌ MISSING
power_wkg15: rider.power?.wkg15     // ❌ MISSING
power_wkg30: rider.power?.wkg30     // ❌ MISSING
power_wkg60: rider.power?.wkg60     // ❌ MISSING
power_wkg120: rider.power?.wkg120   // ❌ MISSING
power_wkg300: rider.power?.wkg300   // ❌ MISSING
power_wkg1200: rider.power?.wkg1200 // ❌ MISSING

// Absolute Watts intervals
power_w5: rider.power?.w5           // ❌ MISSING
power_w15: rider.power?.w15         // ❌ MISSING
power_w30: rider.power?.w30         // ❌ MISSING
power_w60: rider.power?.w60         // ❌ MISSING
power_w120: rider.power?.w120       // ❌ MISSING
power_w300: rider.power?.w300       // ❌ MISSING
power_w1200: rider.power?.w1200     // ❌ MISSING
```

**API Data Structure** (ZwiftRider.power):
```typescript
power?: {
  wkg5?: number;    // 5 sec W/kg
  wkg15?: number;   // 15 sec
  wkg30?: number;   // 30 sec
  wkg60?: number;   // 1 min
  wkg120?: number;  // 2 min
  wkg300?: number;  // 5 min
  wkg1200?: number; // 20 min
  w5?: number;      // 5 sec Watts
  w15?: number;
  w30?: number;
  w60?: number;
  w120?: number;
  w300?: number;
  w1200?: number;
}
```

---

#### 3. ❌ Sync Timings Incorrect
**Probleem**: 
- Rider sync draait om de **90 minuten** (zou 60 min moeten zijn)
- Event sync configuratie klopt niet met verwachtingen

**Huidige Configuratie** (`server.ts` line 155-158):
```typescript
// Rider Sync: Every 90 minutes
const riderCronExpression = '0,30 */3 * * *'; // At :00 and :30, every 3 hours
console.log('✅ Rider Sync (P1): Every 90 min - Safe POST rate limit (16x/dag)');

// At: 00:00, 00:30, 03:00, 03:30, 06:00, 06:30, 09:00, 09:30, 12:00, 12:30, 15:00, 15:30, 18:00, 18:30, 21:00, 21:30
// = 16x per dag = elke 90 minuten
```

**Verwacht**:
```typescript
// Every 60 minutes
const riderCronExpression = '0 * * * *'; // At :00 every hour
// = 24x per dag = elk uur
```

**Rate Limit Check**:
- ZwiftRacing API: POST /public/riders = 1 call per 15 minuten
- 60 min interval = 4x veilige marge ✅
- 90 min interval = 6x veilige marge (te conservatief)

**Event Sync Timings**:
- NEAR events: Elke 15 min (at :05, :20, :35, :50) ✅
- FULL scan: Elke 3 uur (at :50) ✅

---

## 🔧 Fixes Needed

### Fix 1: Clean Orphaned Riders
```sql
-- Run in Supabase SQL Editor
DELETE FROM riders WHERE rider_id NOT IN (SELECT rider_id FROM my_team_members);
```

### Fix 2: Map Power Intervals in Rider Sync
**File**: `backend/src/services/sync-v2.service.ts` (line ~115-129)

**Add**:
```typescript
const riders = ridersData.map(rider => ({
  rider_id: rider.riderId,
  name: rider.name || `Rider ${rider.riderId}`,
  // ... existing fields ...
  
  // Power intervals - W/kg
  power_wkg5: rider.power?.wkg5 || undefined,
  power_wkg15: rider.power?.wkg15 || undefined,
  power_wkg30: rider.power?.wkg30 || undefined,
  power_wkg60: rider.power?.wkg60 || undefined,
  power_wkg120: rider.power?.wkg120 || undefined,
  power_wkg300: rider.power?.wkg300 || undefined,
  power_wkg1200: rider.power?.wkg1200 || undefined,
  
  // Power intervals - Absolute Watts
  power_w5: rider.power?.w5 || undefined,
  power_w15: rider.power?.w15 || undefined,
  power_w30: rider.power?.w30 || undefined,
  power_w60: rider.power?.w60 || undefined,
  power_w120: rider.power?.w120 || undefined,
  power_w300: rider.power?.w300 || undefined,
  power_w1200: rider.power?.w1200 || undefined,
  
  // Critical Power & Anaerobic Work Capacity
  power_cp: rider.power?.CP || undefined,
  power_awc: rider.power?.AWC || undefined,
  
  last_synced: new Date().toISOString(),
}));
```

### Fix 3: Adjust Rider Sync Interval
**File**: `backend/src/server.ts` (line ~155)

**Change**:
```typescript
// FROM:
const riderCronExpression = '0,30 */3 * * *'; // Every 90 min
intervalMinutes: 90,

// TO:
const riderCronExpression = '0 * * * *'; // Every 60 min (hourly)
intervalMinutes: 60,
```

---

## 📊 Expected Results After Fixes

### Rider Data
```
✅ riders table: 75 riders (matches my_team_members)
✅ All power intervals populated:
   - power_wkg5, power_wkg15, power_wkg30, power_wkg60, power_wkg120, power_wkg300, power_wkg1200
   - power_w5, power_w15, power_w30, power_w60, power_w120, power_w300, power_w1200
   - power_cp, power_awc
```

### Sync Timings
```
✅ Rider Sync: Every 60 minutes (24x/dag)
✅ Event Sync NEAR: Every 15 minutes (96x/dag)
✅ Event Sync FULL: Every 3 hours (8x/dag)
```

### Dashboard Display
```
✅ Results dashboard shows complete power curves
✅ Team dashboard shows accurate rider power stats
✅ Only your 75 team members visible
```

---

## 🧪 Verification

### After Cleanup:
```sql
SELECT COUNT(*) FROM riders; -- Should be 75
SELECT COUNT(*) FROM my_team_members; -- Should be 75
SELECT COUNT(*) FROM view_my_team; -- Should be 75
```

### After Power Intervals Fix:
```sql
SELECT 
  rider_id,
  name,
  power_wkg5, power_wkg15, power_wkg30, power_wkg60, power_wkg120, power_wkg300, power_wkg1200,
  power_w5, power_w15, power_w30, power_w60, power_w120, power_w300, power_w1200,
  power_cp, power_awc
FROM riders
WHERE rider_id = 150437;
```

### After Sync Timing Fix:
Check logs voor:
```
[CRON] Rider Sync (PRIORITY 1) triggered at [time]
```
Should run every 60 minutes (not 90).
