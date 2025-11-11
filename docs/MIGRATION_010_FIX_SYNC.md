# 🔧 Sync Error Fix - Migration 010

## Probleem
De `sync_logs` tabel heeft niet de juiste kolommen voor de auto-sync feature.

**Code verwacht:**
- `endpoint` - ZwiftRacing API endpoint
- `records_processed` - Aantal gesynchroniseerde riders  
- `error_message` - Error details
- `created_at` - Timestamp

**Database heeft:**
- `operation`, `entity_type`, `entity_id` (oude structuur)
- `message`, `error_details` (oude format)
- `synced_at` (oude timestamp naam)

## Oplossing

### Stap 1: Open Supabase SQL Editor
```
https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/sql
```

### Stap 2: Copy Migration SQL
Kopieer de volledige inhoud van:
```
supabase/migrations/010_update_sync_logs_for_auto_sync.sql
```

### Stap 3: Run in SQL Editor
1. Plak de SQL in de editor
2. Klik op "Run" (of Ctrl/Cmd + Enter)
3. Check de output voor success messages

### Stap 4: Verify
De migration zal laten zien:
- ✅ Added column: endpoint
- ✅ Added column: records_processed  
- ✅ Added column: error_message
- ✅ Added column: created_at
- Tabel structuur overview
- Aantal records in de tabel

## Wat doet de migration?
1. **Voegt nieuwe kolommen toe** (safe - IF NOT EXISTS pattern)
2. **Migreert bestaande data** (operation → endpoint, message → error_message)
3. **Behoudt oude kolommen** (backwards compatible)
4. **Creëert indexes** voor performance

## Na Migration
De Sync Status pagina zal werken:
- ✅ Sync logs worden opgehaald zonder errors
- ✅ Endpoint informatie wordt getoond
- ✅ Records processed counter werkt
- ✅ Auto-sync logging is functional

## Rollback (indien nodig)
De oude kolommen blijven bestaan, dus oude code blijft werken.
Als je wilt rollbacken, verwijder de nieuwe kolommen:
```sql
ALTER TABLE sync_logs 
  DROP COLUMN IF EXISTS endpoint,
  DROP COLUMN IF EXISTS records_processed,
  DROP COLUMN IF EXISTS error_message,
  DROP COLUMN IF EXISTS created_at;
```

## Support
Als je errors ziet, check:
1. Supabase connection (backend moet draaien)
2. SQL Editor permissions (admin access needed)
3. Console output voor detailed error messages
