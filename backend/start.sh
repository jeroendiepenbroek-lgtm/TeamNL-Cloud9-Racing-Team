#!/bin/sh
# Railway startup script with debug logging

echo "════════════════════════════════════════════════════════"
echo "🚀 TeamNL Cloud9 Backend - Starting..."
echo "════════════════════════════════════════════════════════"
echo ""
echo "📦 Environment:"
echo "  NODE_ENV: ${NODE_ENV}"
echo "  PORT: ${PORT}"
echo "  DATABASE_URL: ${DATABASE_URL:0:30}..."
echo "  ZWIFT_API_KEY: ${ZWIFT_API_KEY:0:20}..."
echo ""
echo "📁 Working directory: $(pwd)"
echo "📂 Contents:"
ls -la
echo ""
echo "🔍 Checking public/dist frontend build:"
ls -la public/dist/ 2>/dev/null || echo "  ⚠️  Frontend build not found!"
echo ""
echo "════════════════════════════════════════════════════════"
echo "▶️  Starting server..."
echo "════════════════════════════════════════════════════════"
echo ""

# Start the server
exec npx tsx src/server.ts
