# 🚀 Smart Upload/Delete API - Complete Documentatie

## Overzicht

Moderne, intelligente API voor het toevoegen en verwijderen van riders. Ondersteunt **enkele riders, meerdere riders én bulk operaties** met automatische detectie van het formaat.

---

## 📥 POST `/api/admin/riders` - Add Riders

Voeg één of meerdere riders toe aan het team met automatische sync naar Zwift Racing en Zwift Official APIs.

### Ondersteunde Formaten

#### 1️⃣ **Enkele Rider** (Recommended for UI)
```json
POST /api/admin/riders
Content-Type: application/json

{
  "rider_id": 150437
}
```
- ✅ **Detection**: Automatisch herkend als `SINGLE` operatie
- 💡 **Use case**: Form input, single rider toevoegen via UI

#### 2️⃣ **Meerdere Riders** (Legacy format - backwards compatible)
```json
POST /api/admin/riders
Content-Type: application/json

{
  "rider_ids": [150437, 274131, 397234]
}
```
- ✅ **Detection**: `MULTIPLE` (3-10 riders) of `BULK` (>10 riders)
- 💡 **Use case**: Backwards compatibility met oude frontend code

#### 3️⃣ **Bulk Upload** (Modern format)
```json
POST /api/admin/riders
Content-Type: application/json

[150437, 274131, 397234, 1076179, 3067920, ...]
```
- ✅ **Detection**: `MULTIPLE` (3-10 riders) of `BULK` (>10 riders)
- 💡 **Use case**: CSV import, grote lijsten, batch processing

---

### Response Format

```json
{
  "success": true,
  "operation": "SINGLE" | "MULTIPLE" | "BULK",
  "total": 5,
  "synced": 4,
  "failed": 1,
  "skipped": 0,
  "logId": 123,
  "results": [
    {
      "rider_id": 150437,
      "synced": true,
      "sources": {
        "racing": true,
        "profile": true
      }
    },
    {
      "rider_id": 999999,
      "synced": false,
      "error": "Racing: Not found. Profile: Not found."
    }
  ]
}
```

### Operation Types
- **SINGLE**: 1 rider
- **MULTIPLE**: 2-10 riders  
- **BULK**: 11+ riders

### Data Sync Process
1. **Validation**: Check of riders al in team_roster bestaan → skip duplicates
2. **Bulk Fetch**: ZwiftRacing API (1 call voor alle riders)
3. **Individual Fetch**: Zwift Official API (per rider, 250ms delay)
4. **Database Update**: Upsert naar `api_zwiftracing_riders` en `api_zwift_api_profiles`
5. **Team Roster**: Update `team_roster` met `is_active=true`
6. **Logging**: Volledige sync log naar `sync_logs` tabel

---

## 🗑️ DELETE `/api/admin/riders` - Remove Riders

Verwijder één of meerdere riders uit het team (uit alle tabellen: team_roster, api_zwiftracing_riders, api_zwift_api_profiles).

### Ondersteunde Formaten

#### 1️⃣ **Enkele Rider** (URL Parameter)
```bash
DELETE /api/admin/riders/150437
```
- ✅ **Detection**: Automatisch herkend als `SINGLE` operatie
- 💡 **Use case**: Delete button in UI, RESTful pattern

#### 2️⃣ **Bulk Delete** (Body met rider_ids)
```json
DELETE /api/admin/riders
Content-Type: application/json

{
  "rider_ids": [150437, 274131, 397234]
}
```
- ✅ **Detection**: `MULTIPLE` (2-10 riders) of `BULK` (>10 riders)
- 💡 **Use case**: Multi-select delete in UI

#### 3️⃣ **Bulk Delete** (Direct array)
```json
DELETE /api/admin/riders
Content-Type: application/json

[150437, 274131, 397234, 1076179, 3067920, ...]
```
- ✅ **Detection**: `MULTIPLE` (2-10 riders) of `BULK` (>10 riders)
- 💡 **Use case**: Batch cleanup, admin tools

---

### Response Format

```json
{
  "success": true,
  "operation": "SINGLE" | "MULTIPLE" | "BULK",
  "total": 3,
  "deleted": 3,
  "failed": 0,
  "logId": 124,
  "results": [
    {
      "rider_id": 150437,
      "deleted": true
    },
    {
      "rider_id": 274131,
      "deleted": true
    },
    {
      "rider_id": 397234,
      "deleted": true
    }
  ]
}
```

### Deletion Process
1. **Validation**: Parse en valideer rider IDs
2. **Multi-table Delete**: Parallel delete van 3 tabellen:
   - `team_roster`
   - `api_zwiftracing_riders`
   - `api_zwift_api_profiles`
3. **Logging**: Volledige delete log naar `sync_logs` tabel

---

## 📊 Sync Logging

Alle upload/delete operaties worden automatisch gelogd in de `sync_logs` tabel.

### Log Entry Structure
```sql
{
  "id": 123,
  "sync_type": "team_riders",
  "trigger_type": "upload" | "api",  -- upload=POST, api=DELETE
  "status": "success" | "partial" | "failed",
  "started_at": "2025-12-15T10:00:00Z",
  "completed_at": "2025-12-15T10:00:05Z",
  "duration_ms": 5234,
  "total_items": 5,
  "success_count": 4,
  "failed_count": 1,
  "metadata": {
    "operation": "delete",           -- only for DELETE
    "operation_type": "BULK",
    "rider_ids": [150437, 274131, ...],
    "triggered_by": "api_upload"
  }
}
```

### Query Recent Logs
```bash
GET /api/admin/sync-logs?limit=10&triggerType=upload
GET /api/admin/sync-logs?limit=10&triggerType=api
```

---

## 🎯 Use Cases & Examples

### Scenario 1: User voegt 1 rider toe via form
```javascript
// Frontend code
const response = await fetch('/api/admin/riders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rider_id: 150437 })
});

// Response: { operation: "SINGLE", synced: 1, ... }
```

### Scenario 2: CSV Import met 50 riders
```javascript
const riderIds = [150437, 274131, 397234, /* ... 47 more */];

const response = await fetch('/api/admin/riders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(riderIds)  // Direct array
});

// Response: { operation: "BULK", total: 50, synced: 48, failed: 2 }
```

### Scenario 3: Multi-select delete in UI
```javascript
const selectedIds = [150437, 274131, 397234];

const response = await fetch('/api/admin/riders', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rider_ids: selectedIds })
});

// Response: { operation: "MULTIPLE", deleted: 3 }
```

### Scenario 4: Cleanup script - verwijder inactive riders
```bash
curl -X DELETE https://your-api.railway.app/api/admin/riders \
  -H "Content-Type: application/json" \
  -d '[999999, 999998, 999997, 999996, 999995]'
```

---

## ⚡ Performance

| Operation | Riders | Time | Notes |
|-----------|--------|------|-------|
| **Single Upload** | 1 | ~3-5s | ZwiftRacing + Zwift Official API |
| **Multiple Upload** | 5 | ~15-20s | Bulk ZwiftRacing + 5x Official (250ms delay) |
| **Bulk Upload** | 50 | ~2-3min | Bulk ZwiftRacing + 50x Official (250ms delay) |
| **Single Delete** | 1 | ~100ms | 3 parallel DB deletes |
| **Bulk Delete** | 50 | ~2-3s | 50x 3 parallel DB deletes |

### Rate Limiting
- **ZwiftRacing API**: 1 bulk call voor alle riders (geen rate limit)
- **Zwift Official API**: 250ms delay tussen calls (240 calls/min max)
- **DELETE**: Geen rate limit (pure database operaties)

---

## 🔒 Error Handling

### Upload Errors
- **Invalid input**: `400 Bad Request` met duidelijke error message
- **API failures**: Partial success mogelijk - synced=riders met data, failed=riders zonder data
- **Database errors**: `500 Internal Server Error` met error details in log

### Delete Errors
- **Invalid input**: `400 Bad Request`
- **Partial delete failures**: Success response met failed count > 0
- **Database errors**: `500 Internal Server Error`

### Response Status Codes
- `200 OK`: Success (check `success` en `failed` counts)
- `400 Bad Request`: Invalid input format
- `500 Internal Server Error`: Server/database error

---

## 📝 Changelog

### Version 2.0 (2025-12-15)
- ✨ **Smart format detection**: Automatische herkenning van single/multiple/bulk
- ✨ **3 input formats**: URL param, object, direct array
- ✨ **Operation types**: SINGLE/MULTIPLE/BULK classification
- ✨ **Enhanced logging**: Volledig operation tracking in sync_logs
- ✨ **Bulk DELETE**: Support voor meerdere riders tegelijk
- 🔧 **Backwards compatible**: Oude `rider_ids` format blijft werken

### Version 1.0 (Pre-2025-12-15)
- Basic POST met `rider_ids` array
- Basic DELETE met URL parameter
- Sync logging voor uploads

---

## 🧪 Testing

Run alle tests:
```bash
./test-smart-upload-delete.sh
```

Verwachte output:
- ✅ Test 1: SINGLE upload detection
- ✅ Test 2: MULTIPLE upload (legacy format)
- ✅ Test 3: BULK upload (direct array)
- ✅ Test 4: SINGLE delete (URL param)
- ✅ Test 5: BULK delete (body)
- ✅ Test 6: Sync logs verification

---

## 🎓 Best Practices

1. **Use SINGLE format voor UI forms**: `{ rider_id: 12345 }`
2. **Use direct array voor bulk**: `[12345, 67890, ...]` 
3. **Check sync_logs voor audit trail**: Alle operaties zijn traceerbaar
4. **Handle partial failures**: Check `failed` count en `results` array
5. **Use URL param voor single delete**: RESTful pattern
6. **Use body array voor bulk delete**: Efficient voor cleanup

---

**Deployment**: Railway (https://teamnl-cloud9-racing-team-production.up.railway.app)  
**Commit**: `63ff9a9` - "Smart Upload/Delete: Single, Multiple & Bulk support"  
**Status**: ✅ Production Ready
