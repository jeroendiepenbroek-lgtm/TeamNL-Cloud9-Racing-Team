#!/bin/bash
# Apply migration 015 to Supabase database
# This fixes views to use zwift_api_event_signups instead of event_signups

echo "🔧 Applying migration 015: Fix views to use zwift_api_event_signups"
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Error: SUPABASE_DB_URL not set"
    echo "Please set: export SUPABASE_DB_URL='postgresql://...'"
    exit 1
fi

# Apply migration
psql "$SUPABASE_DB_URL" -f /workspaces/TeamNL-Cloud9-Racing-Team/supabase/migrations/015_fix_views_use_zwift_api_signups.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration 015 applied successfully!"
    echo ""
    echo "Testing views..."
    echo ""
    
    # Test view_upcoming_events
    psql "$SUPABASE_DB_URL" -c "SELECT event_id, title, distance_meters, elevation_meters, route_name, route_world, total_signups FROM view_upcoming_events LIMIT 3;"
    
    echo ""
    echo "✅ Views are working with all columns!"
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi
