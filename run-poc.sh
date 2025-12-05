#!/bin/bash
# Wrapper script to run POC with correct environment variables

cd /workspaces/TeamNL-Cloud9-Racing-Team

# Set only required env vars
export ZWIFT_API_KEY="650c6d2fc4ef6858d74cbef1"
export SUPABASE_URL="https://bktbeefdmrpxhsyyalvc.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU"

# Run POC script
npx tsx poc-sync-rider-150437.ts "$@"
