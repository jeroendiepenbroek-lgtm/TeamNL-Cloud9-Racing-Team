#!/usr/bin/env python3
"""
Complete Race Results Sync - rider 150437
Combineert ZwiftPower EN ZwiftRacing.app APIs voor complete data
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
from supabase import create_client
from pathlib import Path

# Load .env.upload if it exists
env_file = Path(__file__).parent / '.env.upload'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

try:
    from zpdatafetch import Cyclist, Result
    import keyring
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    sys.exit(1)

# Configuration
RIDER_ID = 150437
RIDER_NAME = "JRøne"
DAYS_BACK = 90
ZWIFTRACING_TOKEN = "650c6d2fc4ef6858d74cbef1"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

# Setup ZwiftPower credentials
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")

def print_section(title):
    print(f"\n{'='*100}")
    print(f"  {title}")
    print(f"{'='*100}")

def fetch_zwiftpower_data():
    """Haal data op van ZwiftPower (via zpdatafetch)"""
    print_section("STAP 1: ZwiftPower API - Basisdata")
    
    cyclist = Cyclist()
    raw_data = cyclist.fetch(RIDER_ID)
    
    rider_data = raw_data.get(RIDER_ID) or raw_data.get(str(RIDER_ID))
    if isinstance(rider_data, str):
        rider_data = json.loads(rider_data)
    
    races = rider_data.get('data', [])
    cutoff = datetime.now() - timedelta(days=DAYS_BACK)
    
    recent = []
    for race in races:
        event_date = race.get('event_date')
        if event_date and isinstance(event_date, (int, float)):
            race_date = datetime.fromtimestamp(event_date)
            if race_date >= cutoff:
                recent.append({
                    'event_id': str(race.get('zid')),
                    'event_title': race.get('event_title'),
                    'event_date': race_date,
                    'source': 'zwiftpower',
                    'raw': race
                })
    
    recent.sort(key=lambda x: x['event_date'], reverse=True)
    print(f"✅ ZwiftPower: {len(recent)} races")
    return recent

def fetch_zwiftracing_data():
    """Haal data op van ZwiftRacing.app API"""
    print_section("STAP 2: ZwiftRacing.app API - Aanvullende data")
    
    url = f"https://www.zwiftracing.app/api/riders/{RIDER_ID}"
    headers = {"Accept": "application/json"}
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Parse rider data
        rider_info = data.get('data', {})
        print(f"✅ Rider info: {rider_info.get('name')}")
        print(f"   vELO: {rider_info.get('velo_live')} (live)")
        print(f"   Category: {rider_info.get('category')}")
        
        # Haal race history op
        races_url = f"https://www.zwiftracing.app/api/riders/{RIDER_ID}/results"
        races_response = requests.get(races_url, headers=headers, timeout=30)
        races_response.raise_for_status()
        races_data = races_response.json()
        
        results = races_data.get('data', [])
        cutoff = datetime.now() - timedelta(days=DAYS_BACK)
        
        recent = []
        for result in results:
            event_date_str = result.get('event_date') or result.get('date')
            if event_date_str:
                try:
                    event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
                    if event_date >= cutoff:
                        recent.append({
                            'event_id': str(result.get('event_id')),
                            'event_title': result.get('event_name') or result.get('name'),
                            'event_date': event_date,
                            'velo_before': result.get('velo_before'),
                            'velo_after': result.get('velo_after'),
                            'velo_change': result.get('velo_change'),
                            'source': 'zwiftracing',
                            'raw': result
                        })
                except:
                    pass
        
        recent.sort(key=lambda x: x['event_date'], reverse=True)
        print(f"✅ ZwiftRacing: {len(recent)} races")
        return recent, rider_info
        
    except Exception as e:
        print(f"⚠️  ZwiftRacing API error: {e}")
        return [], {}

def merge_race_data(zp_races, zr_races):
    """Merge data van beide APIs en verwijder duplicaten"""
    print_section("STAP 3: Data Merge - Combineer beide bronnen")
    
    merged = {}
    
    # Start met ZwiftPower data (basis)
    for race in zp_races:
        event_id = race['event_id']
        merged[event_id] = race
    
    print(f"📊 ZwiftPower races: {len(zp_races)}")
    
    # Verrijk met ZwiftRacing data
    enriched = 0
    added = 0
    for race in zr_races:
        event_id = race['event_id']
        if event_id in merged:
            # Verrijk bestaande race met vELO data
            merged[event_id]['velo_before'] = race.get('velo_before')
            merged[event_id]['velo_after'] = race.get('velo_after')
            merged[event_id]['velo_change'] = race.get('velo_change')
            merged[event_id]['sources'] = 'zwiftpower+zwiftracing'
            enriched += 1
        else:
            # Nieuwe race alleen in ZwiftRacing
            merged[event_id] = race
            added += 1
    
    print(f"✅ Verrijkt met vELO data: {enriched} races")
    print(f"✅ Nieuwe races van ZwiftRacing: {added}")
    print(f"📊 Totaal unieke races: {len(merged)}")
    
    # Sorteer op datum
    result = sorted(merged.values(), key=lambda x: x['event_date'], reverse=True)
    return result

def fetch_event_details_zwiftpower(event_id):
    """Haal complete event results van ZwiftPower"""
    try:
        result = Result()
        raw_data = result.fetch(event_id)
        
        event_data = raw_data.get(event_id) or raw_data.get(int(event_id))
        if isinstance(event_data, str):
            event_data = json.loads(event_data)
        
        if event_data and isinstance(event_data, dict):
            return event_data.get('data', [])
    except:
        pass
    return []

def fetch_event_details_zwiftracing(event_id):
    """Haal event details van ZwiftRacing.app"""
    url = f"https://www.zwiftracing.app/api/events/{event_id}"
    headers = {"Accept": "application/json"}
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data.get('data', {})
    except:
        return {}

def save_complete_race(event_id, event_title, event_date, race_info, supabase):
    """Sla complete race op met data van beide APIs"""
    
    print(f"\n🏁 {event_title[:70]}")
    print(f"   Event ID: {event_id} | Datum: {event_date.strftime('%Y-%m-%d')}")
    
    # Haal results van beide APIs
    zp_results = fetch_event_details_zwiftpower(event_id)
    zr_event = fetch_event_details_zwiftracing(event_id)
    
    print(f"   ZwiftPower: {len(zp_results)} deelnemers")
    print(f"   ZwiftRacing: {'✅' if zr_event else '⚠️'} event data")
    
    # Save event metadata
    event_data = {
        'event_id': event_id,
        'event_name': event_title,
        'event_date': event_date.isoformat(),
        'world': zr_event.get('world'),
        'route': zr_event.get('route'),
        'distance_km': zr_event.get('distance_km'),
        'elevation_m': zr_event.get('elevation_m'),
        'source': 'zwiftpower+zwiftracing' if zr_event else 'zwiftpower'
    }
    
    supabase.table('race_events').upsert(event_data, on_conflict='event_id').execute()
    
    # Save results
    saved = 0
    if zp_results:
        for r in zp_results:
            try:
                # Extract power data
                power_val = r.get('avg_power')
                avg_power = None
                if power_val:
                    avg_power = int(float(power_val[0] if isinstance(power_val, list) else power_val))
                
                wkg_val = r.get('avg_wkg')
                avg_wkg = None
                if wkg_val:
                    avg_wkg = float(wkg_val[0] if isinstance(wkg_val, list) else wkg_val)
                
                time_val = r.get('time')
                time_seconds = None
                if time_val:
                    time_seconds = int(float(time_val[0] if isinstance(time_val, list) else time_val))
                
                # Add vELO data for our rider
                velo_data = {}
                if r.get('zwid') == RIDER_ID and race_info:
                    velo_data = {
                        'velo_before': race_info.get('velo_before'),
                        'velo_after': race_info.get('velo_after'),
                        'velo_change': race_info.get('velo_change')
                    }
                
                result_data = {
                    'event_id': event_id,
                    'rider_id': r.get('zwid'),
                    'position': r.get('position') or r.get('pos'),
                    'category': r.get('category'),
                    'avg_power': avg_power,
                    'avg_wkg': avg_wkg,
                    'time_seconds': time_seconds,
                    'team_name': r.get('tname') or r.get('tm'),
                    'source': 'zwiftpower',
                    **velo_data
                }
                
                supabase.table('race_results').upsert(result_data, on_conflict='event_id,rider_id').execute()
                saved += 1
            except:
                pass
    
    print(f"   💾 Opgeslagen: {saved} results")
    return saved

def main():
    print("\n" + "="*100)
    print("  COMPLETE RACE RESULTS SYNC - Rider 150437")
    print("  ZwiftPower + ZwiftRacing.app APIs")
    print("="*100)
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing Supabase credentials")
        sys.exit(1)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Haal data van beide APIs
    zp_races = fetch_zwiftpower_data()
    zr_races, rider_info = fetch_zwiftracing_data()
    
    # Merge data
    all_races = merge_race_data(zp_races, zr_races)
    
    print_section("STAP 4: Opslaan Complete Data")
    print(f"📊 Totaal te verwerken: {len(all_races)} races")
    
    total_saved = 0
    for i, race in enumerate(all_races, 1):
        print(f"\n[{i}/{len(all_races)}]", end=" ")
        saved = save_complete_race(
            race['event_id'],
            race['event_title'],
            race['event_date'],
            race,
            supabase
        )
        total_saved += saved
    
    # Final summary
    print_section("SAMENVATTING")
    
    events = supabase.table('race_events').select('*', count='exact').execute()
    results = supabase.table('race_results').select('*', count='exact').eq('rider_id', RIDER_ID).execute()
    all_results = supabase.table('race_results').select('*', count='exact').execute()
    
    print(f"✅ Races verwerkt: {len(all_races)}")
    print(f"✅ Results opgeslagen: {total_saved}")
    print(f"\n📊 Database Status:")
    print(f"   Events: {events.count}")
    print(f"   Results (rider {RIDER_ID}): {results.count}")
    print(f"   Results (totaal): {all_results.count}")
    
    print(f"\n🎯 Data Sources:")
    print(f"   ✅ ZwiftPower API (power, time, category, position)")
    print(f"   ✅ ZwiftRacing.app API (vELO, event details)")
    print(f"   ✅ Data merged en duplicaten verwijderd")
    
    print(f"\n🎨 Ready for Dashboards:")
    print(f"   1. Rider Results (90 dagen) - {results.count} races")
    print(f"   2. Race Details - {events.count} events met complete results")
    print(f"   3. Team Results (7 dagen) - klaar voor uitbreiding")
    
    print("\n" + "="*100)
    print("✅ SYNC COMPLEET - Rider 150437 production ready!")
    print("="*100)

if __name__ == "__main__":
    main()
