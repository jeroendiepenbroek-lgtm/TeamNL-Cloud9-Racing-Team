#!/bin/bash
# Stop alle development servers

echo "🛑 Stopping development servers..."

pkill -f "tsx src/server.ts"
pkill -f "vite"
pkill -f "nodemon"

sleep 1

echo "✅ All servers stopped"
