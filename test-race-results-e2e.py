#!/usr/bin/env python3
"""
🏁 E2E Race Results Pipeline - Production Test
ZwiftPower → Backend API → Database (server-side RLS bypass)
"""

import json
import requests
import sys

print("="*70)
print("🏁 E2E RACE RESULTS TEST - Production Backend API")
print("="*70)

# Load enriched results from earlier ZwiftPower fetch
try:
    with open('rider-150437-enriched-results.json') as f:
        results = json.load(f)
    print(f"✅ Loaded {len(results)} race results from file\n")
except FileNotFoundError:
    print("❌ rider-150437-enriched-results.json not found!")
    print("   Run e2e-race-results-pipeline.py first to fetch from ZwiftPower")
    sys.exit(1)

BACKEND_URL = "https://teamnl-cloud9-racing-team-production.up.railway.app"

# Transform to backend API format
payload = []
for r in results:
    payload.append({
        'eventId': int(r['event_id']),
        'riderId': r['rider_id'],
        'position': r['position'],
        'category': r['category'],
        'avgPower': r['avg_power'],
        'avgWkg': r['avg_wkg'],
        'timeSeconds': int(r['time_seconds']) if r['time_seconds'] else None,
        
        # Power intervals (already W/kg from ZwiftPower)
        'power5s': r['power_5s'],
        'power15s': r['power_15s'],
        'power30s': r['power_30s'],
        'power1m': r['power_1m'],
        'power2m': r['power_2m'],
        'power5m': r['power_5m'],
        'power20m': r['power_20m'],
        
        # Rider metadata
        'riderName': r['rider_name'],
        'weight': r['weight'],
        'ftp': r['ftp'],
        'source': 'zwiftpower'
    })

print(f"📤 POST {BACKEND_URL}/api/results/bulk")
print(f"   Payload: {len(payload)} race results\n")

try:
    response = requests.post(
        f"{BACKEND_URL}/api/results/bulk",
        json={'results': payload},
        timeout=30
    )
    
    print(f"📥 Response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ SUCCESS!")
        print(f"   Saved: {data.get('saved', 0)}")
        print(f"   Total: {data.get('total', 0)}")
        print(f"\n🎉 E2E FLOW COMPLETE!")
        print(f"   ZwiftPower Fetch → Backend API → Database ✅")
        print(f"\n📊 Verify at:")
        print(f"   {BACKEND_URL}/api/results/rider/150437")
    else:
        print(f"\n❌ Error: {response.status_code}")
        print(f"   {response.text[:500]}")
        
except Exception as e:
    print(f"\n❌ Exception: {e}")
    print(f"\n💡 TIP: Railway might still be deploying. Wait 1-2 minutes and retry.")
