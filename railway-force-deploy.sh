#!/bin/bash
# Railway CLI Quick Deploy Script
# Forces complete rebuild and redeploy

set -e

echo "🚂 Railway CLI Force Redeploy"
echo "=============================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI niet gevonden"
    echo "Installeer met: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI versie: $(railway --version)"
echo ""

# Step 1: Login
echo "Step 1: Login bij Railway..."
echo "Dit opent je browser voor authenticatie."
read -p "Druk op Enter om te continueren..."
railway login

echo ""
echo "Step 2: Link naar project..."
cd /workspaces/TeamNL-Cloud9-Racing-Team

# Check if already linked
if [ -f ".railway/config.json" ]; then
    echo "✅ Project al gelinked"
else
    echo "Linking to project..."
    railway link
fi

echo ""
echo "Step 3: Force redeploy..."
echo "Dit triggert een nieuwe build vanaf GitHub main branch"
railway up --detach

echo ""
echo "Step 4: Monitor deployment..."
echo "Logs worden getoond (Ctrl+C om te stoppen):"
echo ""
railway logs --follow

echo ""
echo "✅ Deployment compleet!"
echo ""
echo "Verificatie:"
echo "curl https://teamnl-cloud9-racing-team-production.up.railway.app/health"
