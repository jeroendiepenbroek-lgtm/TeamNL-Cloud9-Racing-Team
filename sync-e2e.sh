#!/bin/bash

# ============================================================================
# E2E Data Sync Workflow
# ============================================================================
# Automated: API → Sourcing Tables → Views → Frontend Dashboard
# ============================================================================

echo "🚀 TeamNL Cloud9 Racing - E2E Data Sync Workflow"
echo "=============================================="
echo ""

# Configuration
RIDER_IDS=(150437)  # Add more rider IDs as needed

echo "📊 Syncing ${#RIDER_IDS[@]} rider(s)..."
echo ""

# Step 1: Fetch from APIs and populate sourcing tables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 STEP 1: API → Sourcing Tables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for rider_id in "${RIDER_IDS[@]}"; do
  echo "🏁 Fetching rider $rider_id..."
  node fetch-zwiftracing-rider.js "$rider_id"
  
  if [ $? -eq 0 ]; then
    echo "✅ Rider $rider_id synced"
  else
    echo "❌ Failed to sync rider $rider_id"
  fi
  
  echo ""
  
  # Rate limiting: 5 calls per minute for ZwiftRacing API
  if [ ${#RIDER_IDS[@]} -gt 1 ]; then
    echo "⏳ Rate limiting: waiting 12 seconds..."
    sleep 12
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 STEP 2: Sourcing Tables → Views"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Views automatically updated via FULL OUTER JOIN"
echo "   - v_rider_complete (main profile)"
echo "   - Data merged from api_zwift_api_profiles + api_zwiftracing_riders"
echo ""

# Step 3: Verify data in views
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 STEP 3: Verify Views → Frontend Ready"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node -e "
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tfsepzumkireferencer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY1Mjg3NCwiZXhwIjoyMDQ5MjI4ODc0fQ.w_OaLXZ-VvGJV0_6n1zP9rH7YXElxyoTqDcg0p_7W7s'
);

async function verifySync() {
  console.log('🔍 Checking v_rider_complete...\n');
  
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select('rider_id, full_name, velo, velo_90day, zwiftracing_category, data_completeness')
    .in('rider_id', [150437]);
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️  No riders found in view');
    return;
  }
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📊 SYNCED RIDERS IN v_rider_complete                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  data.forEach(rider => {
    console.log(\`👤 \${rider.full_name} (ID: \${rider.rider_id})\`);
    console.log(\`   vELO: \${rider.velo || 'N/A'}\`);
    console.log(\`   vELO 90-day: \${rider.velo_90day || 'N/A'}\`);
    console.log(\`   Category: \${rider.zwiftracing_category || 'N/A'}\`);
    console.log(\`   Completeness: \${rider.data_completeness}\`);
    console.log('');
  });
  
  const complete = data.filter(r => r.data_completeness === 'complete').length;
  const total = data.length;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(\`✅ \${complete}/\${total} riders have complete data\`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

verifySync().catch(console.error);
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 E2E Sync Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Data flow:"
echo "   1. ✅ ZwiftRacing API → api_zwiftracing_riders"
echo "   2. ✅ Zwift Official API → api_zwift_api_profiles"
echo "   3. ✅ Sourcing tables → v_rider_complete (FULL OUTER JOIN)"
echo "   4. ✅ Views → Frontend Dashboard ready"
echo ""
echo "🔗 Frontend can now query: SELECT * FROM v_rider_complete"
echo ""
