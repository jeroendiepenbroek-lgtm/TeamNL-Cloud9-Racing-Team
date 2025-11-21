# Sync V2 Rider Data Fix

## Probleem Gevonden

**Datum**: 21 november 2025  
**Rider ID**: 150437 (Jeroen Diepenbroek)

### Symptomen
- Sync V2 service draait zonder errors ✅
- Riders staan in `my_team_members` tabel ✅
- Riders worden wel geupdate (last_synced timestamp verandert) ✅
- **MAAR**: Physical attributes worden NIET gesynchroniseerd ❌

### Database vs API Vergelijking

**Database (Voor Fix)**:
```
rider_id: 150437
name: JRøne | CloudRacer-9 @YouTube
weight_kg: NULL  ❌
height_cm: NULL  ❌
ftp: NULL        ❌
velo_rating: NULL
```

**ZwiftRacing API**:
```
riderId: 150437
name: JRøne | CloudRacer-9 @YouTube
weight: 74       ✅ (kg)
height: 183      ✅ (cm)
zpFTP: NULL
race.current.rating: NULL
```

### Root Cause

In `backend/src/services/sync-v2.service.ts` (regel 114-121), de rider mapping code mapte **alleen**:
- rider_id
- name
- zp_category
- race_current_rating
- race_finishes
- club_id
- club_name
- last_synced

**Ontbrekende velden**:
- weight_kg ← `rider.weight`
- height_cm ← `rider.height`
- ftp ← `rider.zpFTP`
- velo_rating ← `rider.race?.current?.rating || rider.race?.last?.rating`

## Fix Toegepast

**File**: `backend/src/services/sync-v2.service.ts`  
**Lines**: 114-129

**Voor**:
```typescript
const riders = ridersData.map(rider => ({
  rider_id: rider.riderId,
  name: rider.name || `Rider ${rider.riderId}`,
  zp_category: rider.zpCategory || undefined,
  race_current_rating: rider.race?.current?.rating || undefined,
  race_finishes: rider.race?.finishes || 0,
  club_id: clubId,
  club_name: rider.club?.name || undefined,
  last_synced: new Date().toISOString(),
}));
```

**Na**:
```typescript
const riders = ridersData.map(rider => ({
  rider_id: rider.riderId,
  name: rider.name || `Rider ${rider.riderId}`,
  zp_category: rider.zpCategory || undefined,
  race_current_rating: rider.race?.current?.rating || undefined,
  race_finishes: rider.race?.finishes || 0,
  club_id: clubId,
  club_name: rider.club?.name || undefined,
  // Physical attributes - NIEUW! ✅
  weight_kg: rider.weight || undefined,
  height_cm: rider.height || undefined,
  ftp: rider.zpFTP || undefined,
  // vELO rating (from race.current.rating or race.last.rating) - NIEUW! ✅
  velo_rating: rider.race?.current?.rating || rider.race?.last?.rating || undefined,
  last_synced: new Date().toISOString(),
}));
```

## Impact

### Direct Impact
- **455 riders** in my_team_members zullen nu correct geüpdate worden
- Physical attributes (weight, height, FTP) worden nu gesynchroniseerd
- vELO rating wordt nu correct opgehaald van API

### Volgende Sync
Bij de volgende automatische rider sync (elk uur):
1. Sync V2 haalt alle 455 team members op
2. Bulk API call naar ZwiftRacing voor rider data
3. **NU OOK**: weight_kg, height_cm, ftp, velo_rating worden gemapt
4. Upsert naar `riders` tabel

### Expected Result (Na Volgende Sync)
```
rider_id: 150437
name: JRøne | CloudRacer-9 @YouTube
weight_kg: 74    ✅ (was NULL)
height_cm: 183   ✅ (was NULL)
ftp: NULL        ✅ (correct - rider heeft geen FTP op API)
velo_rating: NULL ✅ (correct - rider heeft geen vELO rating)
updated_at: [timestamp van sync]
```

## Testing

### Manual Test
```bash
# Check huidige data rider 150437
npx tsx scripts/check-rider-150437.ts

# Trigger manual rider sync
curl -X POST http://localhost:3000/api/sync/riders

# Check weer na sync
npx tsx scripts/check-rider-150437.ts
```

### Verification Queries (Supabase)
```sql
-- Check rider 150437 data
SELECT rider_id, name, weight_kg, height_cm, ftp, velo_rating, updated_at
FROM riders
WHERE rider_id = 150437;

-- Check all riders with NULL physical attributes
SELECT COUNT(*) as riders_without_weight
FROM riders
WHERE weight_kg IS NULL AND rider_id IN (
  SELECT rider_id FROM my_team_members
);

-- After sync, this should be 0 (or only riders where API also has NULL)
```

## Automatische Sync Schedule

Rider sync draait automatisch via cron job in `backend/src/server.ts`:
```typescript
// Rider Sync: Every 60 minutes
cron.schedule('0 * * * *', async () => {
  const metrics = await syncServiceV2.syncRidersCoordinated({
    intervalMinutes: 60,
    clubId: 11818
  });
});
```

## Related Files

- `backend/src/services/sync-v2.service.ts` - Sync service met fix
- `backend/src/api/zwift-client.ts` - ZwiftRacing API client (`getBulkRiders`)
- `backend/src/types/index.ts` - `ZwiftRider` interface definitie
- `scripts/check-rider-150437.ts` - Diagnostic script
- `scripts/test-rider-sync-fix.ts` - Test script voor fix

## Next Steps

1. ✅ **Fix toegepast**: Rider mapping bevat nu alle velden
2. ⏳ **Wacht op volgende sync**: Over max 60 minuten draait automatische sync
3. 🧪 **Verificatie**: Check rider 150437 na sync om te bevestigen
4. 📊 **Results Dashboard**: Zodra riders juiste data hebben, kunnen we results dashboard testen met echte data

## Lesson Learned

**Altijd alle beschikbare API velden mappen in sync flows!**

De ZwiftRacing API geeft rijke data terug, maar we mappten slechts een subset. Voor een complete sync:
1. Check API response structure (via types/index.ts)
2. Map ALLE relevante velden naar database
3. Test met een specifieke rider om mismatch te detecteren
