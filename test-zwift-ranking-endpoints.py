#!/usr/bin/env python3
"""
Test api.zwiftracing.app endpoints for power interval data
"""
import requests
import json

# Test with a known event ID
# From screenshot: Stage 1 - Race - Tour de Zwift (Jan 10, 2026)
# Let's try a recent event ID from our database

ZWIFTRACING_API_BASE = "https://api.zwiftracing.app/api"
RIDER_ID = 150437

# First get some event IDs from ZwiftPower
print("🔍 Fetching event IDs from ZwiftPower...")
from zpdatafetch import Result
import keyring

keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")

try:
    result = Result()
    events = result.results(rider=RIDER_ID)
    
    if events and len(events) > 0:
        test_event = events[0]
        event_id = test_event.get('event_id') or test_event.get('id')
        event_name = test_event.get('event_name') or test_event.get('name', 'Unknown')
        
        print(f"\n✅ Using event {event_id}: {event_name}")
        print("=" * 60)
        
        # Test 1: ZwiftRacing.app results endpoint
        print(f"\n1️⃣ Testing ZwiftRacing.app endpoint:")
        print(f"   GET {ZWIFTRACING_API_BASE}/public/results/{event_id}")
        
        try:
            response = requests.get(f"{ZWIFTRACING_API_BASE}/public/results/{event_id}", timeout=30)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for our rider
                results = data if isinstance(data, list) else data.get('results', [])
                rider_data = None
                
                for r in results:
                    if r.get('zwid') == RIDER_ID or r.get('rider_id') == RIDER_ID:
                        rider_data = r
                        break
                
                if rider_data:
                    print(f"\n   ✅ Found rider {RIDER_ID} data!")
                    print(f"\n   🔑 Available fields:")
                    for key in sorted(rider_data.keys()):
                        print(f"      - {key}")
                    
                    # Check for power intervals
                    power_keys = [k for k in rider_data.keys() if 'power' in k.lower() or '5s' in k or '15s' in k or '30s' in k or '1m' in k or '2m' in k or '5m' in k or '20m' in k]
                    if power_keys:
                        print(f"\n   ⚡ Power interval fields:")
                        for key in power_keys:
                            print(f"      - {key}: {rider_data[key]}")
                    
                    print(f"\n   📋 Full rider data:")
                    print(json.dumps(rider_data, indent=4))
                else:
                    print(f"\n   ℹ️  Rider {RIDER_ID} not found in results")
                    if results:
                        print(f"\n   📋 Sample result (first rider):")
                        print(json.dumps(results[0], indent=4))
            else:
                print(f"   ❌ Error: {response.text[:200]}")
        
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
        
        # Test 2: ZwiftPower results endpoint
        print(f"\n\n2️⃣ Testing ZwiftPower endpoint:")
        print(f"   GET {ZWIFTRACING_API_BASE}/public/zp/{event_id}/results")
        
        try:
            response = requests.get(f"{ZWIFTRACING_API_BASE}/public/zp/{event_id}/results", timeout=30)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                results = data if isinstance(data, list) else data.get('results', [])
                rider_data = None
                
                for r in results:
                    if r.get('zwid') == RIDER_ID or r.get('rider_id') == RIDER_ID:
                        rider_data = r
                        break
                
                if rider_data:
                    print(f"\n   ✅ Found rider {RIDER_ID} data!")
                    print(f"\n   🔑 Available fields:")
                    for key in sorted(rider_data.keys()):
                        print(f"      - {key}")
                    
                    print(f"\n   📋 Full rider data:")
                    print(json.dumps(rider_data, indent=4))
                else:
                    print(f"\n   ℹ️  Rider {RIDER_ID} not found")
            else:
                print(f"   ❌ Error: {response.text[:200]}")
        
        except Exception as e:
            print(f"   ❌ Request failed: {e}")
    
    else:
        print("❌ No events found")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
