#!/usr/bin/env python3
"""
Maak dashboard views aan in Supabase
"""
import os
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://bktbeefdmrpxhsyyalvc.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("🔧 Creating dashboard view v_dashboard_rider_results...\n")

# Test of view al bestaat
try:
    response = supabase.table('v_dashboard_rider_results').select('*').eq('rider_id', 150437).limit(5).execute()
    print(f"✅ View bestaat al! {len(response.data)} results gevonden voor rider 150437")
    
    if response.data:
        print("\n📊 Sample result:")
        print(response.data[0])
    else:
        print("\n⚠️ View bestaat maar heeft geen data voor rider 150437")
        print("   Check of race_results en race_events tables data hebben")
        
        # Check tables
        events = supabase.table('race_events').select('count').execute()
        results = supabase.table('race_results').select('count').eq('rider_id', 150437).execute()
        
        print(f"\n📊 race_events: {events.data}")
        print(f"📊 race_results (rider 150437): {results.data}")
        
except Exception as e:
    print(f"❌ View bestaat niet of error: {e}")
    print("\n📝 De view moet aangemaakt worden via Supabase SQL Editor:")
    print("   Dashboard → SQL Editor → New Query")
    print("   En dan de SQL uit migrations/017_dashboard_views.sql uitvoeren")
