#!/bin/bash

# Supabase Project Info
PROJECT_REF="tfsepzumkireferencer"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY1Mjg3NCwiZXhwIjoyMDQ5MjI4ODc0fQ.w_OaLXZ-VvGJV0_6n1zP9rH7YXElxyoTqDcg0p_7W7s"

echo "🔧 Running migrations via Supabase REST API..."
echo ""

# Read migration SQL
SQL=$(cat /tmp/run_migrations.sql)

# Execute via PostgREST
curl -X POST "https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"query\": $(echo "$SQL" | jq -Rs .)}"

echo ""
echo "✅ Migration request sent"
echo ""
echo "⚠️  If this fails, go to:"
echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo "   And paste migrations/005_zwiftracing_riders_table.sql + migrations/006_updated_views.sql"
