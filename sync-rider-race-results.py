#!/usr/bin/env python3
"""
Race Results Pipeline
Haalt events op via ZPDataFetch en results via ZwiftRacing.app voor rider 150437
"""

import asyncio
import requests
import os
import json
from datetime import datetime, timedelta
from supabase import create_client, Client
from zpdatafetch import Cyclist, setup_logging
import keyring

# Setup logging
setup_logging(console_level='INFO')

# Supabase setup
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL of SUPABASE_SERVICE_KEY niet gevonden in environment")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

RIDER_ID = 150437
DAYS_BACK = 90

# ZwiftPower credentials
ZWIFTPOWER_USERNAME = "jeroen.diepenbroek@gmail.com"
ZWIFTPOWER_PASSWORD = "CloudRacer-9"

async def fetch_zwiftpower_events():
    """Haal events op via ZPDataFetch voor rider 150437"""
    print(f"\n📥 Stap 1: Ophalen events voor rider {RIDER_ID} via ZPDataFetch...")
    
    # Setup credentials
    try:
        keyring.set_password("zpdatafetch", "username", ZWIFTPOWER_USERNAME)
        keyring.set_password("zpdatafetch", "password", ZWIFTPOWER_PASSWORD)
    except Exception as e:
        print(f"⚠️  Warning setting credentials: {e}")
    
    try:
        cyclist = Cyclist()
        await cyclist.afetch(RIDER_ID)
        cyclist_data = cyclist.asdict()
        
        if not cyclist_data or 'results' not in cyclist_data:
            print("⚠️  Geen results gevonden")
            return []
        
        results = cyclist_data['results']
        
        # Filter laatste 90 dagen
        cutoff_date = datetime.now() - timedelta(days=DAYS_BACK)
        recent_events = []
        
        for result in results:
            event_date = result.get('date')
            if event_date:
                try:
                    # Parse datetime
                    if isinstance(event_date, str):
                        event_date = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                    
                    if event_date >= cutoff_date:
                        recent_events.append({
                            'event_id': result.get('event_id'),
                            'event_name': result.get('name', ''),
                            'event_date': event_date.isoformat(),
                            'category': result.get('category', ''),
                            'position': result.get('position'),
                            'time_seconds': result.get('time'),
                            'avg_power': result.get('power'),
                            'avg_wkg': result.get('wkg')
                        })
                except Exception as e:
                    print(f"⚠️  Kon datum niet parsen: {event_date} - {e}")
        
        print(f"✅ {len(recent_events)} events gevonden in laatste {DAYS_BACK} dagen")
        return recent_events
        
    except Exception as e:
        print(f"❌ Fout bij ophalen ZPDataFetch data: {e}")
        import traceback
        traceback.print_exc()
        return []

def fetch_zwiftracing_results(event_id):
    """Haal detailed results op van ZwiftRacing.app voor een specifiek event"""
    url = f"https://www.zwiftracing.app/api/results/{event_id}"
    
    headers = {
        'Authorization': '650c6d2fc4ef6858d74cbef1'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if not data or 'data' not in data:
            return None
        
        return data['data']
        
    except Exception as e:
        print(f"⚠️  Kon results niet ophalen voor event {event_id}: {e}")
        return None

def upsert_race_event(event_data, zp_event):
    """Voeg race event toe aan database"""
    try:
        event_record = {
            'event_id': event_data.get('id'),
            'event_name': event_data.get('name') or zp_event.get('event_name', ''),
            'event_date': event_data.get('eventStart') or zp_event.get('event_date'),
            'world': event_data.get('mapName'),
            'route': event_data.get('routeName'),
            'distance_km': event_data.get('distanceInMeters', 0) / 1000 if event_data.get('distanceInMeters') else None,
            'total_participants': len(event_data.get('results', [])),
            'source': 'zwiftracing'
        }
        
        result = supabase.table('race_events').upsert(event_record).execute()
        return True
        
    except Exception as e:
        print(f"❌ Fout bij upsert race event: {e}")
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
        print(f"❌ Fout bij upsert race results: {e}")
        return 0

async def main():
    print("=" * 80)
    print("🚀 RACE RESULTS PIPELINE - RIDER 150437")
    print("=" * 80)
    
    # Stap 1: Haal events op via ZPDataFetch
    zp_events = await fetch_zwiftpower_events()
    
    if not zp_events:
        print("❌ Geen events gevonden, pipeline gestopt")
        return
    
    # Stap 2: Per event, haal details + results op via ZwiftRacing
    print(f"\n📥 Stap 2: Ophalen details + results via ZwiftRacing.app...")
    
    total_events = 0
    total_results = 0
    skipped_events = 0
    
    for i, zp_event in enumerate(zp_events, 1):
        event_id = zp_event['event_id']
        print(f"\n[{i}/{len(zp_events)}] Event {event_id}: {zp_event['event_name'][:50]}...")
        
        # Haal ZwiftRacing data op
        zr_data = fetch_zwiftracing_results(event_id)
        
        if not zr_data:
            print(f"   ⚠️  Geen data beschikbaar op ZwiftRacing.app, skip")
            skipped_events += 1
            continue
        
        # Voeg event toe
        if upsert_race_event(zr_data, zp_event):
            total_events += 1
            print(f"   ✅ Event toegevoegd")
        
        # Voeg results toe
        num_results = upsert_race_results(event_id, zr_data)
        if num_results > 0:
            total_results += num_results
            print(f"   ✅ {num_results} results toegevoegd")
    
    # Samenvatting
    print("\n" + "=" * 80)
    print("📊 PIPELINE VOLTOOID")
    print("=" * 80)
    print(f"✅ Events verwerkt: {total_events}")
    print(f"✅ Results toegevoegd: {total_results}")
    print(f"⚠️  Events overgeslagen: {skipped_events}")
    
    # Controleer rider 150437 data
    print(f"\n🔍 Controle rider {RIDER_ID} in database...")
    try:
        result = supabase.table('race_results')\
            .select('event_id')\
            .eq('rider_id', RIDER_ID)\
            .execute()
        
        rider_events = len(result.data) if result.data else 0
        print(f"✅ Rider {RIDER_ID} heeft nu {rider_events} race results in database")
        
    except Exception as e:
        print(f"❌ Fout bij controle: {e}")

if __name__ == '__main__':
    asyncio.run(main())
