#!/bin/bash

# Railway Cost Monitor Script
# Run wekelijks: ./scripts/check-railway-costs.sh

echo "🔍 Railway Cost Monitoring Check"
echo "================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI niet geïnstalleerd${NC}"
    echo "Installeer met: npm install -g @railway/cli"
    echo "Dan: railway login"
    exit 1
fi

echo "📊 Huidige Railway Status:"
echo ""

# Get project list
echo "1. Actieve Projects:"
railway projects 2>/dev/null || echo "   Login required: railway login"
echo ""

# Get current deployment status
echo "2. Deployment Status:"
railway status 2>/dev/null || echo "   Geen actieve deployment gevonden"
echo ""

# Manual checks
echo "3. ⚠️  HANDMATIGE CHECKS NODIG:"
echo ""
echo "   a) Ga naar: https://railway.app/account/usage"
echo "   b) Check 'Estimated cost this month'"
echo "   c) Verwacht: < \$2.00 (goed) | \$2-4 (OK) | >\$4 (ALARM!)"
echo ""
echo "   d) Verify aantal projects = 1"
echo "   e) Verify 'intuitive-victory' is DELETED"
echo ""

# Check production health
echo "4. Production Health Check:"
HEALTH_URL="https://teamnl-cloud9-racing-team-production.up.railway.app/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   ${GREEN}✅ Backend is LIVE (HTTP $HTTP_CODE)${NC}"
else
    echo -e "   ${RED}❌ Backend OFFLINE (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# Cost estimation (manual input)
echo "5. 💰 Vul geschatte kosten in (van Railway dashboard):"
read -p "   Current month cost (\$): " CURRENT_COST

if (( $(echo "$CURRENT_COST < 2.5" | bc -l) )); then
    echo -e "   ${GREEN}✅ Kosten binnen budget (<50% van limiet)${NC}"
elif (( $(echo "$CURRENT_COST < 4.0" | bc -l) )); then
    echo -e "   ${YELLOW}⚠️  Kosten zijn OK maar hoog (>50% van limiet)${NC}"
else
    echo -e "   ${RED}🚨 ALARM! Kosten te hoog (>80% van \$5 limiet)${NC}"
    echo "   Actie: Check Railway logs en usage breakdown!"
fi
echo ""

# Weekly log
LOG_FILE="logs/railway-cost-checks.log"
mkdir -p logs
echo "[$(date)] Cost check: \$${CURRENT_COST} | Health: HTTP ${HTTP_CODE}" >> $LOG_FILE

echo "================================="
echo "✅ Check voltooid!"
echo ""
echo "📝 Log opgeslagen in: $LOG_FILE"
echo "📅 Volgende check over 7 dagen"
echo ""
