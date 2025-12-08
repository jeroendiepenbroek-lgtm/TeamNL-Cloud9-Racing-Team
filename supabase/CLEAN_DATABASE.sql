-- ============================================================================
-- SUPABASE DATABASE CLEANUP SCRIPT
-- ============================================================================
-- Datum: 7 december 2025
-- Doel: Verwijder ALLE oude tabellen, views, functies voor fresh start
-- 
-- WAARSCHUWING: Dit verwijdert ALLE data! Alleen runnen als backup gemaakt is.
-- 
-- Run dit in Supabase SQL Editor:
-- https://app.supabase.com/project/bktbeefdmrpxhsyyalvc/sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- STAP 1: Drop ALL views first (depend on tables)
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '🗑️  Dropping all views...';
    
    FOR r IN (
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
        AND viewname NOT LIKE 'pg_%'
    ) LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE '  Dropped view: %', r.viewname;
    END LOOP;
END $$;

-- ============================================================================
-- STAP 2: Drop ALL materialized views
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '🗑️  Dropping all materialized views...';
    
    FOR r IN (
        SELECT matviewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS ' || quote_ident(r.matviewname) || ' CASCADE';
        RAISE NOTICE '  Dropped materialized view: %', r.matviewname;
    END LOOP;
END $$;

-- ============================================================================
-- STAP 3: Drop ALL tables (CASCADE removes all dependencies)
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '🗑️  Dropping all tables...';
    
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE '  Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- ============================================================================
-- STAP 4: Drop ALL functions/triggers
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '🗑️  Dropping all functions...';
    
    FOR r IN (
        SELECT 
            n.nspname as schema,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
    ) LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
            r.schema, r.function_name, r.args);
        RAISE NOTICE '  Dropped function: %(%)', r.function_name, r.args;
    END LOOP;
END $$;

-- ============================================================================
-- STAP 5: Drop ALL sequences
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '🗑️  Dropping all sequences...';
    
    FOR r IN (
        SELECT sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequencename) || ' CASCADE';
        RAISE NOTICE '  Dropped sequence: %', r.sequencename;
    END LOOP;
END $$;

-- ============================================================================
-- STAP 6: Verify cleanup
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%';
    
    SELECT COUNT(*) INTO view_count 
    FROM pg_views 
    WHERE schemaname = 'public' AND viewname NOT LIKE 'pg_%';
    
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname NOT LIKE 'pg_%';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CLEANUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables remaining: %', table_count;
    RAISE NOTICE 'Views remaining: %', view_count;
    RAISE NOTICE 'Functions remaining: %', function_count;
    RAISE NOTICE '========================================';
    
    IF table_count > 0 OR view_count > 0 THEN
        RAISE WARNING 'Some objects still exist - may be system objects';
    ELSE
        RAISE NOTICE '💯 Database is completely clean!';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-CLEANUP: Ready for fresh schema
-- ============================================================================
-- 
-- Database is nu schoon. Volgende stappen:
-- 
-- 1. Run nieuwe schema migration (nog te maken)
-- 2. Re-deploy backend naar Railway
-- 3. Test API endpoints
-- 
-- ============================================================================
