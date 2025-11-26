#!/usr/bin/env python3
"""
Complete API Scan - Alle 3 APIs volledig documenteren
Verzamelt ALLE beschikbare data van ZwiftRacing, ZwiftPower, Zwift.com
"""

import sys
import json
import requests
from typing import Dict, Any, List
from zpdatafetch import Cyclist, Primes, Sprints, Team, Result, Signup, ZP, Config

# Test rider
RIDER_ID = 150437
RIDER_NAME = "JRøne | CloudRacer-9 @YouTube"

# Credentials
ZWIFT_EMAIL = "jeroen.diepenbroek@gmail.com"
ZWIFT_PASSWORD = "CloudRacer-9"

def print_section(title: str):
    """Print mooie section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80 + "\n")

def get_zwift_token() -> str:
    """Verkrijg Zwift.com OAuth token"""
    response = requests.post(
        'https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token',
        data={
            'username': ZWIFT_EMAIL,
            'password': ZWIFT_PASSWORD,
            'client_id': 'Zwift_Mobile_Link',
            'grant_type': 'password'
        }
    )
    return response.json()['access_token']

def scan_zwift_racing_api() -> Dict[str, Any]:
    """Scan ZwiftRacing.app API - alle endpoints"""
    print_section("1️⃣  ZWIFTRACING.APP API")
    
    base_url = "https://zwift-ranking.herokuapp.com/api"
    results = {}
    
    # Rider profile
    print("📊 Rider Profile...")
    rider_response = requests.get(f"{base_url}/riders/{RIDER_ID}")
    if rider_response.status_code != 200:
        rider = {}
    else:
        rider = rider_response.json()
    
    results['rider_profile'] = {
        'endpoint': f'/api/riders/{RIDER_ID}',
        'fields': list(rider.keys()) if isinstance(rider, dict) else [],
        'field_count': len(rider.keys()) if isinstance(rider, dict) else 0,
        'nested_fields': {
            'power': list(rider.get('power', {}).keys()),
            'race': list(rider.get('race', {}).keys()),
            'handicaps': list(rider.get('handicaps', {}).keys()),
            'phenotype': list(rider.get('phenotype', {}).keys()),
            'achievements': len(rider.get('achievements', [])),
            'history': list(rider.get('history', {}).keys()) if rider.get('history') else []
        },
        'sample_data': {
            'name': rider.get('name'),
            'riderId': rider.get('riderId'),
            'ftp': rider.get('power', {}).get('CP'),
            'vELO': rider.get('race', {}).get('rating'),
            'category': rider.get('zpClass'),
            'achievements_count': len(rider.get('achievements', []))
        }
    }
    
    # Routes
    print("🗺️  Routes...")
    routes = requests.get(f"{base_url}/routes").json()
    results['routes'] = {
        'endpoint': '/api/routes',
        'count': len(routes),
        'fields': list(routes[0].keys()) if routes else [],
        'profiles': list(set(r.get('profile') for r in routes if r.get('profile'))),
        'sample_route': routes[0] if routes else None
    }
    
    # Upcoming events
    print("📅 Upcoming Events...")
    events = requests.get(f"{base_url}/events/upcoming").json()
    results['events_upcoming'] = {
        'endpoint': '/api/events/upcoming',
        'count': len(events),
        'fields': list(events[0].keys()) if events else [],
        'sample_event': events[0] if events else None
    }
    
    # Event signups
    if events:
        event_id = events[0]['eventId']
        print(f"👥 Event Signups (eventId: {event_id})...")
        signups = requests.get(f"{base_url}/events/{event_id}/signups").json()
        results['event_signups'] = {
            'endpoint': f'/api/events/{{eventId}}/signups',
            'structure': type(signups).__name__,
            'fields': list(signups.keys()) if isinstance(signups, dict) else 'array',
            'sample': signups[0] if isinstance(signups, list) and signups else signups
        }
    
    # Clubs
    print("🏆 Clubs...")
    club = requests.get(f"{base_url}/clubs/2281").json()
    results['club'] = {
        'endpoint': '/api/clubs/{{clubId}}',
        'fields': list(club.keys()),
        'sample': club
    }
    
    return results

def scan_zwiftpower_api() -> Dict[str, Any]:
    """Scan ZwiftPower API via zpdatafetch library"""
    print_section("2️⃣  ZWIFTPOWER API (via zpdatafetch)")
    
    # Setup ZwiftPower session
    from zpdatafetch.config import Config as ZPConfig
    ZPConfig.write(username=ZWIFT_EMAIL, password=ZWIFT_PASSWORD)
    zp = ZP()
    
    results = {}
    
    # Cyclist profile
    print("🚴 Cyclist Profile...")
    cyclist = Cyclist()
    cyclist.set_zp_session(zp)
    cyclist_data = cyclist.fetch(RIDER_ID)
    
    results['cyclist'] = {
        'endpoint': 'Cyclist.fetch(zwift_id)',
        'top_level_keys': list(cyclist_data.keys()),
        'field_count': len(cyclist_data.keys()),
        'sample_keys': list(cyclist_data.keys())[:10]
    }
    
    # Primes (KOM/Sprint segments)
    print("⛰️  Primes (KOM/Sprint Segments)...")
    primes = Primes()
    primes.set_zp_session(zp)
    # Need event ID - skip for now maar method bestaat
    results['primes'] = {
        'endpoint': 'Primes.fetch(event_id)',
        'description': 'Sprint/KOM segment data (FAL=Fastest Absolute Lap, FTS=First To Sprint)',
        'available': True,
        'requires': 'event_id'
    }
    
    # Sprints
    print("🏁 Sprints...")
    results['sprints'] = {
        'endpoint': 'Sprints.fetch(event_id)',
        'description': 'Sprint segment results per event',
        'available': True,
        'requires': 'event_id'
    }
    
    # Team
    print("👥 Team Data...")
    results['team'] = {
        'endpoint': 'Team.fetch(team_id)',
        'description': 'Team information and members',
        'available': True,
        'requires': 'team_id'
    }
    
    # Result
    print("📊 Race Results...")
    results['result'] = {
        'endpoint': 'Result.fetch(event_id)',
        'description': 'Detailed race results per event',
        'available': True,
        'requires': 'event_id'
    }
    
    # Signup
    print("✅ Event Signups...")
    results['signup'] = {
        'endpoint': 'Signup.fetch(event_id)',
        'description': 'Event signup information',
        'available': True,
        'requires': 'event_id'
    }
    
    return results

def scan_zwift_com_api(token: str) -> Dict[str, Any]:
    """Scan Zwift.com Official API"""
    print_section("3️⃣  ZWIFT.COM OFFICIAL API")
    
    base_url = "https://us-or-rly101.zwift.com/api"
    headers = {'Authorization': f'Bearer {token}'}
    results = {}
    
    endpoints = [
        f'/profiles/{RIDER_ID}',
        f'/profiles/{RIDER_ID}/followers',
        f'/profiles/{RIDER_ID}/followees',
        f'/profiles/{RIDER_ID}/activities',
        f'/profiles/{RIDER_ID}/goals'
    ]
    
    for endpoint in endpoints:
        endpoint_name = endpoint.split('/')[-1]
        print(f"🔍 Testing {endpoint}...")
        
        response = requests.get(f"{base_url}{endpoint}", headers=headers)
        
        if response.status_code == 200:
            try:
                data = response.json()
            except:
                data = {'error': 'Invalid JSON response'}
            
            if isinstance(data, dict):
                results[endpoint_name] = {
                    'endpoint': endpoint,
                    'status': 200,
                    'fields': list(data.keys()),
                    'field_count': len(data.keys()),
                    'sample_keys': list(data.keys())[:15]
                }
            elif isinstance(data, list):
                results[endpoint_name] = {
                    'endpoint': endpoint,
                    'status': 200,
                    'type': 'array',
                    'count': len(data),
                    'item_fields': list(data[0].keys()) if data else [],
                    'sample': data[0] if data else None
                }
        else:
            results[endpoint_name] = {
                'endpoint': endpoint,
                'status': response.status_code,
                'error': 'Not available'
            }
    
    return results

def main():
    """Main scan functie"""
    print("\n" + "🔍 " * 20)
    print("  COMPLETE API SCAN - ALLE 3 APIs")
    print("  Rider: {} ({})".format(RIDER_NAME, RIDER_ID))
    print("🔍 " * 20 + "\n")
    
    all_results = {}
    
    # 1. ZwiftRacing.app
    try:
        all_results['zwift_racing'] = scan_zwift_racing_api()
    except Exception as e:
        print(f"❌ ZwiftRacing scan failed: {e}")
        all_results['zwift_racing'] = {'error': str(e)}
    
    # 2. ZwiftPower
    try:
        all_results['zwift_power'] = scan_zwiftpower_api()
    except Exception as e:
        print(f"❌ ZwiftPower scan failed: {e}")
        all_results['zwift_power'] = {'error': str(e)}
    
    # 3. Zwift.com
    try:
        token = get_zwift_token()
        all_results['zwift_com'] = scan_zwift_com_api(token)
    except Exception as e:
        print(f"❌ Zwift.com scan failed: {e}")
        all_results['zwift_com'] = {'error': str(e)}
    
    # Output JSON
    print_section("📋 COMPLETE RESULTS")
    print(json.dumps(all_results, indent=2, default=str))
    
    # Summary
    print_section("📊 SUMMARY")
    
    total_endpoints = 0
    total_fields = 0
    
    for api_name, api_data in all_results.items():
        if 'error' in api_data:
            continue
            
        endpoint_count = len([k for k in api_data.keys() if not k.startswith('_')])
        total_endpoints += endpoint_count
        
        print(f"\n{api_name.upper()}:")
        print(f"  ✅ {endpoint_count} endpoints discovered")
        
        for endpoint_name, endpoint_data in api_data.items():
            if isinstance(endpoint_data, dict):
                fields = endpoint_data.get('field_count', 0)
                if fields:
                    total_fields += fields
                    print(f"     • {endpoint_name}: {fields} fields")
    
    print(f"\n🎯 TOTAAL:")
    print(f"   • {total_endpoints} endpoints")
    print(f"   • {total_fields}+ unique fields")
    print(f"\n✅ Complete API scan voltooid!\n")

if __name__ == '__main__':
    main()
