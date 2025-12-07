#!/bin/bash
# Apply ZRS migration to Supabase

set -e

echo "📦 Applying ZRS migration to Supabase..."

# Source env vars
source backend/.env

# Check if we have Supabase credentials
if [ -z "$SUPABASE_DB_HOST" ]; then
  echo "❌ SUPABASE_DB_HOST not set. Please set in backend/.env"
  echo ""
  echo "Required env vars:"
  echo "  SUPABASE_DB_HOST=aws-0-eu-central-1.pooler.supabase.com"
  echo "  SUPABASE_DB_PORT=6543"
  echo "  SUPABASE_DB_USER=postgres.qkjqwphwwawplhslpkbv"
  echo "  SUPABASE_DB_PASSWORD=<your-password>"
  echo ""
  echo "Alternative: Run SQL manually in Supabase SQL Editor:"
  echo ""
  cat supabase/migrations/add_zrs_column.sql
  exit 1
fi

# Run migration
echo "Connecting to: $SUPABASE_DB_HOST:$SUPABASE_DB_PORT"
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  -h "$SUPABASE_DB_HOST" \
  -p "$SUPABASE_DB_PORT" \
  -U "$SUPABASE_DB_USER" \
  -d postgres \
  -f supabase/migrations/add_zrs_column.sql

echo "✅ Migration applied successfully!"
