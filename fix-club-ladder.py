#!/usr/bin/env python3
"""
Quick Fix - Vul ontbrekende Club Ladder results aan met ZwiftRacing.app
"""
import os
import sys
import requests
import time
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

RIDER_ID = 150437
ZWIFTRACING_TOKEN = "650c6d2fc4ef6858d74cbef1"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Club Ladder events zonder results
missing_events = ['5308652', '5290955', '5275729', '5213922', '5149471']

print("="*80)
print("QUICK FIX - CLUB LADDER EVENTS")
print("="*80)

for event_id in missing_events:
    print(f"\n🔄 Event {event_id}...")
    time.sleep(2)  # Rate limit protection
    
    try:
        url = f"https://api.zwiftracing.app/api/public/results/{event_id}"
        headers = {
            "Authorization": ZWIFTRACING_TOKEN,
            "Accept": "application/json"
        }
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, dict):
                saved = 0
                for rider_id_str, rider_data in data.items():
                    try:
                        rider_id = int(rider_id_str)
                        
                        result = {
                            'event_id': event_id,
                            'rider_id': rider_id,
                            'position': rider_data.get('position', 0),
                            'category': rider_data.get('category', 'Unknown'),
                            'category_position': 0,
                            'source': 'zwiftracing'
                        }
                        
                        # Add vELO for our rider
                        if rider_id == RIDER_ID:
                            result['velo_before'] = rider_data.get('velo_before')
                            result['velo_after'] = rider_data.get('velo_after')  
                            result['velo_change'] = rider_data.get('velo_change')
                        
                        supabase.table('race_results').upsert(result, on_conflict='event_id,rider_id').execute()
                        saved += 1
                    except:
                        continue
                
                print(f"   ✅ Saved {saved} results")
        else:
            print(f"   ⚠️  API {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

# Verify
print("\n" + "="*80)
results = supabase.table('race_results').select('*', count='exact').eq('rider_id', RIDER_ID).execute()
print(f"✅ Total results for rider {RIDER_ID}: {results.count}")
print("="*80)
