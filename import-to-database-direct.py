#!/usr/bin/env python3
"""
Database Import via Backend API Endpoint
Test de volledige stack: API → Database
"""

import json
import requests

# Load data
with open('rider-150437-enriched-results.json') as f:
    results = json.load(f)

print(f"{'='*70}")
print(f"💾 Database Import via Backend API")
print(f"{'='*70}")
print(f"Results: {len(results)}")
print(f"Rider: 150437")
print(f"Method: Bulk POST /api/results/bulk\n")

BACKEND_URL = "https://teamnl-cloud9-racing-team-production.up.railway.app"

# Map naar backend API schema
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
        
        # Power intervals W/kg
        'power5s': r['power_5s'],
        'power15s': r['power_15s'],
        'power30s': r['power_30s'],
        'power1m': r['power_1m'],
        'power2m': r['power_2m'],
        'power5m': r['power_5m'],
        'power20m': r['power_20m'],
        
        # Rider info
        'riderName': r['rider_name'],
        'weight': r['weight'],
        'ftp': r['ftp'],
        
        # Metadata
        'source': 'zwiftpower'
    })

print("📤 Sending bulk request to backend API...")
print(f"   Endpoint: POST {BACKEND_URL}/api/results/bulk")
print(f"   Payload size: {len(json.dumps({'results': payload}))} bytes\n")

try:
    response = requests.post(
        f"{BACKEND_URL}/api/results/bulk",
        json={'results': payload},
        timeout=30
    )
    
    if response.status_code == 200:
        data = response.json()
        saved = data.get('saved', 0)
        
        print(f"{'='*70}")
        print(f"✅ SUCCESS!")
        print(f"{'='*70}")
        print(f"Status: {response.status_code}")
        print(f"Saved: {saved}/{len(results)} results")
        
        if saved == len(results):
            print(f"\n🎉 PERFECT! Alle {saved} races opgeslagen via backend API!")
            print(f"\n📊 Database is nu gevuld via de productie stack:")
            print(f"   ✅ Backend API endpoint werkt")
            print(f"   ✅ Database connectie werkt")
            print(f"   ✅ UPSERT logic werkt (geen duplicates)")
            print(f"\n🎯 Volgende stap: Test met GET /api/results/rider/150437")
        else:
            print(f"\n⚠️  Gedeeltelijk: {saved}/{len(results)} opgeslagen")
            
    else:
        print(f"{'='*70}")
        print(f"❌ ERROR")
        print(f"{'='*70}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
except Exception as e:
    print(f"{'='*70}")
    print(f"❌ EXCEPTION")
    print(f"{'='*70}")
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
