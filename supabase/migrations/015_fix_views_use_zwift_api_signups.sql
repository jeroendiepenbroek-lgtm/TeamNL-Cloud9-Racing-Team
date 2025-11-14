-- Migration 015: Fix views to use zwift_api_event_signups instead of event_signups
-- Purpose: Views gebruikten oude event_signups tabel, moeten zwift_api_event_signups gebruiken
-- Date: 2025-11-14
-- CRITICAL: zwift_api_event_signups heeft GEEN status kolom, alleen pen_name!

-- Drop oude views
DROP VIEW IF EXISTS view_upcoming_events CASCADE;
DROP VIEW IF EXISTS view_team_events CASCADE;

-- RECREATE view_upcoming_events - DIRECT FROM TABLE, ALLE KOLOMMEN
-- Simpele view die EXACT de tabel kopieert voor upcoming events
CREATE OR REPLACE VIEW view_upcoming_events AS
SELECT 
  e.id,
  e.mongo_id,
  e.event_id,
  e.time_unix,
  e.title,
  e.event_type,
  e.sub_type,
  e.distance_meters,
  e.elevation_meters,
  e.route_name,
  e.route_world,
  e.route_id,
  e.organizer,
  e.category_enforcement,
  e.pens,
  e.route_full,
  e.raw_response,
  e.created_at,
  e.updated_at,
  e.last_synced,
  -- Signup counts berekend vanuit zwift_api_event_signups
  (SELECT COUNT(DISTINCT es.rider_id) 
   FROM zwift_api_event_signups es 
   WHERE es.event_id = e.event_id) as total_signups,
  (SELECT COUNT(DISTINCT es.rider_id) 
   FROM zwift_api_event_signups es 
   WHERE es.event_id = e.event_id AND (es.pen_name = 'A' OR es.pen_name = 'A+')) as signups_a,
  (SELECT COUNT(DISTINCT es.rider_id) 
   FROM zwift_api_event_signups es 
   WHERE es.event_id = e.event_id AND es.pen_name = 'B') as signups_b,
  (SELECT COUNT(DISTINCT es.rider_id) 
   FROM zwift_api_event_signups es 
   WHERE es.event_id = e.event_id AND es.pen_name = 'C') as signups_c,
  (SELECT COUNT(DISTINCT es.rider_id) 
   FROM zwift_api_event_signups es 
   WHERE es.event_id = e.event_id AND es.pen_name = 'D') as signups_d,
  (SELECT COUNT(DISTINCT es.rider_id) 
   FROM zwift_api_event_signups es 
   WHERE es.event_id = e.event_id AND es.pen_name = 'E') as signups_e
FROM zwift_api_events e
WHERE TO_TIMESTAMP(e.time_unix) > NOW() 
  AND TO_TIMESTAMP(e.time_unix) <= (NOW() + INTERVAL '36 hours')
ORDER BY e.time_unix ASC;

-- RECREATE view_team_events - DIRECT FROM TABLE met team rider aggregatie
CREATE OR REPLACE VIEW view_team_events AS
SELECT 
  e.id,
  e.mongo_id,
  e.event_id,
  e.time_unix,
  e.title,
  e.event_type,
  e.sub_type,
  e.distance_meters,
  e.elevation_meters,
  e.route_name,
  e.route_world,
  e.route_id,
  e.organizer,
  e.category_enforcement,
  e.pens,
  e.route_full,
  e.raw_response,
  e.created_at,
  e.updated_at,
  e.last_synced,
  -- Team rider info via subqueries
  (SELECT COUNT(DISTINCT tm.rider_id)
   FROM zwift_api_event_signups es
   INNER JOIN my_team_members tm ON es.rider_id = tm.rider_id
   WHERE es.event_id = e.event_id) as team_rider_count,
  (SELECT ARRAY_AGG(
     jsonb_build_object(
       'rider_id', tm.rider_id,
       'rider_name', es.rider_name,
       'pen_name', es.pen_name
     )
   )
   FROM zwift_api_event_signups es
   INNER JOIN my_team_members tm ON es.rider_id = tm.rider_id
   WHERE es.event_id = e.event_id) as team_riders
FROM zwift_api_events e
WHERE TO_TIMESTAMP(e.time_unix) > NOW() 
  AND TO_TIMESTAMP(e.time_unix) <= (NOW() + INTERVAL '36 hours')
  AND EXISTS (
    SELECT 1 
    FROM zwift_api_event_signups es
    INNER JOIN my_team_members tm ON es.rider_id = tm.rider_id
    WHERE es.event_id = e.event_id
  )
ORDER BY e.time_unix ASC;

-- Comments
COMMENT ON VIEW view_upcoming_events IS 
  'Upcoming events (next 36h) with signup counts per category - uses zwift_api_event_signups';
COMMENT ON VIEW view_team_events IS 
  'Upcoming events with our team riders signed up - uses zwift_api_event_signups + my_team_members';

-- Grant permissions
GRANT SELECT ON view_upcoming_events TO anon, authenticated;
GRANT SELECT ON view_team_events TO anon, authenticated;
