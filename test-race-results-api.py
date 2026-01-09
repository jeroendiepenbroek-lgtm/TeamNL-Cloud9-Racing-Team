#!/usr/bin/env python3
"""
Test ZwiftRacing API voor Race Results
Gebruik EventID om volledige race results op te halen
"""

import sys
import json
import requests
from datetime import datetime

# ZwiftRacing API Configuration
ZWIFT_RACING_API_KEY = "650c6d2fc4ef6858d74cbef1"
ZWIFT_RACING_API_BASE = "https://api.zwiftracing.app/api"

# Test met recent event van rider 150437
TEST_EVENT_ID = "5331604"  # Zwift Racing League: Redline Rally - 2026-01-06

def test_zwiftracing_results():
    """Test ZwiftRacing.app results endpoint"""
    print("=" * 100)
    print(f"🏁 Testing ZwiftRacing.app Results API")
    print("=" * 100)
    
    # Public endpoint - no auth needed
    url = f"{ZWIFT_RACING_API_BASE}/public/results/{TEST_EVENT_ID}"
    headers = {
        "Accept": "application/json",
        "User-Agent": "TeamNL-RaceResults/1.0"
    }
    
    print(f"\n📡 GET {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        print(f"\n✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📦 Response keys: {list(data.keys())}")
            
            # Print structured data
            if isinstance(data, dict):
                print(f"\n📋 EVENT DATA:")
                for key in ['event_id', 'name', 'event_date', 'category', 'distance']:
                    if key in data:
                        print(f"  {key}: {data[key]}")
                
                # Check for results array
                if 'results' in data:
                    results = data['results']
                    print(f"\n🏆 RESULTS: {len(results)} riders")
                    
                    # Show first 5 results
                    print(f"\n{'Pos':<5} {'Name':<30} {'Power':<10} {'Time':<10}")
                    print("-" * 60)
                    for i, result in enumerate(results[:5]):
                        pos = result.get('position', '?')
                        name = result.get('name', result.get('rider_name', 'Unknown'))[:28]
                        power = f"{result.get('avg_power', 0)}W"
                        time_sec = result.get('time', 0)
                        time_min = int(time_sec / 60)
                        time_s = int(time_sec % 60)
                        time_str = f"{time_min}:{time_s:02d}"
                        print(f"{pos:<5} {name:<30} {power:<10} {time_str:<10}")
                    
                    # Check if rider 150437 is in results
                    rider_150437 = None
                    for result in results:
                        if result.get('zwid') == 150437 or result.get('rider_id') == 150437:
                            rider_150437 = result
                            break
                    
                    if rider_150437:
                        print(f"\n✅ Found Rider 150437 (JRøne) in results:")
                        print(f"   Position: {rider_150437.get('position', '?')}")
                        print(f"   Name: {rider_150437.get('name', '?')}")
                        print(f"   Power: {rider_150437.get('avg_power', 0)}W")
                else:
                    print("\n⚠️  No 'results' array in response")
                    print(f"Available keys: {list(data.keys())}")
            else:
                print(f"\n📄 Raw response (first 500 chars):\n{str(data)[:500]}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text[:500]}")
    
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        import traceback
        traceback.print_exc()

def test_zwiftpower_results():
    """Test ZwiftPower results endpoint via ZwiftRacing API"""
    print("\n\n" + "=" * 100)
    print(f"🏁 Testing ZwiftPower Results API (via ZwiftRacing)")
    print("=" * 100)
    
    # Public endpoint - no auth needed
    url = f"{ZWIFT_RACING_API_BASE}/public/zp/{TEST_EVENT_ID}/results"
    headers = {
        "Accept": "application/json",
        "User-Agent": "TeamNL-RaceResults/1.0"
    }
    
    print(f"\n📡 GET {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        print(f"\n✅ Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"📦 Response type: {type(data)}")
            
            if isinstance(data, list):
                print(f"📊 Total results: {len(data)}")
                
                # Show first 5 results
                print(f"\n{'Pos':<5} {'Name':<30} {'Power':<10} {'Time':<10}")
                print("-" * 60)
                for result in data[:5]:
                    pos = result.get('position', result.get('pos', '?'))
                    name = result.get('name', 'Unknown')[:28]
                    power = f"{result.get('avg_power', 0)}W"
                    time_val = result.get('time', result.get('time_gun', 0))
                    if isinstance(time_val, list):
                        time_val = time_val[0]
                    time_min = int(time_val / 60)
                    time_s = int(time_val % 60)
                    time_str = f"{time_min}:{time_s:02d}"
                    print(f"{pos:<5} {name:<30} {power:<10} {time_str:<10}")
            elif isinstance(data, dict):
                print(f"📦 Response keys: {list(data.keys())}")
                print(f"\n📄 Sample data:\n{json.dumps(data, indent=2, default=str)[:500]}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text[:500]}")
    
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print(f"\n🎯 Testing with Event ID: {TEST_EVENT_ID}")
    print(f"📅 Event: Zwift Racing League: Redline Rally - 2026-01-06")
    print(f"👤 Looking for Rider 150437 (JRøne)")
    
    test_zwiftracing_results()
    test_zwiftpower_results()
    
    print("\n" + "=" * 100)
    print("✅ Test completed")
    print("=" * 100)
