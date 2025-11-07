# Migration 007 - Lessons Learned

## ❌ FOUTEN DIE IK MAAKTE

### 1. **Vergeten dat migration al gerund is**
**Fout**: Na het runnen van migration 007, probeerde ik hotfixes te maken die verwijzen naar oude kolomnamen zoals `zwift_id`.

**Error**: `column "zwift_id" does not exist`

**Waarom**: Migration 007 STEP 3 hernoemde `zwift_id` → `rider_id`. Alle volgende hotfixes moeten `rider_id` gebruiken!

**Oplossing**: 
- ✅ Check ALTIJD wat migration al heeft veranderd
- ✅ Hotfixes moeten standalone zijn en nieuwe schema gebruiken
- ✅ Nooit aannemen dat oude kolomnamen nog bestaan

### 2. **Aannames over bestaande kolommen**
**Fout**: Assumeerde dat `height`, `weight`, `name` etc al bestonden in riders tabel.

**Error**: `Could not find the 'height' column in the schema cache`

**Waarom**: Original schema had niet alle core fields. Migration zei "blijven zoals ze zijn" maar voegde ze NIET toe.

**Oplossing**:
- ✅ Gebruik altijd `ADD COLUMN IF NOT EXISTS` 
- ✅ Nooit aannemen dat kolommen bestaan
- ✅ Expliciet alle velden toevoegen

### 3. **Verkeerde data types**
**Fout**: `age` als INTEGER gedefined, maar API stuurt "Vet" (Veteran category).

**Error**: `invalid input syntax for type integer: "Vet"`

**Waarom**: ZwiftRacing API geeft leeftijdscategorieën terug, niet altijd numerieke leeftijd.

**Oplossing**:
- ✅ Test EERST met echte API data: `curl API | jq .`
- ✅ Check data types in actual response
- ✅ Gebruik flexibele types (TEXT vs INTEGER) als API inconsistent is

### 4. **Te veel tegelijk willen fixen**
**Fout**: Hotfixes met meerdere changes tegelijk (age + andere velden).

**Probleem**: Als één deel faalt, is onduidelijk welk deel het probleem is.

**Oplossing**:
- ✅ Eén wijziging per hotfix
- ✅ Test na elke hotfix
- ✅ Kleine, atomische changes

---

## ✅ WAT WEL WERKTE

1. **Backup tabel maken** (`riders_backup_20251107`) - veiligheidsnet
2. **IF EXISTS/IF NOT EXISTS** gebruiken - idempotent
3. **CASCADE** bij drops - voorkomt dependency errors
4. **Views voor backwards compatibility** - smooth transition
5. **Git commits na elke fix** - traceable geschiedenis

---

## 📋 HOTFIX CHECKLIST (volgende keer)

Voordat je een hotfix schrijft:

- [ ] Check welke migration al gerund is
- [ ] Verifieer huidige schema: `SELECT * FROM information_schema.columns WHERE table_name = 'riders'`
- [ ] Test met echte API data: `curl API_ENDPOINT | jq .`
- [ ] Gebruik nieuwe kolomnamen (rider_id, NIET zwift_id)
- [ ] Eén wijziging per hotfix
- [ ] Test query EERST in Supabase console
- [ ] Commit na succesvolle hotfix

---

## 🎯 CORRECTE WORKFLOW

1. **Voor migration**: Test API response → Design schema
2. **Migration**: Run in Supabase → Verify columns exist
3. **Hotfix (indien nodig)**: 
   - Check current schema
   - Use NEW column names
   - One change at a time
   - Test immediately
4. **Backend sync**: Wait for Railway deploy → Test sync endpoint
5. **Verify**: Check data populated correctly

---

## 📝 FINAL HOTFIXES VOOR MIGRATION 007

### Hotfix 1: Core fields (✅ APPLIED)
```sql
ALTER TABLE riders ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS height INTEGER;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS weight NUMERIC;
```

### Hotfix 2: Age type fix (⏳ PENDING)
```sql
-- CORRECT: Gebruikt geen zwift_id, alleen age type change
ALTER TABLE riders ALTER COLUMN age TYPE TEXT USING age::TEXT;
```

**Reden**: ZwiftRacing API geeft "Vet" (Veteran) terug, niet een nummer.

---

## 🚀 NA HOTFIXES

Test sync:
```bash
curl -X POST https://teamnl-cloud9-racing-team-production.up.railway.app/api/auto-sync/trigger
```

Verwacht: `{ "success": 1, "errors": 0 }`

---

**Datum**: 2025-11-07  
**Commit range**: 9a12da0 → 422c84a  
**Status**: Migration succesvol, 2 hotfixes needed
