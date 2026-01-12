#!/usr/bin/env python3
"""
E2E Test: Race Results voor Rider 150437 (JRøne | CloudRacer-9)
Test beide APIs: ZwiftPower (zpdatafetch) en ZwiftRacing
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Import zpdatafetch en zrdatafetch
try:
    from zpdatafetch import Result as ZPResult, setup_logging, Cyclist
    from zrdatafetch import ZRResult, ZRRider, AsyncZR_obj
    import keyring
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Install: pip install zpdatafetch keyring")
    sys.exit(1)

# Import Supabase
try:
    from supabase import create_client, Client
except ImportError:
    print("⚠️  Supabase not installed: pip install supabase")
    create_client = None

# Setup logging
setup_logging(console_level='INFO')

# Test Configuration
TEST_RIDER_ID = 150437
TEST_RIDER_NAME = "JRøne | CloudRacer-9"

ZWIFTPOWER_USERNAME = os.getenv("ZWIFTPOWER_USERNAME", "jeroen.diepenbroek@gmail.com")
ZWIFTPOWER_PASSWORD = os.getenv("ZWIFTPOWER_PASSWORD", "CloudRacer-9")
ZWIFTRACING_API_TOKEN = os.getenv("ZWIFTRACING_API_TOKEN", "650c6d2fc4ef6858d74cbef1")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def setup_credentials():
    """Setup credentials in keyring"""
    print("🔑 Setting up credentials...")
    try:
        keyring.set_password("zpdatafetch", "username", ZWIFTPOWER_USERNAME)
        keyring.set_password("zpdatafetch", "password", ZWIFTPOWER_PASSWORD)
        keyring.set_password("zrdatafetch", "authorization", ZWIFTRACING_API_TOKEN)
        print("✅ Credentials configured")
    except Exception as e:
        print(f"⚠️  Warning: {e}")


async def test_zwiftpower_api():
    """Test 1: Fetch race history via ZwiftPower API (zpdatafetch)"""
    print("\n" + "="*70)
    print("🧪 TEST 1: ZwiftPower API (zpdatafetch)")
    print("="*70)
    
    try:
        # Initialize cyclist with async fetch
        cyclist = Cyclist()
        await cyclist.afetch(TEST_RIDER_ID)
        
        print(f"✅ Loaded profile: {cyclist.name}")
        print(f"   Zwift ID: {cyclist.zwid}")
        print(f"   FTP: {cyclist.ftp}W")
        print(f"   Weight: {cyclist.weight}kg")
        
        # Get race history (last 30 days)
        days_back = 30
        
        print(f"\n🔍 Fetching races from last {days_back} days...")
        races = await cyclist.araces(days=days_back)
        
        print(f"✅ Found {len(races)} races")
        
        # Show details of each race
        race_details = []
        for idx, race in enumerate(races[:10], 1):  # First 10 races
            print(f"\n📋 Race {idx}: {race.name}")
            print(f"   Event ID: {race.id}")
            print(f"   Date: {race.date}")
            print(f"   Category: {race.category}")
            print(f"   Position: {race.position}/{race.finishers}")
            print(f"   Time: {race.time}")
            print(f"   Avg Power: {race.avg_power}W")
            print(f"   Avg HR: {race.avg_hr} bpm")
            
            race_details.append({
                'event_id': race.id,
                'event_name': race.name,
                'date': str(race.date),
                'category': race.category,
                'position': race.position,
                'finishers': race.finishers,
                'time_seconds': race.time,
                'avg_power': race.avg_power,
                'avg_hr': race.avg_hr,
                'source': 'zwiftpower'
            })
        
        return {
            'success': True,
            'source': 'ZwiftPower',
            'rider_id': TEST_RIDER_ID,
            'rider_name': cyclist.name,
            'total_races': len(races),
            'races': race_details
        }
        
    except Exception as e:
        print(f"❌ ZwiftPower API Error: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


async def test_zwiftracing_api():
    """Test 2: Fetch race data via Zwiftracing API"""
    print("\n" + "="*70)
    print("🧪 TEST 2: ZwiftRacing API (zrdatafetch)")
    print("="*70)
    
    try:
        # Get rider info using async context
        async with AsyncZR_obj() as zr:
            rider = ZRRider()
            rider.set_session(zr)
            await rider.afetch(zwift_id=TEST_RIDER_ID)
            
            print(f"✅ Loaded rider: {rider.name}")
            print(f"   Zwift ID: {rider.zwift_id}")
            print(f"   Current Rating: {rider.current_rating}")
            print(f"   Current Rank: {rider.current_rank}")
            print(f"   Max 30-day: {rider.max30_rating}")
            
            # Note: ZRRider doesn't directly provide race history
            # We need to fetch individual race results
            print(f"\n🔍 ZRRider provides rating info, not race history")
            print(f"   Use ZRResult to fetch specific event results")
            
            race_details = [{
                'rider_id': rider.zwift_id,
                'name': rider.name,
                'current_rating': rider.current_rating,
                'current_rank': rider.current_rank,
                'max30_rating': rider.max30_rating,
                'max30_rank': rider.max30_rank,
                'source': 'zwiftracing'
            }]
        
        return {
            'success': True,
            'source': 'ZwiftRacing',
            'rider_id': TEST_RIDER_ID,
            'rider_name': rider.name,
            'current_rating': rider.current_rating,
            'current_rank': rider.current_rank,
            'max30_rating': rider.max30_rating,
            'results': race_details
        }
        
    except Exception as e:
        print(f"❌ ZwiftRacing API Error: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


async def test_database_sync(zp_data: Dict, zr_data: Dict):
    """Test 3: Sync results to database"""
    print("\n" + "="*70)
    print("🧪 TEST 3: Database Sync")
    print("="*70)
    
    if not create_client or not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️  Skipping database test - no Supabase credentials")
        return {'success': False, 'reason': 'No database credentials'}
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase")
        
        # Prepare race results for database
        results_to_sync = []
        
        # Add ZwiftPower results
        if zp_data.get('success') and 'races' in zp_data:
            for race in zp_data['races']:
                results_to_sync.append({
                    'event_id': race['event_id'],
                    'rider_id': TEST_RIDER_ID,
                    'position': race['position'],
                    'category': race['category'],
                    'time_seconds': race['time_seconds'],
                    'avg_power': race['avg_power'],
                    'avg_hr': race['avg_hr'],
                    'data_source': 'zwiftpower',
                    'fetched_at': datetime.utcnow().isoformat()
                })
        
        # Add ZwiftRacing results (merge with existing)
        if zr_data.get('success') and 'results' in zr_data:
            for result in zr_data['results']:
                # Find matching result from ZP or create new
                existing = next((r for r in results_to_sync if r['event_id'] == result['event_id']), None)
                
                if existing:
                    # Merge ZwiftRacing data
                    existing['velo_after'] = result['velo_after']
                    existing['data_source'] = 'both'
                else:
                    # Add as new result
                    results_to_sync.append({
                        'event_id': result['event_id'],
                        'rider_id': TEST_RIDER_ID,
                        'position': result['position'],
                        'category': result['category'],
                        'velo_after': result['velo_after'],
                        'data_source': 'zwiftracing',
                        'fetched_at': datetime.utcnow().isoformat()
                    })
        
        print(f"\n💾 Syncing {len(results_to_sync)} race results to database...")
        
        # Upsert to database
        for result in results_to_sync:
            response = supabase.table('race_results')\
                .upsert(result, on_conflict='event_id,rider_id')\
                .execute()
        
        print(f"✅ Synced {len(results_to_sync)} results")
        
        # Verify in database
        db_check = supabase.table('race_results')\
            .select('*', count='exact')\
            .eq('rider_id', TEST_RIDER_ID)\
            .execute()
        
        print(f"✅ Database verification: {db_check.count} total results for rider {TEST_RIDER_ID}")
        
        return {
            'success': True,
            'synced_count': len(results_to_sync),
            'total_in_db': db_check.count
        }
        
    except Exception as e:
        print(f"❌ Database sync error: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}


async def main():
    """Run E2E test pipeline"""
    print("\n" + "="*70)
    print("🚀 E2E RACE RESULTS TEST - Rider 150437")
    print("="*70)
    print(f"Rider: {TEST_RIDER_NAME}")
    print(f"Testing: ZwiftPower API + ZwiftRacing API + Database Sync")
    print("="*70)
    
    # Setup
    setup_credentials()
    
    # Test results
    results = {
        'test_date': datetime.now().isoformat(),
        'rider_id': TEST_RIDER_ID,
        'rider_name': TEST_RIDER_NAME
    }
    
    # Test 1: ZwiftPower API
    zp_result = await test_zwiftpower_api()
    results['zwiftpower'] = zp_result
    
    # Test 2: ZwiftRacing API  
    zr_result = await test_zwiftracing_api()
    results['zwiftracing'] = zr_result
    
    # Test 3: Database Sync
    db_result = await test_database_sync(zp_result, zr_result)
    results['database'] = db_result
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    
    print(f"\n1️⃣  ZwiftPower API: {'✅ PASSED' if zp_result.get('success') else '❌ FAILED'}")
    if zp_result.get('success'):
        print(f"   - Found {zp_result.get('total_races', 0)} races")
    
    print(f"\n2️⃣  ZwiftRacing API: {'✅ PASSED' if zr_result.get('success') else '❌ FAILED'}")
    if zr_result.get('success'):
        print(f"   - Rider: {zr_result.get('rider_name', 'N/A')}")
        print(f"   - Current Rating: {zr_result.get('current_rating', 'N/A')}")
        print(f"   - Current Rank: {zr_result.get('current_rank', 'N/A')}")
    
    print(f"\n3️⃣  Database Sync: {'✅ PASSED' if db_result.get('success') else '⚠️ SKIPPED' if db_result.get('reason') else '❌ FAILED'}")
    if db_result.get('success'):
        print(f"   - Synced: {db_result.get('synced_count', 0)} results")
        print(f"   - Total in DB: {db_result.get('total_in_db', 0)} results")
    elif db_result.get('reason'):
        print(f"   - Reason: {db_result.get('reason')}")
    
    # Save results to file
    output_file = f"test-results-rider-{TEST_RIDER_ID}-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Results saved to: {output_file}")
    print("\n" + "="*70)
    
    # Overall status
    all_passed = zp_result.get('success') and zr_result.get('success')
    if all_passed:
        print("🎉 E2E TEST: ALL TESTS PASSED!")
    else:
        print("⚠️  E2E TEST: SOME TESTS FAILED")
    
    print("="*70 + "\n")
    
    return results


if __name__ == "__main__":
    asyncio.run(main())
