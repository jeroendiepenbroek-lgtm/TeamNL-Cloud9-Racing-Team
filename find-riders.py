from supabase import create_client

SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co'
SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Zoek naar tabellen met "rider" in de naam
tables_to_check = [
    "riders",
    "team_riders", 
    "zwift_racing_riders",
    "zwift_riders",
    "club_members"
]

for table in tables_to_check:
    try:
        response = supabase.table(table).select("*", count="exact").limit(3).execute()
        print(f"\n✅ {table}: {response.count} rows")
        if response.data:
            print(f"   Sample columns: {list(response.data[0].keys())}")
            print(f"   Sample row: {response.data[0]}")
    except Exception as e:
        print(f"❌ {table}: {str(e)[:80]}")

