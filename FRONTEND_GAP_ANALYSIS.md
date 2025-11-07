# Frontend Gap Analysis - Wat ontbreekt er?

**Status**: 2 riders, 70 velden per rider, maar minimale visualisatie  
**Datum**: 2025-11-07

---

## 📊 WAT IS ER NU?

### Huidige UI (Screenshot analyse)

**Stats Cards** (4):
- ✅ Total Riders: 2
- ✅ Avg Ranking: 1500
- ⚠️ Avg FTP: "-W" (geen data getoond!)
- ✅ Total Wins: 0

**Riders Tabel** (9 kolommen):
1. ✅ ZWIFT ID (leeg - zou rider_id moeten zijn)
2. ✅ NAAM
3. ✅ CLUB
4. ✅ RANKING (race_current_rating - 16 decimalen! 😱)
5. ⚠️ CAT (Category badge "?" - zp_category bestaat!)
6. ❌ FTP (toont "-" terwijl zp_ftp=270 in DB!)
7. ✅ WEIGHT
8. ✅ W/KG (watts_per_kg computed)
9. ✅ RACES (race_finishes)
10. ✅ WINS (race_wins)
11. ✅ Favorite star

**Buttons**:
- ✅ Add Rider
- ✅ Bulk Upload
- ✅ Sync All
- ✅ Export CSV

---

## ❌ WAT ONTBREEKT ER?

### 1. **Basis Data Display Issues**

#### FTP niet zichtbaar
```
UI toont: "-"
DB heeft: zp_ftp = 270
```
**Probleem**: Frontend query selecteert oude `ftp` kolom (deprecated), niet `zp_ftp`

#### Category badge leeg
```
UI toont: "?"
DB heeft: zp_category = "B"
```
**Probleem**: Mapping van zp_category → CAT badge niet correct

#### Ranking te veel decimalen
```
UI toont: 1397.8074155465263
Beter: 1398 (afgerond)
```
**Probleem**: Geen `toFixed(0)` in frontend

#### Zwift ID kolom leeg
```
Kolom header: "ZWIFT ID"
Waarde: leeg
DB heeft: rider_id = 150437
```
**Probleem**: Query gebruikt nog oude `zwift_id` kolom naam

---

### 2. **Ontbrekende Power Data** (18 velden!)

**Beschikbaar in DB maar NIET in UI**:
- `power_wkg5` (5-sec sprint) = 13.027 W/kg 💪
- `power_wkg15` (15-sec sprint)
- `power_wkg30` (30-sec)
- `power_wkg60` (1-min)
- `power_wkg120` (2-min)
- `power_wkg300` (5-min)
- `power_wkg1200` (20-min FTP test)
- Absolute watts: `power_w5`, `power_w15`, etc.
- Power rating: `power_rating` = 1152.42
- Critical Power: `power_cp`, `power_awc`

**Gewenste visualisatie**:
```
Power Curve Graph
┌─────────────────────────────┐
│  W/kg                       │
│  15 ┤                       │
│  13 ┼●──────────┐           │ ← 5sec: 13.0
│  10 ┤          ╰──┐         │
│   5 ┤             ╰────●    │ ← 1200sec: 3.4
│     └─────────────────────  │
│      5s  30s  2m  5m   20m  │
└─────────────────────────────┘
```

---

### 3. **Ontbrekende Phenotype Data** (7 velden!)

**Beschikbaar in DB maar NIET in UI**:
- `phenotype_value` = "Sprinter" ⚡
- `phenotype_sprinter` = 96.6 (zeer hoog!)
- `phenotype_puncheur` = score
- `phenotype_pursuiter` = score
- `phenotype_climber` = score
- `phenotype_tt` = score
- `phenotype_bias` = betrouwbaarheid

**Gewenste visualisatie**:
```
Phenotype Badge in tabel:
┌──────────────────┐
│  ⚡ Sprinter     │  ← Kleur badge: groen/rood/blauw
│  Score: 96.6/100 │
└──────────────────┘

Phenotype Radar Chart (detail view):
       Sprinter
           *
         /   \
    TT  *     *  Puncheur
        |     |
    Climber   Pursuiter
```

---

### 4. **Ontbrekende Race Stats** (14 velden!)

**Beschikbaar in DB maar NIET in UI**:
- `race_last_rating` + `race_last_date`
- `race_max30_rating` + `race_max30_date` (beste 30d)
- `race_max90_rating` + `race_max90_date` (beste 90d)
- `race_dnfs` (Did Not Finish count)
- `race_podiums` (top-3 finishes)

**Huidige tabel toont**:
- RACES (finishes) = 0 ❌ (JRøne heeft 24!)
- WINS = 0 ✅ (klopt)

**Probleem**: `race_finishes` niet correct geselecteerd in query

**Gewenste visualisatie**:
```
Race History Chart
Rating
1500 ┤     ╭─●  ← Max 90d
1400 ┼────●      ← Current
1300 ┤   ╭╯
     └──────────►
     30d  60d  90d

Stats:
• Finishes: 24
• Wins: 0 (0%)
• Podiums: ? 
• DNFs: ?
```

---

### 5. **Ontbrekende Handicap Data** (4 velden!)

**Beschikbaar in DB maar NIET in UI**:
- `handicap_flat` = 135.41
- `handicap_rolling` = ?
- `handicap_hilly` = ?
- `handicap_mountainous` = ?

**Gewenste visualisatie**:
```
Terrain Profile
┌────────────────────┐
│ Flat:        135.4 │ ████████████░░ 88%
│ Rolling:     ?     │ 
│ Hilly:       ?     │
│ Mountainous: ?     │
└────────────────────┘
```

---

### 6. **Ontbrekende Personal Info**

**Beschikbaar in DB maar NIET in UI**:
- `name` (nu wel zichtbaar ✅)
- `gender` = "M" (niet getoond)
- `age` = "Vet" (Veteran - niet getoond)
- `country` = "NL" (niet getoond)
- `height` = 183cm (niet getoond)

**Gewenste visualisatie**:
```
Rider Profile Card
┌─────────────────────────┐
│  🇳🇱 JRøne              │
│  M, Vet (40-49)         │
│  183cm, 74kg            │
│  TeamNL                 │
└─────────────────────────┘
```

---

## 🔧 PRIORITEIT FIXES

### P0: KRITIEK (Data is er maar niet zichtbaar)
1. **FTP fix**: Query `zp_ftp` ipv `ftp`
2. **Category fix**: Query `zp_category` ipv oude veld
3. **Races fix**: Query `race_finishes` ipv oude kolom
4. **Rider ID fix**: Query `rider_id` ipv `zwift_id`
5. **Ranking round**: `toFixed(0)` voor race_current_rating

### P1: HOOG (Nieuwe features met bestaande data)
6. **Power curve graph**: Visualiseer 7 power points (5s-1200s)
7. **Phenotype badge**: Toon dominant type in tabel
8. **Age/gender**: Voeg toe aan rider profile
9. **Country flag**: 🇳🇱 emoji of icon

### P2: MEDIUM (Analytics features)
10. **Phenotype radar chart**: Detail view met 5 scores
11. **Race history graph**: Rating over tijd (last/max30/max90)
12. **Handicap profile**: 4 terrain types horizontale bars
13. **Power rating badge**: 1152 rating met kleur (A/B/C/D)

### P3: LAAG (Nice-to-have)
14. **Export met alle velden**: Nu 9 kolommen, kan 70 zijn
15. **Advanced filters**: Filter op phenotype, category, rating range
16. **Compare riders**: Side-by-side power curves
17. **Team analytics**: Gem. power per phenotype, rating verdeling

---

## 📋 FRONTEND CODE ANALYSIS

### Wat moet er aangepast?

#### 1. API Query Fix (riders endpoint)
**Huidige query** (vermoedelijk):
```typescript
// FOUT - oude kolom namen
SELECT 
  zwift_id,    // ❌ Bestaat niet meer
  ftp,         // ❌ Deprecated
  ranking      // ❌ Bestaat niet meer
FROM riders
```

**Nieuwe query** (correct):
```typescript
// CORRECT - migration 007 kolom namen
SELECT 
  rider_id,           // ✅ Nieuwe PK
  zp_ftp,             // ✅ FTP van ZwiftPower
  zp_category,        // ✅ A/B/C/D/E
  race_current_rating,// ✅ Rating (was ranking)
  race_finishes,      // ✅ Total races
  race_wins,          // ✅ Victories
  power_wkg5,         // ✅ Sprint power
  phenotype_value,    // ✅ Rider type
  watts_per_kg        // ✅ Computed in view
FROM riders_computed  // ✅ Use view with computed fields
```

#### 2. Frontend Display Fix
**Locatie**: Vermoedelijk `frontend/components/RidersTable.tsx` of similar

**Fixes**:
```typescript
// FTP kolom
<td>{rider.zp_ftp || '-'} W</td>  // was: rider.ftp

// Category badge
<Badge color={getCategoryColor(rider.zp_category)}>
  {rider.zp_category}  // was: '?'
</Badge>

// Ranking (afgerond)
<td>{Math.round(rider.race_current_rating)}</td>  // was: rider.ranking

// Rider ID kolom
<td>{rider.rider_id}</td>  // was: rider.zwift_id

// Races
<td>{rider.race_finishes}</td>  // was: rider.total_races_compat
```

---

## 🎯 QUICK WINS (30 min werk)

**Stap 1**: Fix API query (backend)
```typescript
// src/api/endpoints/riders.ts of similar
const riders = await supabase
  .from('riders_computed')  // ← Use view!
  .select('rider_id, name, zp_ftp, zp_category, race_current_rating, race_finishes, race_wins, weight, watts_per_kg, club_name')
  .order('race_current_rating', { ascending: false });
```

**Stap 2**: Fix frontend display
```typescript
// Update alle kolommen naar nieuwe veld namen
- rider.zwift_id → rider.rider_id
- rider.ftp → rider.zp_ftp
- rider.ranking → Math.round(rider.race_current_rating)
- rider.total_races_compat → rider.race_finishes
```

**Stap 3**: Test
- Refresh page → FTP toont "270 W"
- Category toont "B"
- Races toont "24"
- Ranking toont "1398" (niet 1397.807...)

**Result**: Alle basis data zichtbaar! ✅

---

## 🚀 ROADMAP NIEUWE FEATURES

### Week 1: Basis Data Fixes
- [ ] Fix FTP/Category/Races display
- [ ] Round rankings
- [ ] Show rider_id
- [ ] Add age/gender/country to profile

### Week 2: Power Visualisatie
- [ ] Power curve line chart (7 punten)
- [ ] Power rating badge met kleur
- [ ] Compare power curves tussen riders

### Week 3: Phenotype & Race
- [ ] Phenotype badge in tabel
- [ ] Phenotype radar chart (detail)
- [ ] Race history graph (last/max30/max90)
- [ ] Podiums/DNFs stats

### Week 4: Advanced Analytics
- [ ] Handicap terrain profile
- [ ] Team analytics dashboard
- [ ] Export all 70 fields
- [ ] Advanced filters

---

## 💡 DESIGN IDEAS

### Power Curve Widget (rechts van tabel)
```
╔═══════════════════════╗
║ Power Profile         ║
║ ┌────────────┐        ║
║ │ ●──┐       │        ║
║ │    ╰──●    │        ║
║ └────────────┘        ║
║ 5s: 13.0 | 20m: 3.4  ║
║ Rating: 1152 (B)      ║
╚═══════════════════════╝
```

### Phenotype Badge (in tabel cel)
```
⚡ Sprinter  ← Groen voor sprinter
🏔️ Climber   ← Rood voor klimmer
⏱️ TT        ← Blauw voor tijdrijder
👊 Puncheur  ← Oranje voor puncher
```

### Stats Cards Verbetering
```
Before:                After:
┌────────────┐        ┌────────────────┐
│ Avg FTP    │        │ Avg FTP        │
│ -W         │   →    │ 270 W          │
└────────────┘        │ Range: 250-290 │
                      └────────────────┘
```

---

## 🔍 WAAR ZIJN DE FRONTEND FILES?

**Vermoedelijk structuur**:
```
frontend/
├── components/
│   ├── RidersTable.tsx      ← Fix hier de kolom mapping
│   ├── StatsCards.tsx       ← Fix Avg FTP berekening
│   └── RiderProfile.tsx     ← Voeg power/phenotype toe
├── api/
│   └── riders.ts            ← Fix de query
└── types/
    └── rider.ts             ← Update interface met 70 velden
```

**Maar**: Ik zie geen `frontend/` folder in workspace! 🤔

**Mogelijkheden**:
1. Frontend is aparte repo?
2. Frontend zit in `public/` als static HTML?
3. Backend serveert SSR templates?

---

## 📝 NEXT STEPS

1. **Find frontend code**: Waar zitten de UI components?
2. **Inspect current query**: Welke velden worden nu opgevraagd?
3. **Fix quick wins**: FTP/Category/Races/RiderID mapping
4. **Add power curve**: Line chart component met 7 data punten
5. **Add phenotype badge**: Simple badge met emoji + score

**Wil je dat ik**:
- A) Zoek naar frontend code in deze repo
- B) Check of frontend aparte repo is
- C) Maak mockup van nieuwe UI met alle 70 velden
- D) Start met backend API endpoint die alle velden returnt

Wat wil je als eerste aanpakken? 🚀
