#!/usr/bin/env python3
"""
ZwiftPower Robust Fetch - Direct API access

Haalt actuele rider data op via ZwiftPower cache endpoint (public data).
Geen authenticatie nodig voor public profiles.

Usage:
    python zp_robust_fetch.py <zwift_id> [username] [password]

Returns JSON:
    {
        "success": true,
        "data": {
            "zwift_id": 150437,
            "name": "JRøne CloudRacer-9",
            "ftp": 285,
            "category": "B",
            "weight_kg": 75.5,
            "height_cm": 180,
            "flag": "nl",
            "age": "40",
            "team_name": "TeamNL Cloud9",
            "avg_power": 265,
            "avg_wkg": "3.51",
            "last_race_date": 1733072400,
            "last_race_title": "Race Title",
            "profile_url": "https://zwiftpower.com/profile.php?z=150437"
        },
        "race_count": 45
    }
"""

import sys
import json
import requests
from typing import Dict, Any, Optional


def fetch_rider_data(zwift_id: int, username: str = "", password: str = "") -> Dict[str, Any]:
    """
    Fetch rider data from ZwiftPower cache endpoint (public data)
    
    Args:
        zwift_id: Zwift rider ID
        username: Not used (for compatibility)
        password: Not used (for compatibility)
    
    Returns:
        Dictionary with rider data or error info
    """
    try:
        # ZwiftPower public cache endpoint
        profile_url = f"https://zwiftpower.com/cache3/profile/{zwift_id}_all.json"
        
        # Fetch with requests
        response = requests.get(profile_url, timeout=10)
        response.raise_for_status()
        
        rider_data = response.json()
        
        if not rider_data or 'data' not in rider_data:
            return {
                "success": False,
                "error": f"Rider {zwift_id} not found in ZwiftPower",
                "error_type": "NotFoundError"
            }
        
        # Parse ZwiftPower data structure
        profile = rider_data.get('data', {})
        
        # Extract relevant data
        result = {
            "success": True,
            "data": {
                "zwift_id": zwift_id,
                "name": profile.get("name", "Unknown"),
                "ftp": int(profile.get("ftp", 0) or 0),
                "category": profile.get("category", None),
                "weight_kg": float(profile.get("weight", 0) or 0) / 1000 if profile.get("weight") else 0,  # ZP stores in grams
                "height_cm": int(profile.get("height", 0) or 0),
                "flag": profile.get("flag", ""),
                "age": str(profile.get("age", "")),
                "team_name": profile.get("div", ""),
                "avg_power": int(profile.get("ftp", 0) or 0),  # Use FTP as avg_power
                "avg_wkg": str(round(profile.get("wkg_ftp", 0) or 0, 2)),
                "last_race_date": 0,  # Not in cache endpoint
                "last_race_title": "",
                "profile_url": f"https://zwiftpower.com/profile.php?z={zwift_id}"
            },
            "race_count": len(profile.get("races", []))
        }
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python zp_robust_fetch.py <zwift_id> [username] [password]",
            "error_type": "UsageError"
        }))
        sys.exit(1)
    
    try:
        zwift_id = int(sys.argv[1])
        username = sys.argv[2] if len(sys.argv) > 2 else ""
        password = sys.argv[3] if len(sys.argv) > 3 else ""
    except ValueError:
        print(json.dumps({
            "success": False,
            "error": "Invalid zwift_id - must be an integer",
            "error_type": "ValueError"
        }))
        sys.exit(1)
    
    # Fetch data
    result = fetch_rider_data(zwift_id, username, password)
    
    # Output JSON
    print(json.dumps(result, indent=2))
    
    # Exit with error code if failed
    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()
