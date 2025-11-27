#!/usr/bin/env python3
"""
COMPLETE API DISCOVERY - Alle 3 APIs Volledig
Systematisch alle endpoints, fields en nested data documenteren
"""

import json
import requests
import sys
from typing import Dict, Any

# Config
RIDER_ID = 150437
ZWIFT_EMAIL = "jeroen.diepenbroek@gmail.com"
ZWIFT_PASSWORD = "CloudRacer-9"

def count_all_fields(data: Any, prefix: str = "") -> Dict[str, Any]:
    """Recursief alle velden tellen"""
    fields = {}
    
    if isinstance(data, dict):
        for key, value in data.items():
            full_key = f"{prefix}.{key}" if prefix else key
            fields[full_key] = type(value).__name__
            
            if isinstance(value, (dict, list)):
                nested = count_all_fields(value, full_key)
                fields.update(nested)
    
    elif isinstance(data, list) and data:
        # Sample first item
        first_item = data[0]
        if isinstance(first_item, dict):
            for key, value in first_item.items():
                full_key = f"{prefix}[].{key}" if prefix else f"[].{key}"
                fields[full_key] = type(value).__name__
                
                if isinstance(value, (dict, list)):
                    nested = count_all_fields(value, full_key)
                    fields.update(nested)
    
    return fields

print("\n" + "="*80)
print("  🔍 COMPLETE API DISCOVERY - ALLE 3 APIs")
print("  📊 Rider ID:", RIDER_ID)
print("="*80 + "\n")

# =============================================================================
# 1. ZWIFTRACING.APP API
# =============================================================================
print("\n🏁 ZWIFTRACING.APP API")
print("-" * 80)

zwift_racing_endpoints = {}

# GET /api/riders/{id}
print("  Testing /api/riders/{id}...")
r = requests.get(f"https://zwift-ranking.herokuapp.com/api/riders/{RIDER_ID}")
if r.status_code == 200:
    data = r.json()
    fields = count_all_fields(data)
    zwift_racing_endpoints['GET /api/riders/{id}'] = {
        'status': 200,
        'total_fields': len(fields),
        'top_level_keys': list(data.keys()) if isinstance(data, dict) else 'array',
        'sample_data': {
            'name': data.get('name'),
            'riderId': data.get('riderId'),
            'ftp': data.get('power', {}).get('CP'),
            'weight': data.get('weight'),
            'vELO': data.get('race', {}).get('rating'),
            'category': data.get('zpClass')
        }
    }
    print(f"    ✅ {len(fields)} fields (including nested)")

# GET /api/routes
print("  Testing /api/routes...")
r = requests.get("https://zwift-ranking.herokuapp.com/api/routes")
if r.status_code == 200:
    data = r.json()
    fields = count_all_fields(data)
    zwift_racing_endpoints['GET /api/routes'] = {
        'status': 200,
        'total_fields': len(fields),
        'count': len(data),
        'sample': data[0] if data else None
    }
    print(f"    ✅ {len(data)} routes, {len(fields)} fields")

# GET /api/events/upcoming
print("  Testing /api/events/upcoming...")
r = requests.get("https://zwift-ranking.herokuapp.com/api/events/upcoming")
if r.status_code == 200:
    data = r.json()
    fields = count_all_fields(data)
    zwift_racing_endpoints['GET /api/events/upcoming'] = {
        'status': 200,
        'total_fields': len(fields),
        'count': len(data),
        'sample': data[0] if data else None
    }
    print(f"    ✅ {len(data)} events, {len(fields)} fields")
    
    # GET /api/events/{id}/signups
    if data:
        event_id = data[0]['eventId']
        print(f"  Testing /api/events/{event_id}/signups...")
        r2 = requests.get(f"https://zwift-ranking.herokuapp.com/api/events/{event_id}/signups")
        if r2.status_code == 200:
            signups = r2.json()
            signup_fields = count_all_fields(signups)
            zwift_racing_endpoints['GET /api/events/{id}/signups'] = {
                'status': 200,
                'total_fields': len(signup_fields),
                'structure': type(signups).__name__,
                'sample': signups
            }
            print(f"    ✅ {len(signup_fields)} fields")

# GET /api/clubs/{id}
print("  Testing /api/clubs/{id}...")
r = requests.get("https://zwift-ranking.herokuapp.com/api/clubs/2281")
if r.status_code == 200:
    data = r.json()
    zwift_racing_endpoints['GET /api/clubs/{id}'] = {
        'status': 200,
        'data': data
    }
    print(f"    ✅ Club data retrieved")

# =============================================================================
# 2. ZWIFTPOWER API
# =============================================================================
print("\n⚡ ZWIFTPOWER API (via Web Scraping)")
print("-" * 80)

zwiftpower_endpoints = {}

# Profile data (available via HTML scraping)
print("  Profile page: https://zwiftpower.com/profile.php?z={id}")
zwiftpower_endpoints['Profile Page'] = {
    'url': f'https://zwiftpower.com/profile.php?z={RIDER_ID}',
    'data_available': [
        'FTP (calculated from races)',
        'Power curve (5s, 15s, 30s, 1min, 5min, 20min)',
        'W/kg values',
        'Race history',
        'Category',
        'ZP points',
        'Best results'
    ],
    'note': 'Requires Python zpdatafetch library with authentication'
}

# Race results
zwiftpower_endpoints['Race Results'] = {
    'url': 'https://zwiftpower.com/api3.php?do=event_results&zid={event_id}',
    'data_available': [
        'Position', 'Name', 'Time', 'Avg Power', 'Avg HR',
        'Max Power', 'W/kg', 'Speed', 'Distance',
        'Category', 'ZP points', 'DQ status'
    ]
}

# Power analysis
zwiftpower_endpoints['Power Analysis'] = {
    'description': 'Detailed power curve and critical power estimates',
    'data_available': [
        'Critical Power (CP)',
        'W\' (Anaerobic Work Capacity)',
        'Power @ 5s, 15s, 30s, 1min, 5min, 20min',
        'W/kg for all durations',
        'Power rankings vs category'
    ]
}

# Primes (Segments/KOM)
zwiftpower_endpoints['Primes (Sprint/KOM)'] = {
    'url': 'https://zwiftpower.com/api3.php?do=event_primes&zid={event_id}',
    'data_available': [
        'Sprint segments (FTS - First To Sprint)',
        'KOM segments (FAL - Fastest Absolute Lap)',
        'Segment times per category',
        'Sprint rankings',
        'Segment names and distances'
    ]
}

print(f"  ✅ {len(zwiftpower_endpoints)} endpoint categories documented")
print("  ⚠️  Requires authentication - login met credentials")

# =============================================================================
# 3. ZWIFT.COM OFFICIAL API
# =============================================================================
print("\n🌐 ZWIFT.COM OFFICIAL API")
print("-" * 80)

# Get OAuth token
print("  🔐 Authenticating...")
auth_response = requests.post(
    'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
    data={
        'username': ZWIFT_EMAIL,
        'password': ZWIFT_PASSWORD,
        'client_id': 'Zwift_Mobile_Link',
        'grant_type': 'password'
    }
)

if auth_response.status_code != 200:
    print(f"  ❌ Auth failed: {auth_response.status_code}")
    sys.exit(1)

token = auth_response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
zwift_com_endpoints = {}

endpoints_to_test = [
    f'/profiles/{RIDER_ID}',
    f'/profiles/{RIDER_ID}/followers',
    f'/profiles/{RIDER_ID}/followees',
    f'/profiles/{RIDER_ID}/activities',
    f'/profiles/{RIDER_ID}/goals',
    f'/profiles/{RIDER_ID}/followers/count',
    f'/profiles/{RIDER_ID}/followees/count'
]

for endpoint in endpoints_to_test:
    endpoint_name = endpoint.split('/')[-1] if endpoint.split('/')[-1] else 'profile'
    print(f"  Testing {endpoint}...")
    
    r = requests.get(f"https://us-or-rly101.zwift.com/api{endpoint}", headers=headers)
    
    if r.status_code == 200:
        try:
            data = r.json()
            fields = count_all_fields(data)
            
            zwift_com_endpoints[f'GET {endpoint}'] = {
                'status': 200,
                'total_fields': len(fields),
                'structure': type(data).__name__,
                'sample': data if not isinstance(data, list) else data[0] if data else None
            }
            
            print(f"    ✅ {len(fields)} fields")
        except:
            zwift_com_endpoints[f'GET {endpoint}'] = {
                'status': 200,
                'note': 'Non-JSON response'
            }
            print(f"    ⚠️  Non-JSON response")
    else:
        print(f"    ❌ {r.status_code}")

# =============================================================================
# SUMMARY
# =============================================================================
print("\n" + "="*80)
print("  📊 DISCOVERY SUMMARY")
print("="*80)

total_endpoints = 0
total_fields = 0

print("\n1️⃣  ZWIFTRACING.APP API:")
for endpoint, data in zwift_racing_endpoints.items():
    total_endpoints += 1
    if 'total_fields' in data:
        fields = data['total_fields']
        total_fields += fields
        print(f"   {endpoint}: {fields} fields")
    else:
        print(f"   {endpoint}: ✅")

print("\n2️⃣  ZWIFTPOWER API:")
print(f"   {len(zwiftpower_endpoints)} endpoint categories available")
print("   Requires: Python zpdatafetch library + authentication")
total_endpoints += len(zwiftpower_endpoints)

print("\n3️⃣  ZWIFT.COM OFFICIAL API:")
for endpoint, data in zwift_com_endpoints.items():
    total_endpoints += 1
    if 'total_fields' in data:
        fields = data['total_fields']
        total_fields += fields
        print(f"   {endpoint}: {fields} fields")
    elif 'status' in data and data['status'] == 200:
        print(f"   {endpoint}: ✅")

print("\n" + "="*80)
print(f"  🎯 TOTAAL: {total_endpoints} endpoints, {total_fields}+ fields")
print("="*80 + "\n")

# Save results
output = {
    'zwift_racing': zwift_racing_endpoints,
    'zwift_power': zwiftpower_endpoints,
    'zwift_com': zwift_com_endpoints,
    'summary': {
        'total_endpoints': total_endpoints,
        'total_fields': total_fields
    }
}

import os
script_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(script_dir, '..', 'data')
os.makedirs(data_dir, exist_ok=True)
output_path = os.path.join(data_dir, 'complete_api_discovery.json')

with open(output_path, 'w') as f:
    json.dump(output, indent=2, fp=f, default=str)

print(f"✅ Results saved to {output_path}\n")
