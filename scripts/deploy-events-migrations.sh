#!/bin/bash
# Deploy Events Migrations (009 + 010)
# Run this in Railway CLI or with DATABASE_URL set

echo "🗄️  Deploying Events Migrations..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo ""
  echo "Set it with:"
  echo "  export DATABASE_URL='postgresql://postgres:[password]@[host]:5432/postgres'"
  echo ""
  echo "Get it from:"
  echo "  • Supabase: Settings → Database → Connection String"
  echo "  • Railway: Your database service → Connect"
  exit 1
fi

echo "📊 Target database: ${DATABASE_URL:0:50}..."
echo ""
echo "⚠️  This will create:"
echo "   Migration 009: events table"
echo "   Migration 010: event_signups table + views"
echo ""

read -p "Continue? (y/N) " -n 1 -r
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

# Deploy migration 009
echo "🚀 Running migration 009 (events table)..."
psql "$DATABASE_URL" -f supabase/migrations/009_events_table.sql

if [ $? -ne 0 ]; then
  echo "❌ Migration 009 failed!"
  exit 1
fi

echo "✅ Migration 009 deployed!"
echo ""

# Deploy migration 010
echo "🚀 Running migration 010 (event_signups table)..."
psql "$DATABASE_URL" -f supabase/migrations/010_event_signups.sql

if [ $? -ne 0 ]; then
  echo "❌ Migration 010 failed!"
  exit 1
fi

echo "✅ Migration 010 deployed!"
echo ""
echo "🎉 All migrations deployed successfully!"
echo ""
echo "📋 Verify with:"
echo "   psql \$DATABASE_URL -c \"\\d events\""
echo "   psql \$DATABASE_URL -c \"\\d event_signups\""
echo "   psql \$DATABASE_URL -c \"SELECT * FROM view_upcoming_events LIMIT 5;\""
echo ""
echo "🔄 Now restart your backend to trigger initial event sync!"
