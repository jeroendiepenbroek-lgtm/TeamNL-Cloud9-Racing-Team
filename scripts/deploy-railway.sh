#!/bin/bash

echo "🚀 TeamNL Cloud9 - Production Deployment Setup"
echo "=============================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Railway CLI niet gevonden. Installeren..."
    npm install -g @railway/cli
fi

echo "🔐 Railway Login..."
railway login

echo ""
echo "📁 Maak nieuw Railway project aan..."
echo "   1. Ga naar: https://railway.app/new"
echo "   2. Kies 'Deploy from GitHub repo'"
echo "   3. Selecteer 'TeamNL-Cloud9-Racing-Team'"
echo "   4. Kom terug hier en druk ENTER"
read -p "Druk ENTER als project is aangemaakt..."

echo ""
echo "🔗 Link Railway project..."
railway link

echo ""
echo "🗄️  PostgreSQL database toevoegen..."
echo "   1. In Railway dashboard: klik 'New' → 'Database' → 'PostgreSQL'"
echo "   2. DATABASE_URL wordt automatisch toegevoegd"
echo "   3. Druk ENTER als database is toegevoegd..."
read -p "Druk ENTER als database is toegevoegd..."

echo ""
echo "⚙️  Environment variables configureren..."
railway variables set NODE_ENV=production
railway variables set AUTH_ENABLED=true

read -p "API Username [admin]: " API_USER
API_USER=${API_USER:-admin}
railway variables set API_USERNAME=$API_USER

read -sp "API Password: " API_PASS
echo ""
railway variables set API_PASSWORD=$API_PASS

railway variables set ZWIFT_API_KEY=650c6d2fc4ef6858d74cbef1
railway variables set ZWIFT_API_BASE_URL=https://zwift-ranking.herokuapp.com
railway variables set ZWIFT_CLUB_ID=2281
railway variables set ENABLE_AUTO_SYNC=true
railway variables set SCHEDULER_ENABLED=true
railway variables set FAVORITES_SYNC_CRON="0 */6 * * *"
railway variables set CLUB_SYNC_CRON="0 */12 * * *"
railway variables set FORWARD_SCAN_CRON="0 * * * *"
railway variables set CLEANUP_CRON="0 3 * * *"

echo ""
echo "🚀 Deploying naar productie..."
railway up

echo ""
echo "✅ Deployment compleet!"
echo ""
echo "📊 Monitoring:"
echo "   - Dashboard: railway open"
echo "   - Logs: railway logs"
echo ""
echo "🔗 Je app URL:"
railway domain

echo ""
echo "🧪 Test je deployment:"
echo "   curl https://your-app.railway.app/api/health"
echo ""
echo "   Met authenticatie:"
echo "   curl -u $API_USER:$API_PASS https://your-app.railway.app/api/workflow/status"
echo ""
echo "🎉 Klaar! Je app draait nu 24/7 in de cloud!"
