from supabase import create_client

SUPABASE_URL = 'https://bktbeefdmrpxhsyyalvc.supabase.co'
SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdGJlZWZkbXJweGhzeXlhbHZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk1NDYzMSwiZXhwIjoyMDc3NTMwNjMxfQ.jZeIBq_SUydFzFs6YUYJooxfu_mZ7ZBrz6oT_0QiHiU'

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

views_to_check = [
    "api_zwiftracing_riders",
    "v_riders_complete"
]

for view in views_to_check:
    try:
        response = supabase.table(view).select("*", count="exact").limit(2).execute()
        print(f"\n✅ {view}: {response.count} rows")
        if response.data:
            print(f"   Columns: {list(response.data[0].keys())}")
            print(f"   Sample: rider_id={response.data[0].get('rider_id')}, name={response.data[0].get('name') or response.data[0].get('full_name')}")
    except Exception as e:
        print(f"❌ {view}: {str(e)[:100]}")

