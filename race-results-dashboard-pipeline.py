#!/usr/bin/env python3
"""
Race Results Dashboard Pipeline
Volledige pipeline voor het ophalen en integreren van race results data:
1. Haal events op voor rider via ZPDataFetch (90 dagen)
2. Haal race results op per event via ZwiftRacing.app
3. Integreer data in database voor dashboard
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import requests

# Import zpdatafetch and zrdatafetch
try:
    from zpdatafetch import Cyclist, setup_logging
    from zrdatafetch import ZRResult, AsyncZR_obj
    import keyring
except ImportError as e:
    print(f"❌ Error: {e}")
    print("Install: pip install zpdatafetch zrdatafetch keyring")
    sys.exit(1)

# Setup logging
setup_logging(console_level='INFO')

# Configuration
RIDER_ID = 150437
DAYS_BACK = 90

# Credentials
ZWIFTPOWER_USERNAME = "jeroen.diepenbroek@gmail.com"
ZWIFTPOWER_PASSWORD = "CloudRacer-9"
ZWIFTRACING_API_TOKEN = "650c6d2fc4ef6858d74cbef1"

# Backend API (Railway deployment)
BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'https://teamnl-cloud9-racing-team-production.up.railway.app')
API_KEY = os.getenv('API_KEY', '92dcb3f6-6cbc-4a19-a43d-a8a73d318bd4')


def setup_credentials():
    """Setup credentials in system keyring"""
    print("🔑 Setting up credentials...")
    
    try:
        keyring.set_password("zpdatafetch", "username", ZWIFTPOWER_USERNAME)
        keyring.set_password("zpdatafetch", "password", ZWIFTPOWER_PASSWORD)
        keyring.set_password("zrdatafetch", "authorization", ZWIFTRACING_API_TOKEN)
        print("✅ Credentials configured")
    except Exception as e:
        print(f"⚠️  Warning: {e}")


async def fetch_rider_events(rider_id: int, days: int = 90) -> Dict[str, Any]:
    """
    Stap 1: Haal events op voor rider via ZPDataFetch
    
    Args:
        rider_id: Zwift rider ID
        days: Aantal dagen terug
        
    Returns:
        Dict met event_ids en race details
    """
    print("=" * 70)
    print(f"📥 STAP 1: Fetching Events for Rider {rider_id} (laatste {days} dagen)")
    print("=" * 70)
    
    try:
        cyclist = Cyclist()
        await cyclist.afetch(rider_id)
        
        print(f"✅ Cyclist data fetched")
        
        # Get races
        print(f"🏁 Fetching race history...")
        races = await cyclist.araces(days=days)
        
        print(f"✅ Found {len(races)} races\n")
        
        # Extract event IDs and details
        event_data = []
        event_ids = []
        
        for idx, race in enumerate(races, 1):
            race_dict = race.asdict()
            event_id = race_dict.get('id') or race_dict.get('event_id')
            
            if event_id:
                event_ids.append(event_id)
                event_data.append({
                    'event_id': event_id,
                    'name': race_dict.get('name'),
                    'date': str(race_dict.get('date')),
                    'category': race_dict.get('category'),
                    'position': race_dict.get('position'),
                    'finishers': race_dict.get('finishers'),
                })
                
                print(f"📌 Race {idx}: Event {event_id} - {race_dict.get('name', 'N/A')}")
        
        result = {
            'rider_id': rider_id,
            'fetch_date': datetime.now().isoformat(),
            'total_races': len(races),
            'event_ids': event_ids,
            'races': event_data
        }
        
        print(f"\n✅ Stap 1 Compleet: {len(event_ids)} event IDs gevonden")
        return result
        
    except Exception as e:
        print(f"❌ Error fetching events: {e}")
        import traceback
        traceback.print_exc()
        return None


async def fetch_zwiftracing_results(event_ids: List[int]) -> Dict[int, Any]:
    """
    Stap 2: Haal race results op van ZwiftRacing.app per event
    
    Args:
        event_ids: List van Zwift event IDs
        
    Returns:
        Dictionary mapping event_id -> race results data
    """
    print("\n" + "=" * 70)
    print(f"📊 STAP 2: Fetching Race Results from ZwiftRacing.app")
    print(f"Events to fetch: {len(event_ids)}")
    print("=" * 70)
    
    results = {}
    
    try:
        async with AsyncZR_obj() as zr:
            for idx, event_id in enumerate(event_ids, 1):
                try:
                    print(f"\n[{idx}/{len(event_ids)}] Fetching event {event_id}...")
                    
                    result = ZRResult()
                    result.set_session(zr)
                    await result.afetch(event_id)
                    
                    # Parse results
                    if hasattr(result, 'results') and result.results:
                        rider_results = []
                        
                        for r in result.results:
                            rider_results.append({
                                'zwift_id': r.zwift_id,
                                'name': r.name,
                                'position': r.position,
                                'time': r.time,
                                'avg_power': getattr(r, 'avg_power', None),
                                'avg_wkg': getattr(r, 'avg_wkg', None),
                                'rating_before': r.rating_before,
                                'rating_after': r.rating_after,
                                'rating_change': r.rating_change,
                                'category': getattr(r, 'category', None),
                                'team': getattr(r, 'team', None),
                            })
                        
                        results[event_id] = {
                            'event_id': event_id,
                            'total_riders': len(rider_results),
                            'results': rider_results
                        }
                        
                        print(f"   ✅ Event {event_id}: {len(rider_results)} riders")
                    else:
                        print(f"   ⚠️  Event {event_id}: No results found")
                        
                    # Small delay to avoid rate limiting
                    await asyncio.sleep(0.5)
                        
                except Exception as e:
                    print(f"   ❌ Event {event_id} failed: {e}")
                    continue
                    
    except Exception as e:
        print(f"❌ ZwiftRacing fetch failed: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\n✅ Stap 2 Compleet: {len(results)} events met race results")
    return results


def integrate_to_database(event_data: Dict, race_results: Dict[int, Any]) -> bool:
    """
    Stap 3: Integreer data in database via backend API
    
    Args:
        event_data: Event data van ZPDataFetch
        race_results: Race results data van ZwiftRacing.app
        
    Returns:
        True if successful
    """
    print("\n" + "=" * 70)
    print("💾 STAP 3: Integreren data in database")
    print("=" * 70)
    
    if not race_results:
        print("❌ Geen race results om te integreren")
        return False
    
    headers = {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
    }
    
    success_count = 0
    error_count = 0
    
    for event_id, result_data in race_results.items():
        try:
            # Find matching event info from event_data
            event_info = None
            for race in event_data.get('races', []):
                if race['event_id'] == event_id:
                    event_info = race
                    break
            
            if not event_info:
                print(f"⚠️  Event {event_id}: No event info found, skipping")
                continue
            
            # Prepare payload for backend API
            payload = {
                'event_id': event_id,
                'event_name': event_info.get('name', f'Race {event_id}'),
                'event_date': event_info.get('date'),
                'results': result_data['results']
            }
            
            print(f"\n📤 Uploading event {event_id}: {event_info.get('name', 'N/A')}")
            print(f"   Riders: {len(result_data['results'])}")
            
            # Post to backend API
            response = requests.post(
                f"{BACKEND_API_URL}/api/race-results/batch",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                print(f"   ✅ Event {event_id} uploaded successfully")
                success_count += 1
            else:
                print(f"   ❌ Event {event_id} failed: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                error_count += 1
                
        except Exception as e:
            print(f"   ❌ Event {event_id} error: {e}")
            error_count += 1
            continue
    
    print("\n" + "=" * 70)
    print("📊 INTEGRATIE RESULTAAT")
    print("=" * 70)
    print(f"✅ Succesvol: {success_count} events")
    print(f"❌ Gefaald: {error_count} events")
    print(f"📊 Totaal: {success_count + error_count} events")
    
    return success_count > 0


async def run_full_pipeline(rider_id: int = RIDER_ID, days: int = DAYS_BACK):
    """
    Run volledige pipeline voor race results dashboard
    """
    print("\n" + "=" * 70)
    print("🚀 RACE RESULTS DASHBOARD PIPELINE")
    print("=" * 70)
    print(f"Rider ID: {rider_id}")
    print(f"Periode: Laatste {days} dagen")
    print(f"Datum: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Setup credentials
    setup_credentials()
    
    # Stap 1: Haal events op
    event_data = await fetch_rider_events(rider_id, days)
    
    if not event_data or not event_data.get('event_ids'):
        print("\n❌ PIPELINE FAILED: Geen events gevonden")
        return False
    
    # Save event data
    events_file = f"rider-{rider_id}-events-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(events_file, 'w') as f:
        json.dump(event_data, f, indent=2)
    print(f"💾 Events saved to: {events_file}")
    
    # Stap 2: Haal race results op
    race_results = await fetch_zwiftracing_results(event_data['event_ids'])
    
    if not race_results:
        print("\n❌ PIPELINE FAILED: Geen race results gevonden")
        return False
    
    # Save race results
    results_file = f"rider-{rider_id}-results-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(race_results, f, indent=2)
    print(f"💾 Race results saved to: {results_file}")
    
    # Stap 3: Integreer in database
    success = integrate_to_database(event_data, race_results)
    
    if success:
        print("\n" + "=" * 70)
        print("✅ PIPELINE SUCCESS!")
        print("=" * 70)
        print(f"Events fetched: {len(event_data['event_ids'])}")
        print(f"Race results fetched: {len(race_results)}")
        print(f"Data integrated in database")
        print(f"\n🌐 Dashboard beschikbaar op:")
        print(f"{BACKEND_API_URL}/results")
        print("=" * 70)
        return True
    else:
        print("\n❌ PIPELINE FAILED: Database integratie mislukt")
        return False


async def main():
    """Main entry point"""
    try:
        success = await run_full_pipeline()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Pipeline interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
