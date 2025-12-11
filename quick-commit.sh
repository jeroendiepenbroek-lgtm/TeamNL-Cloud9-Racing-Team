#!/bin/bash
set -e

cd /workspaces/TeamNL-Cloud9-Racing-Team

echo "🔄 Adding changes..."
git add -A

echo "📝 Committing..."
git commit -m "cleanup: Remove old mock endpoints and insecure secrets" || echo "No changes to commit"

echo "📤 Pushing..."
git push origin fresh-start-v4

echo "✅ Done!"
