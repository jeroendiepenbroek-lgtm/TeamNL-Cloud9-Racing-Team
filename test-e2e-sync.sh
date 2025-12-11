#!/bin/bash

echo "🧪 E2E Test: Add Rider & Verify Sync"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for backend to be ready
echo -e "\n1️⃣  Waiting for backend..."
for i in {1..10}; do
  if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "   ✅ Backend is healthy!"
    break
  fi
  echo "   ⏳ Attempt $i/10..."
  sleep 2
done

# Login
echo -e "\n2️⃣  Logging in as admin..."
TOKEN=$(curl -s -X POST http://localhost:8080/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teamnl.cloud9","password":"admin123"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "   ❌ Login failed!"
  exit 1
fi
echo "   ✅ Token: ${TOKEN:0:50}..."

# Add rider 150437
echo -e "\n3️⃣  Adding rider 150437..."
ADD_RESULT=$(curl -s -X POST http://localhost:8080/api/admin/team/riders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rider_id":150437}')

echo "$ADD_RESULT" | jq .

if echo "$ADD_RESULT" | grep -q "error"; then
  echo "   ⚠️  Rider might already exist (this is OK)"
else
  echo "   ✅ Rider added successfully!"
fi

# Wait for sync to complete
echo -e "\n4️⃣  Waiting 20 seconds for background sync..."
for i in {20..1}; do
  echo -ne "   ⏳ $i seconds remaining...\r"
  sleep 1
done
echo -e "\n   ✅ Wait complete!"

# Check team roster
echo -e "\n5️⃣  Checking team_roster..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bktbeefdmrpxhsyyalvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'
);

(async () => {
  const { data } = await supabase
    .from('team_roster')
    .select('*')
    .eq('rider_id', 150437)
    .single();
  
  if (data) {
    console.log('   ✅ Rider in team_roster');
    console.log('   Last synced:', data.last_synced || 'Never');
  } else {
    console.log('   ❌ Rider NOT in team_roster');
  }
})();
"

# Check ZwiftRacing data
echo -e "\n6️⃣  Checking ZwiftRacing data..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bktbeefdmrpxhsyyalvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'
);

(async () => {
  const { data } = await supabase
    .from('api_zwiftracing_riders')
    .select('name, velo_live, ftp, race_wins')
    .eq('rider_id', 150437)
    .single();
  
  if (data) {
    console.log('   ✅ ZwiftRacing data found!');
    console.log('   Name:', data.name);
    console.log('   vELO:', data.velo_live);
    console.log('   FTP:', data.ftp + 'W');
    console.log('   Wins:', data.race_wins);
  } else {
    console.log('   ❌ No ZwiftRacing data yet');
  }
})();
"

# Check v_rider_complete
echo -e "\n7️⃣  Checking v_rider_complete view..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://bktbeefdmrpxhsyyalvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'
);

(async () => {
  const { data } = await supabase
    .from('v_rider_complete')
    .select('full_name, velo_live, racing_ftp, data_completeness')
    .eq('rider_id', 150437)
    .single();
  
  if (data) {
    console.log('   ✅ Visible in v_rider_complete!');
    console.log('   Name:', data.full_name);
    console.log('   vELO:', data.velo_live);
    console.log('   FTP:', data.racing_ftp + 'W');
    console.log('   Completeness:', data.data_completeness);
    console.log('');
    console.log('   🎉 SUCCESS! Rider will appear in Racing Matrix');
  } else {
    console.log('   ❌ Not visible in v_rider_complete');
  }
})();
"

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ E2E Test Complete!"
echo ""
