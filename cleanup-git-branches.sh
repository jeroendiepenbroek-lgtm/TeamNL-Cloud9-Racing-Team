#!/bin/bash
# =============================================================================
# GIT CLEANUP SCRIPT
# =============================================================================
# Verwijdert oude feature branches en dependabot branches
# Behoud alleen: main, backup-before-rebuild-20251207
# =============================================================================

echo "🧹 Git Cleanup Script"
echo ""

# Branches to DELETE (oude features en dependabot)
BRANCHES_TO_DELETE=(
  "copilot/fix-missing-server-module"
  "copilot/vscode1761850837955"
  "dependabot/github_actions/actions/checkout-5"
  "dependabot/github_actions/actions/download-artifact-6"
  "dependabot/github_actions/actions/setup-node-6"
  "dependabot/github_actions/actions/upload-artifact-5"
  "dependabot/github_actions/github/codeql-action-4"
  "dependabot/npm_and_yarn/dotenv-17.2.3"
  "dependabot/npm_and_yarn/multi-4207cc2927"
  "dependabot/npm_and_yarn/node-cron-4.2.1"
  "dependabot/npm_and_yarn/types/node-24.9.1"
  "dependabot/npm_and_yarn/vitest-4.0.3"
  "develop"
  "feature/rider-dashboard"
  "feature/test-workflow"
)

echo "📋 Branches to delete:"
for branch in "${BRANCHES_TO_DELETE[@]}"; do
  echo "  - $branch"
done

echo ""
read -p "❓ Continue with deletion? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted"
  exit 1
fi

echo ""
echo "🗑️  Deleting branches..."
echo ""

for branch in "${BRANCHES_TO_DELETE[@]}"; do
  echo "Deleting: $branch"
  git push origin --delete "$branch" 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo "  ✅ Deleted"
  else
    echo "  ⚠️  Failed (may not exist)"
  fi
done

echo ""
echo "✅ Git cleanup complete!"
echo ""
echo "Remaining branches:"
git branch -r | grep -v "HEAD"
