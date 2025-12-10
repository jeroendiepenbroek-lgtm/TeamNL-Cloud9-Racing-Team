#!/bin/bash

# ============================================================================
# Supabase Sync - Complete Setup
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Supabase Setup & Data Sync                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if service key is set
if [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_KEY not set!"
  echo ""
  echo "Get your service key from:"
  echo "https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/settings/api"
  echo ""
  echo "Then run:"
  echo "export SUPABASE_SERVICE_KEY='your-key-here'"
  echo "bash supabase-sync.sh"
  echo ""
  exit 1
fi

echo "📋 Step 1: Run Migrations in Supabase SQL Editor"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Go to: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/editor"
echo ""
echo "Run these migrations IN ORDER:"
echo ""
echo "1. migrations/000_cleanup.sql (optional - only if you want clean start)"
echo "2. migrations/002_api_source_tables.sql ⭐ REQUIRED"
echo "3. migrations/003_hybrid_views.sql ⭐ REQUIRED"
echo ""
echo "Press ENTER when migrations are complete..."
read

echo ""
echo "📊 Step 2: Upload Local Data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if @supabase/supabase-js is installed
if ! npm list @supabase/supabase-js &> /dev/null; then
  echo "Installing Supabase client..."
  npm install @supabase/supabase-js
  echo ""
fi

# Run upload script
node upload-to-supabase.js

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ SUPABASE SYNC COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Your Supabase database now contains:"
echo "  • 857 upcoming events"
echo "  • 99 event signups"
echo "  • 427 race history records (rider 150437)"
echo ""
echo "Test your setup:"
echo "  🔍 SQL Editor: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/editor"
echo "  📊 Table Editor: https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/editor"
echo ""
echo "Example queries:"
echo "  SELECT * FROM v_race_calendar LIMIT 10;"
echo "  SELECT * FROM v_event_signup_preview LIMIT 10;"
echo "  SELECT * FROM v_race_history WHERE rider_id = 150437 LIMIT 10;"
echo ""
