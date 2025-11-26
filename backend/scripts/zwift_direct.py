#!/usr/bin/env python3
"""
Zwift.com Direct API Access via HTTP Requests
Gebruikt directe Zwift API calls met authenticatie
"""

import sys
import json
import requests

ZWIFT_AUTH_URL = "https://secure.zwift.com/auth/rb_bf03269xpwcmvcmxsx"
ZWIFT_API_BASE = "https://us-or-rly101.zwift.com"

def get_zwift_token(username: str, password: str):
    """
    Verkrijg authenticatie token van Zwift
    """
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Zwift/1.0 (iPhone; iOS 14.0; Scale/2.0)"
    }
    
    payload = {
        "username": username,
        "password": password,
        "client_id": "Zwift_Mobile_Link"
    }
    
    try:
        response = requests.post(
            "https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token",
            data={
                "username": username,
                "password": password,
                "grant_type": "password",
                "client_id": "Zwift_Mobile_Link"
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            return response.json().get("access_token")
        else:
            print(f"❌ Auth fout: {response.status_code} - {response.text}", file=sys.stderr)
            return None
            
    except Exception as e:
        print(f"❌ Auth exception: {e}", file=sys.stderr)
        return None

def get_zwift_profile(username: str, password: str, player_id: int):
    """
    Log in op Zwift en haal profiel data op
    """
    try:
        print(f"🔐 Inloggen op Zwift.com als {username}...", file=sys.stderr)
        
        # Get auth token
        token = get_zwift_token(username, password)
        
        if not token:
            result = {
                "success": False,
                "source": "zwift.com",
                "error": "Kon niet inloggen - Check credentials",
                "note": "Zwift.com API is unofficial en kan wijzigen"
            }
            print(json.dumps(result, indent=2))
            return result
        
        print(f"✅ Token verkregen! Ophalen profiel data...", file=sys.stderr)
        
        # Haal profiel op
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        
        endpoints_to_try = [
            f"{ZWIFT_API_BASE}/api/profiles/{player_id}",
            f"{ZWIFT_API_BASE}/api/profiles/me",
            f"{ZWIFT_API_BASE}/relay/profiles/{player_id}",
        ]
        
        for endpoint in endpoints_to_try:
            try:
                print(f"🔍 Probeer: {endpoint}", file=sys.stderr)
                response = requests.get(endpoint, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    profile_data = response.json()
                    
                    result = {
                        "success": True,
                        "source": "zwift.com",
                        "endpoint": endpoint,
                        "data": profile_data
                    }
                    
                    print(json.dumps(result, indent=2))
                    return result
                else:
                    print(f"   Status: {response.status_code}", file=sys.stderr)
                    
            except Exception as e:
                print(f"   Error: {e}", file=sys.stderr)
                continue
        
        # Geen endpoint werkte
        result = {
            "success": False,
            "source": "zwift.com",
            "error": "Geen profiel data beschikbaar via API",
            "note": "Zwift API endpoints zijn restricted - alleen ZwiftPower is betrouwbaar"
        }
        print(json.dumps(result, indent=2))
        return result
        
    except Exception as e:
        error_result = {
            "success": False,
            "source": "zwift.com",
            "error": str(e),
            "error_type": type(e).__name__
        }
        print(json.dumps(error_result, indent=2))
        return error_result

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({
            "success": False,
            "error": "Usage: zwift_direct.py <player_id> <username> <password>"
        }))
        sys.exit(1)
    
    player_id = int(sys.argv[1])
    username = sys.argv[2]
    password = sys.argv[3]
    
    get_zwift_profile(username, password, player_id)
