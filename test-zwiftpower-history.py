#!/usr/bin/env python3
"""
Test ZwiftPower Race Results voor Rider 150437
ZwiftPower cyclist endpoint heeft race history
"""

import sys
from datetime import datetime, timedelta

try:
    from zpdatafetch import Cyclist
    import keyring
except ImportError as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

# Setup credentials
try:
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
except:
    pass

RIDER_ID = 150437

def test_zwiftpower_history():
    print("=" * 70)
    print(f"🔍 ZwiftPower Race History for Rider {RIDER_ID}")
    print("=" * 70)
    
    print(f"\n1️⃣ Fetching cyclist data from ZwiftPower...")
    
    cyclist = Cyclist()
    
    try:
        cyclist.fetch(RIDER_ID)
        
        # Access attributes directly
        print(f"\n✅ Cyclist Found:")
        if hasattr(cyclist, 'name'):
            print(f"   Name: {cyclist.name}")
        if hasattr(cyclist, 'zwid'):
            print(f"   Zwift ID: {cyclist.zwid}")
        if hasattr(cyclist, 'category'):
            print(f"   Category: {cyclist.category}")
        
        # Try to get races/results
        print(f"\n2️⃣ Checking available data fields...")
        
        # List all attributes
        attrs = [attr for attr in dir(cyclist) if not attr.startswith('_')]
        print(f"   Available attributes: {', '.join(attrs[:20])}...")
        
        # Check for race data
        if hasattr(cyclist, 'races'):
            print(f"\n📊 RACES FOUND!")
            races = cyclist.races
            print(f"   Total races: {len(races) if races else 0}")
            
            if races and len(races) > 0:
                print(f"\n🏁 Recent Races (last 10):")
                for i, race in enumerate(races[:10]):
                    print(f"\n   Race {i+1}:")
                    for key, value in race.items():
                        print(f"      {key}: {value}")
        
        elif hasattr(cyclist, 'results'):
            print(f"\n📊 RESULTS FOUND!")
            results = cyclist.results
            print(f"   Total results: {len(results) if results else 0}")
            
        else:
            print(f"\n⚠️  No races/results field found in cyclist object")
            print(f"   Available fields:")
            for attr in attrs[:30]:
                try:
                    value = getattr(cyclist, attr)
                    if not callable(value):
                        print(f"      - {attr}: {type(value).__name__}")
                except:
                    pass
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 70)
    print("✅ Test Complete")
    print("=" * 70)

if __name__ == "__main__":
    test_zwiftpower_history()
