#!/bin/bash

# Schema Deployment via Supabase SQL Editor (Browser Automation Alternative)
# 
# Omdat we geen directe PostgreSQL connection hebben, moeten we via
# Supabase Dashboard. Dit script opent de juiste URL's voor je.

set -e

echo "🚀 Schema Deployment Helper"
echo "======================================================================"
echo ""
echo "⚠️  HANDMATIGE STAPPEN VEREIST"
echo ""
echo "De Supabase JS client kan geen DDL (CREATE/DROP) uitvoeren."
echo "Je moet de SQL scripts handmatig runnen via Supabase Dashboard."
echo ""
echo "======================================================================"
echo ""

PROJECT_ID="bktbeefdmrpxhsyyalvc"
SQL_EDITOR_URL="https://app.supabase.com/project/${PROJECT_ID}/sql/new"

echo "📋 STAP 1: Cleanup Oude Schema"
echo "----------------------------------------------------------------------"
echo ""
echo "1. Open deze URL (automatisch geopend in 3 seconden):"
echo "   $SQL_EDITOR_URL"
echo ""
echo "2. Copy-paste deze file:"
echo "   supabase/cleanup-schema.sql"
echo ""
echo "3. Klik: RUN (rechtsonder)"
echo ""
echo "4. Verwacht: 'Cleanup voltooid! Database is klaar voor mvp-schema.sql'"
echo ""

# Check if we can open browser
if command -v "$BROWSER" &> /dev/null; then
  echo "⏳ Opening browser in 3 seconds..."
  sleep 3
  "$BROWSER" "$SQL_EDITOR_URL" &
else
  echo "ℹ️  Open deze URL handmatig: $SQL_EDITOR_URL"
fi

echo ""
echo "✋ Druk ENTER wanneer Stap 1 voltooid is..."
read

echo ""
echo "📋 STAP 2: Deploy MVP Schema"
echo "----------------------------------------------------------------------"
echo ""
echo "1. In dezelfde SQL Editor, maak een NIEUWE query"
echo ""
echo "2. Copy-paste deze file:"
echo "   supabase/mvp-schema.sql"
echo ""
echo "3. Klik: RUN"
echo ""
echo "4. Verwacht: 'Success. No rows returned.'"
echo ""
echo "✋ Druk ENTER wanneer Stap 2 voltooid is..."
read

echo ""
echo "📋 STAP 3: Verify Deployment"
echo "----------------------------------------------------------------------"
echo ""
echo "⏳ Running verification test..."
echo ""

# Run verification test
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU"

npx tsx scripts/test-database-flow.ts

RESULT=$?

echo ""
echo "======================================================================"
if [ $RESULT -eq 0 ]; then
  echo "✅ SCHEMA DEPLOYMENT SUCCESS!"
  echo ""
  echo "Database is klaar voor gebruik."
  echo ""
  echo "📋 Volgende stappen:"
  echo "   1. Verkrijg nieuwe ZwiftRacing API key"
  echo "   2. Upload test data via frontend"
  echo "   3. Trigger GitHub Actions workflow"
else
  echo "❌ SCHEMA DEPLOYMENT FAILED"
  echo ""
  echo "Controleer of beide SQL scripts succesvol uitgevoerd zijn."
  echo "Check Supabase SQL Editor voor errors."
fi
echo "======================================================================"
