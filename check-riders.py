import os
from supabase import create_client

SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co'
SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Check zwift_racing_riders table
print("Checking zwift_racing_riders table...")
response = supabase.table("zwift_racing_riders").select("*", count="exact").limit(5).execute()
print(f"Total rows: {response.count}")
print(f"Sample data: {response.data[:2] if response.data else 'No data'}")

# Check with club_id filter
print("\nChecking with club_id=2281...")
response2 = supabase.table("zwift_racing_riders").select("*", count="exact").eq("club_id", 2281).limit(5).execute()
print(f"TeamNL rows: {response2.count}")
print(f"Sample: {response2.data[:2] if response2.data else 'No data'}")
