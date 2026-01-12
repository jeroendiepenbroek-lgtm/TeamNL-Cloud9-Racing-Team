#!/usr/bin/env python3
"""
Fetch Event IDs voor Rider 150437 via ZPDataFetch
"""

import asyncio
import json
from datetime import datetime
from zpdatafetch import Cyclist, setup_logging
import keyring

# Setup logging
setup_logging(console_level='INFO')

# Configuration
RIDER_ID = 150437
RIDER_NAME = "JRøne | CloudRacer-9"

# Credentials
ZWIFTPOWER_USERNAME = "jeroen.diepenbroek@gmail.com"
ZWIFTPOWER_PASSWORD = "CloudRacer-9"


async def fetch_rider_events():
    """Haal event IDs op voor rider 150437"""
    
    print("="*70)
    print(f"🔍 Fetching Events for Rider {RIDER_ID}")
    print("="*70)
    
    # Setup credentials
    print("\n🔑 Setting up ZwiftPower credentials...")
    try:
        keyring.set_password("zpdatafetch", "username", ZWIFTPOWER_USERNAME)
        keyring.set_password("zpdatafetch", "password", ZWIFTPOWER_PASSWORD)
        print("✅ Credentials configured")
    except Exception as e:
        print(f"⚠️  Warning: {e}")
    
    # Fetch cyclist data
    print(f"\n📥 Fetching cyclist data for Rider {RIDER_ID}...")
    
    try:
        cyclist = Cyclist()
        await cyclist.afetch(RIDER_ID)
        
        # Check what data we have
        cyclist_data = cyclist.asdict()
        print(f"✅ Cyclist data fetched")
        print(f"\n📋 Available data keys: {list(cyclist_data.keys())}")
        
        # Try to get races
        print(f"\n🏁 Fetching race history (last 60 days)...")
        races = await cyclist.araces(days=60)
        
        print(f"✅ Found {len(races)} races\n")
        
        # Extract event IDs and details
        event_data = []
        for idx, race in enumerate(races, 1):
            race_dict = race.asdict()
            event_id = race_dict.get('id') or race_dict.get('event_id')
            
            print(f"📌 Race {idx}:")
            print(f"   Event ID: {event_id}")
            print(f"   Name: {race_dict.get('name', 'N/A')}")
            print(f"   Date: {race_dict.get('date', 'N/A')}")
            print(f"   Category: {race_dict.get('category', 'N/A')}")
            print(f"   Position: {race_dict.get('position', 'N/A')}/{race_dict.get('finishers', 'N/A')}")
            print(f"   Avg Power: {race_dict.get('avg_power', 'N/A')}W")
            print()
            
            event_data.append({
                'event_id': event_id,
                'name': race_dict.get('name'),
                'date': str(race_dict.get('date')),
                'category': race_dict.get('category'),
                'position': race_dict.get('position'),
                'finishers': race_dict.get('finishers'),
                'avg_power': race_dict.get('avg_power'),
                'avg_hr': race_dict.get('avg_hr'),
                'time': race_dict.get('time'),
            })
        
        # Save to file
        output = {
            'rider_id': RIDER_ID,
            'rider_name': RIDER_NAME,
            'fetch_date': datetime.now().isoformat(),
            'total_races': len(races),
            'event_ids': [e['event_id'] for e in event_data],
            'races': event_data
        }
        
        filename = f"rider-{RIDER_ID}-events-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2, default=str)
        
        print("="*70)
        print(f"📊 SUMMARY")
        print("="*70)
        print(f"Rider ID: {RIDER_ID}")
        print(f"Total Races Found: {len(races)}")
        print(f"Event IDs: {output['event_ids'][:10]}{'...' if len(output['event_ids']) > 10 else ''}")
        print(f"\n💾 Data saved to: {filename}")
        print("="*70)
        
        return output
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    result = asyncio.run(fetch_rider_events())
    
    if result:
        print(f"\n✅ SUCCESS: Found {result['total_races']} races with Event IDs")
    else:
        print(f"\n❌ FAILED: Could not fetch event data")
