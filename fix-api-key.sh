#!/bin/bash
# Quick Fix: Invalid API Key - Interactieve Setup

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
PROJECT_ID="bktbeefdmrpxhsyyalvc"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Fix: Invalid API Key - Interactive Setup           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 Je hebt 'Invalid API key' error.${NC}"
echo -e "${YELLOW}   Ik ga je helpen om dit op te lossen!${NC}"
echo ""

# Step 1: Open Supabase Dashboard
echo -e "${GREEN}Stap 1: Haal API Keys op${NC}"
echo ""
echo "   Open deze URL in je browser:"
echo -e "   ${BLUE}https://supabase.com/dashboard/project/$PROJECT_ID/settings/api${NC}"
echo ""
echo "   Kopieer de volgende keys:"
echo "   1. Project URL (moet zijn: $SUPABASE_URL)"
echo "   2. anon / public key (lange string starting met 'eyJhbG...')"
echo ""

read -p "Druk ENTER als je de Supabase dashboard open hebt..."

# Step 2: Get Anon Key
echo ""
echo -e "${GREEN}Stap 2: Plak je Anon Key${NC}"
echo ""
echo "   Kopieer de 'anon' key van de Supabase API settings pagina"
echo "   en plak hem hieronder (de key is niet zichtbaar tijdens typen):"
echo ""
read -sp "   ANON KEY: " ANON_KEY
echo ""

if [ -z "$ANON_KEY" ]; then
    echo -e "${RED}❌ Geen key ingevoerd. Probeer opnieuw.${NC}"
    exit 1
fi

# Step 3: Test the key
echo ""
echo -e "${GREEN}Stap 3: Test de API Key${NC}"
echo ""
echo "   Testing..."

RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/v_rider_complete?select=count&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")

if echo "$RESPONSE" | grep -q "Invalid API key"; then
    echo -e "${RED}❌ Key is nog steeds invalid!${NC}"
    echo ""
    echo "   Mogelijke oorzaken:"
    echo "   - Verkeerde key gekopieerd"
    echo "   - Key is van ander Supabase project"
    echo "   - Project is gepauzeerd"
    echo ""
    echo "   Check: https://supabase.com/dashboard/project/$PROJECT_ID"
    exit 1
elif echo "$RESPONSE" | grep -q "relation.*does not exist"; then
    echo -e "${YELLOW}⚠️  API key WERKT, maar view 'v_rider_complete' bestaat niet!${NC}"
    echo ""
    echo "   Volgende stap: Draai migrations"
    echo "   1. Open: https://supabase.com/dashboard/project/$PROJECT_ID/sql/new"
    echo "   2. Kopieer/plak inhoud van: SETUP_SUPABASE_COMPLETE.sql"
    echo "   3. Klik 'Run'"
    echo ""
    read -p "Druk ENTER nadat je migrations hebt gedraaid..."
    
    # Test again
    RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/v_rider_complete?select=count&limit=1" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY")
    
    if echo "$RESPONSE" | grep -q "relation.*does not exist"; then
        echo -e "${RED}❌ View bestaat nog steeds niet. Check je SQL output.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ API Key is VALID en view bestaat!${NC}"
echo ""

# Step 4: Update .env files
echo -e "${GREEN}Stap 4: Update Environment Files${NC}"
echo ""

# Update frontend/.env
FRONTEND_ENV="frontend/.env"
echo "# Supabase Configuration - TeamNL Cloud9
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY" > "$FRONTEND_ENV"

echo -e "   ✅ Updated: ${FRONTEND_ENV}"

# Update .env.upload
ROOT_ENV=".env.upload"
if [ -f "$ROOT_ENV" ]; then
    sed -i.bak "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$ANON_KEY|g" "$ROOT_ENV"
    sed -i.bak "s|SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|g" "$ROOT_ENV"
    echo -e "   ✅ Updated: ${ROOT_ENV}"
fi

# Step 5: Test data fetch
echo ""
echo -e "${GREEN}Stap 5: Test Data Fetch${NC}"
echo ""
echo "   Fetching top 3 riders..."

curl -s "${SUPABASE_URL}/rest/v1/v_rider_complete?select=rider_id,full_name,velo_live&order=velo_live.desc.nullslast&limit=3" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" | jq '.'

# Step 6: Instructions for rebuild
echo ""
echo -e "${GREEN}✅ ALLES GECONFIGUREERD!${NC}"
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Volgende Stap: Rebuild Frontend                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "   Run deze commands:"
echo ""
echo -e "   ${YELLOW}cd frontend${NC}"
echo -e "   ${YELLOW}npm run dev${NC}"
echo ""
echo "   Open in browser: http://localhost:5173"
echo ""
echo -e "${GREEN}🎯 Racing Matrix zou nu data moeten tonen!${NC}"
echo ""
