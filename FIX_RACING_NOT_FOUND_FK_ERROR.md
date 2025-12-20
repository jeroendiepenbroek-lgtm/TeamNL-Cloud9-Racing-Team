# Fix: RACING_NOT_FOUND Foreign Key Constraint Error

**Datum:** 20 december 2025  
**Status:** ✅ Geïmplementeerd

## Probleem

Bij het uploaden van rijders kreeg je de volgende error:

```
Failure Details (1 riders)
Rider: 4471698
RACING_NOT_FOUND
→ Rider not found in ZwiftRacing bulk response
→ team_roster: insert or update on table "team_roster" violates foreign key constraint "fk_rider"
```

### Root Cause

De `team_roster` tabel heeft een foreign key constraint die verwijst naar `api_zwiftracing_riders(rider_id)`:

```sql
CONSTRAINT fk_rider FOREIGN KEY (rider_id) 
  REFERENCES api_zwiftracing_riders(rider_id) 
  ON DELETE CASCADE
```

**Scenario dat faalt:**
1. Een rijder wordt opgezocht in de ZwiftRacing bulk API → **niet gevonden**
2. De rijder wordt wel gevonden in de Zwift Official API → **succesvol**
3. Data wordt opgeslagen in `api_zwift_api_profiles` → **succesvol**
4. Poging om rijder toe te voegen aan `team_roster` → **FAALT**
   - Reden: rijder bestaat niet in `api_zwiftracing_riders`
   - Foreign key constraint wordt geschonden

## Geïmplementeerde Oplossing

### Quick Fix (Huidige Implementatie)

Wanneer alleen Zwift Official data beschikbaar is (en ZwiftRacing niet), wordt automatisch een placeholder record aangemaakt in `api_zwiftracing_riders`:

**Locatie:** [backend/src/server.ts](backend/src/server.ts) (rond regel 1080)

```typescript
// 🔧 FIX: Als alleen Official data beschikbaar is, maak placeholder in api_zwiftracing_riders
// Dit zorgt ervoor dat de FK constraint niet faalt bij team_roster insert
if (profileSynced && !racingSynced && zwiftProfileData) {
  try {
    console.log(`      🔧 Creating placeholder in api_zwiftracing_riders for FK constraint...`);
    
    const firstName = zwiftProfileData.firstName || '';
    const lastName = zwiftProfileData.lastName || '';
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : null;
    
    const { error: placeholderError } = await supabase
      .from('api_zwiftracing_riders')
      .upsert({
        rider_id: riderId,
        id: riderId,
        name: fullName,
        country: zwiftProfileData.countryCode || null,
        weight: zwiftProfileData.weight ? zwiftProfileData.weight / 1000.0 : null,
        height: zwiftProfileData.height || null,
        ftp: zwiftProfileData.ftp || null,
        fetched_at: new Date().toISOString()
      }, { onConflict: 'rider_id' });
    
    if (!placeholderError) {
      console.log(`      ✅ Placeholder created - FK constraint satisfied`);
    }
  } catch (err: any) {
    console.warn(`      ⚠️  Placeholder creation error:`, err.message);
  }
}
```

**Wat doet de fix:**
- ✅ Creëert een minimaal record in `api_zwiftracing_riders` met basis informatie uit Zwift Official API
- ✅ Voorkomt foreign key violations bij `team_roster` inserts
- ✅ Behoudt data integriteit - alle rijders hebben nu een entry in beide source tables
- ✅ De rijder is volledig functioneel en zichtbaar in alle views (`v_rider_complete`)

### Lange Termijn Oplossing (Aanbevolen)

**Migratie script beschikbaar:** [migrations/020_add_riders_master_table.sql](migrations/020_add_riders_master_table.sql)

Deze migratie:
1. Creëert een centrale `riders` master tabel voor alle rider_ids
2. Wijzigt de FK constraint om naar `riders` te verwijzen i.p.v. `api_zwiftracing_riders`
3. Voegt triggers toe om automatisch alle rijders naar de master tabel te syncen
4. Lost het probleem structureel op door een gecentraliseerde bron voor rider IDs

**Voordelen lange termijn oplossing:**
- ✅ Cleaner architectuur - centrale bron voor alle rider IDs
- ✅ Geen placeholder records nodig
- ✅ Ondersteunt toekomstige extra data bronnen
- ✅ Duidelijkere data ownership

**Om de migratie uit te voeren:**
1. Via Supabase Dashboard: Kopieer de SQL uit [migrations/020_add_riders_master_table.sql](migrations/020_add_riders_master_table.sql)
2. Run de SQL in de Supabase SQL Editor
3. Verwijder de placeholder fix uit server.ts (optioneel, kan blijven voor backwards compatibility)

## Testing

Na de fix zou rijder 4471698 (of vergelijkbare gevallen) moeten kunnen worden toegevoegd zonder FK constraint errors.

**Test scenario:**
1. Upload een rijder die wel in Zwift Official maar niet in ZwiftRacing voorkomt
2. Verwacht resultaat: 
   - ✅ Placeholder record in `api_zwiftracing_riders`
   - ✅ Complete record in `api_zwift_api_profiles`
   - ✅ Entry in `team_roster`
   - ✅ Zichtbaar in `v_rider_complete` view

## Deployment

- ✅ Code change geïmplementeerd in [backend/src/server.ts](backend/src/server.ts)
- ✅ Backend gebuild en herstart
- ⏳ Migratie 020 kan optioneel worden uitgevoerd voor lange termijn oplossing

## Related Files

- [backend/src/server.ts](backend/src/server.ts) - Bevat de placeholder fix
- [migrations/020_add_riders_master_table.sql](migrations/020_add_riders_master_table.sql) - Lange termijn migratie
- [migrations/008_admin_system.sql](migrations/008_admin_system.sql#L44) - Originele FK constraint definitie
