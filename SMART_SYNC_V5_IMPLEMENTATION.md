# Smart Sync v5.0 - Implementatie Gids

## ✅ User Stories - Requirements

### Sync-Service
- **US1**: Dynamische en efficiente sync
- **US2**: Individuele sync GET request mogelijk (voor kleine aantallen)
- **US3**: Multi rider sync afhankelijk van aantal riders (auto-strategy)
- **US4**: Bulk sync via POST request (>=5 riders, max 1000 per call)
- **US5**: Onbekende RIDER-ID overslaan, niet blocking voor sync

### Auto-sync
- **US1**: Configureerbaar via API endpoints
- **US2**: Intervallen zelf in te stellen (5-1440 minuten)
- **US3**: Configuratie opslaan in database (sync_config tabel)
- **US4**: SMART en dynamisch voor toekomst
- **US5**: Manual sync mogelijk via POST API

## 🎯 Huidige Status (v4.1)

### ✅ Al geïmplementeerd:
1. Bulk API fetch functie (`bulkFetchZwiftRacingRiders`)
2. POST /api/admin/riders endpoint (bulk add riders)
3. POST /api/admin/sync-all endpoint (manual sync)
4. GET /api/admin/sync-config endpoint
5. PUT /api/admin/sync-config endpoint
6. Database sync_config en sync_logs tabellen
7. Auto-scheduler met interval

### ⚠️ Problemen met huidige implementatie:
1. `executeSyncJob()` gebruikt nog steeds loop met individuele calls
2. Geen smart strategy (altijd bulk, ook voor 1-2 riders)
3. Onbekende rider IDs worden niet overgeslagen (blocking)
4. Config update restart scheduler niet automatisch

## 🔧 Benodigde Wijzigingen

### 1. Smart Sync Strategy Functie

Voeg toe na `bulkFetchZwiftRacingRiders()`:

```typescript
// SMART SYNC THRESHOLDS
const BULK_SYNC_THRESHOLD = 5; // Gebruik bulk sync voor >= 5 riders
const INDIVIDUAL_SYNC_DELAY = 1000; // 1 sec tussen individuele calls
const MAX_BULK_SIZE = 1000; // ZwiftRacing API limiet

// Individual fetch voor enkele rider
async function fetchSingleZwiftRacingRider(riderId: number): Promise<any | null> {
  try {
    const response = await axios.get(
      `https://zwift-ranking.herokuapp.com/public/riders/${riderId}`,
      {
        headers: { 'Authorization': ZWIFTRACING_API_TOKEN },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.warn(`⚠️  Rider ${riderId} not found (404) - skipping`);
      return null; // Non-blocking
    } else if (error.response?.status === 429) {
      console.warn(`🚫 Rate limited for rider ${riderId}`);
      throw error;
    } else {
      console.warn(`⚠️  Failed to fetch rider ${riderId}:`, error.message);
      return null;
    }
  }
}

// SMART SYNC: Automatisch kiezen tussen bulk/individual
async function smartSyncRiders(
  riderIds: number[],
  authToken: string
): Promise<{ synced: number; failed: number; skipped: number; errors: string[] }> {
  const results = { synced: 0, failed: 0, skipped: 0, errors: [] as string[] };
  if (riderIds.length === 0) return results;
  
  const strategy = riderIds.length >= BULK_SYNC_THRESHOLD ? 'bulk' : 'individual';
  console.log(`🎯 Using ${strategy} sync for ${riderIds.length} riders`);
  
  // BULK STRATEGY (>= 5 riders)
  if (strategy === 'bulk') {
    const chunks: number[][] = [];
    for (let i = 0; i < riderIds.length; i += MAX_BULK_SIZE) {
      chunks.push(riderIds.slice(i, i + MAX_BULK_SIZE));
    }
    
    for (const chunk of chunks) {
      const racingDataMap = await bulkFetchZwiftRacingRiders(chunk);
      
      for (const riderId of chunk) {
        const racingData = racingDataMap.get(riderId);
        
        if (!racingData) {
          console.warn(`⚠️  No data for rider ${riderId} - skipping`);
          results.skipped++;
          continue; // NON-BLOCKING
        }
        
        try {
          // Save ZwiftRacing data
          await supabase.from('api_zwiftracing_riders').upsert({
            id: riderId,
            rider_id: riderId,
            name: racingData.name,
            country: racingData.country,
            velo_live: racingData.race?.current?.rating || null,
            velo_30day: racingData.race?.max30?.rating || null,
            // ... rest of fields
            fetched_at: new Date().toISOString()
          }, { onConflict: 'rider_id' });
          
          // Fetch Zwift Official profile
          await delay(250);
          try {
            const profileResponse = await axios.get(
              `https://us-or-rly101.zwift.com/api/profiles/${riderId}`,
              { headers: { 'Authorization': authToken, 'User-Agent': 'Zwift/1.0' }, timeout: 10000 }
            );
            
            await supabase.from('api_zwift_api_profiles').upsert({
              rider_id: riderId,
              first_name: profileResponse.data.firstName,
              // ... rest of fields
              fetched_at: new Date().toISOString()
            }, { onConflict: 'rider_id' });
          } catch (profileError: any) {
            if (profileError.response?.status === 404) {
              console.warn(`⚠️  Rider ${riderId} profile not found (404)`);
            }
          }
          
          // Update last_synced
          await supabase.from('team_roster').update({ 
            last_synced: new Date().toISOString() 
          }).eq('rider_id', riderId);
          
          results.synced++;
          console.log(`✅ Rider ${riderId} synced`);
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${riderId}: ${error.message}`);
        }
      }
    }
  }
  
  // INDIVIDUAL STRATEGY (< 5 riders)
  else {
    for (const riderId of riderIds) {
      try {
        const racingData = await fetchSingleZwiftRacingRider(riderId);
        
        if (!racingData) {
          results.skipped++;
          continue; // NON-BLOCKING
        }
        
        // ... same save logic as bulk
        
        await delay(INDIVIDUAL_SYNC_DELAY);
        results.synced++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${riderId}: ${error.message}`);
      }
    }
  }
  
  return results;
}
```

### 2. Update executeSyncJob()

Vervang huidige loop met:

```typescript
async function executeSyncJob(...) {
  // ... existing setup code ...
  
  const riderIds = riders.map(r => r.rider_id);
  console.log(`📊 Starting smart sync for ${riderIds.length} riders`);
  
  const authToken = await getZwiftCookie();
  const syncResults = await smartSyncRiders(riderIds, authToken); // ← NEW
  
  const { synced, failed, skipped, errors } = syncResults;
  
  const duration = Date.now() - startTime;
  const status = failed === 0 ? 'success' : (synced > 0 ? 'partial' : 'failed');
  
  if (logId) {
    await updateSyncLog(logId, {
      status,
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      total_items: riderIds.length,
      success_count: synced,
      failed_count: failed,
      error_message: errors.slice(0, 5).join('; '),
      metadata: { skipped_count: skipped, all_errors: errors }
    });
  }
  
  console.log(`✅ Sync complete: ${synced} synced, ${failed} failed, ${skipped} skipped (${duration}ms)`);
  return { success: true, synced, failed, skipped, logId };
}
```

### 3. Update Config Validatie

In `PUT /api/admin/sync-config`, fix validatie:

```typescript
// enabled is optioneel
if (enabled !== undefined && typeof enabled !== 'boolean') {
  return res.status(400).json({ success: false, error: 'enabled must be boolean' });
}
```

### 4. Test Scenarios

Na implementatie testen:

1. **Individual Sync (1-4 riders)**
   ```bash
   POST /api/admin/riders
   { "rider_ids": [150437] }
   
   # Expected: "Using individual sync for 1 riders"
   ```

2. **Bulk Sync (5+ riders)**
   ```bash
   POST /api/admin/riders
   { "rider_ids": [150437, 1406356, 1813927, 2703740, 2878630] }
   
   # Expected: "Using bulk sync for 5 riders"
   ```

3. **Unknown Rider (404)**
   ```bash
   POST /api/admin/riders
   { "rider_ids": [999999999, 150437] }
   
   # Expected: "skipped: 1" (non-blocking, rider 150437 succeeds)
   ```

4. **Config Update**
   ```bash
   PUT /api/admin/sync-config
   { "enabled": false }
   
   # Expected: "Sync config updated and scheduler restarted"
   ```

5. **Manual Sync**
   ```bash
   POST /api/admin/sync-all
   
   # Expected: Works regardless of auto-sync enabled status
   ```

## 🚀 Deployment Checklist

- [ ] Backup huidige server.ts
- [ ] Implementeer smartSyncRiders functie
- [ ] Update executeSyncJob om smartSyncRiders te gebruiken
- [ ] Fix config validatie
- [ ] Update version naar v5.0
- [ ] Compileer TypeScript (`npm run build`)
- [ ] Test lokaal met verschillende scenario's
- [ ] Push naar GitHub
- [ ] Deploy naar Railway (`railway up` of auto-deploy)
- [ ] Verify logs: "Environment loaded (v5.0 - Smart Sync)"
- [ ] Test endpoints via Postman/curl

## 📊 Verwachte Resultaten

### Voor huidige team (24 riders):
- Strategy: **bulk** (24 >= 5)
- ZwiftRacing calls: **1 bulk POST** (was: 24 individual GETs)
- Zwift Official calls: **24 individual GETs** (met 250ms delay)
- Rate limiting: **OPGELOST** ✅
- Unknown riders: **Worden overgeslagen** ✅
- Total time: ~7-8 seconden (was: 24+ seconden met 429 errors)

### Voor kleine sync (2 riders):
- Strategy: **individual** (2 < 5)
- ZwiftRacing calls: **2 individual GETs** (met 1s delay)
- Zwift Official calls: **2 individual GETs** (met 1s delay)
- Total time: ~4 seconden

## 💡 Future Improvements

1. **Adaptieve thresholds**: Pas BULK_SYNC_THRESHOLD aan op basis van rate limit response
2. **Retry logic**: Automatisch retry bij 429 met exponential backoff
3. **Batch optimization**: Groepeer Official API calls per 10 met 3s delay tussen batches
4. **Cache strategy**: Cache frequent riders voor kortere tijd, inactieve riders langer
5. **Webhook triggers**: Sync automatisch na Zwift race finish events

## 🆘 Troubleshooting

### Probleem: Nog steeds 429 errors
- Check version in logs: "Environment loaded (v5.0 - Smart Sync)"
- Check strategy gebruikt: "Using bulk sync for X riders"
- Verify geen oude syncRiderFromAPIs() calls meer in logs

### Probleem: Riders worden niet synced
- Check "skipped" count in response
- Check logs voor "No data for rider X - skipping"
- Verify rider exists op ZwiftRacing API manually

### Probleem: Config update werkt niet
- Check sync_config table exists
- Check scheduler restart logs
- Verify interval changed in next_run_at field

##
 ✅ Success Criteria

De implementatie is succesvol als:
1. ✅ Logs tonen "v5.0 - Smart Sync" bij startup
2. ✅ < 5 riders → individual strategy
3. ✅ >= 5 riders → bulk strategy
4. ✅ 404 riders → logged as "skipped", sync continues
5. ✅ Geen 429 errors meer in Railway logs
6. ✅ Config API endpoints werken (GET/PUT)
7. ✅ Manual sync werkt altijd
8. ✅ Auto-sync interval configureerbaar (5-1440 min)
