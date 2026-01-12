#!/usr/bin/env python3
"""
Race Results Sync met ZRDataFetch
Haalt race results op via ZwiftRacing.app met correcte authenticatie
"""

import asyncio
import os
from datetime import datetime
from supabase import create_client, Client
from zrdatafetch import ZRResult, AsyncZR_obj
import keyring

# Supabase setup
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL of SUPABASE_SERVICE_KEY niet gevonden in environment")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

RIDER_ID = 150437
ZWIFTRACING_API_TOKEN = "650c6d2fc4ef6858d74cbef1"

# Bekende recente event IDs voor rider 150437
RECENT_EVENT_IDS = [
    5331604,  # Zwift Racing League: Redline Rally
    5325879,
    5320154,
    5314429,
    5308704,
    5308652,  # Club Ladder
    5302979,
    5297254,
    5291529,
    5290955,
]

def setup_credentials():
    """Setup ZwiftRacing credentials"""
    try:
        keyring.set_password("zrdatafetch", "authorization", ZWIFTRACING_API_TOKEN)
        print("✅ ZwiftRacing credentials configured")
    except Exception as e:
        print(f"⚠️  Warning: {e}")

async def fetch_event_results(event_id: int, zr_session):
    """Haal results op voor een enkel event"""
    try:
        result = ZRResult()
        result.set_session(zr_session)
        await result.afetch(event_id)
        
        # Parse event data
        event_data = {
            'id': event_id,
            'name': getattr(result, 'name', None),
            'eventStart': getattr(result, 'event_start', None),
            'mapName': getattr(result, 'map_name', None),
            'routeName': getattr(result, 'route_name', None),
            'distanceInMeters': getattr(result, 'distance', None),
            'results': []
        }
        
        # Parse rider results
        if hasattr(result, 'results') and result.results:
            for r in result.results:
                rider_result = {
                    'zwiftId': r.zwift_id,
                    'position': r.position,
                    'category': getattr(r, 'category', None),
                    'categoryPosition': getattr(r, 'category_position', None),
                    'avgWatts': getattr(r, 'avg_power', None),
                    'avgWkg': getattr(r, 'avg_wkg', None),
                    'timeInSeconds': r.time if hasattr(r, 'time') else None,
                    'teamName': getattr(r, 'team', None),
                    'raceScores': {
                        'veloBefore': r.rating_before if hasattr(r, 'rating_before') else None,
                        'veloAfter': r.rating_after if hasattr(r, 'rating_after') else None,
                    }
                }
                event_data['results'].append(rider_result)
        
        return event_data
        
    except Exception as e:
        print(f"  ❌ Fout: {e}")
        return None

def upsert_race_event(event_data):
    """Voeg race event toe aan database"""
    try:
        event_record = {
            'event_id': event_data.get('id'),
            'event_name': event_data.get('name', ''),
            'event_date': event_data.get('eventStart'),
            'world': event_data.get('mapName'),
            'route': event_data.get('routeName'),
            'distance_km': event_data.get('distanceInMeters', 0) / 1000 if event_data.get('distanceInMeters') else None,
            'total_participants': len(event_data.get('results', [])),
            'source': 'zwiftracing'
        }
        
        supabase.table('race_events').upsert(event_record).execute()
        return True
        
    except Exception as e:
        print(f"  ❌ Fout bij upsert event: {e}")
        return False

def upsert_race_results(event_id, results_data):
    """Voeg race results toe aan database"""
    try:
        results = results_data.get('results', [])
        if not results:
            return 0
        
        records = []
        for result in results:
            # Haal velo scores op
            velo_before = None
            velo_after = None
            velo_change = None
            
            if 'raceScores' in result and result['raceScores']:
                scores = result['raceScores']
                velo_before = scores.get('veloBefore')
                velo_after = scores.get('veloAfter')
                if velo_before and velo_after:
                    velo_change = velo_after - velo_before
            
            record = {
                'event_id': event_id,
                'rider_id': result.get('zwiftId'),
                'position': result.get('position'),
                'category': result.get('category'),
                'category_position': result.get('categoryPosition'),
                'avg_power': result.get('avgWatts'),
                'avg_wkg': result.get('avgWkg'),
                'time_seconds': result.get('timeInSeconds'),
                'velo_before': velo_before,
                'velo_after': velo_after,
                'velo_change': velo_change,
                'team_name': result.get('teamName'),
                'source': 'zwiftracing'
            }
            records.append(record)
        
        # Batch upsert
        if records:
            supabase.table('race_results').upsert(records).execute()
            return len(records)
        
        return 0
        
    except Exception as e:
        print(f"  ❌ Fout bij upsert results: {e}")
        return 0

async def main():
    print("=" * 80)
    print("🚀 RACE RESULTS SYNC - ZRDATAFETCH")
    print("=" * 80)
    print(f"📌 Rider ID: {RIDER_ID}")
    print(f"📌 Events to sync: {len(RECENT_EVENT_IDS)}")
    
    # Setup credentials
    setup_credentials()
    
    total_events = 0
    total_results = 0
    skipped_events = 0
    
    try:
        async with AsyncZR_obj() as zr:
            for i, event_id in enumerate(RECENT_EVENT_IDS, 1):
                print(f"\n[{i}/{len(RECENT_EVENT_IDS)}] Event {event_id}:")
                
                # Haal ZwiftRacing data op
                event_data = await fetch_event_results(event_id, zr)
                
                if not event_data or not event_data.get('results'):
                    print(f"  ⚠️  Geen data beschikbaar, skip")
                    skipped_events += 1
                    continue
                
                print(f"  ✅ Data opgehaald: {event_data.get('name', 'N/A')}")
                
                # Voeg event toe
                if upsert_race_event(event_data):
                    total_events += 1
                    print(f"  ✅ Event toegevoegd")
                
                # Voeg results toe
                num_results = upsert_race_results(event_id, event_data)
                if num_results > 0:
                    total_results += num_results
                    print(f"  ✅ {num_results} results toegevoegd")
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.5)
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    # Samenvatting
    print("\n" + "=" * 80)
    print("📊 SYNC VOLTOOID")
    print("=" * 80)
    print(f"✅ Events verwerkt: {total_events}")
    print(f"✅ Results toegevoegd: {total_results}")
    print(f"⚠️  Events overgeslagen: {skipped_events}")
    
    # Controleer rider 150437 data
    print(f"\n🔍 Controle rider {RIDER_ID} in database...")
    try:
        result = supabase.table('race_results')\
            .select('event_id, position, category, avg_power, avg_wkg, velo_change')\
            .eq('rider_id', RIDER_ID)\
            .order('event_id', desc=True)\
            .limit(10)\
            .execute()
        
        if result.data:
            print(f"✅ Rider {RIDER_ID} heeft {len(result.data)} results (laatste 10 getoond):")
            for r in result.data:
                velo_str = f" | vELO: {r['velo_change']:+.0f}" if r.get('velo_change') else ""
                print(f"   Event {r['event_id']}: P{r['position']} | Cat {r['category']} | {r['avg_power']}W | {r['avg_wkg']}w/kg{velo_str}")
        else:
            print(f"⚠️  Geen data gevonden voor rider {RIDER_ID}")
        
    except Exception as e:
        print(f"❌ Fout bij controle: {e}")

if __name__ == '__main__':
    asyncio.run(main())
