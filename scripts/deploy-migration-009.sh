#!/bin/bash
# Deploy Migration 009: Event Signups Table
# Run this in Railway CLI or Supabase dashboard

echo "🗄️  Deploying Migration 009: Event Signups..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  echo "   Set it with: export DATABASE_URL='your_connection_string'"
  exit 1
fi

echo "📊 Target database: ${DATABASE_URL:0:50}..."
echo ""
echo "⚠️  This will create:"
echo "   - event_signups table"
echo "   - view_upcoming_events view"
echo "   - view_team_events view"
echo "   - Indexes and RLS policies"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "🚀 Running migration..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
  echo "❌ psql not found. Install PostgreSQL client first:"
  echo "   Ubuntu/Debian: sudo apt-get install postgresql-client"
  echo "   MacOS: brew install postgresql"
  exit 1
fi

# Run migration
psql "$DATABASE_URL" -f supabase/migrations/009_event_signups.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration 009 deployed successfully!"
  echo ""
  echo "📋 Verify with:"
  echo "   psql \$DATABASE_URL -c \"\\d event_signups\""
  echo "   psql \$DATABASE_URL -c \"SELECT * FROM view_upcoming_events LIMIT 5;\""
else
  echo ""
  echo "❌ Migration failed. Check error messages above."
  exit 1
fi

