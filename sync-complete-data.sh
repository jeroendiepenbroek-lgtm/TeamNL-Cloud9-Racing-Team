#!/bin/bash

echo "🏁 TeamNL Cloud9 Racing - Complete Data Sync"
echo "=============================================="
echo ""
echo "⚠️  PREREQUISITE: Migrations must be run in Supabase first!"
echo ""
echo "If not done yet:"
echo "1. Open: https://supabase.com/dashboard/project/tfsepzumkireferencer/sql/new"
echo "2. Copy content from: /tmp/run_migrations.sql"
echo "3. Click RUN"
echo "4. Come back and run this script again"
echo ""
read -p "Have you run the migrations? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please run migrations first, then come back."
    exit 1
fi

echo ""
echo "=============================================="
echo "📋 Step 1: Checking database setup..."
echo "=============================================="
echo ""

node check-setup.js
SETUP_OK=$?

if [ $SETUP_OK -ne 0 ]; then
  echo ""
  echo "❌ Setup incomplete. Migrations may not have been run correctly."
  exit 1
fi

echo ""
echo "=============================================="
echo ""

# Step 2: Fetch ZwiftRacing data
echo "📋 Step 2: Fetching ZwiftRacing.app data..."
echo ""
node fetch-zwiftracing-rider.js 150437

echo ""
echo "=============================================="
echo ""

# Step 3: Verify complete data
echo "📋 Step 3: Verifying data completeness..."
echo ""

node -e "
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tfsepzumkireferencer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY1Mjg3NCwiZXhwIjoyMDQ5MjI4ODc0fQ.w_OaLXZ-VvGJV0_6n1zP9rH7YXElxyoTqDcg0p_7W7s'
);

async function verify() {
  const { data, error } = await supabase
    .from('v_rider_complete')
    .select(\`
      rider_id,
      full_name,
      racing_name,
      velo,
      zwiftracing_score,
      zwift_official_racing_score,
      phenotype,
      zwiftracing_category,
      race_count,
      power_5s_wkg,
      power_1200s_wkg,
      weight_kg,
      height_cm,
      ftp_watts,
      avatar_url,
      data_completeness
    \`)
    .eq('rider_id', 150437)
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  console.log('📊 COMPLETE RIDER PROFILE - Rider 150437');
  console.log('');
  console.log('👤 Identity:');
  console.log('   Full Name:', data.full_name);
  console.log('   Racing Name:', data.racing_name);
  console.log('');
  console.log('🏁 Racing Metrics:');
  console.log('   vELO:', data.velo?.toFixed(2) || 'N/A');
  console.log('   ZwiftRacing Score:', data.zwiftracing_score?.toFixed(2) || 'N/A');
  console.log('   Zwift Official Score:', data.zwift_official_racing_score || 'N/A');
  console.log('   Category:', data.zwiftracing_category || 'N/A');
  console.log('   Phenotype:', data.phenotype || 'N/A');
  console.log('   Race Count:', data.race_count || 'N/A');
  console.log('');
  console.log('💪 Power Curve:');
  console.log('   5s:', data.power_5s_wkg?.toFixed(2) || 'N/A', 'w/kg');
  console.log('   20min:', data.power_1200s_wkg?.toFixed(2) || 'N/A', 'w/kg');
  console.log('');
  console.log('📏 Physical:');
  console.log('   Weight:', data.weight_kg?.toFixed(1) || 'N/A', 'kg');
  console.log('   Height:', data.height_cm || 'N/A', 'cm');
  console.log('   FTP:', data.ftp_watts || 'N/A', 'W');
  console.log('');
  console.log('📸 Avatar:', data.avatar_url ? '✅ Present' : '❌ Missing');
  console.log('');
  console.log('✅ DATA COMPLETENESS:', data.data_completeness?.toUpperCase());
  
  if (data.data_completeness === 'complete') {
    console.log('');
    console.log('🎉 SUCCESS! All data sources integrated.');
  } else {
    console.log('');
    console.log('⚠️  Partial data only. Status:', data.data_completeness);
  }
}

verify().catch(console.error);
"

echo ""
echo "=============================================="
echo ""
echo "✅ Data sync completed!"
echo ""
echo "📊 View your data at:"
echo "   https://supabase.com/dashboard/project/tfsepzumkireferencer/editor"
echo ""
