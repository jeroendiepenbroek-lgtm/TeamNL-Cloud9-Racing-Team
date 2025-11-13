-- ============================================================================
-- MIGRATION 013: Add Foreign Key Relationship
-- ============================================================================
-- Purpose: Add FK from event_signups to zwift_api_events for Supabase JOIN
-- Note: Migration 012 removed FK constraint, now adding it back properly
-- ============================================================================

ALTER TABLE event_signups
  ADD CONSTRAINT fk_event_signups_event 
  FOREIGN KEY (event_id) 
  REFERENCES zwift_api_events(event_id)
  ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_event_signups_event ON event_signups IS 
  'Links signups to events for Supabase API JOINs';
