#!/usr/bin/env python3
"""
Quick Test - Race Results Scanner
Test de basis functionaliteit van zpdatafetch
"""

import sys

print("=" * 60)
print("🧪 Quick Test - zpdatafetch")
print("=" * 60)

# Test 1: Import check
print("\n1️⃣ Testing imports...")
try:
    from zpdatafetch import Result, Cyclist
    from zrdatafetch import ZRResult, ZRRider, AsyncZR_obj
    import keyring
    print("✅ All imports successful")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

# Test 2: Keyring setup
print("\n2️⃣ Setting up test credentials...")
try:
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
    keyring.set_password("zrdatafetch", "authorization", "650c6d2fc4ef6858d74cbef1")
    print("✅ Credentials stored in keyring")
except Exception as e:
    print(f"⚠️  Warning: {e}")

# Test 3: Simple Zwiftracing fetch
print("\n3️⃣ Testing Zwiftracing API...")
import asyncio

async def test_zwiftracing():
    try:
        async with AsyncZR_obj() as zr:
            rider = ZRRider()
            rider.set_session(zr)
            
            # Test met een bekende rider
            test_rider_id = 150437
            print(f"   Fetching rider {test_rider_id}...")
            
            await rider.afetch(test_rider_id)
            
            # Check if data was fetched
            if hasattr(rider, 'name') and rider.name:
                print(f"   ✅ Success!")
                print(f"      Name: {rider.name}")
                print(f"      Rating: {rider.current_rating if hasattr(rider, 'current_rating') else 'N/A'}")
                print(f"      Category: {rider.current_rank if hasattr(rider, 'current_rank') else 'N/A'}")
                
                # Also test JSON output
                json_data = rider.json()
                print(f"      JSON: {len(json_data)} characters")
                return True
            else:
                print("   ⚠️  No data returned")
                return False
                
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

success = asyncio.run(test_zwiftracing())

# Test 4: Summary
print("\n" + "=" * 60)
if success:
    print("✅ ALL TESTS PASSED!")
    print("\n🚀 Ready to use:")
    print("   • python race-results-scanner.py")
    print("   • python race-results-db-sync.py")
else:
    print("⚠️  SOME TESTS FAILED")
    print("   Check credentials and API access")
print("=" * 60)
