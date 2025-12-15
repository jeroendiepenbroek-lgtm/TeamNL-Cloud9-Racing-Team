# 🏆 Team Builder - Setup Instructies

## Status
✅ Backend deployed  
✅ Frontend deployed  
❌ **Database tabellen MOETEN NOG AANGEMAAKT WORDEN**

## Fout in Railway logs:
```
Could not find the table 'public.competition_teams' in the schema cache
```

## Oplossing: Run SQL Migration in Supabase

### Stap 1: Open Supabase Dashboard
1. Ga naar https://supabase.com/dashboard
2. Open project: **TeamNL Cloud9**
3. Klik op **SQL Editor** in het linker menu

### Stap 2: Run Migration Script
1. Klik op **New Query** (of gebruik bestaande query tab)
2. Open het bestand: **`RUN_IN_SUPABASE_TEAMBUILDER.sql`**
3. Kopieer de VOLLEDIGE inhoud (Ctrl+A, Ctrl+C)
4. Plak in de Supabase SQL Editor
5. Klik op **Run** (of druk op Ctrl+Enter)

### Stap 3: Verificatie
Je zou moeten zien:
```sql
✅ Team Builder tables created!
Tables: competition_teams, team_lineups
Views: v_team_summary, v_team_lineups_full
Function: validate_team_lineup(team_id)
```

Plus een tabel met 2 sample teams:
- TeamNL ZRL A/B (Category-based)
- TeamNL Ladder 1-2-3 (vELO-based)

### Stap 4: Test Team Builder
1. Open: https://teamnl-cloud9-racing-team-production.up.railway.app/team-builder
2. Je zou nu de 2 sample teams moeten zien
3. Klik op "New Team" om een nieuw team te maken
4. Sleep riders naar het team

---

## Wat wordt er aangemaakt?

### Tabellen
- **`competition_teams`** - Team configuratie (vELO/category rules)
- **`team_lineups`** - Rider assignments met validation status

### Views
- **`v_team_summary`** - Team overview met rider counts en status
- **`v_team_lineups_full`** - Complete lineup met rider details

### Functie
- **`validate_team_lineup(team_id)`** - Validates riders against team rules

### Features
- ⚡ **vELO Teams** - Club Ladder met rank spread (bijv. 1-2-3)
- 🏆 **Category Teams** - WTRL ZRL met toegestane categorieën
- ✅ **Real-time Validation** - Groen voor valid, rood voor invalid
- 📊 **Team Status** - incomplete/ready/warning/overfilled

---

## Troubleshooting

**Als je nog steeds de fout ziet na het runnen van de SQL:**
1. Refresh de Supabase dashboard
2. Wacht 30 seconden voor schema cache update
3. Test opnieuw: `/team-builder`

**Check of tabellen bestaan:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('competition_teams', 'team_lineups');
```

**Check sample teams:**
```sql
SELECT * FROM v_team_summary;
```

---

## Team Builder Gebruik

### vELO Team (Club Ladder)
1. Competition Type: **vELO**
2. Min Rank: **1**, Max Rank: **3** (voor rank 1-2-3 spread)
3. Alleen riders met vELO 1, 2, of 3 kunnen toegevoegd worden
4. Spread warning als huidige spread > max_spread

### Category Team (WTRL ZRL)
1. Competition Type: **Category**
2. Allowed Categories: **A, B** (of andere combinatie)
3. Alleen riders in deze categorieën kunnen toegevoegd worden
4. Allow Category Up: riders mogen hoger racen (B rider in A team = OK)

### Drag & Drop
- Sleep rider van "Available Riders" naar "Lineup"
- Of klik op "+ Add" button
- Validation gebeurt automatisch
- Groene border = valid, rode border = invalid met waarschuwing

---

## Volgende Stappen

Na SQL migration:
- [ ] Test Team Builder op production
- [ ] Maak eerste echte teams
- [ ] Voeg team filter toe aan Racing Matrix (optioneel)
- [ ] Test vELO validation met rank spreads
- [ ] Test category validation met WTRL teams
