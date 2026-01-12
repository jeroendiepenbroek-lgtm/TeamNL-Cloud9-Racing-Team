#!/usr/bin/env python3
"""
Simple Race Results Sync
Haalt race results op van ZwiftRacing.app en synchroniseert naar database
"""

import requests
import os
from datetime import datetime, timedelta
from supabase import create_client, Client

# Supabase setup
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL of SUPABASE_SERVICE_KEY niet gevonden in environment")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

RIDER_ID = 150437

# Bekende recente event IDs voor rider 150437 (je kunt deze lijst uitbreiden)
# Deze events zijn gevonden via manuele check of eerdere scans
RECENT_EVENT_IDS = [
    5331604,  # Recent event
    5325879,
    5320154,
    5314429,
    5308704,
    5302979,
    5297254,
    5291529,
    # Voeg hier meer event IDs toe...
]

def fetch_zwiftracing_results(event_id):
    """Haal detailed results op van ZwiftRacing.app voor een specifiek event"""
    url = f"https://www.zwiftracing.app/api/results/{event_id}"
    
    headers = {
        'Authorization': '650c6d2fc4ef6858d74cbef1'
    }
    
    try:
        print(f"  📥 Fetching {url}...")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if not data or 'data' not in data:
            return None
        
        return data['data']
        
    except Exception as e:
        print(f"  ⚠️  Fout: {e}")
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
            # Haal velo scores op als ze beschikbaar zijn
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

def main():
    print("=" * 80)
    print("🚀 SIMPLE RACE RESULTS SYNC")
    print("=" * 80)
    print(f"📌 Rider ID: {RIDER_ID}")
    print(f"📌 Events to sync: {len(RECENT_EVENT_IDS)}")
    
    total_events = 0
    total_results = 0
    skipped_events = 0
    
    for i, event_id in enumerate(RECENT_EVENT_IDS, 1):
        print(f"\n[{i}/{len(RECENT_EVENT_IDS)}] Event {event_id}:")
        
        # Haal ZwiftRacing data op
        zr_data = fetch_zwiftracing_results(event_id)
        
        if not zr_data:
            print(f"  ⚠️  Geen data beschikbaar, skip")
            skipped_events += 1
            continue
        
        print(f"  ✅ Data opgehaald: {zr_data.get('name', 'N/A')}")
        
        # Voeg event toe
        if upsert_race_event(zr_data):
            total_events += 1
            print(f"  ✅ Event toegevoegd")
        
        # Voeg results toe
        num_results = upsert_race_results(event_id, zr_data)
        if num_results > 0:
            total_results += num_results
            print(f"  ✅ {num_results} results toegevoegd")
    
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
            .select('event_id, position, category, avg_power, avg_wkg')\
            .eq('rider_id', RIDER_ID)\
            .order('event_id', desc=True)\
            .limit(10)\
            .execute()
        
        if result.data:
            print(f"✅ Rider {RIDER_ID} heeft {len(result.data)} results (laatste 10 getoond):")
            for r in result.data:
                print(f"   Event {r['event_id']}: P{r['position']} | Cat {r['category']} | {r['avg_power']}W | {r['avg_wkg']}w/kg")
        else:
            print(f"⚠️  Geen data gevonden voor rider {RIDER_ID}")
        
    except Exception as e:
        print(f"❌ Fout bij controle: {e}")

if __name__ == '__main__':
    main()
