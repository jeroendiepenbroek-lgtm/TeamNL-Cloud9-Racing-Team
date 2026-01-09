#!/usr/bin/env python3
"""Monitor race results sync progress"""
import time
from supabase import create_client

SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co'
SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

while True:
    # Check sync log
    log = supabase.table("race_results_sync_log").select("*").order("started_at", desc=True).limit(1).execute()
    
    # Check data
    events = supabase.table("race_events").select("*", count="exact").execute()
    results = supabase.table("race_results").select("*", count="exact").execute()
    
    print(f"\n{'='*80}")
    print(f"⏱️  {time.strftime('%H:%M:%S')}")
    
    if log.data:
        latest = log.data[0]
        print(f"📊 Laatste sync:")
        print(f"   Events:  {latest.get('events_fetched', 0)}")
        print(f"   Results: {latest.get('results_saved', 0)}")
        print(f"   Success: {latest.get('success', False)}")
        if latest.get('completed_at'):
            print(f"   Status:  ✅ Completed")
        else:
            print(f"   Status:  🔄 Running...")
    
    print(f"\n💾 Database:")
    print(f"   Events:  {events.count}")
    print(f"   Results: {results.count}")
    
    time.sleep(10)
