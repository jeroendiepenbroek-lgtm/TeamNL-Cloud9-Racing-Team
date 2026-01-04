#!/bin/bash
# Deploy Race Results naar productie

echo "📦 Deploying Race Results..."

# Upload nieuwe HTML files
echo "1. Upload deze files naar productie:"
ls -1 frontend/dist/race-results-index.html
ls -1 frontend/dist/team-riders-results.html  
ls -1 frontend/dist/individual-rider-results.html
ls -1 frontend/dist/race-details.html

echo ""
echo "2. Server code is al gedeployed (backend/src/server.ts)"
echo "3. Herstart productie server"
echo "4. Test: https://jouw-domain.com/race-results-index.html"

