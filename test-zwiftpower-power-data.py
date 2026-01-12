#!/usr/bin/env python3
"""
Test ZwiftPower API to check available power data
"""
from zpdatafetch import Result
import json
import keyring

# Setup credentials
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")

RIDER_ID = 150437

print(f"🔍 Testing ZwiftPower API for rider {RIDER_ID}")
print()

try:
    result = Result(zwid=RIDER_ID)
    events = result.results()
    
    if events:
        print(f"✅ Found {len(events)} events")
        
        # Get most recent event
        recent_event = events[0]
        
        print(f"\n📊 Most recent event:")
        print(f"Event ID: {recent_event.get('event_id')}")
        print(f"Event Name: {recent_event.get('event_name')}")
        print(f"Date: {recent_event.get('event_date') or recent_event.get('date')}")
        
        print(f"\n🔑 Available fields:")
        for key in sorted(recent_event.keys()):
            value = recent_event[key]
            value_str = str(value)[:100] if value else 'None'
            print(f"  - {key}: {value_str}")
        
        # Check for power-related fields
        power_fields = [k for k in recent_event.keys() if 'power' in k.lower() or 'watt' in k.lower() or 'w' == k.lower()]
        if power_fields:
            print(f"\n⚡ Power-related fields found:")
            for field in power_fields:
                print(f"  - {field}: {recent_event[field]}")
        
        # Check full JSON structure
        print(f"\n📋 Full JSON structure of recent event:")
        print(json.dumps(recent_event, indent=2))
    
    else:
        print("❌ No events found")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
