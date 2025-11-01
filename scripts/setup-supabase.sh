#!/bin/bash
# Supabase Setup Helper Script
# Interactieve wizard om .env files te configureren

set -e

echo "🚀 Supabase Setup Helper"
echo "========================"
echo ""
echo "Dit script helpt je om je Supabase credentials te configureren."
echo ""
echo "Volg eerst SUPABASE_SETUP_INSTRUCTIONS.md om:"
echo "  1. Supabase project aan te maken"
echo "  2. Database schema te runnen"
echo "  3. Realtime replication te enablen"
echo ""
read -p "Heb je dit gedaan? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup afgebroken. Volg eerst SUPABASE_SETUP_INSTRUCTIONS.md"
    exit 1
fi

echo ""
echo "📝 Configureer Backend (.env)"
echo "=============================="
echo ""

# Project URL
echo "Kopieer je Project URL uit Supabase dashboard (Settings → API)"
echo "Formaat: https://xxxxx.supabase.co"
read -p "SUPABASE_URL: " SUPABASE_URL

# Service key
echo ""
echo "Kopieer je service_role key uit Supabase dashboard (Settings → API)"
echo "⚠️  Dit is de GEHEIME key (klik 'Reveal' eerst)"
read -p "SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY

# Update backend .env
echo ""
echo "Updating backend .env..."

if [ -f .env ]; then
    # Update existing .env
    if grep -q "^SUPABASE_URL=" .env; then
        sed -i "s|^SUPABASE_URL=.*|SUPABASE_URL=$SUPABASE_URL|" .env
    else
        echo "SUPABASE_URL=$SUPABASE_URL" >> .env
    fi
    
    if grep -q "^SUPABASE_SERVICE_KEY=" .env; then
        sed -i "s|^SUPABASE_SERVICE_KEY=.*|SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY|" .env
    else
        echo "SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY" >> .env
    fi
    
    echo "✅ Backend .env updated"
else
    echo "⚠️  .env file niet gevonden"
    exit 1
fi

echo ""
echo "📱 Configureer Frontend (frontend/.env)"
echo "========================================="
echo ""

# Anon key
echo "Kopieer je anon public key uit Supabase dashboard (Settings → API)"
read -p "SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY

# Create/update frontend .env
if [ ! -d "frontend" ]; then
    echo "⚠️  frontend/ directory niet gevonden"
else
    cat > frontend/.env << EOF
# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Backend API URL (localhost voor development)
VITE_API_BASE_URL=http://localhost:3000/api
EOF
    echo "✅ Frontend .env created"
fi

echo ""
echo "🎉 Configuration Complete!"
echo "=========================="
echo ""
echo "✅ Backend .env: SUPABASE_URL + SUPABASE_SERVICE_KEY"
echo "✅ Frontend .env: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY"
echo ""
echo "🧪 Test je configuratie:"
echo "   npx tsx scripts/test-deployment.ts"
echo ""
echo "🚀 Start development:"
echo "   Backend:  npm run dev:watch"
echo "   Frontend: cd frontend && npm run dev"
echo ""
