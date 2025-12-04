#!/bin/bash
# POC Data Sync - Direct via curl

SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU"
ZWIFT_API_KEY="650c6d2fc4ef6858d74cbef1"

echo ""
echo "🔄 POC SYNC - Rider 150437"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. Fetch rider from ZwiftRacing
echo "1️⃣  Fetching from ZwiftRacing.app..."
RIDER_DATA=$(curl -s "https://zwift-ranking.herokuapp.com/public/riders/150437" \
  -H "Authorization: $ZWIFT_API_KEY")

NAME=$(echo "$RIDER_DATA" | jq -r '.name')
echo "   ✅ $NAME"
echo ""

# 2. Insert to riders_unified
echo "2️⃣  Inserting to riders_unified..."

# Map API → DB (exact column names from riders_unified)
RIDER_JSON=$(echo "$RIDER_DATA" | jq '{
  rider_id: .riderId,
  name: .name,
  gender: .gender,
  age_category: .age,
  country_code: .country,
  weight_kg: .weight,
  height_cm: .height,
  ftp: .zpFTP,
  category: .zpCategory,
  
  power_5s_w: .power.w5,
  power_15s_w: .power.w15,
  power_30s_w: .power.w30,
  power_1m_w: .power.w60,
  power_2m_w: .power.w120,
  power_5m_w: .power.w300,
  power_20m_w: .power.w1200,
  
  power_5s_wkg: .power.wkg5,
  power_15s_wkg: .power.wkg15,
  power_30s_wkg: .power.wkg30,
  power_1m_wkg: .power.wkg60,
  power_2m_wkg: .power.wkg120,
  power_5m_wkg: .power.wkg300,
  power_20m_wkg: .power.wkg1200,
  
  critical_power: .power.CP,
  anaerobic_work_capacity: .power.AWC,
  compound_score: .power.compoundScore,
  
  velo_rating: .race.current.rating,
  velo_rank: .race.current.mixed.number,
  velo_max_30d: .race.max30.rating,
  velo_max_90d: .race.max90.rating,
  
  race_wins: .race.wins,
  race_podiums: .race.podiums,
  race_dnfs: .race.dnfs,
  
  phenotype_sprinter: .phenotype.scores.sprinter,
  phenotype_pursuiter: .phenotype.scores.pursuiter,
  phenotype_puncheur: .phenotype.scores.puncheur,
  
  handicap_flat: .handicaps.flat,
  handicap_rolling: .handicaps.rolling,
  handicap_hilly: .handicaps.hilly,
  handicap_mountainous: .handicaps.mountainous,
  
  club_id: .club.id,
  club_name: .club.name
}')

INSERT_RESULT=$(curl -s "$SUPABASE_URL/rest/v1/riders_unified" \
  -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d "$RIDER_JSON")

if echo "$INSERT_RESULT" | jq -e '.[0].rider_id' > /dev/null 2>&1; then
  echo "   ✅ Rider inserted successfully"
else
  echo "   ❌ Insert failed:"
  echo "$INSERT_RESULT" | jq '.'
fi

echo ""

# 3. Add to my_team_members
echo "3️⃣  Adding to my_team_members..."

TEAM_RESULT=$(curl -s "$SUPABASE_URL/rest/v1/my_team_members" \
  -X POST \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=ignore-duplicates,return=representation" \
  -d '{"rider_id": 150437}')

if echo "$TEAM_RESULT" | jq -e '.[0].rider_id' > /dev/null 2>&1; then
  echo "   ✅ Added to team"
elif [ -z "$TEAM_RESULT" ]; then
  echo "   ✅ Already in team (duplicate ignored)"
else
  echo "   ❌ Team add failed:"
  echo "$TEAM_RESULT" | jq '.'
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ POC Sync complete!"
echo ""
