-- ============================================================================
-- SUPABASE SCHEMA INSPECTION - ALL 6 SOURCE TABLES (SINGLE QUERY)
-- ============================================================================
-- Date: 2025-11-05
-- Purpose: Document complete schema for all SOURCE tables in one query
-- Usage: Run this SINGLE query in Supabase SQL Editor, paste JSON output
-- ============================================================================

-- ============================================================================
-- SINGLE QUERY FOR ALL 6 TABLES
-- ============================================================================
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('clubs', 'riders', 'events', 'results', 'rider_history', 'sync_logs')
ORDER BY 
  CASE table_name
    WHEN 'clubs' THEN 1
    WHEN 'riders' THEN 2
    WHEN 'events' THEN 3
    WHEN 'results' THEN 4
    WHEN 'rider_history' THEN 5
    WHEN 'sync_logs' THEN 6
  END,
  ordinal_position;


-- ============================================================================
-- BONUS: GET ALL TABLES IN PUBLIC SCHEMA
-- ============================================================================
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns c 
     WHERE c.table_schema = 'public' 
       AND c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- ============================================================================
-- BONUS: GET SAMPLE DATA FROM EACH TABLE (if not empty)
-- ============================================================================

-- Clubs sample
SELECT * FROM clubs LIMIT 1;

-- Riders sample
SELECT * FROM riders LIMIT 1;

-- Events sample
SELECT * FROM events LIMIT 1;

-- Results sample (if exists)
-- SELECT * FROM results LIMIT 1;

-- Rider_history sample (if exists)
-- SELECT * FROM rider_history LIMIT 1;

-- Sync_logs sample
SELECT * FROM sync_logs LIMIT 1;


-- ============================================================================
-- KNOWN SCHEMAS (Already Retrieved 2025-11-05)
-- ============================================================================

/*
CLUBS (10 columns):
- id: bigint NOT NULL
- club_id: bigint NOT NULL
- club_name: text NOT NULL
- description: text NULL
- member_count: integer NULL
- country: text NULL
- created_date: timestamptz NULL
- last_synced: timestamptz NULL
- created_at: timestamptz NULL
- updated_at: timestamptz NULL

RIDERS (21 columns):
- id: bigint NOT NULL (auto-increment)
- zwift_id: bigint NOT NULL (unique)
- name: text NOT NULL
- club_id: bigint NULL (FK → clubs.club_id)
- club_name: text NULL (DENORMALIZED!)
- ranking: integer NULL
- ranking_score: numeric NULL
- ftp: integer NULL
- weight: numeric NULL
- watts_per_kg: numeric NULL (PRE-COMPUTED!)
- category_racing: text NULL
- category_zftp: text NULL
- age: integer NULL
- gender: text NULL
- country: text NULL (NOT country_code!)
- total_races: integer NULL (default 0)
- total_wins: integer NULL (default 0)
- total_podiums: integer NULL (default 0)
- last_synced: timestamptz NULL (default now())
- created_at: timestamptz NULL (default now())
- updated_at: timestamptz NULL (default now())
*/
