# Re-upload Implementatie - Samenvatting

## ✅ Wat is Geïmplementeerd

### 1. Service Layer Updates (`src/services/subteam.ts`)

**Oude gedrag**:
```typescript
if (exists) {
  result.alreadyExists++;
  continue; // Skip rider
}
```

**Nieuwe gedrag**:
```typescript
// Haal ALTIJD verse data op
const riderData = await this.zwiftApi.getRider(zwiftId);

// Check club wijzigingen
const clubChanged = existingRider && 
                   existingRider.clubId !== riderData.club?.id;

// Update bestaande rider
if (alreadyFavorite) {
  result.updated++;
  // Log club change indien van toepassing
}
```

### 2. API Response Update (`src/api/routes.ts`)

**Toegevoegd aan response**:
```json
{
  "added": 1,
  "updated": 2,      // ← NIEUW!
  "failed": 0,
  "riders": [
    {
      "status": "updated",
      "clubChanged": true  // ← NIEUW!
    }
  ]
}
```

### 3. GUI Verbeteringen (`public/favorites-manager.html`)

**Oude upload**:
- Individuele API calls per rider (traag)
- Geen duidelijke feedback over updates

**Nieuwe upload**:
- Bulk API endpoint (sneller)
- Gedetailleerde feedback:
  ```
  ✅ Nieuw toegevoegd: 1
  🔄 Bijgewerkt: 2
  ⚠️  Club gewijzigd voor 1 rider(s)
  ```
- Auto-reload van favorites lijst na upload

---

## 🎯 Features

### ✅ Duplicate Preventie
- Database constraint op `zwiftId` (PRIMARY KEY)
- Prisma upsert: atomair INSERT of UPDATE
- Geen duplicates mogelijk

### ✅ Automatische Stats Update
Bij re-upload worden **alle velden** bijgewerkt:
- FTP en power metrics
- Handicaps
- Race statistics (wins, podiums, etc.)
- Last race date
- Country, gender, weight, height
- **ClubID** (belangrijkste voor tracking)

### ✅ Club Change Detection
```typescript
if (existingRider.clubId !== newData.club?.id) {
  // Club is gewijzigd!
  clubChanged: true
  // Nieuwe club wordt toegevoegd aan clubs tabel
}
```

### ✅ Graceful Error Handling
- Per-rider try-catch
- Gefaalde riders stoppen proces niet
- Duidelijke error messages in response

---

## 📊 Test Scenario's

### Scenario 1: Complete Re-upload
```txt
# examples/favorites-example.txt (50 riders)
150437
832234
...
```

**Verwacht**:
- `updated: 50` (als alle riders al bestaan)
- `added: 0`
- Stats van alle riders worden ververst

### Scenario 2: Mix Bestaand + Nieuw
```txt
# examples/re-upload-test.txt
150437  # Bestaand
832234  # Bestaand
123456  # Nieuw
```

**Verwacht**:
- `updated: 2`
- `added: 1`
- GUI toont beide categorieën

### Scenario 3: Club Transfer
Rider 832234 verandert van TeamNL (2281) naar OtherTeam (9999)

**Verwacht**:
- `updated: 1`
- `clubChanged: true` voor deze rider
- Beide clubs in database
- Forward scan volgt nu beide clubs

---

## ⚡ Performance

### Rate Limiting
- **Constraint**: 5 riders/min (ZwiftRacing API)
- **Implementation**: 12 sec wachttijd tussen calls
- **Impact**: 
  - 10 riders = ~2 min
  - 50 riders = ~10 min
  - 100 riders = ~20 min

### Optimalisatie Tip
Voor grote uploads (>50 riders):
- Upload 1x bij initiële setup
- Daarna: gebruik scheduler (automatisch elke 6 uur)
- Handmatige re-upload alleen bij specifieke behoefte

---

## 🔍 Verificatie

### Database Check
```sql
-- Check duplicates (moet 0 zijn)
SELECT zwiftId, COUNT(*) 
FROM riders 
WHERE isFavorite = 1 
GROUP BY zwiftId 
HAVING COUNT(*) > 1;

-- Check laatste sync
SELECT zwiftId, name, lastSynced, clubId
FROM riders
WHERE isFavorite = 1
ORDER BY lastSynced DESC;

-- Check club wijzigingen
SELECT r.zwiftId, r.name, r.clubId, c.name as clubName
FROM riders r
LEFT JOIN clubs c ON r.clubId = c.id
WHERE r.isFavorite = 1;
```

### API Test
```bash
# Test bulk upload
curl -X POST http://localhost:3000/api/subteam/riders \
  -H "Content-Type: application/json" \
  -d '{"zwiftIds": [150437, 832234, 377812]}'

# Expected response:
{
  "added": 0,
  "updated": 3,
  "failed": 0,
  "riders": [...]
}
```

---

## 📝 Documentatie

Volledige details in:
- **`docs/RE_UPLOAD_FUNCTIONALITY.md`** - Complete gids
- **`examples/re-upload-test.txt`** - Test bestand

---

## ✅ Checklist Vereisten

- [x] Geen duplicates bij re-upload
- [x] Bestaande riders worden bijgewerkt
- [x] ClubID wijzigingen worden gedetecteerd
- [x] Alle stats worden ververst
- [x] GUI toont duidelijke feedback
- [x] API response bevat update count
- [x] Bulk upload via API endpoint
- [x] Database constraints voorkomen duplicates
- [x] Error handling per rider
- [x] Club extraction bij updates
- [x] Rate limiting gerespecteerd
- [x] Documentatie compleet

**Alle vereisten zijn geïmplementeerd!** ✅
