#!/bin/bash
# TeamNL Cloud9 - Development Startup (exact zoals Railway productie)
# Start backend + frontend in één keer

set -e

echo "🚀 Starting TeamNL Cloud9 Development Environment"
echo "=================================================="
echo ""

# Check environment variabelen
echo "✅ Checking environment..."
if [ ! -f "backend/.env" ]; then
    echo "❌ ERROR: backend/.env niet gevonden!"
    exit 1
fi

if [ ! -f "backend/frontend/.env.local" ]; then
    echo "❌ ERROR: backend/frontend/.env.local niet gevonden!"
    exit 1
fi

# Check of Supabase variabelen aanwezig zijn
source backend/.env
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ ERROR: SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY niet ingesteld in backend/.env"
    exit 1
fi

echo "✅ Environment variables OK"
echo ""

# Check of node_modules aanwezig zijn
echo "📦 Checking dependencies..."
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "backend/frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd backend/frontend && npm install && cd ../..
fi

echo "✅ Dependencies OK"
echo ""

# Start backend (in backend folder)
echo "🔧 Starting Backend API on http://localhost:3000"
cd backend
npx tsx src/server.ts &
BACKEND_PID=$!
cd ..

# Wacht tot backend gereed is
echo "⏳ Waiting for backend to be ready..."
sleep 3

# Check of backend draait
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ ERROR: Backend niet bereikbaar op http://localhost:3000/health"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Backend running (PID: $BACKEND_PID)"
echo ""

# Start frontend (in backend/frontend folder)
echo "⚛️  Starting Frontend Dev Server on http://localhost:5173"
cd backend/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "=================================================="
echo "✅ DEVELOPMENT ENVIRONMENT RUNNING"
echo "=================================================="
echo ""
echo "📊 Dashboard:  http://localhost:5173"
echo "🔧 Backend API: http://localhost:3000"
echo "❤️  Health:     http://localhost:3000/health"
echo ""
echo "🔑 Admin Login:"
echo "   Email:    admin@cloudracer.nl"
echo "   Password: CloudRacer2024!"
echo ""
echo "📝 Logs:"
echo "   Backend PID:  $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 Stop alles: pkill -f 'tsx src/server.ts' && pkill -f vite"
echo "   Of: ./stop-dev.sh"
echo ""
echo "Press Ctrl+C to stop..."
echo ""

# Wacht op stop signaal
wait
