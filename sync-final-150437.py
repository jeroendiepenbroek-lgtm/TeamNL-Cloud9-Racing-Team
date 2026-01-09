#!/usr/bin/env python3
"""
FINALE SYNC - Rider 150437
ZwiftPower + ZwiftRacing.app APIs gecombineerd
"""
import os
import sys
import requests
from datetime import datetime, timedelta
from supabase import create_client
from pathlib import Path

# Load credentials
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
    print(f"❌ {e}")
    sys.exit(1)

RIDER_ID = 150437
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
ZWIFTRACING_API = "https://www.zwiftracing.app/api"

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing credentials")
    sys.exit(1)

# Setup
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("="*80)
print("FINAL SYNC - RIDER 150437")
print("="*80)

# STAP 1: Haal alle races op
print("\n📡 Fetching races from ZwiftPower...")
cyclist = Cyclist()
raw_data = cyclist.fetch(RIDER_ID)
rider_data = raw_data.get(RIDER_ID) or raw_data.get(str(RIDER_ID))
if isinstance(rider_data, str):
    import json
    rider_data = json.loads(rider_data)

all_races = rider_data.get('data', [])
cutoff = datetime.now() - timedelta(days=90)
recent = []

for race in all_races:
    event_date = race.get('event_date')
    if event_date and isinstance(event_date, (int, float)):
        race_date = datetime.fromtimestamp(event_date)
        if race_date >= cutoff:
            recent.append({
                'event_id': str(race.get('zid')),
                'event_date': race_date,
                'event_title': race.get('event_title'),
                'raw': race
            })

recent.sort(key=lambda x: x['event_date'], reverse=True)
print(f"✅ ZwiftPower: {len(recent)} races")

# STAP 2: Haal ZwiftRacing.app data op
print(f"\n📡 Fetching from ZwiftRacing.app...")
try:
    url = f"{ZWIFTRACING_API}/riders/{RIDER_ID}"
    response = requests.get(url, headers={"Accept": "application/json"}, timeout=10)
    
    if response.status_code == 200:
        zr_data = response.json()
        rider_info = zr_data.get(str(RIDER_ID), {})
        zr_results = rider_info.get('data', [])
        
        # Voeg ZwiftRacing results toe die niet in ZwiftPower zitten
        zp_event_ids = {r['event_id'] for r in recent}
        added = 0
        
        for zr_race in zr_results:
            event_id = str(zr_race.get('event_id'))
            event_date_val = zr_race.get('event_date')
            
            if event_date_val:
                if isinstance(event_date_val, str):
                    race_date = datetime.fromisoformat(event_date_val.replace('Z', '+00:00'))
                else:
                    race_date = datetime.fromtimestamp(event_date_val)
                
                if race_date >= cutoff and event_id not in zp_event_ids:
                    recent.append({
                        'event_id': event_id,
                        'event_date': race_date,
                        'event_title': zr_race.get('event_name', 'Unknown'),
                        'raw': zr_race,
                        'source': 'zwiftracing'
                    })
                    added += 1
        
        print(f"✅ ZwiftRacing.app: {added} extra races toegevoegd")
    else:
        print(f"⚠️  ZwiftRacing.app niet beschikbaar")
        
except Exception as e:
    print(f"⚠️  ZwiftRacing.app error: {e}")

recent.sort(key=lambda x: x['event_date'], reverse=True)
print(f"\n📊 Totaal: {len(recent)} races")

# STAP 3: Sync elke race
print(f"\n📊 Syncing {len(recent)} races...")
total_saved = 0

for i, race in enumerate(recent, 1):
    event_id = race['event_id']
    print(f"\n[{i}/{len(recent)}] Event {event_id} - {race['event_title'][:50]}")
    
    # Save event
    event_data = {
        'event_id': event_id,
        'event_name': race['event_title'],
        'event_date': race['event_date'].isoformat(),
        'event_type': race['raw'].get('event_type', 'race'),
        'categories': [],
        'source': 'zwiftpower'
    }
    
    try:
        supabase.table('race_events').upsert(event_data, on_conflict='event_id').execute()
        print(f"   ✅ Event saved")
    except Exception as e:
        print(f"   ⚠️  Event error: {e}")
    
    # Fetch results
    try:
        result = Result()
        result_data = result.fetch(int(event_id))
        
        # Parse results
        event_results = result_data.get(int(event_id)) or result_data.get(event_id)
        if isinstance(event_results, str):
            import json
            event_results = json.loads(event_results)
        
        if not event_results or not event_results.get('data'):
            # Probeer ZwiftRacing.app als ZwiftPower geen results heeft
            print(f"   ⚠️  No ZwiftPower results, trying ZwiftRacing.app...")
            try:
                zr_url = f"{ZWIFTRACING_API}/events/{event_id}/results"
                zr_response = requests.get(zr_url, timeout=10)
                if zr_response.status_code == 200:
                    zr_results = zr_response.json()
                    results = zr_results.get('results', [])
                    print(f"   📋 {len(results)} participants (ZwiftRacing.app)")
                    
                    # Save ZwiftRacing results
                    saved = 0
                    for r in results:
                        try:
                            result_row = {
                                'event_id': event_id,
                                'rider_id': int(r.get('rider_id')),
                                'position': int(r.get('position', 0)),
                                'category': r.get('category', 'Unknown'),
                                'category_position': int(r.get('category_position', 0)),
                                'avg_power': int(r.get('power')) if r.get('power') else None,
                                'avg_wkg': float(r.get('wkg')) if r.get('wkg') else None,
                                'time_seconds': int(r.get('time_seconds')) if r.get('time_seconds') else None,
                                'velo_before': int(r.get('velo_before')) if r.get('velo_before') else None,
                                'velo_after': int(r.get('velo_after')) if r.get('velo_after') else None,
                                'velo_change': int(r.get('velo_change')) if r.get('velo_change') else None,
                                'team_name': r.get('team', None),
                                'source': 'zwiftracing'
                            }
                            
                            supabase.table('race_results').upsert(result_row, on_conflict='event_id,rider_id').execute()
                            saved += 1
                            
                        except Exception as e:
                            continue
                    
                    print(f"   💾 Saved {saved} results")
                    total_saved += saved
                    continue
                    
            except Exception as e:
                print(f"   ⚠️  ZwiftRacing.app error: {e}")
                continue
            
        results = event_results.get('data', [])
        print(f"   📋 {len(results)} participants")
        
        # Save each result
        saved = 0
        for r in results:
            try:
                # Extract values from arrays
                avg_power = r.get('avg_power')
                if isinstance(avg_power, list):
                    avg_power = avg_power[0] if avg_power else None
                    
                avg_wkg = r.get('avg_wkg')
                if isinstance(avg_wkg, list):
                    avg_wkg = avg_wkg[0] if avg_wkg else None
                    
                time_val = r.get('time')
                if isinstance(time_val, list):
                    time_val = time_val[0] if time_val else None
                
                # Convert to proper types
                if avg_power:
                    avg_power = int(float(str(avg_power)))
                if avg_wkg:
                    avg_wkg = float(str(avg_wkg))
                if time_val:
                    time_val = int(float(str(time_val)))
                
                result_row = {
                    'event_id': event_id,
                    'rider_id': int(r.get('zwid')),
                    'position': int(r.get('position', 0)),
                    'category': r.get('category', 'Unknown'),
                    'category_position': int(r.get('pos', 0)),
                    'avg_power': avg_power,
                    'avg_wkg': avg_wkg,
                    'time_seconds': time_val,
                    'team_name': r.get('team', None),
                    'dnf': bool(r.get('did_not_finish', False)),
                    'dq': bool(r.get('disqualified', False)),
                    'source': 'zwiftpower'
                }
                
                supabase.table('race_results').upsert(result_row, on_conflict='event_id,rider_id').execute()
                saved += 1
                
            except Exception as e:
                continue
        
        print(f"   💾 Saved {saved} results")
        total_saved += saved
        
    except Exception as e:
        print(f"   ⚠️  Results error: {e}")

# SUMMARY
print("\n" + "="*80)
print("SYNC COMPLETE")
print("="*80)
print(f"✅ Races synced: {len(recent)}")
print(f"✅ Results saved: {total_saved}")

# Verify
results_150437 = supabase.table('race_results').select('*', count='exact').eq('rider_id', RIDER_ID).execute()
all_results = supabase.table('race_results').select('*', count='exact').execute()
events = supabase.table('race_events').select('*', count='exact').execute()

print(f"\n📊 DATABASE STATUS:")
print(f"   Events: {events.count}")
print(f"   Results (rider {RIDER_ID}): {results_150437.count}")
print(f"   Results (total): {all_results.count}")
print("\n✅ READY FOR DASHBOARDS!")
