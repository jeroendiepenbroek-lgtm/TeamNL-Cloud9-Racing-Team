#!/usr/bin/env python3
"""
Fetch Race Results met zpdatafetch ZRResult class
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

# Setup Zwiftracing credentials
try:
    keyring.set_password("zpdatafetch", "zr_token", "650c6d2fc4ef6858d74cbef1")
except:
    pass

# Test met recent event van rider 150437
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
            print(f"\n📋 Available attributes: {attrs[:20]}")
            
            # Try to access event data
            if hasattr(result, 'name'):
                print(f"\n📝 Event Name: {result.name}")
            
            if hasattr(result, 'event_date'):
                print(f"📅 Event Date: {result.event_date}")
            
            if hasattr(result, 'raw') and result.raw:
                print(f"\n📦 Raw data type: {type(result.raw)}")
                
                # Parse raw data
                raw_data = result.raw
                if isinstance(raw_data, str):
                    raw_data = json.loads(raw_data)
                
                if isinstance(raw_data, dict):
                    print(f"🔑 Keys in raw data: {list(raw_data.keys())[:20]}")
                    
                    # Look for results array
                    if 'results' in raw_data:
                        results = raw_data['results']
                        print(f"\n🏆 RESULTS: {len(results)} riders")
                        
                        # Show first 5
                        print(f"\n{'Pos':<5} {'Name':<35} {'ZwiftID':<10} {'Power':<10} {'Time':<10}")
                        print("-" * 75)
                        
                        for i, rider in enumerate(results[:10]):
                            pos = rider.get('position', rider.get('pos', '?'))
                            name = str(rider.get('name', 'Unknown'))[:33]
                            zwid = rider.get('zwid', rider.get('rider_id', '?'))
                            power = f"{rider.get('avg_power', 0)}W"
                            time_val = rider.get('time', rider.get('time_gun', 0))
                            if isinstance(time_val, list):
                                time_val = time_val[0]
                            time_min = int(time_val / 60)
                            time_s = int(time_val % 60)
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
                            print(f"Time:        {time_str}")
                            print(f"Team:        {rider_150437.get('tname', '?')}")
                        else:
                            print(f"\n⚠️  Rider 150437 not found in results")
                    
                    elif 'data' in raw_data:
                        print(f"\n📊 Found 'data' key with {len(raw_data['data'])} items")
                    else:
                        print(f"\n⚠️  No 'results' or 'data' key found")
                        print(f"Sample raw data: {json.dumps(raw_data, indent=2, default=str)[:500]}")
            
            # Try processed data
            elif hasattr(result, 'processed') and result.processed:
                print(f"\n📦 Processed data type: {type(result.processed)}")
                processed = result.processed
                print(f"Keys: {list(processed.keys())[:20]}")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

def main():
    print("\n🚀 Starting race results fetch...")
    fetch_race_results()
    print("\n✅ Done!")

if __name__ == "__main__":
    main()
