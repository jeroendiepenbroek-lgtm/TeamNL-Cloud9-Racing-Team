# QUICK FIX: Results Table Aanmaken

## Probleem
```
Error: Could not find the table 'public.zwift_api_race_results' in the schema cache
```

## Oplossing (5 minuten)

### Stap 1: Maak de tabel aan
1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecteer je project
3. Ga naar **SQL Editor**
4. Klik **New query**
5. Kopieer/plak **ALLE inhoud** van: `backend/migrations/SUPABASE_CREATE_RESULTS_TABLE.sql`
6. Klik **Run**

✅ Verwachte output: `Table created successfully! | column_count: 25`

### Stap 2: Voeg test data toe
1. Zelfde SQL Editor
2. Klik **New query** (of clear de huidige)
3. Kopieer/plak **ALLE inhoud** van: `backend/migrations/SUPABASE_SEED_RESULTS_DATA.sql`
4. Klik **Run**

✅ Verwachte output: 
```
status: "Seed successful!"
total_results: 18
unique_events: 5
unique_riders: 5
```

### Stap 3: Test de API
Open in browser:
```
https://your-app.railway.app/api/results/team/recent?days=90&limit=50
```

✅ Verwachte JSON response met `events` array

### Stap 4: View Results Dashboard
```
https://your-app.railway.app/results
```

✅ Je ziet nu 5 event cards met race results!

---

## Waarom deze fout?

De `zwift_api_race_results` tabel moet **handmatig** aangemaakt worden in Supabase. Dit kan niet via Railway/backend code omdat:
1. Supabase = aparte database service (hosted PostgreSQL)
2. Geen automatic migrations in Supabase Free tier
3. SQL Editor = enige manier om tabellen aan te maken

---

## Bestanden Overzicht

| Bestand | Doel | Volgorde |
|---------|------|----------|
| `SUPABASE_CREATE_RESULTS_TABLE.sql` | Maak tabel aan | **1. RUN EERST** |
| `SUPABASE_SEED_RESULTS_DATA.sql` | Voeg test data toe | 2. Run daarna |
| `SUPABASE_ADD_RESULTS_COLUMNS.sql` | Extend bestaande tabel | ⚠️ Skip deze (voor later) |

---

## Troubleshooting

### ❌ Error: "relation already exists"
**Oplossing**: Tabel bestaat al, skip naar Stap 2 (seed data)

### ❌ Error: "permission denied"
**Oplossing**: Gebruik **service_role** key in Supabase, niet anon key

### ❌ API returns empty array
**Probleem**: Seed data dates zijn van 2024-11
**Oplossing**: Verhoog `days` filter naar 365:
```
/api/results/team/recent?days=365&limit=50
```

### ❌ Frontend shows "Geen results gevonden"
**Probleem**: Same as above
**Oplossing**: In ResultsModern.tsx, change default:
```typescript
const [days, setDays] = useState(365); // was 90
```

---

## Na de Fix

✅ Results Dashboard werkt  
✅ API endpoints functional  
✅ 18 test results zichtbaar  
✅ Power curves, vELO badges, rankings shown  

**Next**: Voeg echte race data toe via ZwiftRacing API sync
