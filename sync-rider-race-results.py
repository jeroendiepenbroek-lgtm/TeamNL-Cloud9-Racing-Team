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
from zpdatafetch import Cyclist, setup_logging, Result as ZPResult
from zrdatafetch import ZRResult
import keyring
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
# Allow overriding days via env var for flexible runs (e.g., DAYS_BACK=10)
DAYS_BACK = int(os.environ.get('DAYS_BACK', '90'))

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
        # Use async fetch and read processed data that contains 'data' list
        await cyclist.afetch(RIDER_ID)
        pdata = cyclist.processed.get(RIDER_ID) or cyclist.processed.get(str(RIDER_ID)) or cyclist.processed
        all_races = pdata.get('data', []) if isinstance(pdata, dict) else []

        if not all_races:
            print("⚠️  Geen results gevonden in cyclist.processed")
            return []

        # Filter and normalise events
        cutoff_date = datetime.now() - timedelta(days=DAYS_BACK)
        recent_events = []

        for r in all_races:
            # event_date may be a unix timestamp (seconds)
            event_date = r.get('event_date') or r.get('date')
            try:
                if isinstance(event_date, (int, float)):
                    event_dt = datetime.fromtimestamp(int(event_date))
                elif isinstance(event_date, str):
                    event_dt = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                else:
                    event_dt = None
            except Exception:
                event_dt = None

            if event_dt and event_dt >= cutoff_date:
                recent_events.append({
                    'event_id': str(r.get('zid') or r.get('id') or r.get('event_id')),
                    'event_name': r.get('event_title') or r.get('name', ''),
                    'event_date': event_dt.isoformat(),
                    'category': r.get('category', ''),
                    'position': r.get('position'),
                    'time_seconds': r.get('time'),
                    'avg_power': r.get('avg_power') or r.get('power'),
                    'avg_wkg': r.get('wkg')
                })

        print(f"✅ {len(recent_events)} events gevonden in laatste {DAYS_BACK} dagen")
        return recent_events
        
    except Exception as e:
        print(f"❌ Fout bij ophalen ZPDataFetch data: {e}")
        import traceback
        traceback.print_exc()
        return []

async def fetch_zwiftracing_results(event_id):
    """Haal detailed results op van ZwiftRacing.app voor een specifiek event (async)"""
    # Ensure we have authorization configured in keyring
    try:
        token = os.getenv('ZWIFTRACING_API_TOKEN') or '650c6d2fc4ef6858d74cbef1'
        keyring.set_password('zrdatafetch', 'authorization', token)
    except Exception as e:
        print(f"⚠️  Warning setting zrdatafetch auth: {e}")

    try:
        from zrdatafetch import AsyncZR_obj, ZRResult as _ZRResult
        async with AsyncZR_obj() as zr:
            result = _ZRResult()
            result.set_session(zr)
            await result.afetch(event_id)
            # Parse results
            if hasattr(result, 'results') and result.results:
                # Build normalized structure
                return {
                    'event_id': event_id,
                    'results': [r.__dict__ for r in result.results]
                }
            # fallback: try result.json()
            try:
                j = result.json()
                return j
            except Exception:
                return None
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
            
            # Support multiple id field names
            rider_id = result.get('zwiftId') or result.get('zwid') or result.get('rider_id')

            record = {
                'event_id': event_id,
                'rider_id': rider_id,
                'position': result.get('position'),
                'category': result.get('category'),
                'category_position': result.get('categoryPosition'),
                'avg_power': result.get('avgWatts') or result.get('avg_power'),
                'avg_wkg': result.get('avgWkg') or result.get('avg_wkg'),
                'time_seconds': result.get('timeInSeconds') or result.get('time'),
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

def delete_old_results(rider_id, days_back):
    """Delete race_results for a rider older than days_back days (based on race_events.event_date)"""
    try:
        cutoff = datetime.utcnow() - timedelta(days=days_back)
        # Get event_ids older than cutoff
        q = supabase.table('race_events').select('event_id,event_date').lt('event_date', cutoff.isoformat()).execute()
        rows = None
        # Handle different response shapes
        if hasattr(q, 'data'):
            rows = q.data
        elif isinstance(q, dict) and 'data' in q:
            rows = q['data']
        else:
            rows = []

        if rows is None:
            print("⚠️  Fout bij ophalen oude events: geen data terug")
            return

        old_event_ids = [r['event_id'] for r in (rows or []) if r.get('event_id')]
        if not old_event_ids:
            print("✅ Geen oude events om te verwijderen")
            return
        # Delete race_results for this rider and these events
        try:
            resp = supabase.table('race_results').delete().eq('rider_id', rider_id).in_('event_id', old_event_ids).execute()
            # resp may not have .error depending on client
            resp_error = getattr(resp, 'error', None) or (resp.get('error') if isinstance(resp, dict) else None)
            if resp_error:
                print(f"⚠️  Fout bij delete (batch): {resp_error}")
                # Fallback: delete per event
                for eid in old_event_ids:
                    supabase.table('race_results').delete().eq('rider_id', rider_id).eq('event_id', eid).execute()
            else:
                print(f"✅ Verwijderd {len(old_event_ids)} oude events voor rider {rider_id}")
        except Exception as e:
            print(f"⚠️  Batch delete failed, falling back: {e}")
            for eid in old_event_ids:
                try:
                    supabase.table('race_results').delete().eq('rider_id', rider_id).eq('event_id', eid).execute()
                except Exception as e:
                    print(f"❌ Failed to delete event {eid}: {e}")
    except Exception as e:
        print(f"❌ Error deleting old results: {e}")


async def main():
    print("=" * 80)
    print("🚀 RACE RESULTS PIPELINE - RIDER 150437")
    print("=" * 80)
    
    # Pre-clean: verwijder oude resultaten buiten de window voor deze run
    print(f"🔧 Cleaning old results older than {DAYS_BACK} days for rider {RIDER_ID}...")
    delete_old_results(RIDER_ID, DAYS_BACK)

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
        zr_data = await fetch_zwiftracing_results(event_id)
        
        if not zr_data:
            print(f"   ⚠️  Geen data beschikbaar op ZwiftRacing.app, proberen ZwiftPower fallback...")
            # Try ZwiftPower fallback (sync fetch run in thread)
            try:
                from zpdatafetch import Result as _ZPResult
                zp = _ZPResult()
                raw = await asyncio.to_thread(zp.fetch, event_id)
                inner = None
                if isinstance(raw, dict):
                    inner = raw.get(str(event_id)) or raw.get(int(event_id)) or raw.get(event_id)
                if inner and isinstance(inner, dict) and inner.get('data'):
                    parsed = {'event_id': event_id, 'results': inner.get('data')}
                    num_results = upsert_race_results(event_id, parsed)
                    if num_results > 0:
                        total_events += 1
                        total_results += num_results
                        print(f"   ✅ {num_results} results toegevoegd via ZwiftPower fallback")
                        continue
                print(f"   ⚠️  Geen fallback data gevonden op ZwiftPower voor event {event_id}")
            except Exception as e:
                print(f"   ⚠️  ZwiftPower fallback failed: {e}")

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
        else:
            # Fallback: probeer ZwiftPower (ZPDataFetch Result)
            print(f"   ℹ️  Proberen fallback naar ZwiftPower voor event {event_id}...")
            try:
                from zpdatafetch import Result as _ZPResult
                zp = _ZPResult()
                raw = await asyncio.to_thread(zp.fetch, event_id)
                # parse raw similar to other functions
                if raw:
                    # raw may be dict {event_id: {...}} or direct
                    inner = raw.get(str(event_id)) if isinstance(raw, dict) else raw
                    if isinstance(inner, dict) and inner.get('data'):
                        parsed = {
                            'event_id': event_id,
                            'results': inner.get('data')
                        }
                        num_zp = upsert_race_results(event_id, parsed)
                        if num_zp > 0:
                            total_results += num_zp
                            print(f"   ✅ {num_zp} results toegevoegd via ZwiftPower fallback")
                            continue
                print(f"   ⚠️  Geen fallback data gevonden op ZwiftPower voor event {event_id}")
            except Exception as e:
                print(f"   ⚠️  ZwiftPower fallback failed: {e}")
    
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
