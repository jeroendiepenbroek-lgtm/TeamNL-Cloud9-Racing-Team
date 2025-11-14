-- Migration 015: Fix views to use zwift_api_event_signups instead of event_signups
-- Purpose: Views gebruikten oude event_signups tabel, moeten zwift_api_event_signups gebruiken
-- Date: 2025-11-14
-- CRITICAL: zwift_api_event_signups heeft GEEN status kolom, alleen pen_name!

-- Drop oude views
DROP VIEW IF EXISTS view_upcoming_events CASCADE;
DROP VIEW IF EXISTS view_team_events CASCADE;

-- RECREATE view_upcoming_events met correcte tabel zwift_api_event_signups
-- NOTE: geen status field in zwift_api_event_signups, alle signups zijn confirmed
CREATE OR REPLACE VIEW view_upcoming_events AS
SELECT 
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
  e.laps,
  e.organizer,
  e.category_enforcement,
  e.created_at,
  e.updated_at,
  e.raw_response,
  COUNT(DISTINCT es.rider_id) as total_signups,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.pen_name = 'A' OR es.pen_name = 'A+') as signups_a,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.pen_name = 'B') as signups_b,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.pen_name = 'C') as signups_c,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.pen_name = 'D') as signups_d,
  COUNT(DISTINCT es.rider_id) FILTER (WHERE es.pen_name = 'E') as signups_e
FROM zwift_api_events e
LEFT JOIN zwift_api_event_signups es ON e.event_id = es.event_id
WHERE TO_TIMESTAMP(e.time_unix) > NOW() 
  AND TO_TIMESTAMP(e.time_unix) <= (NOW() + INTERVAL '48 hours')
GROUP BY 
  e.event_id, e.time_unix, e.title, e.event_type, e.sub_type, 
  e.distance_meters, e.elevation_meters, e.route_name, e.route_world, e.route_id,
  e.laps, e.organizer, e.category_enforcement, e.created_at, e.updated_at, e.raw_response
ORDER BY e.time_unix ASC;

-- RECREATE view_team_events met correcte tabel
CREATE OR REPLACE VIEW view_team_events AS
SELECT 
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
  e.laps,
  e.organizer,
  e.category_enforcement,
  e.created_at,
  e.updated_at,
  COUNT(DISTINCT tm.rider_id) as team_rider_count,
  ARRAY_AGG(
    DISTINCT jsonb_build_object(
      'rider_id', tm.rider_id,
      'rider_name', es.rider_name,
      'pen_name', es.pen_name
    )
  ) FILTER (WHERE tm.rider_id IS NOT NULL) as team_riders
FROM zwift_api_events e
INNER JOIN zwift_api_event_signups es ON e.event_id = es.event_id
INNER JOIN my_team_members tm ON es.rider_id = tm.rider_id
WHERE TO_TIMESTAMP(e.time_unix) > NOW() 
  AND TO_TIMESTAMP(e.time_unix) <= (NOW() + INTERVAL '48 hours')
GROUP BY 
  e.event_id, e.time_unix, e.title, e.event_type, e.sub_type,
  e.distance_meters, e.elevation_meters, e.route_name, e.route_world, e.route_id,
  e.laps, e.organizer, e.category_enforcement, e.created_at, e.updated_at
ORDER BY e.time_unix ASC;

-- Comments
COMMENT ON VIEW view_upcoming_events IS 
  'Upcoming events (next 48h) with signup counts per category - uses zwift_api_event_signups';
COMMENT ON VIEW view_team_events IS 
  'Upcoming events with our team riders signed up - uses zwift_api_event_signups + my_team_members';

-- Grant permissions
GRANT SELECT ON view_upcoming_events TO anon, authenticated;
GRANT SELECT ON view_team_events TO anon, authenticated;
