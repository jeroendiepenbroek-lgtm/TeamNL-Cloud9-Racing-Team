#!/usr/bin/env python3
"""
Test ZwiftRacing.app API to check if power intervals are available
"""
import requests
import json

# Test with a recent event from the screenshot
TEST_EVENT_ID = 4694738  # "Stage 1 - Race - Tour de Zwift" from Jan 10, 2026

ZWIFTRACING_API_BASE = "https://www.zwiftracing.app/api"
ZWIFTRACING_TOKEN = "650c6d2fc4ef6858d74cbef1"

url = f"{ZWIFTRACING_API_BASE}/events/{TEST_EVENT_ID}/results"
headers = {
    "Authorization": f"Bearer {ZWIFTRACING_TOKEN}",
    "Accept": "application/json",
    "User-Agent": "TeamNL-Cloud9-Racing/1.0"
}

print(f"🔍 Testing ZwiftRacing.app API for event {TEST_EVENT_ID}")
print(f"📡 URL: {url}")
print()

try:
    response = requests.get(url, headers=headers, timeout=15)
    
    print(f"📊 Status: {response.status_code}")
    print()
    
    if response.status_code == 200:
        data = response.json()
        
        # Check if results exist
        results = data.get('results', [])
        print(f"✅ Found {len(results)} results")
        
        if results:
            # Show first result (rider 150437 should be in this race)
            rider_150437 = None
            for result in results:
                if result.get('zwid') == 150437 or result.get('rider_id') == 150437:
                    rider_150437 = result
                    break
            
            if rider_150437:
                print(f"\n🎯 Found rider 150437 data:")
                print(json.dumps(rider_150437, indent=2))
            else:
                print(f"\n📋 Sample result (first rider):")
                print(json.dumps(results[0], indent=2))
                
                # Check what fields are available
                print(f"\n🔑 Available fields in first result:")
                for key in results[0].keys():
                    print(f"  - {key}: {type(results[0][key]).__name__}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text[:500])

except Exception as e:
    print(f"❌ Request failed: {e}")
    import traceback
    traceback.print_exc()
