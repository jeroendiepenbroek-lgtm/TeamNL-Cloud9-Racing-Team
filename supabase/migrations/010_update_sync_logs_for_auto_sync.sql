-- ========================================
-- Migration 010: Update sync_logs voor auto-sync feature
-- ========================================
-- Voegt kolommen toe die nodig zijn voor auto-sync logging
-- Behoudt bestaande data waar mogelijk
-- ========================================

-- Stap 1: Voeg nieuwe kolommen toe (if not exists pattern)
DO $$ 
BEGIN
  -- endpoint kolom (voor ZwiftRacing API endpoint tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'endpoint'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN endpoint TEXT;
    RAISE NOTICE '✅ Added column: endpoint';
  END IF;

  -- records_processed kolom (aantal riders gesynchroniseerd)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'records_processed'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN records_processed INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added column: records_processed';
  END IF;

  -- error_message kolom (simpele text error messages)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN error_message TEXT;
    RAISE NOTICE '✅ Added column: error_message';
  END IF;

  -- created_at kolom (standaard timestamp)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added column: created_at';
  END IF;
END $$;

-- Stap 2: Migreer bestaande data
UPDATE sync_logs 
SET 
  endpoint = COALESCE(operation, 'unknown'),
  error_message = message,
  created_at = COALESCE(synced_at, NOW())
WHERE endpoint IS NULL OR created_at IS NULL;

-- Stap 3: Maak endpoint NOT NULL (na migratie)
ALTER TABLE sync_logs ALTER COLUMN endpoint SET NOT NULL;

-- Stap 4: Index voor snelle queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_endpoint ON sync_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);

-- Stap 5: Cleanup oude kolommen zijn OPTIONEEL - we behouden ze voor backwards compatibility
-- Later kunnen we deze verwijderen als we zeker weten dat ze niet meer nodig zijn:
-- ALTER TABLE sync_logs DROP COLUMN IF EXISTS operation;
-- ALTER TABLE sync_logs DROP COLUMN IF EXISTS entity_type;
-- ALTER TABLE sync_logs DROP COLUMN IF EXISTS entity_id;
-- ALTER TABLE sync_logs DROP COLUMN IF EXISTS message;

-- ========================================
-- VERIFICATION
-- ========================================

-- Toon tabel structuur
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sync_logs'
ORDER BY ordinal_position;

-- Toon aantal records
SELECT 
  COUNT(*) as total_logs,
  COUNT(endpoint) as with_endpoint,
  COUNT(error_message) as with_errors
FROM sync_logs;

-- ========================================
-- SUCCESS
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Migration 010 complete!';
  RAISE NOTICE 'sync_logs table updated for auto-sync';
  RAISE NOTICE '========================================';
END $$;
