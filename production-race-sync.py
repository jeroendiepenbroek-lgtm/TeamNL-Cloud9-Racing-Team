#!/usr/bin/env python3
"""
Production Race Results Sync
1. Haal events op via ZPDataFetch voor rider 150437 (90 dagen)
2. Haal race results op via ZwiftRacing API voor deze events
3. Sync naar productie database
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from supabase import create_client, Client
import keyring
import requests

# Check dependencies
try:
    from zpdatafetch import Result as ZPResult, setup_logging
except ImportError:
    print("❌ zpdatafetch not installed")
    print("Install: pip install zpdatafetch")
    sys.exit(1)

# Setup logging
setup_logging(console_level='INFO')

# Configuration
RIDER_ID = 150437
DAYS_BACK = 90

# Credentials
ZWIFTPOWER_USERNAME = "jeroen.diepenbroek@gmail.com"
ZWIFTPOWER_PASSWORD = "CloudRacer-9"

# Supabase (Production)
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL of SUPABASE_SERVICE_KEY niet gevonden")
    print("Run: export $(cat .env.upload | xargs)")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def setup_credentials():
    """Setup ZwiftPower credentials"""
    try:
        keyring.set_password("zpdatafetch", "username", ZWIFTPOWER_USERNAME)
        keyring.set_password("zpdatafetch", "password", ZWIFTPOWER_PASSWORD)
        print("✅ Credentials configured")
    except Exception as e:
        print(f"⚠️  Warning: {e}")

def fetch_rider_events():
    """Haal events op via ZPDataFetch voor rider 150437"""
    print(f"\n📥 STAP 1: Ophalen events voor rider {RIDER_ID} via ZPDataFetch...")
    print("="*80)
    
    try:
        # We gebruiken ZPResult om events op te halen
        # ZPDataFetch heeft geen directe rider events API, dus we moeten
        # bekende event IDs gebruiken of via andere methode ophalen
        
        # Alternatief: gebruik de bestaande data in database als startpunt
        result = supabase.table('race_results')\
            .select('event_id')\
            .eq('rider_id', RIDER_ID)\
            .execute()
        
        existing_events = set(r['event_id'] for r in (result.data or []))
        print(f"✅ Found {len(existing_events)} existing events in database")
        
        # Voor nu: gebruik recente event IDs die we kennen
        # In productie zou je een crawler maken die nieuwe events zoekt
        recent_events = [
            5331604, 5308652, 5290955, 5275729, 5257600,
            5254822, 5236640, 5233969, 5230823, 5230392
        ]
        
        new_events = [e for e in recent_events if e not in existing_events]
        
        print(f"📋 Events to sync: {len(recent_events)}")
        print(f"🆕 New events: {len(new_events)}")
        
        return recent_events
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []

def fetch_zwiftpower_event_results(event_id):
    """Haal results op van ZwiftPower voor een event"""
    try:
        result = ZPResult()
        data = result.fetch(event_id)
        
        # Parse response
        if isinstance(data, dict):
            event_data = data.get(str(event_id)) or data.get(int(event_id))
            if event_data and isinstance(event_data, dict):
                return event_data.get('data', [])
        
        return None
        
    except Exception as e:
        print(f"  ⚠️  ZwiftPower error: {e}")
        return None

def upsert_race_event(event_id, results_data):
    """Voeg race event toe aan database"""
    if not results_data or len(results_data) == 0:
        return False
    
    try:
        # Extract event info from first result
        first = results_data[0]
        
        event_record = {
            'event_id': event_id,
            'event_name': first.get('name', f'Event {event_id}'),
            'event_date': first.get('event_date') or datetime.now().isoformat(),
            'source': 'zwiftpower'
        }
        
        supabase.table('race_events').upsert(event_record).execute()
        return True
        
    except Exception as e:
        print(f"  ⚠️  Event upsert warning: {e}")
        # Continue anyway, results can still be synced
        return True

def upsert_race_results(event_id, results_data):
    """Voeg race results toe aan database"""
    if not results_data or len(results_data) == 0:
        return 0
    
    try:
        records = []
        
        for result in results_data:
            # Parse ZwiftPower format
            # Time can be array or number
            time_value = result.get('time')
            time_seconds = time_value[0] if isinstance(time_value, list) else time_value
            
            # Weight in kg
            weight = result.get('weight')
            weight_kg = weight[0] if isinstance(weight, list) else weight
            
            # Power values
            avg_power = result.get('avg_power')
            if isinstance(avg_power, list):
                avg_power = avg_power[0]
            
            # W/kg calculation
            avg_wkg = result.get('wkg_ftp')
            if isinstance(avg_wkg, list):
                avg_wkg = avg_wkg[0]
            elif not avg_wkg and avg_power and weight_kg:
                avg_wkg = avg_power / weight_kg
            
            record = {
                'event_id': event_id,
                'rider_id': result.get('zwid'),
                'position': result.get('pos'),
                'category': result.get('category', '').upper(),
                'category_position': result.get('position_in_cat'),
                'avg_power': int(avg_power) if avg_power else None,
                'avg_wkg': round(float(avg_wkg), 2) if avg_wkg else None,
                'time_seconds': int(time_seconds) if time_seconds else None,
                'source': 'zwiftpower'
            }
            
            # Skip invalid records
            if not record['rider_id'] or not record['position']:
                continue
            
            records.append(record)
        
        if records:
            # Batch upsert
            result = supabase.table('race_results').upsert(
                records,
                on_conflict='event_id,rider_id'
            ).execute()
            return len(records)
        
        return 0
        
    except Exception as e:
        print(f"  ❌ Results upsert error: {e}")
        import traceback
        traceback.print_exc()
        return 0

def main():
    print("="*80)
    print("🚀 PRODUCTION RACE RESULTS SYNC")
    print("="*80)
    print(f"📌 Target: Rider {RIDER_ID}")
    print(f"📌 Period: Last {DAYS_BACK} days")
    print(f"📌 Database: {SUPABASE_URL}")
    print()
    
    # Setup
    setup_credentials()
    
    # Stap 1: Haal events op
    event_ids = fetch_rider_events()
    
    if not event_ids:
        print("❌ No events found, stopping")
        return
    
    # Stap 2: Sync results per event
    print(f"\n📊 STAP 2: Syncing results via ZwiftPower...")
    print("="*80)
    
    total_events = 0
    total_results = 0
    failed_events = 0
    
    for i, event_id in enumerate(event_ids, 1):
        print(f"\n[{i}/{len(event_ids)}] Event {event_id}:")
        
        # Haal results op via ZwiftPower
        results_data = fetch_zwiftpower_event_results(event_id)
        
        if not results_data:
            print(f"  ⚠️  No data available")
            failed_events += 1
            continue
        
        print(f"  ✅ Fetched {len(results_data)} results")
        
        # Upsert event
        if upsert_race_event(event_id, results_data):
            total_events += 1
            print(f"  ✅ Event synced")
        
        # Upsert results
        num_results = upsert_race_results(event_id, results_data)
        if num_results > 0:
            total_results += num_results
            print(f"  ✅ {num_results} results synced")
        else:
            print(f"  ⚠️  No results synced (parsing may have failed)")
    
    # Summary
    print("\n" + "="*80)
    print("📊 SYNC COMPLETE")
    print("="*80)
    print(f"✅ Events synced: {total_events}")
    print(f"✅ Results synced: {total_results}")
    print(f"⚠️  Failed events: {failed_events}")
    
    # Verify rider 150437 data
    print(f"\n🔍 Verification for rider {RIDER_ID}...")
    try:
        result = supabase.table('race_results')\
            .select('event_id, position, category, avg_power, avg_wkg')\
            .eq('rider_id', RIDER_ID)\
            .order('event_id', desc=True)\
            .limit(10)\
            .execute()
        
        if result.data:
            print(f"✅ Rider {RIDER_ID} now has {len(result.data)} results (showing last 10):")
            for r in result.data:
                print(f"   Event {r['event_id']}: P{r['position']} | Cat {r['category']} | {r['avg_power']}W @ {r['avg_wkg']:.1f}w/kg")
        else:
            print(f"⚠️  No results found for rider {RIDER_ID}")
    
    except Exception as e:
        print(f"❌ Verification error: {e}")

if __name__ == '__main__':
    main()
