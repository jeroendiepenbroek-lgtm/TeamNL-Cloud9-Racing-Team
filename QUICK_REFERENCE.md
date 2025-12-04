# 🚀 Quick Reference - Data Sync

## Meest gebruikte commando's

### Check status
```bash
cd backend
npx tsx check-missing-events.ts
```

### Toon huidige results
```bash
npx tsx show-results-direct.ts
```

### Sync nieuwe events
1. Edit `sync-specific-events.ts`:
```typescript
const EVENTS_TO_SYNC = [
  { id: 5206710, date: '2025-11-27' },
  { id: 5229579, date: '2025-11-30' }
];
```

2. Run (duurt ~2 min):
```bash
npx tsx sync-specific-events.ts
```

### Test API
```bash
# Production
npx tsx test-production-api.ts

# Local  
npx tsx test-http-request.ts
```

## ⚠️ Onthoud ALTIJD

1. **ZwiftPower = NO** voor rider 150437
2. **Rider.history = undefined** (bestaat niet)
3. **Rate limit = 1/min** (wacht 65 sec!)
4. **NO raw_data column** in database

## 📖 Documentatie

- **Kritieke fouten**: `CRITICAL_LESSONS_LEARNED.md` ⭐ **START HIER**
- **Architectuur**: `SYNC_ARCHITECTURE_COMPLETE.md`
- **API endpoints**: `API_ENDPOINTS_COMPLETE.md`

## 🆘 Bij problemen

1. Lees eerst: `CRITICAL_LESSONS_LEARNED.md`
2. Check welke fout (#1-4)
3. Gebruik oplossing uit document
4. Test met verificatie scripts

---
**Laatst bijgewerkt**: 4 december 2025
