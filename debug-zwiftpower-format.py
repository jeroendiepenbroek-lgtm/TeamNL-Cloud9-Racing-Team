#!/usr/bin/env python3
"""Debug ZwiftPower data format"""
import keyring
from zpdatafetch import Result as ZPResult, setup_logging
import json

setup_logging(console_level='INFO')

# Setup credentials
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")

EVENT_ID = 5331604

print(f"Fetching event {EVENT_ID}...\n")

result = ZPResult()
data = result.fetch(EVENT_ID)

# Parse response
if isinstance(data, dict):
    event_data = data.get(str(EVENT_ID)) or data.get(int(EVENT_ID))
    if event_data and isinstance(event_data, dict):
        results_list = event_data.get('data', [])
        print(f"Total results: {len(results_list)}\n")
        
        if results_list:
            print("First result structure:")
            print(json.dumps(results_list[0], indent=2))
            
            print("\n\nRider 150437:")
            for r in results_list:
                if r.get('zwid') == 150437:
                    print(json.dumps(r, indent=2))
                    break
