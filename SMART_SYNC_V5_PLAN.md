# Smart Sync v5.0 Implementation Plan

## ✅ Requirements

### Sync-Service
- **US1**: Dynamische en efficiente sync
- **US2**: Individuele sync GET request mogelijk  
- **US3**: Multi rider sync afhankelijk van aantal riders
- **US4**: Bulk sync via POST request (>=5 riders)
- **US5**: Onbekende RIDER-ID overslaan, niet blocking

### Auto-sync
- **US1**: Configureerbaar via API
- **US2**: Intervallen zelf in te stellen (5-1440 min)
- **US3**: Configuratie opslaan in database
- **US4**: SMART en dynamisch
- **US5**: Manual sync mogelijk via API

## 🎯 Implementation Status

### ✅ COMPLETED
1. Smart sync strategy thresholds (< 5 = individual, >= 5 = bulk)
2. Bulk fetch function for ZwiftRacing POST endpoint
3. Individual fetch function for single riders
4. Non-blocking error handling (404 = skip, continue)
5. Version upgraded to v5.0

### 🚧 IN PROGRESS  
1. Need to finish smartSyncRiders implementation
2. Need to add sync config API endpoints
3. Need to restart scheduler on config changes

### ⏳ TODO
1. Test individual sync (1-4 riders)
2. Test bulk sync (5+ riders)
3. Test skip unknown riders
4. Test config API endpoints
5. Deploy to Railway

## 📝 Code Changes

### Key Functions
- `smartSyncRiders()` - Auto-chooses bulk vs individual based on count
- `bulkFetchZwiftRacingRiders()` - POST /public/riders endpoint  
- `fetchSingleZwiftRacingRider()` - GET /public/riders/:id endpoint
- `executeSyncJob()` - Orchestrates sync with logging
- GET /api/admin/sync-config - Get current config
- PUT /api/admin/sync-config - Update config & restart scheduler
- POST /api/admin/sync-all - Manual sync trigger

### Smart Strategy
```
if (riders < 5):
  use individual GET requests with 1s delay
else:
  use bulk POST request (splits per 1000)
  
if (rider not found):
  log warning, skip rider, continue (non-blocking)
```

## 🧪 Test Plan

1. Test with 1 rider → should use individual
2. Test with 3 riders → should use individual  
3. Test with 5 riders → should use bulk
4. Test with 50 riders → should use bulk
5. Test with invalid rider ID → should skip, not crash
6. Test config update → should restart scheduler
7. Test manual sync → should work regardless of schedule
