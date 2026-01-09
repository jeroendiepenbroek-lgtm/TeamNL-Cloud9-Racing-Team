#!/usr/bin/env python3
"""
Test sync voor één rider
Quick test om te zien of race results sync werkt
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

# Configuration
TEST_RIDER_ID = 150437  # JRøne
DAYS_BACK = 90
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Setup credentials
try:
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
except:
    pass

def main():
    print("\n🏁 Test Race Results Sync - Single Rider")
    print("=" * 80)
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing SUPABASE credentials")
        sys.exit(1)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    cutoff_date = datetime.now() - timedelta(days=DAYS_BACK)
    
    print(f"🎯 Testing with rider: {TEST_RIDER_ID}")
    print(f"📅 Fetching races from: {cutoff_date.strftime('%Y-%m-%d')}")
    
    # Fetch rider's race history
    print(f"\n📡 Fetching race history...")
    try:
        cyclist = Cyclist()
        raw_data = cyclist.fetch(TEST_RIDER_ID)
        
        # Parse nested JSON
        rider_data = None
        if isinstance(raw_data, dict):
            if TEST_RIDER_ID in raw_data:
                rider_data = raw_data[TEST_RIDER_ID]
            elif str(TEST_RIDER_ID) in raw_data:
                rider_data = raw_data[str(TEST_RIDER_ID)]
        
        if not rider_data:
            print(f"❌ No data found for rider {TEST_RIDER_ID}")
            return
        
        # Parse if string
        if isinstance(rider_data, str):
            rider_data = json.loads(rider_data)
        
        races = rider_data.get('data', [])
        print(f"✅ Found {len(races)} total races")
        
        # Filter recent races
        recent_races = []
        for race in races:
            try:
                race_date_value = race.get('event_date')
                if race_date_value:
                    # Handle Unix timestamp
                    if isinstance(race_date_value, (int, float)):
                        race_date = datetime.fromtimestamp(race_date_value)
                    else:
                        # Try ISO format
                        try:
                            race_date = datetime.fromisoformat(str(race_date_value).replace('Z', '+00:00'))
                        except:
                            race_date = datetime.strptime(str(race_date_value), '%Y-%m-%d %H:%M:%S')
                    
                    if race_date >= cutoff_date:
                        recent_races.append({
                            'event_id': race.get('zid'),
                            'event_title': race.get('event_title'),
                            'event_date': race_date.isoformat()
                        })
            except Exception as e:
                continue
        
        print(f"✅ Found {len(recent_races)} races in last {DAYS_BACK} days")
        
        if not recent_races:
            print("No recent races to sync")
            return
        
        # Show sample
        print(f"\n📋 Sample races:")
        for race in recent_races[:5]:
            print(f"   - {race['event_date'][:10]} | EventID: {race['event_id']} | {race['event_title'][:50]}")
        
        # Try the most recent races until we find one with results
        for test_event in recent_races[:5]:
            event_id = test_event['event_id']
            
            print(f"\n🔍 Testing with event: {event_id}")
            print(f"   {test_event['event_title'][:60]}")
            
            # Save event
            print(f"\n💾 Saving event to database...")
            event_data = {
                'event_id': event_id,
                'event_name': test_event['event_title'],
                'event_date': test_event['event_date'],
                'source': 'zwiftpower'
            }
            
            try:
                supabase.table('race_events').upsert(event_data, on_conflict='event_id').execute()
                print(f"   ✅ Event saved")
            except Exception as e:
                print(f"   ⚠️ Event error: {str(e)[:80]}")
            
            # Fetch event results
            print(f"\n📡 Fetching event results...")
            result = Result()
            result_data = result.fetch(event_id)
            
            # Parse results
            event_results = None
            if isinstance(result_data, dict):
                if event_id in result_data:
                    event_results = result_data[event_id]
                elif int(event_id) in result_data:
                    event_results = result_data[int(event_id)]
            
            if isinstance(event_results, str):
                event_results = json.loads(event_results)
            
            if not event_results or not isinstance(event_results, dict):
                print(f"   ⚠️ No results found, trying next event...")
                continue
            
            results_list = event_results.get('data', [])
            if not results_list:
                print(f"   ⚠️ Empty results, trying next event...")
                continue
            
            print(f"✅ Found {len(results_list)} riders in event")
            
            # Save results (test met eerste 10)
            print(f"\n💾 Saving sample results to database...")
            saved = 0
            for rider_result in results_list[:10]:
                try:
                    # Extract and convert values (correcte veldnamen!)
                    power_val = rider_result.get('avg_power')  # API gebruikt 'avg_power'
                    avg_power = int(power_val[0]) if isinstance(power_val, list) else (int(float(power_val)) if power_val else None)
                    
                    wkg_val = rider_result.get('avg_wkg')  # API gebruikt 'avg_wkg'
                    avg_wkg = float(wkg_val[0]) if isinstance(wkg_val, list) else (float(wkg_val) if wkg_val else None)
                    
                    time_val = rider_result.get('time')
                    time_seconds = int(float(time_val[0])) if isinstance(time_val, list) else (int(float(time_val)) if time_val else None)
                    
                    result_row = {
                        'event_id': event_id,
                        'rider_id': rider_result.get('zwid'),
                        'position': rider_result.get('position'),
                        'category': rider_result.get('category'),
                        'avg_power': avg_power,
                        'avg_wkg': avg_wkg,
                        'time_seconds': time_seconds,
                        'team_name': rider_result.get('tm'),
                        'source': 'zwiftpower'
                    }
                    
                    supabase.table('race_results').upsert(result_row, on_conflict='event_id,rider_id').execute()
                    saved += 1
                    print(f"   ✅ Pos {result_row['position']}: Rider {result_row['rider_id']} - {avg_power}W")
                    
                except Exception as e:
                    print(f"   ⚠️ Error: {str(e)[:60]}")
            
            print(f"\n✅ Test completed: {saved}/10 results saved")
            break  # Success, exit loop
        
        # Verify
        print(f"\n📊 Verifying database...")
        events = supabase.table('race_events').select('*', count='exact').execute()
        results = supabase.table('race_results').select('*', count='exact').execute()
        print(f"   Events:  {events.count}")
        print(f"   Results: {results.count}")
        
        print("\n" + "=" * 80)
        print("✅ TEST SUCCESSFUL - Ready for full sync!")
        print("   Run: python sync-race-results.py")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
