#!/usr/bin/env python3
"""
E2E PRODUCTIE FLOW: Race Results Pipeline
- ZwiftPower data (zpdatafetch)
- ZwiftRacing API enrichment
- Database storage zonder redundantie
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests

# Check imports
try:
    from zpdatafetch import Cyclist
    import keyring
    print("✅ zpdatafetch imported")
except ImportError as e:
    print(f"❌ Cannot import zpdatafetch: {e}")
    sys.exit(1)

# ============================================
# CONFIGURATION
# ============================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://bktbeefdmrpxhsyyalvc.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
ZWIFTRACING_API_KEY = "650c6d2fc4ef6858d74cbef1"
ZWIFTRACING_BASE = "https://api.zwiftracing.app/api"

RIDER_ID = 150437
LOOKBACK_DAYS = 90

# Setup ZwiftPower credentials
try:
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
except:
    pass

# ============================================
# STEP 1: ZWIFTPOWER DATA (zpdatafetch)
# ============================================

def fetch_zwiftpower_results(rider_id: int) -> List[Dict]:
    """
    Fetch race results from ZwiftPower using zpdatafetch Cyclist class
    Returns: List of race results from last LOOKBACK_DAYS
    """
    
    print(f"\n{'='*70}")
    print(f"📊 STEP 1: ZwiftPower Data Fetch")
    print(f"{'='*70}")
    print(f"Rider ID: {rider_id}")
    print(f"Lookback: {LOOKBACK_DAYS} days\n")
    
    try:
        # Create Cyclist instance
        cyclist = Cyclist()
        
        # Fetch cyclist data (includes all race history)
        print("🔄 Fetching ZwiftPower cyclist data...")
        cyclist.fetch(rider_id)
        
        # Extract race results from processed data
        # Structure: cyclist.processed[rider_id]['data'] = list of all races
        if not cyclist.processed or rider_id not in cyclist.processed:
            print("⚠️  No data returned")
            return []
        
        rider_data = cyclist.processed[rider_id]
        if 'data' not in rider_data:
            print("⚠️  No race data found")
            return []
        
        all_races = rider_data['data']
        print(f"✅ Fetched {len(all_races)} total race results")
        
        # Filter recent results (event_date is Unix timestamp)
        cutoff_timestamp = (datetime.now() - timedelta(days=LOOKBACK_DAYS)).timestamp()
        recent = []
        
        for race in all_races:
            event_date = race.get('event_date')
            if not event_date:
                continue
            
            # event_date is Unix timestamp (seconds)
            if isinstance(event_date, (int, float)) and event_date > cutoff_timestamp:
                recent.append(race)
        
        print(f"✅ Filtered to {len(recent)} results (last {LOOKBACK_DAYS} days)")
        
        # Show sample
        if recent:
            print(f"\n📋 Sample result (first race):")
            sample = recent[0]
            print(f"   Event: {sample.get('event_title', 'Unknown')}")
            print(f"   Date: {datetime.fromtimestamp(sample.get('event_date', 0)).strftime('%Y-%m-%d')}")
            print(f"   Position: {sample.get('pos')} / Category: {sample.get('category')}")
            print(f"   Power: {sample.get('avg_wkg', ['?'])[0]} W/kg")
            print(f"   Available power intervals: 5s, 15s, 30s, 1m, 2m, 5m, 20m")
        
        return recent
        
    except Exception as e:
        print(f"❌ Error fetching ZwiftPower data: {e}")
        import traceback
        traceback.print_exc()
        return []

# ============================================
# STEP 2: ZWIFTRACING API ENRICHMENT
# ============================================

def fetch_rider_velo_at_timestamp(rider_id: int, timestamp: str) -> Optional[Dict]:
    """
    Fetch rider vELO rating at specific timestamp
    Rate limit: 5 calls/min
    """
    
    headers = {"Authorization": ZWIFTRACING_API_KEY}
    url = f"{ZWIFTRACING_BASE}/public/riders/{rider_id}/{timestamp}"
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            return {
                'velo': data.get('velo'),
                'category': data.get('category'),
                'timestamp': timestamp
            }
        elif response.status_code == 429:
            retry = int(response.headers.get('Ratelimit-Reset', 60))
            print(f"   ⏳ Rate limited, retry after {retry}s")
            return None
        else:
            return None
    except Exception as e:
        print(f"   ⚠️  vELO fetch error: {e}")
        return None

def enrich_with_zwiftracing(zp_results: List[Dict], rider_id: int) -> List[Dict]:
    """
    Enrich ZwiftPower results with ZwiftRacing event data
    Maps ZP fields to database schema
    """
    
    print(f"\n{'='*70}")
    print(f"🔄 STEP 2: Data Mapping & Enrichment")
    print(f"{'='*70}")
    print(f"Total results to process: {len(zp_results)}\n")
    
    enriched = []
    
    for i, zp_race in enumerate(zp_results, 1):
        # Extract ZwiftPower fields
        event_id = zp_race.get('zid')  # ZwiftPower event ID
        event_date_ts = zp_race.get('event_date')  # Unix timestamp
        event_title = zp_race.get('event_title', 'Unknown')
        
        # Convert timestamp to ISO date
        try:
            event_date = datetime.fromtimestamp(event_date_ts).isoformat() if event_date_ts else None
        except:
            event_date = None
        
        # Map to database schema
        enriched_result = {
            # Event info
            'event_id': str(event_id) if event_id else None,
            'event_name': event_title,
            'event_date': event_date,
            'rider_id': rider_id,
            
            # Results
            'position': zp_race.get('pos'),
            'category': zp_race.get('category'),
            'total_riders': None,  # Not in ZP data
            
            # Performance metrics
            'avg_power': zp_race.get('avg_power', [None])[0] if isinstance(zp_race.get('avg_power'), list) else zp_race.get('avg_power'),
            'avg_wkg': float(zp_race.get('avg_wkg', [0])[0]) if isinstance(zp_race.get('avg_wkg'), list) else zp_race.get('avg_wkg'),
            'time_seconds': zp_race.get('time', [None])[0] if isinstance(zp_race.get('time'), list) else zp_race.get('time'),
            
            # Power intervals (W/kg) - ZP stores as [value, 0] arrays
            'power_5s': float(zp_race.get('wkg5', [0])[0]) if isinstance(zp_race.get('wkg5'), list) and zp_race.get('wkg5')[0] else None,
            'power_15s': float(zp_race.get('wkg15', [0])[0]) if isinstance(zp_race.get('wkg15'), list) and zp_race.get('wkg15')[0] else None,
            'power_30s': float(zp_race.get('wkg30', [0])[0]) if isinstance(zp_race.get('wkg30'), list) and zp_race.get('wkg30')[0] else None,
            'power_1m': float(zp_race.get('wkg60', [0])[0]) if isinstance(zp_race.get('wkg60'), list) and zp_race.get('wkg60')[0] else None,
            'power_2m': float(zp_race.get('wkg120', [0])[0]) if isinstance(zp_race.get('wkg120'), list) and zp_race.get('wkg120')[0] else None,
            'power_5m': float(zp_race.get('wkg300', [0])[0]) if isinstance(zp_race.get('wkg300'), list) and zp_race.get('wkg300')[0] else None,
            'power_20m': float(zp_race.get('wkg1200', [0])[0]) if isinstance(zp_race.get('wkg1200'), list) and zp_race.get('wkg1200')[0] else None,
            
            # Rider info
            'rider_name': zp_race.get('name'),
            'weight': float(zp_race.get('weight', [0])[0]) if isinstance(zp_race.get('weight'), list) else None,
            'ftp': int(zp_race.get('ftp')) if zp_race.get('ftp') else None,
            
            # ZwiftRacing vELO (will be enriched later if needed)
            'velo_before': None,
            'velo_after': None,
        }
        
        if i <= 5:  # Show first 5
            print(f"[{i}/{len(zp_results)}] {event_title[:50]}")
            print(f"   📅 {event_date}")
            print(f"   🏁 Position: {enriched_result['position']} ({enriched_result['category']})")
            print(f"   ⚡ Power: {enriched_result['avg_wkg']:.2f} W/kg")
            intervals = [enriched_result[f'power_{p}'] for p in ['5s', '15s', '30s', '1m', '2m', '5m', '20m']]
            has_intervals = sum(1 for x in intervals if x)
            print(f"   📊 Power intervals: {has_intervals}/7 available")
        
        enriched.append(enriched_result)
    
    print(f"\n✅ Processed {len(enriched)} results")
    return enriched

# ============================================
# STEP 3: DATABASE STORAGE
# ============================================

def save_to_database(results: List[Dict]) -> Dict:
    """
    Save enriched results to database race_results table
    Uses UPSERT to handle duplicates
    """
    
    print(f"\n{'='*70}")
    print(f"💾 STEP 3: Database Storage")
    print(f"{'='*70}")
    print(f"Results to save: {len(results)}\n")
    
    if not SUPABASE_KEY:
        print("❌ No SUPABASE_SERVICE_KEY - cannot save to database")
        print("💡 Set environment variable: SUPABASE_SERVICE_KEY")
        print("⏭️  Skipping database save - data saved in JSON file")
        return {'saved': 0, 'skipped': len(results), 'errors': 0}
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/race_results"
    
    saved = 0
    skipped = 0
    errors = 0
    
    for i, result in enumerate(results, 1):
        try:
            # Map fields to database schema
            payload = {
                'event_id': int(result['event_id']),
                'rider_id': result['rider_id'],
                'position': result['position'],
                'category': result['category'],
                'avg_power': result['avg_power'],
                'avg_wkg': result['avg_wkg'],
                'time_seconds': int(result['time_seconds']) if result['time_seconds'] else None,
                
                # Power intervals (W/kg)
                'power_5s_wkg': result['power_5s'],
                'power_15s_wkg': result['power_15s'],
                'power_30s_wkg': result['power_30s'],
                'power_1m_wkg': result['power_1m'],
                'power_2m_wkg': result['power_2m'],
                'power_5m_wkg': result['power_5m'],
                'power_20m_wkg': result['power_20m'],
                
                # Rider info
                'rider_name': result['rider_name'],
                'weight': result['weight'],
                'ftp': result['ftp'],
                
                # vELO (if available)
                'velo_before': result['velo_before'],
                'velo_after': result['velo_after'],
                
                # Metadata
                'source': 'zwiftpower'
            }
            
            # Remove None values
            payload = {k: v for k, v in payload.items() if v is not None}
            
            response = requests.post(url, headers=headers, json=payload)
            
            if response.status_code in [200, 201]:
                saved += 1
                if i <= 5 or i % 10 == 0:
                    print(f"[{i}/{len(results)}] ✅ Saved: Event {result['event_id']} - {result['event_name'][:40]}")
            elif response.status_code == 409:
                skipped += 1
                if i <= 5:
                    print(f"[{i}/{len(results)}] ⏭️  Duplicate: Event {result['event_id']}")
            else:
                errors += 1
                error_msg = response.text[:200] if response.text else 'No error message'
                print(f"[{i}/{len(results)}] ❌ Error {response.status_code}: Event {result['event_id']}")
                print(f"    {error_msg}")
                
        except Exception as e:
            errors += 1
            print(f"[{i}/{len(results)}] ❌ Exception: {e}")
    
    print(f"\n📊 DATABASE SUMMARY:")
    print(f"   ✅ Saved: {saved}")
    print(f"   ⏭️  Skipped: {skipped}")
    print(f"   ❌ Errors: {errors}")
    
    return {'saved': saved, 'skipped': skipped, 'errors': errors}

# ============================================
# MAIN E2E PIPELINE
# ============================================

def main():
    print(f"\n{'='*70}")
    print(f"🚀 E2E RACE RESULTS PIPELINE - Rider {RIDER_ID}")
    print(f"{'='*70}\n")
    
    start_time = time.time()
    
    # STEP 1: ZwiftPower
    zp_results = fetch_zwiftpower_results(RIDER_ID)
    
    if not zp_results:
        print("\n❌ No ZwiftPower data - pipeline stopped")
        return
    
    # STEP 2: ZwiftRacing enrichment
    enriched_results = enrich_with_zwiftracing(zp_results, RIDER_ID)
    
    # Save intermediate results
    output_file = f"rider-{RIDER_ID}-enriched-results.json"
    with open(output_file, 'w') as f:
        json.dump(enriched_results, f, indent=2)
    print(f"\n💾 Saved enriched data: {output_file}")
    
    # STEP 3: Database storage
    summary = save_to_database(enriched_results)
    
    # Final summary
    duration = time.time() - start_time
    
    print(f"\n{'='*70}")
    print(f"✅ PIPELINE COMPLETE")
    print(f"{'='*70}")
    print(f"Duration: {duration:.1f}s")
    print(f"ZwiftPower results: {len(zp_results)}")
    print(f"Enriched results: {len(enriched_results)}")
    print(f"Database saved: {summary['saved']}")
    print(f"Database skipped: {summary['skipped']}")
    print(f"Database errors: {summary['errors']}")
    print(f"\n🎯 Ready for dashboard visualization!")

if __name__ == "__main__":
    main()
