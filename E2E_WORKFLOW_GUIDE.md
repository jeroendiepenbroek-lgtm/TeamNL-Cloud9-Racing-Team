# E2E Workflow Guide: Automatische Data Sync

## 🎯 Overzicht

**Oude manier** (Manueel):
- ❌ MANUAL_INSERT_RIDER_150437.sql copy-paste in Supabase
- ❌ Handmatige data entry per rider
- ❌ Geen automatische updates

**Nieuwe manier** (E2E Automated):
- ✅ API → Sourcing Tabellen → Views → Frontend Dashboard
- ✅ Automatische sync met 1 command
- ✅ Real-time updates mogelijk

---

## 📊 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                             │
├─────────────────────────────────────────────────────────────────┤
│  ZwiftRacing.app API          │  Zwift Official API             │
│  /public/riders/{riderId}     │  /api/profiles/{id}             │
│  • vELO (live, 30d, 90d)      │  • racing_score (553)           │
│  • Power curves (w/kg)        │  • FTP, weight, avatar          │
│  • Category, Phenotype        │  • Social stats, achievements   │
└───────────────┬───────────────┴──────────────┬──────────────────┘
                │                              │
                ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SOURCING TABLES (Supabase)                    │
├─────────────────────────────────────────────────────────────────┤
│  api_zwiftracing_riders       │  api_zwift_api_profiles         │
│  • rider_id (PK)              │  • rider_id (PK)                │
│  • velo, velo_90day           │  • competition_racing_score     │
│  • power_5s - power_1200s     │  • weight, ftp                  │
│  • raw_response JSONB         │  • image_src, social_fact       │
└───────────────┬───────────────┴──────────────┬──────────────────┘
                │                              │
                └──────────┬───────────────────┘
                           │ FULL OUTER JOIN
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        VIEWS (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│  v_rider_complete                                               │
│  • Unified rider profile                                        │
│  • Merged fields from both APIs                                 │
│  • data_completeness status                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Query via PostgREST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND DASHBOARD                            │
├─────────────────────────────────────────────────────────────────┤
│  • Team rosters                                                 │
│  • Performance analytics (vELO trends)                          │
│  • Power curve comparisons                                      │
│  • Real-time race results                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start: E2E Sync

### 1. Voer Migrations Uit (Eenmalig)

**Ga naar Supabase SQL Editor**:
```
https://supabase.com/dashboard/project/tfsepzumkireferencer/sql/new
```

**Paste en run**:
```bash
cat RUN_THIS_IN_SUPABASE.sql
```

**Verwacht resultaat**:
```
Success. No rows returned
```

---

### 2. Run E2E Sync Script

**Single rider sync**:
```bash
./sync-e2e.sh
```

**Output**:
```
🚀 TeamNL Cloud9 Racing - E2E Data Sync Workflow
==============================================

📊 Syncing 1 rider(s)...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📥 STEP 1: API → Sourcing Tables
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏁 Fetching rider 150437...
✅ Rider 150437 synced

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STEP 2: Sourcing Tables → Views
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Views automatically updated via FULL OUTER JOIN

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 STEP 3: Verify Views → Frontend Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╔════════════════════════════════════════════════════════════╗
║  📊 SYNCED RIDERS IN v_rider_complete                      ║
╚════════════════════════════════════════════════════════════╝

👤 JRøne CloudRacer-9 @YT (ID: 150437)
   vELO: 1413.91
   vELO 90-day: 1461.01
   Category: B
   Completeness: complete

✅ 1/1 riders have complete data
```

---

### 3. Voeg Meer Riders Toe

**Edit sync-e2e.sh**:
```bash
# Add your team's rider IDs
RIDER_IDS=(150437 123456 789012 456789)
```

**Run again**:
```bash
./sync-e2e.sh
```

**Rate limiting**: Automatisch 12 seconden delay tussen calls (5 calls/min limit)

---

## 🔄 Automatische Updates

### Optie 1: Cron Job (Scheduled Sync)

**Elke 6 uur**:
```bash
crontab -e
```

**Add line**:
```
0 */6 * * * cd /workspaces/TeamNL-Cloud9-Racing-Team && ./sync-e2e.sh >> logs/sync.log 2>&1
```

**Maak logs directory**:
```bash
mkdir -p /workspaces/TeamNL-Cloud9-Racing-Team/logs
```

---

### Optie 2: Webhook (Event-Driven)

**Create endpoint in backend/src/server.ts**:
```typescript
app.post('/api/sync/rider/:riderId', async (req, res) => {
  const { riderId } = req.params;
  
  // Trigger fetch-zwiftracing-rider.js
  const { exec } = require('child_process');
  exec(`node fetch-zwiftracing-rider.js ${riderId}`, (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, riderId, output: stdout });
  });
});
```

**Call from external service**:
```bash
curl -X POST https://your-app.com/api/sync/rider/150437
```

---

### Optie 3: Supabase Edge Function (Scheduled)

**Create function**:
```typescript
// supabase/functions/sync-riders/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const riderIds = [150437, ...]; // Your team
  
  for (const riderId of riderIds) {
    const response = await fetch(
      `https://zwift-ranking.herokuapp.com/public/riders/${riderId}`,
      { headers: { 'Authorization': '650c6d2fc4ef6858d74cbef1' } }
    );
    
    const data = await response.json();
    
    // Transform and upsert to Supabase
    await supabaseClient
      .from('api_zwiftracing_riders')
      .upsert({
        rider_id: data.riderId,
        velo: data.race.current.rating,
        // ... rest of fields
      });
    
    await delay(12000); // Rate limit
  }
  
  return new Response(JSON.stringify({ synced: riderIds.length }));
});
```

**Schedule via cron**:
```
0 */6 * * * # Runs every 6 hours
```

---

## 🎨 Frontend Integration

### Query Complete Rider Data

```typescript
// Frontend: src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://tfsepzumkireferencer.supabase.co',
  'YOUR_ANON_KEY'
);

export async function getTeamRiders(riderIds: number[]) {
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select('*')
    .in('rider_id', riderIds);
  
  if (error) throw error;
  return data;
}

export async function getRiderProfile(riderId: number) {
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select(`
      rider_id,
      full_name,
      racing_name,
      velo,
      velo_live,
      velo_30day,
      velo_90day,
      zwift_official_racing_score,
      phenotype,
      zwiftracing_category,
      power_5s_wkg,
      power_60s_wkg,
      power_300s_wkg,
      power_1200s_wkg,
      weight_kg,
      avatar_url,
      data_completeness
    `)
    .eq('rider_id', riderId)
    .single();
  
  if (error) throw error;
  return data;
}
```

---

### Real-Time Updates (Optional)

```typescript
// Listen for changes on v_rider_complete
const subscription = supabase
  .channel('rider-updates')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'api_zwiftracing_riders' 
    }, 
    (payload) => {
      console.log('Rider data updated:', payload);
      // Refresh UI
    }
  )
  .subscribe();
```

---

## 📊 Data Completeness Check

```sql
-- Check rider data status
SELECT 
  rider_id,
  full_name,
  racing_name,
  velo,
  velo_90day,
  zwift_official_racing_score,
  zwiftracing_category,
  phenotype,
  power_5s_wkg,
  power_1200s_wkg,
  data_completeness,
  CASE 
    WHEN data_completeness = 'complete' THEN '✅'
    WHEN data_completeness = 'racing_only' THEN '⚠️ Missing Zwift Official data'
    WHEN data_completeness = 'profile_only' THEN '⚠️ Missing ZwiftRacing data'
  END AS status
FROM v_rider_complete
WHERE rider_id IN (150437);
```

**Expected output**:
```
rider_id | full_name              | velo    | velo_90day | data_completeness | status
---------|------------------------|---------|------------|-------------------|------
150437   | JRøne CloudRacer-9 @YT | 1413.91 | 1461.01    | complete          | ✅
```

---

## 🔧 Troubleshooting

### Issue: "Column does not exist" error

**Cause**: Old table structure still exists

**Fix**: Run migrations with DROP CASCADE
```bash
cat RUN_THIS_IN_SUPABASE.sql
# Includes: DROP TABLE IF EXISTS api_zwiftracing_riders CASCADE;
```

---

### Issue: Empty fields in v_rider_complete

**Cause**: Missing data from one or both APIs

**Check**:
```sql
SELECT 
  rider_id, 
  data_completeness,
  CASE 
    WHEN data_completeness = 'racing_only' THEN 'Run: node fetch-zwift-official-rider.js ' || rider_id
    WHEN data_completeness = 'profile_only' THEN 'Run: node fetch-zwiftracing-rider.js ' || rider_id
  END AS action_needed
FROM v_rider_complete
WHERE data_completeness != 'complete';
```

---

### Issue: Rate limit exceeded

**Error**: `429 Too Many Requests`

**Fix**: Add delay between calls (12 seconds = 5 calls/min)
```javascript
await delay(12000);
```

---

## 📈 Performance Metrics

**Rider 150437 (JRøne CloudRacer-9 @YT)**:
- ✅ vELO live: **1413.91** (Amethyst 5)
- ✅ vELO 30-day: **1413.91**
- ✅ vELO 90-day: **1461.01** (Sapphire 4 - Peak)
- ✅ Category: **B**
- ✅ Phenotype: **Sprinter**
- ✅ Power 5s: **12.38 w/kg** (Explosive)
- ✅ Power 20min: **3.51 w/kg** (FTP equivalent)
- ✅ Zwift Official Racing Score: **553**
- ✅ Races: **23 finishes**, **4 podiums**

---

## 🎯 Next Steps

1. ✅ **Execute migrations in Supabase** (RUN_THIS_IN_SUPABASE.sql)
2. ✅ **Run E2E sync**: `./sync-e2e.sh`
3. ⏳ **Add team roster**: Edit `RIDER_IDS` in sync-e2e.sh
4. ⏳ **Setup automation**: Choose cron, webhook, or Edge Function
5. ⏳ **Integrate frontend**: Query `v_rider_complete` view
6. ⏳ **Enable real-time**: Supabase Realtime subscriptions

---

## 🔗 Resources

- **ZwiftRacing API**: https://zwift-ranking.herokuapp.com/public/riders/{riderId}
- **Zwift Official API**: https://us-or-rly101.zwift.com/api/profiles/{id}
- **Supabase Dashboard**: https://supabase.com/dashboard/project/tfsepzumkireferencer
- **View Query**: `SELECT * FROM v_rider_complete WHERE rider_id = 150437;`

---

**Automated E2E Workflow = No More Manual Inserts! 🚀**
