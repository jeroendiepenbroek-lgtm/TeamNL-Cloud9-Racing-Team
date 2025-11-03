#!/bin/bash
set -e

echo "🚀 Schema Deployment via Supabase REST API"
echo "======================================================================"

PROJECT_ID="bktbeefdmrpxhsyyalvc"
SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU"

echo ""
echo "⚠️  DEPLOYMENT STRATEGY"
echo "----------------------------------------------------------------------"
echo "Supabase REST API ondersteunt geen DDL statements direct."
echo "We hebben 2 opties:"
echo ""
echo "1. Handmatig via Dashboard (AANBEVOLEN, 2 min)"
echo "2. Via PostgreSQL connection string (als beschikbaar)"
echo ""
echo "======================================================================"
echo ""

# Check if psql is available
if command -v psql &> /dev/null; then
  echo "✅ psql gevonden!"
  echo ""
  echo "Als je een PostgreSQL connection string hebt, kunnen we deployen."
  echo "Zoek in Supabase Dashboard → Settings → Database → Connection string"
  echo ""
  echo "Heb je de connection string? (y/n)"
  read -r HAS_CONN_STRING
  
  if [ "$HAS_CONN_STRING" = "y" ]; then
    echo ""
    echo "Plak de connection string (format: postgresql://user:pass@host:port/db):"
    read -r CONN_STRING
    
    echo ""
    echo "🔄 Deploying schema via psql..."
    
    # Run cleanup
    psql "$CONN_STRING" < supabase/cleanup-schema.sql
    
    # Run mvp schema
    psql "$CONN_STRING" < supabase/mvp-schema.sql
    
    echo ""
    echo "✅ Schema deployed!"
    
    # Run verification
    echo ""
    echo "🔄 Verifying deployment..."
    export SUPABASE_SERVICE_KEY="$SERVICE_KEY"
    npx tsx scripts/test-database-flow.ts
    
    exit 0
  fi
fi

echo ""
echo "📋 HANDMATIGE DEPLOYMENT INSTRUCTIES"
echo "======================================================================"
echo ""
echo "Open deze URL in je browser:"
echo "https://app.supabase.com/project/${PROJECT_ID}/sql/new"
echo ""
echo "STAP 1: Cleanup"
echo "---------------"
echo "Copy-paste de inhoud van: supabase/cleanup-schema.sql"
echo "Klik: RUN"
echo "Verwacht: 'Cleanup voltooid!'"
echo ""
echo "STAP 2: Deploy"
echo "---------------"
echo "New Query → Copy-paste: supabase/mvp-schema.sql"
echo "Klik: RUN"
echo "Verwacht: 'Success. No rows returned.'"
echo ""
echo "STAP 3: Verify (run dit commando NA deployment):"
echo "---------------"
echo "cd /workspaces/TeamNL-Cloud9-Racing-Team"
echo "SUPABASE_SERVICE_KEY=\"$SERVICE_KEY\" npx tsx scripts/test-database-flow.ts"
echo ""
echo "======================================================================"
echo ""
echo "💡 TIP: Copy-paste de SQL files vanuit VS Code editor"
echo "   - supabase/cleanup-schema.sql (68 lines)"
echo "   - supabase/mvp-schema.sql (399 lines)"
echo ""

