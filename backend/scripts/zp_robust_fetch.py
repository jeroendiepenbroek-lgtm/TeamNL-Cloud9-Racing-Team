#!/usr/bin/env python3
"""
ZwiftPower Data Fetcher - Robuuste oplossing met credential management
Haalt rider data op via de officiële zpdatafetch library

Usage:
    python zp_robust_fetch.py <zwift_id> <username> <password>
    
Example:
    python zp_robust_fetch.py 150437 user@example.com password123
"""

import sys
import json
import logging
from zpdatafetch import ZP, Cyclist
from zpdatafetch.config import Config

# Disable verbose logging from zpdatafetch
logging.getLogger('zpdatafetch').setLevel(logging.WARNING)

def setup_credentials(username: str, password: str) -> None:
    """
    Configureer credentials in keyring (programmatisch, geen interactie)
    Dit wordt alleen gedaan als credentials nog niet bestaan of gewijzigd zijn
    """
    config = Config()
    config.load()
    
    # Check of credentials al correct zijn geconfigureerd
    if config.verify_credentials_exist():
        if config.username == username and config.password == password:
            return  # Already configured correctly
    
    # Configureer nieuwe credentials programmatisch (zonder input prompt)
    config.setup(username=username, password=password)
    config.save()

def fetch_rider_data(zwift_id: int) -> dict:
    """
    Haal rider data op van ZwiftPower
    
    Args:
        zwift_id: Zwift rider ID
        
    Returns:
        Dict met rider data of error
    """
    try:
        # Initialiseer ZP session (gebruikt credentials uit keyring)
        zp = ZP()
        
        # Create Cyclist instance en haal data op
        cyclist = Cyclist()
        cyclist.set_zp_session(zp)
        
        # Fetch rider data (zwift_id als argument)
        # Dit returned een dict met zwift_id als INTEGER key: {150437: {"data": [...]}}
        raw_data = cyclist.fetch(zwift_id)
        
        # Data structuur: {zwift_id_int: {"data": [race_results]}}
        # Parse de meest recente race data (index 0)
        rider_data_wrapper = raw_data.get(zwift_id, {})
        rider_races = rider_data_wrapper.get("data", [])
        
        if not rider_races or len(rider_races) == 0:
            return {
                "success": False,
                "error": "No race data found for rider",
                "zwift_id": zwift_id
            }
        
        # Gebruik de meest recente race voor rider info
        latest_race = rider_races[0]
        
        # Parse weight en height (zijn arrays met [value, confidence])
        weight_data = latest_race.get("weight", [0, 0])
        height_data = latest_race.get("height", [0, 0])
        
        weight_kg = float(weight_data[0]) if weight_data[0] else None
        height_cm = int(height_data[0]) if height_data[0] else None
        
        # Parse FTP (string naar int)
        ftp_str = latest_race.get("ftp", "0")
        ftp = int(ftp_str) if ftp_str else None
        
        # Bereken Category (Pace Group) op basis van W/kg
        # ZwiftPower category grenzen (mannen):
        # A+: 4.6+ W/kg, A: 4.0+ W/kg, B: 3.2+ W/kg, C: 2.5+ W/kg, D: < 2.5 W/kg
        calculated_category = "D"
        if ftp and weight_kg and weight_kg > 0:
            wkg = ftp / weight_kg
            if wkg >= 4.6:
                calculated_category = "A+"
            elif wkg >= 4.0:
                calculated_category = "A"
            elif wkg >= 3.2:
                calculated_category = "B"
            elif wkg >= 2.5:
                calculated_category = "C"
        
        # Parse relevante velden
        result = {
            "success": True,
            "data": {
                "zwift_id": zwift_id,
                "name": latest_race.get("name"),
                "ftp": ftp,
                "category": calculated_category,  # Calculated category (Pace Group)
                "event_category": latest_race.get("category"),  # Event-specific category
                "weight_kg": weight_kg,
                "height_cm": height_cm,
                "flag": latest_race.get("flag"),
                "age": latest_race.get("age"),
                "team_name": latest_race.get("tname"),
                "profile_url": f"https://zwiftpower.com/profile.php?z={zwift_id}",
                # Power data (arrays met [value, confidence])
                "avg_power": latest_race.get("avg_power", [None, 0])[0],
                "avg_wkg": latest_race.get("avg_wkg", [None, 0])[0],
                # Laatste race info
                "last_race_date": latest_race.get("event_date"),
                "last_race_title": latest_race.get("event_title"),
            },
            "race_count": len(rider_races),
            "raw_data": raw_data  # Volledige data voor debugging
        }
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }

def main():
    if len(sys.argv) < 4:
        print(json.dumps({
            "success": False,
            "error": "Usage: zp_robust_fetch.py <zwift_id> <username> <password>"
        }))
        sys.exit(1)
    
    zwift_id = int(sys.argv[1])
    username = sys.argv[2]
    password = sys.argv[3]
    
    try:
        # Setup credentials (programmatisch, geen interactie)
        setup_credentials(username, password)
        
        # Haal data op
        result = fetch_rider_data(zwift_id)
        
        # Output als JSON
        print(json.dumps(result, indent=2))
        
        # Exit code op basis van succes
        sys.exit(0 if result.get("success") else 1)
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
