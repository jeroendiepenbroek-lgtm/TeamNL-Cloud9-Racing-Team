-- ============================================================================
-- NUCLEAR CLEANUP: Verwijder ALLES in public schema
-- ============================================================================
-- Run dit EERST in Supabase SQL Editor voor je SETUP_SUPABASE_COMPLETE.sql runt
-- Dit verwijdert ALLE tabellen, views, sequences, functions in public schema
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop alle views eerst (CASCADE verwijdert dependencies)
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', r.viewname;
    END LOOP;
    
    -- Drop alle materialized views
    FOR r IN (SELECT matviewname FROM pg_matviews WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(r.matviewname) || ' CASCADE';
        RAISE NOTICE 'Dropped materialized view: %', r.matviewname;
    END LOOP;
    
    -- Drop alle tabellen (CASCADE verwijdert alle foreign keys, indices, etc.)
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    -- Drop alle sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequence_name;
    END LOOP;
    
    -- Drop alle custom functions/procedures
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type IN ('FUNCTION', 'PROCEDURE')) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', r.routine_name;
    END LOOP;
    
    -- Drop alle types
    FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        RAISE NOTICE 'Dropped type: %', r.typname;
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICATIE: Controleer dat alles leeg is
-- ============================================================================

-- Tabellen (zou leeg moeten zijn)
SELECT 'TABLES' as type, tablename as name FROM pg_tables WHERE schemaname = 'public'
UNION ALL
-- Views (zou leeg moeten zijn)
SELECT 'VIEWS' as type, viewname as name FROM pg_views WHERE schemaname = 'public'
UNION ALL
-- Sequences (zou leeg moeten zijn)
SELECT 'SEQUENCES' as type, sequence_name as name FROM information_schema.sequences WHERE sequence_schema = 'public'
ORDER BY type, name;

-- ============================================================================
-- Als alles succesvol is, zou de lijst LEEG moeten zijn
-- Dan kun je SETUP_SUPABASE_COMPLETE.sql veilig runnen zonder conflicts
-- ============================================================================
