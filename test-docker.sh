#!/bin/bash
# Test Docker container lokaal met production environment

set -e

echo "🐳 Building Docker image..."
docker build -t teamnl-backend:test .

echo ""
echo "🚀 Starting container with environment variables..."
echo "   Port: 3000"
echo "   Environment: production"
echo ""

# Load env vars from .env.docker
if [ ! -f .env.docker ]; then
    echo "❌ Error: .env.docker not found!"
    echo "Creating from .env..."
    cat .env | grep -E "^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|ZWIFT_API_KEY)=" > .env.docker
fi

# Run container
docker run --rm \
    --name teamnl-test \
    -p 3000:3000 \
    --env-file .env.docker \
    -e NODE_ENV=production \
    -e PORT=3000 \
    teamnl-backend:test

# Container stops when you press Ctrl+C
