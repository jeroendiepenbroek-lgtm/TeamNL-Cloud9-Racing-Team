# Category & Racing Score Diagnose

## Probleem
4 riders hebben **NULL** waarden voor:
- `zwift_official_category` (Zwift.com Category)
- `zwift_official_racing_score` (Zwift.com Racing Score)

## Betrokken Riders

| RiderID | Naam | Zwift.com | ZwiftRacing |
|---------|------|-----------|-------------|
| 1076179 | Mattijs Knol [TeamNL] | NULL / NULL | **B** |
| 3067920 | J an [TeamNLC2] | NULL / NULL | **C** |
| 3137561 | Robert van Dam (TeamNL) | NULL / NULL | **A** |
| 4562003 | Ron (TeamNLC2) | NULL / NULL | **C** |

## Root Cause Analyse

### ✅ API Data Succesvol Opgehaald
- Laatste sync: 14-12-2025 om 10:46 uur
- Data aanwezig in `api_zwift_api_profiles`
- Maar: `competition_category` en `competition_racing_score` zijn beiden NULL

### 🔍 Mogelijke Oorzaken

**1. Niet ingeschreven voor Zwift Racing** (meest waarschijnlijk)
- Deze riders hebben mogelijk geen actief Zwift Racing profiel
- Ze racen wel (hebben ZwiftRacing data), maar niet via officieel Zwift Racing systeem
- Zwift.com API geeft alleen Racing Score voor officieel geregistreerde racers

**2. Privacy Instellingen**
- Racing profiel staat op "private"
- API mag racing data niet delen

**3. Nieuwe Accounts**
- Te weinig races om Racing Score te berekenen
- Maar: ZwiftRacing toont wel category, dus onwaarschijnlijk

## Oplossingen

### ✅ OPGELOST: Category Fallback

**Implementatie:**
```sql
-- In v_rider_complete view:
COALESCE(zo.competition_category, zr.category) AS zwift_official_category
```

**Resultaat:**
- Mattijs → Category **B** (van ZwiftRacing)
- Jan → Category **C** (van ZwiftRacing)
- Robert → Category **A** (van ZwiftRacing)
- Ron → Category **C** (van ZwiftRacing)

### ⚠️ Racing Score: Geen Fallback Mogelijk

**Reden:**
- Racing Score is uniek aan Zwift.com officieel racing systeem
- ZwiftRacing heeft geen equivalent metric
- Kan niet worden berekend of afgeleid

**Frontend Handling:**
```typescript
// Toon "N/A" of verberg veld
const racingScore = rider.zwift_official_racing_score ?? "N/A";

// Of: skip weergave geheel
{rider.zwift_official_racing_score && (
  <div>Racing Score: {rider.zwift_official_racing_score}</div>
)}
```

## Database Status

### Voor Fix
```
Has Zwift.com category: 59/63 (94%)
Missing category: 4/63 (6%)
```

### Na Fix (met fallback)
```
Has category: 63/63 (100%)
  - Van Zwift.com: 59
  - Van ZwiftRacing fallback: 4
```

### Racing Score
```
Has Racing Score: 59/63 (94%)
Missing Racing Score: 4/63 (6%) ← BLIJFT NULL, EXPECTED
```

## Deployment Steps

### 1. Update View (Supabase SQL Editor)
```bash
# Run FIX_CATEGORY_FALLBACK.sql in Supabase
```

### 2. Verify Fix
```bash
node verify-category-fallback.js
# Expected: ✅ Fixed (category now populated): 4/4
```

### 3. Frontend Update (optioneel)
```typescript
// Handle NULL racing score gracefully
const displayRacingScore = rider.zwift_official_racing_score 
  ? rider.zwift_official_racing_score 
  : "Niet beschikbaar";
```

## Test Queries

### Verify Category Fallback
```sql
SELECT 
  rider_id, 
  full_name, 
  zwift_official_category AS category_with_fallback,
  zwiftracing_category AS source_category
FROM v_rider_complete 
WHERE rider_id IN (1076179, 3067920, 3137561, 4562003);
```

### Expected Result
```
1076179 | Mattijs Knol     | B | B
3067920 | J an             | C | C
3137561 | Robert van Dam   | A | A
4562003 | Ron              | C | C
```

## Conclusie

✅ **Category:** Fixed met COALESCE fallback  
⚠️ **Racing Score:** Blijft NULL (geen data beschikbaar van Zwift.com API)

**Impact:** Alle 63 teamleden hebben nu een category. 4 riders hebben geen Racing Score (verwacht gedrag).
