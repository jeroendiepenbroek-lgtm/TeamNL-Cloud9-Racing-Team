#!/usr/bin/env python3
"""Disable RLS op race_results via Supabase Management API"""

import os
from supabase import create_client

SUPABASE_URL = "https://bktbeefdmrpxhsyyalvc.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_KEY niet gevonden in environment")
    print("   Railway heeft deze wel, local environment niet")
    print("\n💡 ALTERNATIEF: Draai dit in Supabase SQL Editor:")
    print("   ALTER TABLE race_results DISABLE ROW LEVEL SECURITY;")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Execute via RPC/SQL
sql = "ALTER TABLE race_results DISABLE ROW LEVEL SECURITY;"

try:
    result = supabase.rpc('exec_sql', {'sql': sql}).execute()
    print(f"✅ RLS disabled on race_results")
except Exception as e:
    print(f"❌ Cannot execute via SDK: {e}")
    print("\n💡 Draai handmatig in Supabase SQL Editor:")
    print(f"   {sql}")
