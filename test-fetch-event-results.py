#!/usr/bin/env python3
"""
Fetch Race Results met zpdatafetch Result class
"""

import sys
import json
from datetime import datetime

try:
    from zpdatafetch import Result
    import keyring
except ImportError as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

# Setup Zwift Power credentials
try:
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
except:
    pass

# Test met recent event
TEST_EVENT_ID = "5331604"  # Zwift Racing League: Redline Rally - 2026-01-06

def fetch_race_results():
    """Fetch race results voor specifiek event"""
    print("=" * 100)
    print(f"🏁 Fetching Race Results met zpdatafetch")
    print("=" * 100)
    print(f"\n🎯 Event ID: {TEST_EVENT_ID}")
    print(f"📅 Event: Zwift Racing League: Redline Rally - 2026-01-06")
    
    try:
        result = Result()
        print(f"\n📡 Fetching event {TEST_EVENT_ID}...")
        result.fetch(TEST_EVENT_ID)
        
        print(f"✅ Event fetched successfully")
        
        # Check available attributes
        attrs = [attr for attr in dir(result) if not attr.startswith('_')]
        print(f"\n📋 Available attributes:")
        print(f"   {', '.join(attrs[:15])}")
        
        # Try to access event data
        if hasattr(result, 'name'):
            print(f"\n📝 Event Name: {result.name}")
        
        if hasattr(result, 'event_date'):
            print(f"📅 Event Date: {result.event_date}")
        
        # Check raw data
        if hasattr(result, 'raw') and result.raw:
            print(f"\n📦 Raw data type: {type(result.raw)}")
            
            # Parse raw data
            raw_data = result.raw
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)
            
            if isinstance(raw_data, dict):
                print(f"🔑 Keys: {list(raw_data.keys())[:20]}")
                
                # Check if event_id is a key (try both string and int)
                event_key = None
                if TEST_EVENT_ID in raw_data:
                    event_key = TEST_EVENT_ID
                elif int(TEST_EVENT_ID) in raw_data:
                    event_key = int(TEST_EVENT_ID)
                
                if event_key:
                    event_data = raw_data[event_key]
                    print(f"\n📦 Found event data under key '{event_key}' (type: {type(event_key)})")
                    
                    # Parse if it's a JSON string
                    if isinstance(event_data, str):
                        event_data = json.loads(event_data)
                        print(f"   ✅ Parsed JSON string")
                    
                    if isinstance(event_data, dict) and 'data' in event_data:
                        results = event_data['data']
                        print(f"\n🏆 RESULTS: {len(results)} riders")
                    else:
                        print(f"   Keys in event_data: {list(event_data.keys()) if isinstance(event_data, dict) else 'Not a dict'}")
                        results = None
                
                # Look for results directly
                elif 'results' in raw_data:
                    results = raw_data['results']
                    print(f"\n🏆 RESULTS: {len(results)} riders")
                
                # Look for results directly
                elif 'results' in raw_data:
                    results = raw_data['results']
                    print(f"\n🏆 RESULTS: {len(results)} riders")
                    
                # If no results found
                else:
                    print(f"\n⚠️  No results found")
                    results = None
                
                # Process results if found
                if results and len(results) > 0:
                    print(f"\n{'Pos':<5} {'Name':<35} {'ZwiftID':<10} {'Power':<10} {'Time':<10}")
                    print("-" * 75)
                    
                    # Show first 10
                    for rider in results[:10]:
                        pos = rider.get('position', rider.get('pos', '?'))
                        name = str(rider.get('name', 'Unknown'))[:33]
                        zwid = rider.get('zwid', rider.get('rider_id', '?'))
                        power = f"{rider.get('avg_power', 0)}W"
                        time_val = rider.get('time', rider.get('time_gun', 0))
                        if isinstance(time_val, list):
                            time_val = time_val[0]
                        time_min = int(time_val / 60) if time_val else 0
                        time_s = int(time_val % 60) if time_val else 0
                        time_str = f"{time_min}:{time_s:02d}"
                        
                        print(f"{pos:<5} {name:<35} {zwid:<10} {power:<10} {time_str:<10}")
                    
                    # Find rider 150437
                    rider_150437 = None
                    for rider in results:
                        zwid = rider.get('zwid', rider.get('rider_id'))
                        if zwid == 150437 or zwid == '150437':
                            rider_150437 = rider
                            break
                    
                    if rider_150437:
                        print(f"\n" + "=" * 100)
                        print(f"✅ FOUND RIDER 150437 (JRøne):")
                        print("=" * 100)
                        print(f"Position:    {rider_150437.get('position', '?')}")
                        print(f"Name:        {rider_150437.get('name', '?')}")
                        print(f"Category:    {rider_150437.get('category', '?')}")
                        print(f"Avg Power:   {rider_150437.get('avg_power', 0)}W")
                        print(f"Avg W/kg:    {rider_150437.get('avg_wkg', '?')}")
                        print(f"Team:        {rider_150437.get('tname', '?')}")
                    else:
                        print(f"\n⚠️  Rider 150437 not found in results")
                
                elif 'data' in raw_data:
                    print(f"\n📊 Found 'data' key")
                    data = raw_data['data']
                    if isinstance(data, list):
                        print(f"   {len(data)} items in data array")
                else:
                    print(f"\n⚠️  No 'results' or 'data' key")
                    print(f"Sample: {json.dumps(raw_data, indent=2, default=str)[:300]}")
        else:
            print("\n⚠️  No raw data available")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("\n🚀 Starting race results fetch...")
    fetch_race_results()
    print("\n✅ Done!")
