#!/usr/bin/env python3
import subprocess
import sys

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode

print("🔄 Committing cleanup changes...")
if run_cmd("cd /workspaces/TeamNL-Cloud9-Racing-Team && git add -A") != 0:
    print("❌ Git add failed")
    sys.exit(1)

commit_msg = """cleanup: Remove all old mock endpoints and insecure fallback secrets

Removed:
- Mock /api/events/upcoming endpoint (hardcoded events)
- Mock /api/results/team/recent endpoint (fake results)  
- Mock /api/riders/team endpoint (hardcoded 5 riders)
- Fallback JWT secrets in admin.ts and auth.ts

Security improvement:
- JWT_SECRET now REQUIRED from environment (no fallback)
- All mock data removed - real data from Supabase only

Next: All rider data served from v_rider_complete view"""

if run_cmd(f'cd /workspaces/TeamNL-Cloud9-Racing-Team && git commit -m "{commit_msg}"') != 0:
    print("⚠️  No changes to commit or commit failed")

print("\n📤 Pushing to GitHub...")
if run_cmd("cd /workspaces/TeamNL-Cloud9-Racing-Team && git push origin fresh-start-v4") != 0:
    print("❌ Push failed")
    sys.exit(1)

print("\n✅ All cleanup changes committed and pushed!")
