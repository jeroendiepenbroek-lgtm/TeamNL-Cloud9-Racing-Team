#!/bin/bash

# ============================================================================
# Quick Upload - Gebruik Railway environment variables
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Upload to Supabase - Simple Version                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if migrations zijn uitgevoerd
echo "⚠️  BELANGRIJK: Heb je de migrations al uitgevoerd in Supabase?"
echo ""
echo "   Ga naar: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/editor"
echo ""
echo "   Run EERST deze migrations:"
echo "   1. migrations/002_api_source_tables.sql"
echo "   2. migrations/003_hybrid_views.sql"
echo ""
read -p "Migrations uitgevoerd? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Run eerst de migrations!"
  exit 1
fi

# Get service key from user
echo ""
echo "📋 Copy/paste je SUPABASE_SERVICE_KEY uit Railway Variables:"
echo "   (Zie screenshot - het begint met 'eyJ...')"
echo ""
read -p "SUPABASE_SERVICE_KEY: " service_key

if [ -z "$service_key" ]; then
  echo "❌ Service key is leeg!"
  exit 1
fi

# Export and run upload
export SUPABASE_SERVICE_KEY="$service_key"
node upload-to-supabase.js
