#!/usr/bin/env python3
"""
Race Results Scanner met zpdatafetch
Haalt race results op van ZwiftPower.com en Zwiftracing.app
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import asyncio

# Import zpdatafetch library
try:
    from zpdatafetch import Result as ZPResult, setup_logging
    from zrdatafetch import ZRResult, AsyncZR_obj, ZRRider
    import keyring
except ImportError as e:
    print(f"❌ Error: {e}")
    print("Install required packages: pip install zpdatafetch keyring")
    sys.exit(1)

# Setup logging
setup_logging(console_level='INFO')
logger = logging.getLogger(__name__)

# ZwiftPower credentials
ZWIFTPOWER_USERNAME = "jeroen.diepenbroek@gmail.com"
ZWIFTPOWER_PASSWORD = "CloudRacer-9"

# Zwiftracing API token
ZWIFTRACING_API_TOKEN = os.getenv('ZWIFTRACING_API_TOKEN', '650c6d2fc4ef6858d74cbef1')


def setup_credentials():
    """Setup credentials in system keyring"""
    print("🔑 Setting up credentials...")
    
    # ZwiftPower credentials
    try:
        keyring.set_password("zpdatafetch", "username", ZWIFTPOWER_USERNAME)
        keyring.set_password("zpdatafetch", "password", ZWIFTPOWER_PASSWORD)
        print("✅ ZwiftPower credentials configured")
    except Exception as e:
        print(f"⚠️  Warning: Could not store ZwiftPower credentials: {e}")
    
    # Zwiftracing authorization
    try:
        keyring.set_password("zrdatafetch", "authorization", ZWIFTRACING_API_TOKEN)
        print("✅ Zwiftracing authorization configured")
    except Exception as e:
        print(f"⚠️  Warning: Could not store Zwiftracing authorization: {e}")


def fetch_zwiftpower_results(event_ids: List[int]) -> Dict[int, Any]:
    """
    Fetch race results from ZwiftPower
    
    Args:
        event_ids: List of Zwift event IDs
        
    Returns:
        Dictionary mapping event_id -> race results
    """
    print(f"\n📊 Fetching ZwiftPower results for {len(event_ids)} events...")
    results = {}
    
    try:
        zp_result = ZPResult()
        
        for event_id in event_ids:
            try:
                print(f"   Fetching event {event_id}...")
                zp_result.fetch(event_id)
                
                # Parse results
                result_data = zp_result.asdict()
                if result_data:
                    results[event_id] = result_data
                    print(f"   ✅ Event {event_id}: {len(result_data.get('results', []))} riders")
                else:
                    print(f"   ⚠️  Event {event_id}: No data")
                    
            except Exception as e:
                print(f"   ❌ Event {event_id} failed: {e}")
                continue
                
    except Exception as e:
        print(f"❌ ZwiftPower fetch failed: {e}")
    
    return results


async def fetch_zwiftracing_results(event_ids: List[int]) -> Dict[int, Any]:
    """
    Fetch race results from Zwiftracing.app (async)
    
    Args:
        event_ids: List of Zwift event IDs
        
    Returns:
        Dictionary mapping event_id -> race results
    """
    print(f"\n📊 Fetching Zwiftracing results for {len(event_ids)} events...")
    results = {}
    
    try:
        async with AsyncZR_obj() as zr:
            for event_id in event_ids:
                try:
                    print(f"   Fetching event {event_id}...")
                    
                    result = ZRResult()
                    result.set_session(zr)
                    await result.afetch(event_id)
                    
                    # Parse results from object
                    if hasattr(result, 'results') and result.results:
                        results[event_id] = {
                            'event_id': event_id,
                            'results': [
                                {
                                    'zwift_id': r.zwift_id,
                                    'name': r.name,
                                    'position': r.position,
                                    'time': r.time,
                                    'rating_before': r.rating_before,
                                    'rating_after': r.rating_after,
                                    'rating_change': r.rating_change,
                                } for r in result.results
                            ]
                        }
                        print(f"   ✅ Event {event_id}: {len(result.results)} riders")
                    else:
                        print(f"   ⚠️  Event {event_id}: No data")
                        
                except Exception as e:
                    print(f"   ❌ Event {event_id} failed: {e}")
                    continue
                    
    except Exception as e:
        print(f"❌ Zwiftracing fetch failed: {e}")
    
    return results


async def fetch_rider_race_history(rider_ids: List[int], days_back: int = 30) -> Dict[int, List[Any]]:
    """
    Fetch race history for specific riders from Zwiftracing
    
    Args:
        rider_ids: List of Zwift rider IDs
        days_back: How many days back to look
        
    Returns:
        Dictionary mapping rider_id -> list of races
    """
    print(f"\n👤 Fetching race history for {len(rider_ids)} riders...")
    rider_history = {}
    
    try:
        async with AsyncZR_obj() as zr:
            for rider_id in rider_ids:
                try:
                    print(f"   Fetching rider {rider_id}...")
                    
                    rider = ZRRider()
                    rider.set_session(zr)
                    await rider.afetch(rider_id)
                    
                    # Access rider data as object attributes
                    if hasattr(rider, 'name') and rider.name:
                        rider_history[rider_id] = {
                            'name': rider.name,
                            'current_rating': getattr(rider, 'current_rating', None),
                            'current_rank': getattr(rider, 'current_rank', None),
                            'max30_rating': getattr(rider, 'max30_rating', None),
                            'max90_rating': getattr(rider, 'max90_rating', None),
                            'zrcs': getattr(rider, 'zrcs', None),
                            'raw_json': rider.json()
                        }
                        print(f"   ✅ Rider {rider_id}: {rider.name}")
                    else:
                        print(f"   ⚠️  Rider {rider_id}: No data")
                        
                except Exception as e:
                    print(f"   ❌ Rider {rider_id} failed: {e}")
                    continue
                    
    except Exception as e:
        print(f"❌ Rider fetch failed: {e}")
    
    return rider_history


def save_results_to_file(data: Dict, filename: str):
    """Save results to JSON file"""
    try:
        output_path = f"/workspaces/TeamNL-Cloud9-Racing-Team/data/{filename}"
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        print(f"💾 Saved to {output_path}")
    except Exception as e:
        print(f"❌ Failed to save: {e}")


def main():
    """Main function"""
    print("=" * 60)
    print("Race Results Scanner - zpdatafetch")
    print("=" * 60)
    
    # Setup credentials
    setup_credentials()
    
    # Example: Test met bekende event IDs
    # Je kunt deze vervangen door recente TeamNL races
    test_event_ids = [
        5298123,  # Example event ID
        # Voeg hier meer event IDs toe
    ]
    
    # Example: TeamNL rider IDs
    team_nl_riders = [
        150437,   # Example rider
        # Voeg hier meer rider IDs toe
    ]
    
    print("\n" + "=" * 60)
    print("OPTIONS:")
    print("1. Fetch ZwiftPower race results")
    print("2. Fetch Zwiftracing race results")
    print("3. Fetch rider race history")
    print("4. Run all")
    print("=" * 60)
    
    choice = input("\nSelect option (1-4): ").strip()
    
    if choice == "1" or choice == "4":
        # Fetch ZwiftPower results
        zp_results = fetch_zwiftpower_results(test_event_ids)
        if zp_results:
            save_results_to_file(zp_results, "zwiftpower_results.json")
    
    if choice == "2" or choice == "4":
        # Fetch Zwiftracing results (async)
        zr_results = asyncio.run(fetch_zwiftracing_results(test_event_ids))
        if zr_results:
            save_results_to_file(zr_results, "zwiftracing_results.json")
    
    if choice == "3" or choice == "4":
        # Fetch rider history (async)
        rider_history = asyncio.run(fetch_rider_race_history(team_nl_riders))
        if rider_history:
            save_results_to_file(rider_history, "rider_history.json")
    
    print("\n✅ Scan complete!")


if __name__ == "__main__":
    main()
