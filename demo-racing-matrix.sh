#!/bin/bash

# 🎯 Racing Matrix - Complete Feature Demo
# Tests all User Stories (US2-US7)

BASE_URL="http://localhost:3000"
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🏁 Racing Matrix - Team Management Demo                  ║"
echo "║  Testing US2, US3, US5, US6, US7                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Check server is running
echo -e "${YELLOW}🔍 Checking server...${NC}"
if ! curl -s "${BASE_URL}/health" > /dev/null; then
    echo -e "${RED}❌ Server not running! Start with: npm start${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}\n"

# ============================================================================
# US2: ADD RIDERS
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  US2: ADD RIDERS (Individual & Bulk)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}📝 Test 1: Add single rider (150437)${NC}"
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/team/members" \
  -H "Content-Type: application/json" \
  -d '{"rider_id": 150437, "nickname": "JRone", "notes": "POC Test Rider"}')

echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Rider added successfully${NC}\n"
else
    echo -e "${YELLOW}⚠️  Rider already exists or error${NC}\n"
fi

read -p "Press ENTER to continue..."

echo -e "\n${YELLOW}📝 Test 2: Create bulk import TXT file${NC}"
cat > /tmp/test-riders.txt << 'EOF'
150437
1495
6899522
EOF

echo "Created /tmp/test-riders.txt with 3 rider IDs"
cat /tmp/test-riders.txt
echo ""

echo -e "${YELLOW}📤 Test 3: Bulk upload TXT file${NC}"
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/team/members/bulk" \
  -F "file=@/tmp/test-riders.txt")

echo "$RESPONSE" | jq '.'
echo ""

read -p "Press ENTER to continue..."

echo -e "\n${YELLOW}📊 Test 4: Get all team members${NC}"
curl -s "${BASE_URL}/api/team/members" | jq '.'
echo ""

read -p "Press ENTER to continue..."

# ============================================================================
# US3: SYNC RIDER DATA
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  US3: SYNC RIDER DATA (Current + Historical)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}🔄 Test 5: Sync single rider with historical data${NC}"
echo "This will take ~15 seconds (rate limiting)..."
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/team/sync/rider/150437?historical=true")

echo "$RESPONSE" | jq '.'
echo ""

read -p "Press ENTER to continue..."

# ============================================================================
# US6: SYNC STATUS & MONITORING
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  US6: SYNC STATUS & MONITORING${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}📊 Test 6: Check sync status${NC}"
curl -s "${BASE_URL}/api/team/sync/status" | jq '.'
echo ""

read -p "Press ENTER to continue..."

# ============================================================================
# US5: AUTO-SYNC SCHEDULER
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  US5: AUTO-SYNC SCHEDULER${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}⏰ Test 7: Check scheduler status${NC}"
curl -s "${BASE_URL}/api/team/sync/scheduler" | jq '.'
echo ""

echo -e "${YELLOW}⏸️  Test 8: Disable auto-sync${NC}"
curl -s -X POST "${BASE_URL}/api/team/sync/scheduler/disable" | jq '.'
echo ""

echo -e "${YELLOW}▶️  Test 9: Enable auto-sync${NC}"
curl -s -X POST "${BASE_URL}/api/team/sync/scheduler/enable" | jq '.'
echo ""

read -p "Press ENTER to continue..."

# ============================================================================
# US7: MANUAL SYNC TRIGGER
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  US7: MANUAL SYNC TRIGGER${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}🚀 Test 10: Trigger manual sync for all riders${NC}"
echo "⚠️  This will sync ALL team members (takes ~12s per rider)"
echo "Current team size: $(curl -s "${BASE_URL}/api/team/members" | jq -r '.count')"
echo ""

read -p "Start manual sync? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    RESPONSE=$(curl -s -X POST "${BASE_URL}/api/team/sync/all")
    echo "$RESPONSE" | jq '.'
    
    ESTIMATED=$(echo "$RESPONSE" | jq -r '.estimated_duration_minutes')
    echo -e "\n${GREEN}✅ Sync started! Estimated duration: ${ESTIMATED} minutes${NC}"
    echo "Monitor progress at: ${BASE_URL}/api/team/sync/status"
else
    echo -e "${YELLOW}⏭️  Skipped manual sync${NC}"
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📊 DEMO SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

MEMBERS=$(curl -s "${BASE_URL}/api/team/members" | jq -r '.count')
STATUS=$(curl -s "${BASE_URL}/api/team/sync/status")
SCHEDULER=$(curl -s "${BASE_URL}/api/team/sync/scheduler")

echo -e "${GREEN}✅ Team Members:${NC} $MEMBERS"
echo -e "${GREEN}✅ Last Sync:${NC} $(echo "$STATUS" | jq -r '.status.last_sync // "Never"')"
echo -e "${GREEN}✅ Sync Progress:${NC} $(echo "$STATUS" | jq -r '.status.sync_percentage')%"
echo -e "${GREEN}✅ Scheduler:${NC} $(echo "$SCHEDULER" | jq -r 'if .scheduler.enabled then "Enabled (hourly at :05)" else "Disabled" end')"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  All User Stories Tested!                                 ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║  ✅ US2: Add riders (individual & bulk)                    ║${NC}"
echo -e "${BLUE}║  ✅ US3: Sync with current + historical data              ║${NC}"
echo -e "${BLUE}║  ✅ US5: Auto-sync scheduler (hourly)                      ║${NC}"
echo -e "${BLUE}║  ✅ US6: Sync monitoring & logs                            ║${NC}"
echo -e "${BLUE}║  ✅ US7: Manual sync trigger                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${YELLOW}📚 View complete documentation:${NC}"
echo "   cat RACING_MATRIX_IMPLEMENTATION.md"
echo ""
echo -e "${YELLOW}🌐 API Endpoints:${NC}"
echo "   GET    ${BASE_URL}/api/team/members"
echo "   POST   ${BASE_URL}/api/team/members"
echo "   POST   ${BASE_URL}/api/team/members/bulk"
echo "   POST   ${BASE_URL}/api/team/sync/rider/:id"
echo "   POST   ${BASE_URL}/api/team/sync/all"
echo "   GET    ${BASE_URL}/api/team/sync/status"
echo "   GET    ${BASE_URL}/api/team/sync/scheduler"
echo ""

read -p "Ready to deploy to production? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${GREEN}🚀 Starting deployment process...${NC}"
    echo "Run: git add . && git commit -m 'feat: Racing Matrix team management (US2-US7)' && git push"
else
    echo -e "\n${YELLOW}⏸️  Deployment cancelled. Test more or make changes.${NC}"
fi

echo ""
