# 🚀 DEPLOYMENT GUIDE - 1:1 API Mapping

**Datum**: 2025-11-07 (Morgen)  
**Status**: ✅ READY TO DEPLOY  
**Commit**: 68bf258

---

## ✅ WAT IS KLAAR

Alle code en migrations zijn klaar! Je hoeft alleen nog:
1. Migration runnen in Supabase (5 min)
2. Testen dat sync werkt (2 min)

---

## 🎯 STAP 1: Run Database Migration

### Open Supabase SQL Editor
1. https://supabase.com/dashboard
2. Select project: `bktbeefdmrpxhsyyalvc`
3. Click "SQL Editor" (linker menu)

### Copy-Paste Migration
Open bestand: `supabase/migrations/007_pure_api_mapping.sql`

**Of kopieer direct**:
```bash
cat supabase/migrations/007_pure_api_mapping.sql | pbcopy
```

### Run in Supabase
1. Paste in SQL editor
2. Click "RUN" (of CMD+Enter)
3. Wacht 5-10 seconden

### Verwachte Output
```
BEGIN
... (veel ALTER TABLE outputs)
COMMIT

Query OK, 0 rows affected
```

### ⚠️ Backup
Automatisch aangemaakt: `riders_backup_20251107`

---

## 🧪 STAP 2: Verify Migration

Run deze queries in Supabase:

### Check 1: Aantal Kolommen
```sql
SELECT COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'riders';
```
**Verwacht**: `61` of hoger

### Check 2: Nieuwe Power Velden
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'riders' 
  AND column_name LIKE 'power_%';
```
**Verwacht**: 14 rijen (power_wkg5, power_w5, etc)

### Check 3: View Werkt
```sql
SELECT * FROM view_my_team LIMIT 1;
```
**Verwacht**: 1 rider met alle velden

---

## 🔄 STAP 3: Test Sync

### Railway is al Deployed
Code is automatisch deployed na push `68bf258`.

### Trigger Manual Sync
```bash
curl -X POST \
  https://teamnl-cloud9-racing-team-production.up.railway.app/api/auto-sync/trigger \
  -s | jq '.'
```

### Verwachte Response (SUCCESS!)
```json
{
  "success": true,
  "message": "Sync voltooid",
  "result": {
    "success": 1,
    "errors": 0,
    "skipped": 0
  }
}
```

**Als errors: 1** → Check Railway logs (zie Troubleshooting)

---

## ✅ STAP 4: Verify Data

### Check Rider Data
```bash
curl -s "https://teamnl-cloud9-racing-team-production.up.railway.app/api/riders/team" \
  | jq '.[0] | {rider_id, name, zp_ftp, power_wkg5, race_current_rating, phenotype_value}'
```

### Expected Output (met data!)
```json
{
  "rider_id": 150437,
  "name": "JRøne | CloudRacer-9 @YouTube",
  "zp_ftp": 270,
  "power_wkg5": 13.027,
  "race_current_rating": 1397.807,
  "phenotype_value": "Sprinter"
}
```

**Als alle velden gevuld** → **🎉 SUCCESS!**

---

## 📊 WAT IS ER VERANDERD?

### Database Changes
- ❌ **Dropped**: `watts_per_kg`, `ranking`, `ranking_score` (waren computed)
- 🔄 **Renamed**: `zwift_id` → `rider_id`
- ➕ **Added**: 40 nieuwe velden:
  - 14 power velden (power_wkg5, power_w5, power_cp, etc)
  - 12 race stats (race_current_rating, race_finishes, race_wins, etc)
  - 4 handicaps (handicap_flat, rolling, hilly, mountainous)
  - 7 phenotype (phenotype_sprinter, phenotype_value, etc)
  - 2 club (club_id, club_name)

### Code Changes
- `DbRider` interface: 21 → 61 velden
- `ZwiftRider` API type: Complete nested structure
- Sync service: Maps alle 61 velden
- Supabase service: Gebruik `rider_id` i.p.v. `zwift_id`

---

## 🐛 TROUBLESHOOTING

### Error: "column zwift_id does not exist"
**Fix**: Run migration script (STAP 1)

### Sync errors: 1
**Check Railway logs**:
```bash
railway logs --tail 100 | grep -i "autosync\|error"
```

**Mogelijke oorzaken**:
1. Migration niet gerund → column mismatch
2. View niet aangemaakt → `riders_computed` missing
3. FK constraint issue → my_team_members.rider_id

**Quick Fix**:
```sql
-- Re-run problematic parts:
ALTER TABLE my_team_members RENAME COLUMN zwift_id TO rider_id;

ALTER TABLE my_team_members 
  ADD CONSTRAINT my_team_members_rider_id_fkey 
  FOREIGN KEY (rider_id) 
  REFERENCES riders(rider_id) 
  ON DELETE CASCADE;
```

### View_my_team Empty
**Check**:
```sql
SELECT COUNT(*) FROM my_team_members;
SELECT COUNT(*) FROM riders;
```

**Fix**: Add test rider:
```sql
INSERT INTO my_team_members (rider_id) VALUES (150437);
```

---

## 🔙 ROLLBACK (only if needed!)

Als alles fout gaat:

```sql
BEGIN;

-- Restore backup
DROP TABLE IF EXISTS riders CASCADE;
ALTER TABLE riders_backup_20251107 RENAME TO riders;

-- Restore old column names
ALTER TABLE riders RENAME COLUMN rider_id TO zwift_id;
ALTER TABLE my_team_members RENAME COLUMN rider_id TO zwift_id;

-- Re-add constraints
ALTER TABLE riders ADD CONSTRAINT riders_zwift_id_key UNIQUE (zwift_id);
ALTER TABLE my_team_members 
  ADD CONSTRAINT my_team_members_zwift_id_fkey 
  FOREIGN KEY (zwift_id) 
  REFERENCES riders(zwift_id);

COMMIT;
```

Dan:
```bash
git revert 68bf258
git push origin main
```

---

## 📖 DOCUMENTATIE

- `docs/API_TO_DB_COMPLETE_MAPPING.md` - Complete 61 velden overzicht
- `supabase/migrations/007_pure_api_mapping.sql` - SQL migration
- `backend/src/types/index.ts` - TypeScript interfaces

---

## ✅ SUCCESS CHECKLIST

- [ ] Migration gerund in Supabase (geen errors)
- [ ] `SELECT COUNT(*) FROM riders` → 61+ kolommen
- [ ] Manual sync: `"errors": 0`
- [ ] API response heeft `power_wkg5`, `race_current_rating`, `phenotype_value`
- [ ] Frontend toont riders (check in browser)

**Als alle checks ✅** → Deployment SUCCESS! 🎉

---

## 🎯 VOLGENDE STAPPEN

Na succesvolle deployment:
1. **Test frontend** - Bekijk riders in UI
2. **Verify auto-sync** - Wacht 6 uur of trigger manual
3. **Analytics planning** - Welke nieuwe velden tonen?
4. **Results mapping** - Volgende: 1:1 mapping voor race results
5. **Events mapping** - Daarna: events table

---

**Geschatte tijd**: 10-15 minuten  
**Risico**: Laag (backup aanwezig, rollback mogelijk)  
**Impact**: HIGH - 40 nieuwe data velden beschikbaar! 📊
