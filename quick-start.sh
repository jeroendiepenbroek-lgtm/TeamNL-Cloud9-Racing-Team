#!/bin/bash

echo "🚀 TeamNL Cloud9 Racing - Quick Start Guide"
echo "==========================================="
echo ""
echo "📋 Current Status:"
echo ""

# Check if migrations are run
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://tfsepzumkireferencer.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmc2VwenVta2lyZWZlcmVuY2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzY1Mjg3NCwiZXhwIjoyMDQ5MjI4ODc0fQ.w_OaLXZ-VvGJV0_6n1zP9rH7YXElxyoTqDcg0p_7W7s'
);

async function checkStatus() {
  const { error } = await supabase.from('api_zwiftracing_riders').select('count').limit(1);
  
  if (error) {
    console.log('❌ Migrations NOT run yet');
    console.log('');
    console.log('👉 NEXT STEP: Run migrations in Supabase');
    console.log('');
    console.log('1. Open: https://supabase.com/dashboard/project/tfsepzumkireferencer/sql/new');
    console.log('2. Copy SQL from: /tmp/run_migrations.sql');
    console.log('   (or see SYNC_SETUP_COMPLETE.md for full SQL)');
    console.log('3. Click RUN button');
    console.log('4. Come back and run: ./sync-complete-data.sh');
    console.log('');
  } else {
    console.log('✅ Migrations completed');
    console.log('');
    console.log('👉 NEXT STEP: Sync rider data');
    console.log('');
    console.log('Run: ./sync-complete-data.sh');
    console.log('');
  }
}

checkStatus().catch(() => {
  console.log('❌ Cannot connect to Supabase');
  console.log('   Check your internet connection');
});
" 2>/dev/null

echo ""
echo "📚 Documentation:"
echo "   - SYNC_SETUP_COMPLETE.md   (complete guide)"
echo "   - migrations/005_*.sql     (new table)"
echo "   - migrations/006_*.sql     (updated views)"
echo ""
echo "🔧 Available Scripts:"
echo "   - ./sync-complete-data.sh  (full workflow)"
echo "   - node check-setup.js      (check database)"
echo "   - node fetch-zwiftracing-rider.js <id>  (fetch rider)"
echo ""
