#!/usr/bin/env python3
"""
Test Race Results Sync - Voor development/testing
Test met 1 rider en print alle stappen
"""

import os
import sys
import json
from datetime import datetime, timedelta

try:
    from zpdatafetch import Cyclist, Result
    import keyring
    from supabase import create_client, Client
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    sys.exit(1)

# Test credentials
TEST_RIDER_ID = 150437  # JRøne
TEST_RIDER_NAME = "JRøne | CloudRacer-9 @YouTube"
DAYS_BACK = 30  # Test met laatste 30 dagen

# Setup credentials
try:
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
except:
    pass

def test_zwiftpower_api():
    """Test ZwiftPower API"""
    print("=" * 100)
    print("🔍 TEST 1: ZwiftPower API")
    print("=" * 100)
    
    try:
        cyclist = Cyclist()
        print(f"\n👤 Fetching rider {TEST_RIDER_ID} ({TEST_RIDER_NAME})...")
        cyclist.fetch(TEST_RIDER_ID)
        
        if hasattr(cyclist, 'raw') and cyclist.raw:
            raw_data = cyclist.raw
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)
            
            if TEST_RIDER_ID in raw_data:
                nested = raw_data[TEST_RIDER_ID]
                if isinstance(nested, str):
                    nested = json.loads(nested)
                
                if 'data' in nested:
                    races = nested['data']
                    print(f"✅ Found {len(races)} total races")
                    
                    # Filter recent
                    cutoff = datetime.now() - timedelta(days=DAYS_BACK)
                    recent = [r for r in races if r.get('event_date', 0) > 0 and datetime.fromtimestamp(r.get('event_date')) >= cutoff]
                    
                    print(f"✅ Found {len(recent)} races in last {DAYS_BACK} days")
                    
                    if recent:
                        print(f"\n📋 Sample races:")
                        for race in recent[:3]:
                            event_date = datetime.fromtimestamp(race.get('event_date'))
                            print(f"   - {event_date.strftime('%Y-%m-%d')} | EventID: {race.get('zid')} | {race.get('event_title', 'Unknown')[:50]}")
                        
                        return recent[:2]  # Return first 2 for event test
                else:
                    print("❌ No 'data' in response")
            else:
                print("❌ Rider ID not in response")
        else:
            print("❌ No raw data")
        
        return []
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []

def test_event_results_api(event_id: str, event_title: str):
    """Test Event Results API"""
    print("\n" + "=" * 100)
    print(f"🔍 TEST 2: Event Results API")
    print("=" * 100)
    print(f"Event ID: {event_id}")
    print(f"Event: {event_title[:60]}")
    
    try:
        result = Result()
        print(f"\n📡 Fetching event results...")
        result.fetch(event_id)
        
        if hasattr(result, 'raw') and result.raw:
            raw_data = result.raw
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)
            
            # Try both string and int keys
            event_key = event_id if event_id in raw_data else (int(event_id) if int(event_id) in raw_data else None)
            
            if event_key:
                event_data = raw_data[event_key]
                if isinstance(event_data, str):
                    event_data = json.loads(event_data)
                
                if 'data' in event_data:
                    results = event_data['data']
                    print(f"✅ Found {len(results)} riders in event")
                    
                    # Find our test rider
                    test_rider_result = None
                    for r in results:
                        if r.get('zwid') == TEST_RIDER_ID:
                            test_rider_result = r
                            break
                    
                    if test_rider_result:
                        print(f"\n👤 Test rider result:")
                        print(f"   Position: {test_rider_result.get('pos')}")
                        print(f"   Name: {test_rider_result.get('name')}")
                        print(f"   Power: {test_rider_result.get('avg_power')}W")
                        print(f"   Category: {test_rider_result.get('category')}")
                    
                    return results
                else:
                    print("❌ No 'data' in event response")
            else:
                print(f"❌ Event key '{event_id}' not found")
        else:
            print("❌ No raw data")
        
        return []
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []

def test_supabase_connection():
    """Test Supabase connection"""
    print("\n" + "=" * 100)
    print("🔍 TEST 3: Supabase Connection")
    print("=" * 100)
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url:
        print("❌ SUPABASE_URL environment variable not set")
        print("\nSet it with:")
        print("   export SUPABASE_URL='https://your-project.supabase.co'")
        return False
    
    if not supabase_key:
        print("❌ SUPABASE_SERVICE_KEY environment variable not set")
        print("\nSet it with:")
        print("   export SUPABASE_SERVICE_KEY='your-service-role-key'")
        return False
    
    try:
        print(f"✅ SUPABASE_URL: {supabase_url[:30]}...")
        print(f"✅ SUPABASE_SERVICE_KEY: {supabase_key[:20]}...")
        
        supabase = create_client(supabase_url, supabase_key)
        
        # Test query
        print(f"\n📊 Testing database query...")
        response = supabase.table("zwift_racing_riders").select("count", count="exact").eq("club_id", 2281).execute()
        count = response.count
        
        print(f"✅ Database connection successful")
        print(f"✅ Found {count} TeamNL riders in database")
        
        return True
    
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def test_insert_sample_data(event_id: str, event_title: str, results: list):
    """Test inserting sample data"""
    print("\n" + "=" * 100)
    print("🔍 TEST 4: Insert Sample Data")
    print("=" * 100)
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        print("⚠️  Skipping (no Supabase credentials)")
        return
    
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        # Insert event
        print(f"\n📝 Inserting event {event_id}...")
        event_data = {
            "event_id": event_id,
            "event_name": event_title,
            "event_date": datetime.now().isoformat(),
            "source": "zwiftpower"
        }
        
        # Check if exists first
        existing = supabase.table("race_events").select("event_id").eq("event_id", event_id).execute()
        
        if not existing.data:
            supabase.table("race_events").insert(event_data).execute()
            print(f"   ✅ Event inserted")
        else:
            print(f"   ℹ️  Event already exists")
        
        # Insert first 5 results
        print(f"\n📝 Inserting sample results (first 5)...")
        inserted = 0
        
        for result in results[:5]:
            rider_id = result.get('zwid')
            if not rider_id:
                continue
            
            # Check if exists
            existing = supabase.table("race_results").select("event_id,rider_id").eq("event_id", event_id).eq("rider_id", rider_id).execute()
            
            if existing.data:
                continue
            
            # Extract data
            avg_power = result.get('avg_power')
            if isinstance(avg_power, list):
                avg_power = avg_power[0] if avg_power else None
            
            avg_wkg = result.get('avg_wkg')
            if isinstance(avg_wkg, list):
                avg_wkg = float(avg_wkg[0]) if avg_wkg and avg_wkg[0] else None
            
            time_val = result.get('time')
            if isinstance(time_val, list):
                time_val = time_val[0] if time_val else None
            
            result_data = {
                "event_id": event_id,
                "rider_id": rider_id,
                "rider_name": result.get('name', 'Unknown'),
                "position": result.get('pos'),
                "category": result.get('category'),
                "avg_power": avg_power,
                "avg_wkg": avg_wkg,
                "time_seconds": time_val,
                "team_name": result.get('tname')
            }
            
            supabase.table("race_results").insert(result_data).execute()
            inserted += 1
            print(f"   ✅ Inserted: Pos {result.get('pos')} - {result.get('name', 'Unknown')[:30]}")
        
        print(f"\n✅ Inserted {inserted} results")
        
        # Query back
        print(f"\n📊 Querying back results...")
        query_results = supabase.table("race_results").select("*").eq("event_id", event_id).limit(5).execute()
        
        print(f"✅ Found {len(query_results.data)} results in database")
        
        return True
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n🧪 RACE RESULTS SYNC - TEST SUITE")
    print("=" * 100)
    print(f"Test Rider: {TEST_RIDER_NAME} ({TEST_RIDER_ID})")
    print(f"Test Period: Last {DAYS_BACK} days")
    print("=" * 100)
    
    # Test 1: ZwiftPower API
    recent_races = test_zwiftpower_api()
    
    if not recent_races:
        print("\n⚠️  No recent races found. Cannot continue tests.")
        return
    
    # Test 2: Event Results API
    test_race = recent_races[0]
    event_id = test_race.get('zid')
    event_title = test_race.get('event_title', 'Unknown')
    
    results = test_event_results_api(event_id, event_title)
    
    # Test 3: Supabase Connection
    db_ok = test_supabase_connection()
    
    # Test 4: Insert Sample Data (only if DB works)
    if db_ok and results:
        test_insert_sample_data(event_id, event_title, results)
    
    print("\n" + "=" * 100)
    print("✅ TEST SUITE COMPLETED")
    print("=" * 100)
    print("\nNext steps:")
    print("1. If all tests passed: Run full sync with `python sync-race-results.py`")
    print("2. If Supabase test failed: Set environment variables")
    print("3. If API tests failed: Check credentials")

if __name__ == "__main__":
    main()
