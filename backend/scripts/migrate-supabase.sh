#!/bin/bash

# Supabase PostgreSQL Migration Runner
# 
# Gebruikt directe PostgreSQL connectie voor SQL migraties
# VOORDEEL: Geen limitaties, volledige PostgreSQL support

set -e

# Check for required tools
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Install: sudo apt-get install postgresql-client"
    exit 1
fi

# Load environment variables
if [ -f "backend/.env" ]; then
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL not found in backend/.env"
    exit 1
fi

# Extract project ref from URL (bktbeefdmrpxhsyyalvc.supabase.co)
PROJECT_REF=$(echo $SUPABASE_URL | sed -E 's|https://([^.]+).*|\1|')

echo "🗄️  Supabase PostgreSQL Migration Runner"
echo "📍 Project: $PROJECT_REF"
echo ""

# Check if migration file provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/migrate-supabase.sh <migration-file.sql>"
    echo "Example: ./scripts/migrate-supabase.sh 018_unified_schema_poc.sql"
    exit 1
fi

MIGRATION_FILE="$1"
MIGRATION_PATH="supabase/migrations/$MIGRATION_FILE"

if [ ! -f "$MIGRATION_PATH" ]; then
    echo "❌ Migration file not found: $MIGRATION_PATH"
    exit 1
fi

echo "📄 Running: $MIGRATION_FILE"
echo ""

# Get database password from Supabase dashboard
echo "⚠️  You need the DATABASE_PASSWORD from Supabase Dashboard:"
echo "   1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo "   2. Copy 'Connection string' → Direct connection → Password"
echo ""
read -sp "Enter database password: " DB_PASSWORD
echo ""
echo ""

# Build connection string
# Format: postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Run migration
echo "🚀 Executing migration..."
psql "$CONNECTION_STRING" -f "$MIGRATION_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration successful!"
    
    # Track migration
    psql "$CONNECTION_STRING" -c "
        CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            executed_at TIMESTAMPTZ DEFAULT NOW()
        );
        INSERT INTO _migrations (name) VALUES ('$MIGRATION_FILE')
        ON CONFLICT (name) DO NOTHING;
    "
    
    echo "✅ Migration tracked in _migrations table"
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi
