#!/usr/bin/env python3
"""Check raw API response structure"""
import json
from zpdatafetch import Result
import keyring

keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")

# Test met recent event
EVENT_ID = 5331604

result = Result()
raw_data = result.fetch(EVENT_ID)

event_data = raw_data.get(EVENT_ID) or raw_data.get(int(EVENT_ID))
if isinstance(event_data, str):
    event_data = json.loads(event_data)

results_list = event_data.get('data', [])

print(f"Total riders: {len(results_list)}")
print(f"\nFirst rider full data:")
print(json.dumps(results_list[0], indent=2))

print(f"\n\nRider 150437 full data:")
for r in results_list:
    if r.get('zwid') == 150437:
        print(json.dumps(r, indent=2))
        break
