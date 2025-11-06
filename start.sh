#!/bin/sh
# Railway startup script met debug logging

echo "🚀 Starting TeamNL Cloud9 Backend..."
echo "📍 Working directory: $(pwd)"
echo "📂 Files present:"
ls -la

echo ""
echo "🔧 Environment Check:"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-not set}"
echo "SUPABASE_URL: ${SUPABASE_URL:+[SET]}"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:+[SET]}"
echo "ZWIFT_API_KEY: ${ZWIFT_API_KEY:+[SET]}"

echo ""
echo "📦 Node modules check:"
ls node_modules/tsx > /dev/null 2>&1 && echo "✅ tsx found" || echo "❌ tsx NOT found"
ls node_modules/express > /dev/null 2>&1 && echo "✅ express found" || echo "❌ express NOT found"
ls node_modules/dotenv > /dev/null 2>&1 && echo "✅ dotenv found" || echo "❌ dotenv NOT found"

echo ""
echo "🎯 Starting server..."
exec npx tsx src/server.ts
