#!/usr/bin/env python3
import json
import sys
import re
from datetime import datetime

# Read the HTML
html = sys.stdin.read()

# Extract the __NEXT_DATA__ script content
match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.DOTALL)
if not match:
    print("ERROR: Could not find __NEXT_DATA__ script")
    sys.exit(1)

json_str = match.group(1)

try:
    data = json.loads(json_str)
    
    # Navigate to rider history
    rider = data.get('props', {}).get('pageProps', {}).get('rider', {})
    history = rider.get('history', [])
    
    print(f"Totaal aantal races in history: {len(history)}")
    print(f"\nAlle Event IDs:")
    print("=" * 120)
    
    event_ids = []
    for i, race in enumerate(history):
        event = race.get('event', {})
        event_id = event.get('id', 'Unknown')
        event_time = event.get('time', 0)
        date_str = datetime.fromtimestamp(event_time).strftime('%Y-%m-%d') if event_time else 'Unknown'
        
        event_ids.append(event_id)
        
        print(f"{i+1:2d}. [{date_str}] Event ID: {event_id:8s} - {event.get('title', 'Unknown')[:80]}")
    
    print("\n" + "=" * 120)
    print(f"\nEvent IDs as JSON array:")
    print(json.dumps(event_ids, indent=2))
    
    print(f"\nEvent IDs as comma-separated:")
    print(",".join(event_ids))
        
except json.JSONDecodeError as e:
    print(f"ERROR parsing JSON: {e}")
    sys.exit(1)
