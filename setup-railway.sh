#!/bin/bash

# 🚂 Railway Deployment Setup Script
# Automatiseert de Railway deployment setup

set -e

echo "🚂 Railway Deployment Setup"
echo "=============================="
echo ""

# Kleurencodes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check of Railway CLI geïnstalleerd is
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI niet gevonden${NC}"
    echo "Installeren..."
    npm install -g @railway/cli
    echo -e "${GREEN}✅ Railway CLI geïnstalleerd${NC}"
else
    echo -e "${GREEN}✅ Railway CLI gevonden${NC}"
fi

echo ""
echo "📋 Setup Stappen:"
echo "1. Railway login"
echo "2. Project aanmaken of linken"
echo "3. Environment variables configureren"
echo "4. Test deployment"
echo ""

# Stap 1: Login
echo -e "${BLUE}Stap 1: Railway Login${NC}"
read -p "Wil je nu inloggen? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    railway login
    echo -e "${GREEN}✅ Ingelogd${NC}"
else
    echo -e "${YELLOW}⚠️  Overgeslagen - login handmatig met: railway login${NC}"
fi

echo ""

# Stap 2: Project linken
echo -e "${BLUE}Stap 2: Project Setup${NC}"
echo "Kies een optie:"
echo "  1) Nieuw project aanmaken"
echo "  2) Bestaand project linken"
echo "  3) Overslaan"
read -p "Keuze (1/2/3): " -n 1 -r PROJECT_CHOICE
echo

case $PROJECT_CHOICE in
    1)
        railway init
        echo -e "${GREEN}✅ Nieuw project aangemaakt${NC}"
        ;;
    2)
        railway link
        echo -e "${GREEN}✅ Project gelinkt${NC}"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Overgeslagen${NC}"
        ;;
esac

echo ""

# Stap 3: Environment Variables
echo -e "${BLUE}Stap 3: Environment Variables${NC}"
echo "Wil je de environment variables nu configureren?"
read -p "(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Voer de volgende waarden in (of druk Enter om over te slaan):"
    echo ""
    
    read -p "SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY
    read -p "SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
    read -p "ZWIFT_USERNAME (optioneel): " ZWIFT_USERNAME
    read -sp "ZWIFT_PASSWORD (optioneel): " ZWIFT_PASSWORD
    echo ""
    read -p "ZWIFTRACING_API_KEY (optioneel): " ZWIFTRACING_API_KEY
    
    # Zet basis variables
    railway variables --set "NODE_ENV=production"
    railway variables --set "PORT=8080"
    railway variables --set "SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co"
    railway variables --set "VITE_SUPABASE_URL=https://bktbeefdmrpxhsyyalvc.supabase.co"
    
    # Zet conditionally variables
    [ ! -z "$SUPABASE_SERVICE_KEY" ] && railway variables --set "SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY"
    [ ! -z "$SUPABASE_ANON_KEY" ] && railway variables --set "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
    [ ! -z "$SUPABASE_ANON_KEY" ] && railway variables --set "VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
    [ ! -z "$ZWIFT_USERNAME" ] && railway variables --set "ZWIFT_USERNAME=$ZWIFT_USERNAME"
    [ ! -z "$ZWIFT_PASSWORD" ] && railway variables --set "ZWIFT_PASSWORD=$ZWIFT_PASSWORD"
    [ ! -z "$ZWIFTRACING_API_KEY" ] && railway variables --set "ZWIFTRACING_API_KEY=$ZWIFTRACING_API_KEY"
    
    echo -e "${GREEN}✅ Environment variables geconfigureerd${NC}"
else
    echo -e "${YELLOW}⚠️  Environment variables overgeslagen${NC}"
    echo "Configureer handmatig met: railway variables set KEY=value"
fi

echo ""

# Stap 4: Test Deployment
echo -e "${BLUE}Stap 4: Test Deployment${NC}"
read -p "Wil je nu een test deployment doen? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Deployment starten..."
    railway up --detach
    
    echo ""
    echo "⏳ Wachten op deployment (30 seconden)..."
    sleep 30
    
    echo ""
    echo "🏥 Health check..."
    APP_URL=$(railway status --json | jq -r '.deployments[0].url' 2>/dev/null || echo "")
    
    if [ ! -z "$APP_URL" ]; then
        if curl -f -s "$APP_URL/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed!${NC}"
            echo -e "${GREEN}🌐 App URL: $APP_URL${NC}"
        else
            echo -e "${YELLOW}⚠️  Health check failed - check logs met: railway logs${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Kon app URL niet ophalen - check Railway dashboard${NC}"
    fi
    
    echo ""
    echo "📊 Bekijk deployment status:"
    railway status
else
    echo -e "${YELLOW}⚠️  Test deployment overgeslagen${NC}"
    echo "Deploy handmatig met: railway up"
fi

echo ""
echo "=============================="
echo -e "${GREEN}✨ Setup voltooid!${NC}"
echo ""
echo "📚 Volgende stappen:"
echo "  1. Configureer GitHub Secrets (RAILWAY_TOKEN, RAILWAY_APP_URL)"
echo "  2. Push naar main branch voor automatische deployment"
echo "  3. Monitor logs met: railway logs"
echo ""
echo "📖 Lees RAILWAY_DEPLOYMENT_GUIDE.md voor details"
echo ""
