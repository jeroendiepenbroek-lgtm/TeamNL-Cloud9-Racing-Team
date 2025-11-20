-- Migration: Add route and elevation columns to zwift_api_events
-- Voor Event Cards met profiel badges, km's en hoogtemeters
-- RUN IN SUPABASE SQL EDITOR

-- Voeg kolommen toe aan zwift_api_events tabel
ALTER TABLE zwift_api_events 
  ADD COLUMN IF NOT EXISTS elevation_m INTEGER,
    ADD COLUMN IF NOT EXISTS route_name TEXT,
      ADD COLUMN IF NOT EXISTS route_world TEXT,
        ADD COLUMN IF NOT EXISTS route_profile TEXT;

        -- Voeg index toe voor snellere route lookups
        CREATE INDEX IF NOT EXISTS idx_zwift_api_events_route_id 
          ON zwift_api_events(route_id);

          -- Drop bestaande views (nodig voor kolom toevoegingen)
          DROP VIEW IF EXISTS view_upcoming_events CASCADE;
          DROP VIEW IF EXISTS view_team_events CASCADE;

          -- Recreate view_upcoming_events met nieuwe kolommen
          CREATE VIEW view_upcoming_events AS
          SELECT 
            e.event_id,
              e.title,
                e.time_unix,
                  e.event_type,
                    e.sub_type,
                      e.distance_meters,
                        e.elevation_m,
                          e.route_id,
                            e.route_name,
                              e.route_world,
                                e.route_profile,
                                  COUNT(DISTINCT s.rider_id) as total_signups,
                                    e.raw_response,
                                      e.last_synced
                                      FROM zwift_api_events e
                                      LEFT JOIN zwift_api_event_signups s ON e.event_id = s.event_id
                                      WHERE e.time_unix >= EXTRACT(EPOCH FROM NOW())
                                      GROUP BY 
                                        e.event_id, 
                                          e.title, 
                                            e.time_unix, 
                                              e.event_type, 
                                                e.sub_type,
                                                  e.distance_meters,
                                                    e.elevation_m,
                                                      e.route_id,
                                                        e.route_name,
                                                          e.route_world,
                                                            e.route_profile,
                                                              e.raw_response,
                                                                e.last_synced
                                                                ORDER BY e.time_unix ASC;

                                                                -- Recreate view_team_events met nieuwe kolommen
                                                                CREATE VIEW view_team_events AS
                                                                SELECT 
                                                                  e.event_id,
                                                                    e.title,
                                                                      e.time_unix,
                                                                        e.event_type,
                                                                          e.sub_type,
                                                                            e.distance_meters,
                                                                              e.elevation_m,
                                                                                e.route_id,
                                                                                  e.route_name,
                                                                                    e.route_world,
                                                                                      e.route_profile,
                                                                                        COUNT(DISTINCT s.rider_id) as total_signups,
                                                                                          COUNT(DISTINCT CASE WHEN r.rider_id IS NOT NULL THEN s.rider_id END) as team_rider_count,
                                                                                            JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT(
                                                                                                'rider_id', r.rider_id,
                                                                                                    'rider_name', r.name,
                                                                                                        'pen_name', s.pen_name
                                                                                                          )) FILTER (WHERE r.rider_id IS NOT NULL) as team_riders,
                                                                                                            e.raw_response,
                                                                                                              e.last_synced
                                                                                                              FROM zwift_api_events e
                                                                                                              LEFT JOIN zwift_api_event_signups s ON e.event_id = s.event_id
                                                                                                              LEFT JOIN riders r ON s.rider_id = r.rider_id
                                                                                                              WHERE e.time_unix >= EXTRACT(EPOCH FROM NOW())
                                                                                                              GROUP BY 
                                                                                                                e.event_id,
                                                                                                                  e.title,
                                                                                                                    e.time_unix,
                                                                                                                      e.event_type,
                                                                                                                        e.sub_type,
                                                                                                                          e.distance_meters,
                                                                                                                            e.elevation_m,
                                                                                                                              e.route_id,
                                                                                                                                e.route_name,
                                                                                                                                  e.route_world,
                                                                                                                                    e.route_profile,
                                                                                                                                      e.raw_response,
                                                                                                                                        e.last_synced
                                                                                                                                        HAVING COUNT(DISTINCT CASE WHEN r.rider_id IS NOT NULL THEN s.rider_id END) > 0
                                                                                                                                        ORDER BY e.time_unix ASC;

                                                                                                                                        -- Verificatie query
                                                                                                                                        SELECT 
                                                                                                                                          'Migration successful - columns added' as status,
                                                                                                                                            COUNT(*) as total_events,
                                                                                                                                              COUNT(elevation_m) as events_with_elevation,
                                                                                                                                                COUNT(route_name) as events_with_route_name,
                                                                                                                                                  COUNT(route_profile) as events_with_profile
                                                                                                                                                  FROM zwift_api_events;
                                                                                                                                                  