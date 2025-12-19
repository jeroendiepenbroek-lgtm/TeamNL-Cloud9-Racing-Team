# Fix: Team Filter in Passport Gallery

## 🐛 Bug
Riders filteren op team in Passport Gallery toont geen resultaten, ondanks dat er riders in het team zitten.

## 🔍 Oorzaak
De `v_rider_complete` view heeft geen `team_id` en `team_name` velden. De view heeft alleen:
- `is_team_member` (boolean)
- `team_member_since` 
- `team_last_synced`

Maar **niet** de daadwerkelijke team identificatie die nodig is voor filtering.

## ✅ Oplossing
Migration `011_add_team_info_to_riders.sql` updatet de `v_rider_complete` view met:
- `team_id` (INTEGER) - van team_lineups tabel
- `team_name` (VARCHAR) - van competition_teams tabel

## 📝 Stappen om te fixen

### 1. Voer Migration uit in Supabase

Ga naar: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

Kopieer en plak de volledige inhoud van:
```
/workspaces/TeamNL-Cloud9-Racing-Team/migrations/011_add_team_info_to_riders.sql
```

Klik op **RUN** om de migration uit te voeren.

### 2. Verifieer de fix

Na het uitvoeren van de migration, test met deze query:

```sql
-- Check riders with team info
SELECT 
  rider_id, 
  full_name, 
  team_id, 
  team_name, 
  zwift_official_category 
FROM v_rider_complete 
WHERE team_id IS NOT NULL 
LIMIT 10;
```

Je zou nu riders moeten zien met hun team_id en team_name.

### 3. Test in Passport Gallery

1. Ga naar de Rider Passport Gallery
2. Selecteer een team in het Team filter (bijv. "Cloud9 Bandits (B3)")
3. De riders van dat team moeten nu verschijnen

## 🎯 Verwacht Resultaat

**Voor de fix:**
- Team filter selecteren → Geen riders getoond ❌

**Na de fix:**
- Team filter selecteren → Riders van dat team worden getoond ✅

## 🔧 Technische Details

De view update voegt deze JOINs toe:
```sql
LEFT JOIN team_lineups tl 
  ON COALESCE(zo.rider_id, zr.rider_id) = tl.rider_id 
  AND tl.is_valid = true
LEFT JOIN competition_teams ct 
  ON tl.team_id = ct.id
```

Dit koppelt:
- Riders → Team Lineups (via rider_id)
- Team Lineups → Competition Teams (via team_id)

En voegt deze velden toe aan v_rider_complete:
- `tl.team_id`
- `ct.team_name`

## 📊 Expected Output van Verification Query

```
✅ Migration 011 complete
   Total team members: 60
   Riders with team_id: 60
   New fields: team_id, team_name
```

Als je ziet: `⚠️ No riders have team_id assigned`, dan is er een probleem met de team_lineups data.
