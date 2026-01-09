#!/usr/bin/env python3
"""
Test Race Results voor Rider 150437 (JRøne | CloudRacer-9)
Ophalen race history van laatste 90 dagen
"""

import asyncio
import sys
from datetime import datetime, timedelta

try:
    from zrdatafetch import ZRRider, ZRResult, AsyncZR_obj
    import keyring
except ImportError as e:
    print(f"❌ Error: {e}")
    print("Run: pip install zpdatafetch")
    sys.exit(1)

# Setup credentials
try:
    keyring.set_password("zrdatafetch", "authorization", "650c6d2fc4ef6858d74cbef1")
except:
    pass

RIDER_ID = 150437

async def test_rider_results():
    print("=" * 70)
    print(f"🔍 Testing Race Results for Rider {RIDER_ID}")
    print("=" * 70)
    
    async with AsyncZR_obj() as zr:
        # 1. Get rider info
        print(f"\n1️⃣ Fetching rider info...")
        rider = ZRRider()
        rider.set_session(zr)
        
        try:
            await rider.afetch(RIDER_ID)
            
            print(f"\n✅ Rider Found:")
            print(f"   Name: {rider.name}")
            print(f"   Current Rating: {rider.current_rating:.2f}")
            print(f"   Current Rank: {rider.current_rank}")
            print(f"   Max 30d: {rider.max30_rating:.2f} ({rider.max30_rank})")
            print(f"   Max 90d: {rider.max90_rating:.2f} ({rider.max90_rank})")
            
            # Check if rider object has race history
            print(f"\n2️⃣ Checking for race history in rider object...")
            
            # Try to access the raw JSON to see what data is available
            json_data = rider.json()
            print(f"   JSON data length: {len(json_data)} characters")
            
            # Parse JSON to look for race history
            import json
            data = json.loads(json_data)
            
            print(f"\n📊 Available fields in rider data:")
            for key in data.keys():
                value = data[key]
                if isinstance(value, list):
                    print(f"   - {key}: [{len(value)} items]")
                elif isinstance(value, dict):
                    print(f"   - {key}: {{...}}")
                else:
                    print(f"   - {key}: {value}")
            
            # Note: Zwiftracing rider endpoint doesn't return race history
            # We would need to search for events separately
            print(f"\n⚠️  Note: ZRRider endpoint doesn't include race history")
            print(f"   To get race results, we need event IDs")
            print(f"   Options:")
            print(f"   1. Use ZwiftPower cyclist endpoint (may have race history)")
            print(f"   2. Search for recent TeamNL events and check if rider participated")
            print(f"   3. Use Zwift official API (requires more auth)")
            
        except Exception as e:
            print(f"❌ Error fetching rider: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 70)
    print("✅ Test Complete")
    print("=" * 70)
    print("\n💡 Next steps to get actual race results:")
    print("   1. Find recent event IDs where rider participated")
    print("   2. Use ZRResult to fetch those specific events")
    print("   3. Or use ZwiftPower Result endpoint with event IDs")

if __name__ == "__main__":
    asyncio.run(test_rider_results())
