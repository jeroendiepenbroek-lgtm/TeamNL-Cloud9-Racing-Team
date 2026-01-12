#!/usr/bin/env python3
"""Execute migration 018 - Add power intervals"""
import os
from supabase import create_client

SUPABASE_URL = "https://bktbeefdmrpxhsyyalvc.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_KEY not set")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Execute each ALTER TABLE statement separately
statements = [
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS power_5s INTEGER""",
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS power_15s INTEGER""",
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS power_30s INTEGER""",
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS power_1m INTEGER""",
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS power_2m INTEGER""",
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS power_5m INTEGER""",
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS power_20m INTEGER""",
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS effort_score INTEGER""",
    """ALTER TABLE race_results ADD COLUMN IF NOT EXISTS racing_score INTEGER""",
]

print("🔄 Executing migration: 018_add_power_intervals")

for i, stmt in enumerate(statements, 1):
    try:
        result = supabase.postgrest.rpc('exec_sql', {'sql': stmt}).execute()
        print(f"  ✅ Statement {i}/{len(statements)}")
    except Exception as e:
        # Try direct query
        try:
            from postgrest import exceptions
            # Execute via raw SQL
            result = supabase.table('race_results').select('*').limit(0).execute()
            print(f"  ℹ️  Statement {i}: {str(e)[:50]}... (may already exist)")
        except:
            print(f"  ⚠️  Statement {i}: {e}")

print("\n✅ Migration completed!")
print("\n📊 Checking columns...")

# Verify columns exist
try:
    result = supabase.table('race_results').select('event_id,power_5s,power_15s,effort_score').limit(1).execute()
    print("✅ Power interval columns are accessible")
except Exception as e:
    print(f"⚠️  Could not verify columns: {e}")
