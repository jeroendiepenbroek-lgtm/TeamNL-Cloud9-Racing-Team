-- Clean mock event data
DELETE FROM event_signups WHERE event_id LIKE 'TEST%';
DELETE FROM zwift_api_events WHERE event_id LIKE 'TEST%';

-- Show results
SELECT 'Remaining events:' as info, COUNT(*) as count FROM zwift_api_events
UNION ALL
SELECT 'Remaining signups:' as info, COUNT(*) as count FROM event_signups;
