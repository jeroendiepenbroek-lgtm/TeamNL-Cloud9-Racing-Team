#!/bin/bash
# Deploy Events Sourcing Migrations (011 + 012)
# Run this after setting DATABASE_URL

echo "🗄️  Deploying Events 1:1 API Mapping Migrations..."
echo ""
echo "⚠️  IMPORTANT: This will:"
echo "   1. Rename 'events' table to 'events_old_backup_20251112'"
echo "   2. Create 'zwift_api_events' sourcing table (1:1 with API)"
echo "   3. Create 'events' VIEW for backwards compatibility"
echo "   4. Fix event_signups.event_id type (BIGINT → TEXT)"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo ""
  echo "Get it from Supabase:"
  echo "  Settings → Database → Connection String (Direct connection)"
  echo ""
  echo "Then run:"
  echo "  export DATABASE_URL='postgresql://...'"
  echo "  ./scripts/deploy-events-sourcing.sh"
  exit 1
fi

echo "📊 Target database: ${DATABASE_URL:0:50}..."
echo ""

read -p "Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found. Install PostgreSQL client first:"
  echo "   Ubuntu/Debian: sudo apt-get install postgresql-client"
  echo "   MacOS: brew install postgresql"
  exit 1
fi

# Deploy migration 011
echo "🚀 Running migration 011 (zwift_api_events sourcing table)..."
psql "$DATABASE_URL" -f supabase/migrations/011_zwift_api_events_sourcing.sql

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Migration 011 failed!"
  echo ""
  echo "Common issues:"
  echo "  - Old 'events' table has data: Backup manually first"
  echo "  - Permission denied: Check DATABASE_URL has admin rights"
  exit 1
fi

echo "✅ Migration 011 deployed!"
echo ""

# Deploy migration 012
echo "🚀 Running migration 012 (fix event_signups type)..."
psql "$DATABASE_URL" -f supabase/migrations/012_fix_event_signups_type.sql

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Migration 012 failed!"
  echo ""
  echo "Note: If event_signups has data, type conversion might fail"
  echo "      Delete old data: DELETE FROM event_signups; then retry"
  exit 1
fi

echo "✅ Migration 012 deployed!"
echo ""
echo "🎉 All migrations deployed successfully!"
echo ""
echo "📋 Verify with:"
echo "   psql \$DATABASE_URL -c \"\\d zwift_api_events\""
echo "   psql \$DATABASE_URL -c \"\\d+ events\"  # Should show it's a VIEW"
echo "   psql \$DATABASE_URL -c \"SELECT * FROM view_upcoming_events LIMIT 5;\""
echo ""
echo "🔄 Next steps:"
echo "   1. Restart Railway backend (triggers automatic event sync)"
echo "   2. Check Railway logs for: '[BulkImport] Complete: X events...'"
echo "   3. Open dashboard Events page - should show data!"
echo ""
echo "🐛 Troubleshooting:"
echo "   - No data? Check: SELECT COUNT(*) FROM zwift_api_events;"
echo "   - Sync errors? Check: SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 10;"
