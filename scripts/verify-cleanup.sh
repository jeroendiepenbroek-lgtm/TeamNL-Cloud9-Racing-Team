#!/bin/bash
# Verify no references to deleted code exist

set -e

echo "=========================================="
echo "🔍 Legacy Code Verification Script"
echo "=========================================="
echo ""

FAIL_COUNT=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Checking for legacy service references..."
if grep -r "auto-sync\.service" backend/src/ 2>/dev/null | grep -v "CLEANUP_PLAN\|ARCHITECTURE_AUDIT"; then
  echo -e "${RED}❌ FAIL: auto-sync.service references found${NC}"
  ((FAIL_COUNT++))
else
  echo -e "${GREEN}✅ PASS: No auto-sync.service references${NC}"
fi

if grep -r "AutoSyncService" backend/src/ 2>/dev/null | grep -v "CLEANUP_PLAN\|ARCHITECTURE_AUDIT"; then
  echo -e "${RED}❌ FAIL: AutoSyncService references found${NC}"
  ((FAIL_COUNT++))
else
  echo -e "${GREEN}✅ PASS: No AutoSyncService references${NC}"
fi

echo ""
echo "🔍 Checking for legacy page references..."
if grep -r "import Dashboard from" backend/frontend/src/ 2>/dev/null; then
  echo -e "${RED}❌ FAIL: Dashboard import found${NC}"
  ((FAIL_COUNT++))
else
  echo -e "${GREEN}✅ PASS: No Dashboard imports${NC}"
fi

if grep -r "import.*RacingDataMatrix[^M]" backend/frontend/src/ 2>/dev/null; then
  echo -e "${RED}❌ FAIL: old RacingDataMatrix import found${NC}"
  ((FAIL_COUNT++))
else
  echo -e "${GREEN}✅ PASS: No old RacingDataMatrix imports${NC}"
fi

if grep -r "from.*Events['\"]" backend/frontend/src/ 2>/dev/null | grep -v "EventsModern" | grep -v "CLEANUP"; then
  echo -e "${YELLOW}⚠️  WARNING: Old Events import might exist (check manually)${NC}"
fi

echo ""
echo "🔍 Checking for deprecated column usage..."
if grep -r "ftp_deprecated" backend/src/ 2>/dev/null | grep -v "CLEANUP_PLAN\|ARCHITECTURE_AUDIT\|migration"; then
  echo -e "${RED}❌ FAIL: ftp_deprecated usage found${NC}"
  ((FAIL_COUNT++))
else
  echo -e "${GREEN}✅ PASS: No ftp_deprecated usage${NC}"
fi

if grep -r "category_racing_deprecated" backend/src/ 2>/dev/null | grep -v "CLEANUP_PLAN\|ARCHITECTURE_AUDIT\|migration"; then
  echo -e "${RED}❌ FAIL: category_racing_deprecated usage found${NC}"
  ((FAIL_COUNT++))
else
  echo -e "${GREEN}✅ PASS: No category_racing_deprecated usage${NC}"
fi

if grep -r "category_zftp_deprecated" backend/src/ 2>/dev/null | grep -v "CLEANUP_PLAN\|ARCHITECTURE_AUDIT\|migration"; then
  echo -e "${RED}❌ FAIL: category_zftp_deprecated usage found${NC}"
  ((FAIL_COUNT++))
else
  echo -e "${GREEN}✅ PASS: No category_zftp_deprecated usage${NC}"
fi

echo ""
echo "🔍 Checking for old table references..."
if grep -r "event_signups" backend/src/ 2>/dev/null | grep -v "zwift_api_event_signups" | grep -v "CLEANUP_PLAN\|ARCHITECTURE_AUDIT" | grep -v "event_signups_with_team" | grep -v "upsertEventSignups"; then
  echo -e "${YELLOW}⚠️  WARNING: event_signups references found (verify they're for zwift_api_event_signups)${NC}"
fi

if grep -r "club_roster" backend/src/ 2>/dev/null | grep -v "CLEANUP_PLAN\|ARCHITECTURE_AUDIT\|schema\.sql"; then
  echo -e "${RED}❌ FAIL: club_roster references found${NC}"
  ((FAIL_COUNT++))
else
  echo -e "${GREEN}✅ PASS: No club_roster references${NC}"
fi

echo ""
echo "🔍 Checking for old category/zwift_id column usage..."
if grep -r "category:" backend/src/ 2>/dev/null | grep -v "zp_category\|zpCategory\|CLEANUP\|ARCHITECTURE" | grep -v "race_.*_category\|event.*category\|pen.*category"; then
  echo -e "${YELLOW}⚠️  WARNING: 'category:' assignment found (should be 'zp_category:')${NC}"
fi

if grep -r "zwift_id:" backend/src/ 2>/dev/null | grep -v "CLEANUP\|ARCHITECTURE"; then
  echo -e "${YELLOW}⚠️  WARNING: 'zwift_id:' assignment found (should be 'rider_id:')${NC}"
fi

echo ""
echo "=========================================="
if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ All checks PASSED${NC}"
  echo -e "${GREEN}Code is clean and ready for production${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAIL_COUNT checks FAILED${NC}"
  echo -e "${RED}Please fix issues before proceeding${NC}"
  exit 1
fi
