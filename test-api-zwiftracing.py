#!/usr/bin/env python3
"""
Quick test of api.zwiftracing.app endpoints with known event IDs
"""
import requests
import json

ZWIFTRACING_API_BASE = "https://api.zwiftracing.app/api"
RIDER_ID = 150437

# Authorization (try both bearer and api key formats)
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "TeamNL-Cloud9-Racing/1.0"
}

# Use event IDs we know exist from our database
# These are from the production sync we did earlier
TEST_EVENT_IDS = [
    4690922,  # Recent event from our database
    4685738,  # Another one
    4683201,  # Another one
]

print("=" * 70)
print("🔍 TESTING API.ZWIFTRACING.APP ENDPOINTS")
print("=" * 70)

for event_id in TEST_EVENT_IDS:
    print(f"\n\n{'='*70}")
    print(f"📊 EVENT {event_id}")
    print('='*70)
    
    # Test 1: ZwiftRacing.app results endpoint
    print(f"\n1️⃣  ZwiftRacing.app Results Endpoint")
    url1 = f"{ZWIFTRACING_API_BASE}/public/results/{event_id}"
    print(f"    URL: {url1}")
    
    try:
        response = requests.get(url1, headers=HEADERS, timeout=30)
        print(f"    Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check structure
            if isinstance(data, list):
                print(f"    ✅ Response is a list with {len(data)} items")
                results = data
            elif isinstance(data, dict):
                print(f"    ✅ Response is a dict with keys: {list(data.keys())}")
                results = data.get('results', [])
            else:
                print(f"    ⚠️  Unexpected response type: {type(data)}")
                results = []
            
            # Find our rider
            rider_data = None
            for r in results:
                if r.get('zwid') == RIDER_ID or r.get('riderId') == RIDER_ID:
                    rider_data = r
                    break
            
            if rider_data:
                print(f"\n    🎯 FOUND RIDER {RIDER_ID}!")
                print(f"\n    Available fields:")
                for key in sorted(rider_data.keys()):
                    value = rider_data[key]
                    if isinstance(value, (int, float, str, bool, type(None))):
                        print(f"      • {key}: {value}")
                    else:
                        print(f"      • {key}: {type(value).__name__}")
                
                # Check for power intervals
                power_fields = {k: v for k, v in rider_data.items() 
                               if any(x in k.lower() for x in ['power', '5s', '15s', '30s', '1m', '2m', '5m', '20m', 'watt', 'effort', 'rp'])}
                
                if power_fields:
                    print(f"\n    ⚡ POWER/EFFORT DATA:")
                    for key, value in power_fields.items():
                        print(f"      • {key}: {value}")
                
                print(f"\n    📋 FULL RIDER DATA:")
                print(json.dumps(rider_data, indent=6))
                
                # Success - stop testing other events
                print(f"\n✅ Successfully retrieved data with power intervals!")
                break
            
            else:
                print(f"\n    ⚠️  Rider {RIDER_ID} not in this event")
                if results and len(results) > 0:
                    print(f"\n    📋 Sample (first rider):")
                    print(json.dumps(results[0], indent=6))
        
        elif response.status_code == 404:
            print(f"    ❌ 404 - Event not found")
        else:
            print(f"    ❌ Error: {response.text[:300]}")
    
    except Exception as e:
        print(f"    ❌ Request failed: {e}")
    
    # Test 2: ZwiftPower results endpoint
    print(f"\n2️⃣  ZwiftPower Results Endpoint")
    url2 = f"{ZWIFTRACING_API_BASE}/public/zp/{event_id}/results"
    print(f"    URL: {url2}")
    
    try:
        response = requests.get(url2, headers=HEADERS, timeout=30)
        print(f"    Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list):
                print(f"    ✅ Response is a list with {len(data)} items")
            elif isinstance(data, dict):
                print(f"    ✅ Response is a dict with keys: {list(data.keys())}")
        
        elif response.status_code == 404:
            print(f"    ❌ 404 - Event not found")
        else:
            print(f"    ❌ Error")
    
    except Exception as e:
        print(f"    ❌ Request failed: {e}")

print(f"\n\n{'='*70}")
print("✅ TEST COMPLETE")
print('='*70)
