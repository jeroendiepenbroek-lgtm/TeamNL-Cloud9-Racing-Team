#!/bin/bash

# ============================================================================
# Railway Deployment Script - Geautomatiseerde E2E
# ============================================================================
# Deploy naar Railway → Run migrations → Sync data → Verify
# ============================================================================

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║              🚂 RAILWAY DEPLOYMENT - AUTOMATED E2E                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not installed"
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STAP 1: Git Commit & Push"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

git add .
git commit -m "feat: Automated E2E workflow with migrations" || echo "ℹ️  No changes to commit"
git push origin fresh-start-v4

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STAP 2: Deploy to Railway"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

railway up

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STAP 3: Run Migrations (Automated)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

railway run node execute-migrations.js

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STAP 4: Sync Initial Data (Automated)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

railway run node fetch-zwiftracing-rider.js 150437

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STAP 5: Verify Data in View"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

railway run node -e "
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, velo_live, velo_90day, zwiftracing_category, data_completeness')
    .eq('rider_id', 150437)
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }
  
  if (!data) {
    console.log('⚠️  Rider 150437 not found in view');
    process.exit(1);
  }
  
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  ✅ DATA VERIFICATION SUCCESSFUL                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log('👤 Rider:', data.full_name);
  console.log('🏁 vELO Live:', data.velo_live);
  console.log('🏆 vELO 90-day:', data.velo_90day);
  console.log('📊 Category:', data.zwiftracing_category);
  console.log('✅ Completeness:', data.data_completeness);
  console.log('');
  
  if (data.data_completeness === 'complete') {
    console.log('🎉 E2E WORKFLOW SUCCESVOL! Data is volledig.');
  } else {
    console.log('⚠️  Data is niet volledig. Run ook Zwift Official sync.');
  }
})();
"

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║              🎉 AUTOMATED E2E DEPLOYMENT COMPLETE!                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔗 Railway Dashboard: https://railway.app"
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard/project/tfsepzumkireferencer"
echo ""
echo "📊 Next: Setup cron job voor automatische data sync"
echo "   railway run --cron '0 */6 * * *' node fetch-zwiftracing-rider.js 150437"
echo ""
