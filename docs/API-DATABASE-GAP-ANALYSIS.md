# API ↔ Database Gap Analysis
**Datum**: 25 oktober 2025  
**Status**: Complete analyse van ontbrekende velden

---

## 📊 Overzicht

Deze analyse vergelijkt de **ZwiftRacing.app API response** met onze **Prisma database schema** om te identificeren welke velden beschikbaar zijn in de API maar nog niet opgeslagen worden in de database.

---

## ✅ WAT IS AL GEÏMPLEMENTEERD

### Basic Rider Info
- ✅ `riderId` → `zwiftId`
- ✅ `name`
- ✅ `gender`
- ✅ `age`
- ✅ `country` → `countryCode`
- ✅ `height`
- ✅ `weight`

### Power Metrics
- ✅ `ftp`
- ✅ `zpFTP`
- ✅ `ftpWkg` (calculated)
- ✅ `powerToWeight`
- ✅ **Volledige power curve** (5s, 15s, 30s, 1min, 2min, 5min, 20min)
- ✅ **Power curve w/kg** (alle duraties)
- ✅ `criticalPower` (CP)
- ✅ `anaerobicWork` (AWC)
- ✅ `compoundScore`
- ✅ `powerRating`

### Category & Ranking
- ✅ `zpCategory` → `categoryRacing`
- ✅ `ranking`
- ✅ `rankingScore`

### Race Stats (Basis)
- ✅ `race.wins` → `totalWins`
- ✅ `race.podiums` → `totalPodiums`
- ✅ `race.finishes` → `totalRaces`
- ✅ `race.last.date` → `lastRaceDate` (alleen ClubMember)

---

## ❌ WAT ONTBREEKT IN DE DATABASE

### 1. **Race Rating System** (BELANGRIJK)
API heeft een geavanceerd rating systeem met historische data:

**API Structuur:**
```typescript
race: {
  last: {
    rating: number,      // ❌ ONTBREEKT
    date: number,        // ✅ Alleen lastRaceDate in ClubMember
    mixed: {             // ❌ ONTBREEKT
      category: string,  
      number: number
    },
    expires: number      // ❌ ONTBREEKT
  },
  current: {             // ❌ ONTBREEKT (hele object)
    rating: number,
    date: number,
    expires: number
  },
  max30: {               // ❌ ONTBREEKT (hele object)
    rating: number,      // Best rating laatste 30 dagen
    date: number,
    expires: number
  },
  max90: {               // ❌ ONTBREEKT (hele object)
    rating: number,      // Best rating laatste 90 dagen
    date: number,
    expires: number
  },
  dnfs: number           // ❌ ONTBREEKT - Did Not Finish count
}
```

**Impact:**
- Rating trends tonen prestatie-ontwikkeling
- Max30/Max90 voor "in vorm" detectie
- DNF ratio voor betrouwbaarheid rider
- Mixed category voor cross-category racing

---

### 2. **Phenotype/Rider Type** (ANALYTICS)
API classificeert riders op basis van hun power profile:

**API Structuur:**
```typescript
phenotype: {
  scores: {              // ❌ ONTBREEKT (hele object)
    sprinter: number,    // 0-100 score
    puncheur: number,    // 0-100 score
    pursuiter: number,   // 0-100 score
    climber: number,     // 0-100 score
    tt: number           // 0-100 score (time trial)
  },
  value: string,         // ❌ ONTBREEKT - "Sprinter", "Climber", etc.
  bias: number           // ❌ ONTBREEKT - Confidence in classification
}
```

**Impact:**
- Automatische rider type classificatie
- Team samenstelling optimalisatie (mix van types)
- Event strategy (welke rider voor welk parcours)
- Dashboard visualisatie (radar charts)

---

### 3. **Handicaps per Terrain** (ROUTE MATCHING)
API geeft handicaps voor verschillende parcours profielen:

**API Structuur:**
```typescript
handicaps: {
  profile: {             // ❌ ONTBREEKT (hele object)
    flat: number,        // Handicap op vlakke parcoursen
    rolling: number,     // Handicap op glooiende parcoursen
    hilly: number,       // Handicap op heuvelachtige parcoursen
    mountainous: number  // Handicap op berg parcoursen
  }
}
```

**Impact:**
- Event/route suitability score
- Race selection recommendations
- Performance predictions per parcours type
- Training focus areas

---

## 🔍 EXTRA ONTBREKENDE VELDEN

### 4. **Avatar & Visuals**
- ❌ `profileImageUrl` - Defined in schema maar **niet** opgeslagen in repositories
- ❌ `flagCode` - Voor custom flags (TeamNL, etc.)

### 5. **Premium Status**
- ⚠️ `isPremium` - In schema maar **niet uit API gehaald**
- ⚠️ `isBanned` - In schema maar **niet uit API gehaald**

### 6. **Points & Events**
- ⚠️ `zPoints` - Zwift racing points (in schema, mogelijk in API)
- ⚠️ `totalEvents` - Totaal events (in schema, niet specifiek in API)

---

## 📋 PRIORITERING VOOR IMPLEMENTATIE

### **🔴 PRIO 1 - HIGH VALUE** (Moet echt geïmplementeerd worden)

1. **Phenotype Scores** (`phenotype.*`)
   - **Waarom**: Zeer waardevol voor analytics & team composition
   - **Effort**: Medium - nieuwe tabel of JSON veld
   - **Database wijziging**: 
     ```prisma
     // Optie A: Aparte tabel (normalized)
     model RiderPhenotype {
       id          Int @id @default(autoincrement())
       riderId     Int @unique
       rider       Rider @relation(fields: [riderId], references: [id])
       sprinter    Float?
       puncheur    Float?
       pursuiter   Float?
       climber     Float?
       tt          Float?
       type        String?  // "Sprinter", "Climber", etc.
       bias        Float?   // Confidence score
       updatedAt   DateTime @updatedAt
     }
     
     // Optie B: JSON veld (sneller te implementeren)
     model Rider {
       ...
       phenotypeScores String? // JSON: {sprinter: 85, climber: 45, ...}
       phenotypeType   String? // "Sprinter", "Climber"
     }
     ```

2. **Race Rating History** (`race.last.rating`, `race.current.rating`, `race.max30`, `race.max90`)
   - **Waarom**: Toont form & progressie, essentieel voor performance tracking
   - **Effort**: Medium - nieuwe tabel aanbevolen
   - **Database wijziging**:
     ```prisma
     model RiderRaceRating {
       id              Int @id @default(autoincrement())
       riderId         Int
       rider           Rider @relation(fields: [riderId], references: [id])
       
       // Current rating
       currentRating   Float?
       currentDate     DateTime?
       currentExpires  DateTime?
       
       // Last race rating
       lastRating      Float?
       lastDate        DateTime?
       lastExpires     DateTime?
       lastMixedCat    String?
       lastMixedNum    Float?
       
       // Peak ratings
       max30Rating     Float?
       max30Date       DateTime?
       max90Rating     Float?
       max90Date       DateTime?
       
       updatedAt       DateTime @updatedAt
       
       @@unique([riderId])
     }
     ```

3. **DNF Count** (`race.dnfs`)
   - **Waarom**: Reliability indicator (DNF ratio)
   - **Effort**: Low - 1 extra veld
   - **Database wijziging**:
     ```prisma
     model Rider {
       ...
       totalDnfs  Int @default(0)
     }
     ```

---

### **🟡 PRIO 2 - NICE TO HAVE** (Nuttig maar niet kritisch)

4. **Handicaps per Terrain** (`handicaps.profile.*`)
   - **Waarom**: Route matching & race recommendations
   - **Effort**: Low-Medium - 4 extra velden of JSON
   - **Database wijziging**:
     ```prisma
     model Rider {
       ...
       // Terrain handicaps
       handicapFlat        Float?
       handicapRolling     Float?
       handicapHilly       Float?
       handicapMountainous Float?
     }
     ```

5. **Profile Image URL**
   - **Waarom**: Avatar display in UI
   - **Effort**: Low - 1 veld + repository update
   - **Status**: Veld bestaat al, alleen repository implementatie nodig

---

### **🟢 PRIO 3 - LOW PRIORITY** (Later indien nodig)

6. **Premium/Banned Status**
   - Check of API dit daadwerkelijk teruggeeft
   - Mogelijk alleen via andere endpoints

7. **ZPoints & Detailed Event Stats**
   - Mogelijk uit andere API endpoints

---

## 💡 AANBEVELINGEN

### Implementatie Strategie

**Fase 1: Core Analytics** (Deze sprint)
1. ✅ Power curve data (DONE)
2. 🔄 Phenotype scores → Rider type classificatie
3. 🔄 Race rating system → Form tracking
4. 🔄 DNF count → Reliability metric

**Fase 2: Enhanced Features** (Volgende sprint)
5. Handicaps per terrain → Route suitability
6. Profile images → UI polish
7. Mixed category racing data

**Fase 3: Advanced** (Future)
8. Historical rating trends (via RiderHistory tabel)
9. Phenotype evolution tracking
10. Terrain performance predictions

---

## 🛠️ TECHNISCHE IMPLEMENTATIE TIPS

### Voor Phenotype (Optie A - Normalized):
```typescript
// In repositories.ts
const phenotype = data.phenotype ? {
  sprinter: data.phenotype.scores?.sprinter,
  puncheur: data.phenotype.scores?.puncheur,
  pursuiter: data.phenotype.scores?.pursuiter,
  climber: data.phenotype.scores?.climber,
  tt: data.phenotype.scores?.tt,
  type: data.phenotype.value,
  bias: data.phenotype.bias,
} : null;

if (phenotype) {
  await prisma.riderPhenotype.upsert({
    where: { riderId: rider.id },
    update: phenotype,
    create: { riderId: rider.id, ...phenotype }
  });
}
```

### Voor Phenotype (Optie B - JSON, sneller):
```typescript
// In repositories.ts
const phenotypeData = data.phenotype ? {
  phenotypeScores: JSON.stringify(data.phenotype.scores || {}),
  phenotypeType: data.phenotype.value,
} : {};

// In upsert:
...phenotypeData,
```

### Voor Race Ratings:
```typescript
const raceRating = data.race ? {
  currentRating: data.race.current?.rating,
  currentDate: data.race.current?.date ? new Date(data.race.current.date * 1000) : null,
  lastRating: data.race.last?.rating,
  lastDate: data.race.last?.date ? new Date(data.race.last.date * 1000) : null,
  max30Rating: data.race.max30?.rating,
  max30Date: data.race.max30?.date ? new Date(data.race.max30.date * 1000) : null,
  max90Rating: data.race.max90?.rating,
  max90Date: data.race.max90?.date ? new Date(data.race.max90.date * 1000) : null,
} : {};
```

---

## 📈 VERWACHTE IMPACT

### Data Verrijking
- **Current**: ~30 velden per rider
- **After Prio 1**: ~45 velden per rider (+50%)
- **After Prio 2**: ~50 velden per rider (+67%)

### Analytics Capabilities
- ✅ Power analysis (DONE)
- 🔄 Rider type classification
- 🔄 Form tracking (current vs peak)
- 🔄 Reliability scoring (DNF ratio)
- 🔄 Route suitability matching

### Dashboard Features Enabled
1. **Rider Type Radar Charts** (phenotype)
2. **Form Indicators** (current vs max30/max90 rating)
3. **Reliability Badges** (DNF percentage)
4. **Route Recommendations** (handicaps matching)
5. **Team Composition Analysis** (mix van rider types)

---

## 🎯 CONCLUSIE

**Huidige Coverage**: ~65% van beschikbare API data wordt opgeslagen  
**Ontbrekende Data**: Vooral **analytics-focused** velden (phenotype, ratings, handicaps)  
**Grootste Wins**: 
1. Phenotype scores → Rider classification
2. Race ratings → Form tracking
3. DNF count → Reliability metric

**Aanbeveling**: Implementeer Prio 1 items (phenotype + ratings + DNF) voor maximale analytics value.
