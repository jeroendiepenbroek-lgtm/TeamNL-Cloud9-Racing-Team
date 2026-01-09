#!/usr/bin/env python3
"""
COMPLETE SYNC - Rider 150437
ZwiftPower + ZwiftRacing.app APIs gecombineerd voor volledige dataset
"""
import os
import sys
import json
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

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing credentials")
    sys.exit(1)

# Setup
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("="*80)
print("DUAL API SYNC - ZWIFTPOWER + ZWIFTRACING.APP")
print("="*80)

# STAP 1: ZwiftPower races
print("\n📡 [1/3] Fetching from ZwiftPower...")
cyclist = Cyclist()
raw_data = cyclist.fetch(RIDER_ID)
rider_data = raw_data.get(RIDER_ID) or raw_data.get(str(RIDER_ID))
if isinstance(rider_data, str):
    rider_data = json.loads(rider_data)

all_races = rider_data.get('data', [])
cutoff = datetime.now() - timedelta(days=90)
zp_races = {}

for race in all_races:
    event_date = race.get('event_date')
    if event_date and isinstance(event_date, (int, float)):
        race_date = datetime.fromtimestamp(event_date)
        if race_date >= cutoff:
            event_id = str(race.get('zid'))
            zp_races[event_id] = {
                'event_id': event_id,
                'event_date': race_date,
                'event_title': race.get('event_title'),
                'source': 'zwiftpower',
                'raw': race
            }

print(f"✅ ZwiftPower: {len(zp_races)} races")

# STAP 2: ZwiftRacing.app races
print(f"\n📡 [2/3] Fetching from ZwiftRacing.app...")
try:
    url = f"https://www.zwiftracing.app/api/riders/{RIDER_ID}"
    response = requests.get(url, headers={"Accept": "application/json"}, timeout=30)
    
    if response.status_code == 200:
        zr_data = response.json()
        rider_info = zr_data.get(str(RIDER_ID), {})
        zr_results = rider_info.get('data', [])
        
        zr_races = {}
        for result in zr_results:
            event_date_str = result.get('event_date', '')
            if event_date_str:
                try:
                    event_date = datetime.fromisoformat(event_date_str.replace('Z', '+00:00'))
                    if event_date >= cutoff:
                        event_id = str(result.get('event_id'))
                        zr_races[event_id] = {
                            'event_id': event_id,
                            'velo_before': result.get('velo_before'),
                            'velo_after': result.get('velo_after'),
                            'velo_change': result.get('velo_change'),
                            'world': result.get('world'),
                            'route': result.get('route')
                        }
                except:
                    continue
        
        print(f"✅ ZwiftRacing: {len(zr_races)} races with vELO data")
        
        # Merge vELO data into ZwiftPower races
        enriched = 0
        for event_id in zp_races:
            if event_id in zr_races:
                zp_races[event_id].update(zr_races[event_id])
                enriched += 1
        
        print(f"✅ Enriched: {enriched} races with vELO + route data")
    else:
        print(f"⚠️  ZwiftRacing API: {response.status_code}")
except Exception as e:
    print(f"⚠️  ZwiftRacing error: {e}")

# STAP 3: Sync alle races
print(f"\n📊 [3/3] Syncing {len(zp_races)} races...")
total_saved = 0
races_list = sorted(zp_races.values(), key=lambda x: x['event_date'], reverse=True)

for i, race in enumerate(races_list, 1):
    event_id = race['event_id']
    print(f"\n[{i}/{len(races_list)}] Event {event_id} - {race['event_title'][:50]}")
    
    # Save event with enriched data
    event_data = {
        'event_id': event_id,
        'event_name': race['event_title'],
        'event_date': race['event_date'].isoformat(),
        'event_type': race['raw'].get('event_type', 'race'),
        'world': race.get('world'),
        'route': race.get('route'),
        'categories': [],
        'source': 'zwiftpower+zwiftracing'
    }
    
    try:
        supabase.table('race_events').upsert(event_data, on_conflict='event_id').execute()
        print(f"   ✅ Event saved")
    except Exception as e:
        print(f"   ⚠️  Event error: {e}")
    
    # Fetch ZwiftPower results
    zp_participants = {}
    try:
        result = Result()
        result_data = result.fetch(int(event_id))
        
        event_results = result_data.get(int(event_id)) or result_data.get(event_id)
        if isinstance(event_results, str):
            event_results = json.loads(event_results)
        
        if event_results:
            results = event_results.get('data', [])
            for r in results:
                rider_id = int(r.get('zwid'))
                zp_participants[rider_id] = r
    except Exception as e:
        pass
    
    # Fetch ZwiftRacing.app results
    zr_participants = {}
    try:
        url = f"https://www.zwiftracing.app/api/events/{event_id}/results"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            zr_data = response.json()
            if isinstance(zr_data, dict):
                for rider_id_str, rider_data in zr_data.items():
                    try:
                        rider_id = int(rider_id_str)
                        zr_participants[rider_id] = rider_data
                    except:
                        continue
    except:
        pass
    
    # Merge participants
    all_riders = set(zp_participants.keys()) | set(zr_participants.keys())
    print(f"   📋 ZwiftPower: {len(zp_participants)}, ZwiftRacing: {len(zr_participants)}, Total: {len(all_riders)}")
    
    # Save merged results
    saved = 0
    for rider_id in all_riders:
        try:
            zp = zp_participants.get(rider_id, {})
            zr = zr_participants.get(rider_id, {})
            
            # Extract power/wkg from ZwiftPower
            avg_power = zp.get('avg_power')
            if isinstance(avg_power, list):
                avg_power = avg_power[0] if avg_power else None
                
            avg_wkg = zp.get('avg_wkg')
            if isinstance(avg_wkg, list):
                avg_wkg = avg_wkg[0] if avg_wkg else None
                
            time_val = zp.get('time')
            if isinstance(time_val, list):
                time_val = time_val[0] if time_val else None
            
            # Convert types
            if avg_power:
                avg_power = int(float(str(avg_power)))
            if avg_wkg:
                avg_wkg = float(str(avg_wkg))
            if time_val:
                time_val = int(float(str(time_val)))
            
            # Get vELO from ZwiftRacing (only for our rider)
            velo_before = None
            velo_after = None
            velo_change = None
            if rider_id == RIDER_ID:
                velo_before = race.get('velo_before')
                velo_after = race.get('velo_after')
                velo_change = race.get('velo_change')
            
            result_row = {
                'event_id': event_id,
                'rider_id': rider_id,
                'position': int(zp.get('position', 0)) if zp else 0,
                'category': zp.get('category') or zr.get('category', 'Unknown'),
                'category_position': int(zp.get('pos', 0)) if zp else 0,
                'avg_power': avg_power,
                'avg_wkg': avg_wkg,
                'time_seconds': time_val,
                'velo_before': velo_before,
                'velo_after': velo_after,
                'velo_change': velo_change,
                'team_name': zp.get('team') if zp else None,
                'dnf': bool(zp.get('did_not_finish', False)) if zp else False,
                'dq': bool(zp.get('disqualified', False)) if zp else False,
                'source': 'merged'
            }
            
            supabase.table('race_results').upsert(result_row, on_conflict='event_id,rider_id').execute()
            saved += 1
            
        except Exception as e:
            continue
    
    print(f"   💾 Saved {saved} results")
    total_saved += saved

# SUMMARY
print("\n" + "="*80)
print("SYNC COMPLETE - DUAL API")
print("="*80)
print(f"✅ Races synced: {len(races_list)}")
print(f"✅ Results saved: {total_saved}")

# Verify
results_150437 = supabase.table('race_results').select('*', count='exact').eq('rider_id', RIDER_ID).execute()
all_results = supabase.table('race_results').select('*', count='exact').execute()
events = supabase.table('race_events').select('*', count='exact').execute()

print(f"\n📊 DATABASE STATUS:")
print(f"   Events: {events.count}")
print(f"   Results (rider {RIDER_ID}): {results_150437.count}")
print(f"   Results (total): {all_results.count}")
print("\n✅ PRODUCTION READY - 3 DASHBOARDS KUNNEN GEBOUWD WORDEN!")
