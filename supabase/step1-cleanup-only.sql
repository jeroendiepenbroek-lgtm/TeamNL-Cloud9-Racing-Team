-- ============================================================================
-- STAP 1: CLEANUP ONLY
-- ============================================================================
-- Run dit EERST, wacht op success, dan run step2-deploy-only.sql
-- ============================================================================

-- Drop ALL views, tables, functions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all views
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
    
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes 
              FROM pg_proc INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
              WHERE pg_namespace.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
    END LOOP;
    
    RAISE NOTICE '✅ CLEANUP COMPLEET - Nu step2-deploy-only.sql runnen';
END $$;

-- Verify cleanup
SELECT 'Tables remaining: ' || COUNT(*)::TEXT as status
FROM pg_tables 
WHERE schemaname = 'public';
