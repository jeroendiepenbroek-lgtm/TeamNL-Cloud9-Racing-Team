#!/usr/bin/env python3
"""
Enhanced Race Results Sync - ZwiftRacing.app API
Fetches detailed race results including power intervals and effort scores
"""
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import requests
from supabase import create_client, Client
from zpdatafetch import Result

# Supabase credentials
SUPABASE_URL = "https://bktbeefdmrpxhsyyalvc.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# ZwiftRacing.app API
ZWIFTRACING_API_BASE = "https://www.zwiftracing.app/api"
ZWIFTRACING_TOKEN = "650c6d2fc4ef6858d74cbef1"

def setup_credentials():
    """Setup ZwiftPower credentials via zpdatafetch"""
    import keyring
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
    print("✅ ZwiftPower credentials configured")

def fetch_rider_events(rider_id: int, days: int = 90) -> List[Dict[str, Any]]:
    """Fetch rider events from ZwiftPower via ZPDataFetch"""
    print(f"\n📥 Fetching events for rider {rider_id} (last {days} days)...")
    
    try:
        result = Result(zwid=rider_id)
        events = result.results()  # Returns list of dicts
        
        if not events:
            print(f"⚠️  No events found for rider {rider_id}")
            return []
        
        # Filter last 90 days
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_events = []
        
        for event in events:
            event_date_str = event.get('event_date') or event.get('date')
            if not event_date_str:
                continue
            
            try:
                # Parse date (format: "2026-01-10" or "2026-01-10T14:00:00")
                event_date = datetime.fromisoformat(event_date_str.split('T')[0])
                if event_date >= cutoff_date:
                    recent_events.append(event)
            except Exception as e:
                print(f"⚠️  Could not parse date {event_date_str}: {e}")
                continue
        
        print(f"✅ Found {len(recent_events)} events in last {days} days")
        return recent_events
    
    except Exception as e:
        print(f"❌ Error fetching events: {e}")
        import traceback
        traceback.print_exc()
        return []

def fetch_zwiftracing_event_results(event_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch detailed event results from ZwiftRacing.app API
    Includes power intervals, effort scores, and vELO changes
    """
    url = f"{ZWIFTRACING_API_BASE}/events/{event_id}/results"
    headers = {
        "Authorization": f"Bearer {ZWIFTRACING_TOKEN}",
        "Accept": "application/json",
        "User-Agent": "TeamNL-Cloud9-Racing/1.0"
    }
    
    try:
        print(f"  📊 Fetching ZwiftRacing.app results for event {event_id}...")
        response = requests.get(url, headers=headers, timeout=15)
        
        if response.status_code == 401:
            print(f"  ⚠️  Event {event_id}: 401 Unauthorized")
            return None
        elif response.status_code == 404:
            print(f"  ⚠️  Event {event_id}: 404 Not Found")
            return None
        elif response.status_code != 200:
            print(f"  ⚠️  Event {event_id}: HTTP {response.status_code}")
            return None
        
        data = response.json()
        if not data or not isinstance(data, dict):
            print(f"  ⚠️  Event {event_id}: Invalid response format")
            return None
        
        # Extract results array
        results = data.get('results', [])
        if not results:
            print(f"  ⚠️  Event {event_id}: No results in response")
            return None
        
        print(f"  ✅ Event {event_id}: {len(results)} results fetched")
        return data
    
    except requests.exceptions.Timeout:
        print(f"  ⚠️  Event {event_id}: Request timeout")
        return None
    except Exception as e:
        print(f"  ❌ Event {event_id}: {e}")
        return None

def parse_power_intervals(rider_data: Dict[str, Any]) -> Dict[str, Optional[int]]:
    """Extract power intervals from ZwiftRacing.app rider data"""
    power_data = rider_data.get('power', {}) or {}
    
    return {
        'power_5s': power_data.get('5s'),
        'power_15s': power_data.get('15s'),
        'power_30s': power_data.get('30s'),
        'power_1m': power_data.get('1m'),
        'power_2m': power_data.get('2m'),
        'power_5m': power_data.get('5m'),
        'power_20m': power_data.get('20m'),
    }

def upsert_race_result_with_intervals(
    supabase: Client,
    event_id: int,
    rider_data: Dict[str, Any],
    event_date: str
) -> bool:
    """Upsert race result with power intervals to database"""
    
    try:
        rider_id = rider_data.get('zwid') or rider_data.get('rider_id')
        if not rider_id:
            return False
        
        # Basic data
        position = rider_data.get('position') or rider_data.get('pos')
        category = rider_data.get('category') or rider_data.get('cat')
        
        # Time data
        time_data = rider_data.get('time', [])
        time_seconds = time_data[0] if isinstance(time_data, list) and len(time_data) > 0 else rider_data.get('time_seconds')
        
        # Power data
        avg_wkg = rider_data.get('avg_wkg') or rider_data.get('wkg')
        if isinstance(avg_wkg, list) and len(avg_wkg) > 0:
            avg_wkg = avg_wkg[0]
        
        # Parse power intervals
        power_intervals = parse_power_intervals(rider_data)
        
        # vELO data
        velo_before = rider_data.get('velo_before') or rider_data.get('rating_before')
        velo_after = rider_data.get('velo_after') or rider_data.get('rating_after')
        velo_change = rider_data.get('velo_change') or rider_data.get('rating_change')
        
        # Effort and racing score
        effort_score = rider_data.get('effort') or rider_data.get('effort_score')
        racing_score = rider_data.get('racing_score') or rider_data.get('rp')
        
        result_data = {
            'event_id': event_id,
            'rider_id': int(rider_id),
            'position': int(position) if position else None,
            'time_seconds': int(time_seconds) if time_seconds else None,
            'category': str(category) if category else None,
            'avg_wkg': float(avg_wkg) if avg_wkg else None,
            'velo_before': float(velo_before) if velo_before else None,
            'velo_after': float(velo_after) if velo_after else None,
            'velo_change': float(velo_change) if velo_change else None,
            'effort_score': int(effort_score) if effort_score else None,
            'racing_score': int(racing_score) if racing_score else None,
            **power_intervals,  # Add all power interval columns
            'source': 'zwiftracing',
            'raw_data': rider_data,
            'fetched_at': datetime.now().isoformat()
        }
        
        # Remove None values
        result_data = {k: v for k, v in result_data.items() if v is not None}
        
        response = supabase.table('race_results').upsert(result_data).execute()
        return True
    
    except Exception as e:
        print(f"    ⚠️  Error upserting result for rider {rider_data.get('zwid', 'unknown')}: {e}")
        return False

def main():
    """Main sync workflow"""
    RIDER_ID = 150437
    
    print("=" * 60)
    print("🚀 ENHANCED RACE RESULTS SYNC - ZwiftRacing.app")
    print("=" * 60)
    
    # Setup
    setup_credentials()
    
    if not SUPABASE_KEY:
        print("❌ SUPABASE_SERVICE_KEY not set")
        sys.exit(1)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"✅ Connected to Supabase")
    
    # Step 1: Fetch events from ZwiftPower
    events = fetch_rider_events(RIDER_ID, days=90)
    if not events:
        print("❌ No events to sync")
        return
    
    print(f"\n📊 Processing {len(events)} events...")
    
    # Step 2: Fetch detailed results from ZwiftRacing.app
    synced_events = 0
    synced_results = 0
    failed_events = []
    
    for i, event in enumerate(events, 1):
        event_id = event.get('event_id') or event.get('id')
        event_name = event.get('event_name') or event.get('name', 'Unknown')
        event_date = event.get('event_date') or event.get('date')
        
        if not event_id:
            continue
        
        print(f"\n[{i}/{len(events)}] Event {event_id}: {event_name}")
        
        # Fetch detailed results from ZwiftRacing.app
        results_data = fetch_zwiftracing_event_results(event_id)
        
        if not results_data:
            failed_events.append(event_id)
            continue
        
        # Sync results with power intervals
        results_list = results_data.get('results', [])
        event_synced = 0
        
        for rider_data in results_list:
            if upsert_race_result_with_intervals(supabase, event_id, rider_data, event_date):
                event_synced += 1
        
        if event_synced > 0:
            synced_events += 1
            synced_results += event_synced
            print(f"  ✅ Synced {event_synced} results with power intervals")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 SYNC SUMMARY")
    print("=" * 60)
    print(f"✅ Events synced: {synced_events}/{len(events)}")
    print(f"✅ Results synced: {synced_results}")
    
    if failed_events:
        print(f"⚠️  Failed events ({len(failed_events)}): {', '.join(map(str, failed_events[:10]))}")

if __name__ == "__main__":
    main()
