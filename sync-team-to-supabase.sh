#!/bin/bash

# ============================================================================
# SYNC TEAM DATA TO SUPABASE
# ============================================================================
# Purpose: Sync alle TeamNL riders naar Supabase bktbeefdmrpxhsyyalvc
# Usage: ./sync-team-to-supabase.sh
# ============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       TeamNL Data Sync → Supabase (Railway Project)      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

# ============================================================================
# STEP 1: Environment Setup
# ============================================================================
echo -e "${YELLOW}📋 Step 1: Setting up environment${NC}"

export SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDczOTQ1MiwiZXhwIjoyMDQ2MzE1NDUyfQ.GXxGUBxnPh3u5Q-7PLy_dT9uc-FcqMVNqWj5hl9rAXM"

echo "   Supabase Project: bktbeefdmrpxhsyyalvc"
echo "   Railway Project: 1af6fad4-ab12-41a6-a6c3-97a532905f8c"
echo ""

# ============================================================================
# STEP 2: Verify Connection
# ============================================================================
echo -e "${YELLOW}📡 Step 2: Verifying Supabase connection${NC}"

if command -v node &> /dev/null; then
    node -e "
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    supabase.from('v_rider_complete').select('*', {count:'exact',head:true})
      .then(r => {
        if (r.error) {
          console.log('   ❌ View does not exist:', r.error.message);
          console.log('   ⚠️  Run SETUP_SUPABASE_COMPLETE.sql first!');
          process.exit(1);
        } else {
          console.log('   ✅ v_rider_complete view exists (' + r.count + ' rows)');
        }
      });
    " 2>&1
else
    echo "   ⚠️  Node.js not found, skipping connection test"
fi

echo ""

# ============================================================================
# STEP 3: Define Team Riders
# ============================================================================
echo -e "${YELLOW}👥 Step 3: Team Riders to Sync${NC}"

# Add your team riders here!
TEAM_RIDERS=(
    150437  # Jeroen Diepenbroek / JRøne CloudRacer-9 @YT
    # Add more rider IDs here:
    # 123456  # Rider Name
    # 789012  # Another Rider
)

echo "   Found ${#TEAM_RIDERS[@]} riders to sync"
echo ""

# ============================================================================
# STEP 4: Sync Each Rider
# ============================================================================
echo -e "${YELLOW}🔄 Step 4: Syncing riders${NC}\n"

SUCCESS_COUNT=0
FAIL_COUNT=0
FAILED_RIDERS=()

for RIDER_ID in "${TEAM_RIDERS[@]}"; do
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Syncing Rider ID: $RIDER_ID${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if node fetch-zwiftracing-rider.js "$RIDER_ID"; then
        echo -e "${GREEN}✅ Rider $RIDER_ID synced successfully${NC}\n"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}❌ Failed to sync rider $RIDER_ID${NC}\n"
        ((FAIL_COUNT++))
        FAILED_RIDERS+=("$RIDER_ID")
    fi
    
    # Rate limiting (be nice to APIs)
    if [ $RIDER_ID != "${TEAM_RIDERS[-1]}" ]; then
        echo "   Waiting 2 seconds (rate limiting)..."
        sleep 2
    fi
done

# ============================================================================
# STEP 5: Summary
# ============================================================================
echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                       SYNC SUMMARY                        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}✅ Successful: $SUCCESS_COUNT riders${NC}"
echo -e "${RED}❌ Failed: $FAIL_COUNT riders${NC}"

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "\n${YELLOW}Failed Rider IDs:${NC}"
    for FAILED_ID in "${FAILED_RIDERS[@]}"; do
        echo "   - $FAILED_ID"
    done
fi

echo ""

# ============================================================================
# STEP 6: Verification
# ============================================================================
echo -e "${YELLOW}🔍 Step 6: Verifying data in Supabase${NC}\n"

if command -v node &> /dev/null; then
    node -e "
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    supabase.from('v_rider_complete')
      .select('rider_id,full_name,velo_live,zwiftracing_category')
      .order('velo_live', { ascending: false, nullsLast: true })
      .limit(10)
      .then(r => {
        if (r.error) {
          console.log('   ❌ Error:', r.error.message);
        } else {
          console.log('   ✅ Top 10 Riders in Database:\n');
          console.log('   ┌─────────┬────────────────────────┬───────────┬──────────┐');
          console.log('   │ Rider ID│ Name                   │ vELO Live │ Category │');
          console.log('   ├─────────┼────────────────────────┼───────────┼──────────┤');
          r.data.forEach(rider => {
            const id = String(rider.rider_id || '').padEnd(8);
            const name = String(rider.full_name || rider.racing_name || 'Unknown').padEnd(23).substring(0,23);
            const velo = String(rider.velo_live || '-').padStart(9);
            const cat = String(rider.zwiftracing_category || '-').padStart(8);
            console.log('   │ ' + id + '│ ' + name + '│ ' + velo + ' │ ' + cat + ' │');
          });
          console.log('   └─────────┴────────────────────────┴───────────┴──────────┘');
        }
      });
    " 2>&1
fi

echo ""

# ============================================================================
# STEP 7: Next Steps
# ============================================================================
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        NEXT STEPS                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo "1. Check dashboard:"
echo "   ${GREEN}https://teamnl-cloud9-racing-team-production.up.railway.app/${NC}"
echo ""
echo "2. View data in Supabase:"
echo "   ${GREEN}https://supabase.com/dashboard/project/bktbeefdmrpxhsyyalvc/editor${NC}"
echo ""
echo "3. Check Railway logs:"
echo "   ${GREEN}railway logs --tail 50${NC}"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some riders failed to sync. Check:${NC}"
    echo "   - API endpoints working?"
    echo "   - Rider IDs correct?"
    echo "   - Network connectivity?"
    echo ""
fi

echo -e "${GREEN}✅ Sync complete!${NC}\n"
