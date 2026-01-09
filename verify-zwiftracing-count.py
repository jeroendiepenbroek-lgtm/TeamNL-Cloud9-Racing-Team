#!/usr/bin/env python3
"""
Verifieer exact hoeveel races rider 150437 heeft gereden volgens ZwiftRacing.app
"""
import requests
from datetime import datetime, timedelta

RIDER_ID = 150437

print("=" * 80)
print(f"ZWIFTRACING.APP CHECK - RIDER {RIDER_ID}")
print("=" * 80)

# Fetch van ZwiftRacing.app
url = f"https://www.zwiftracing.app/api/riders/{RIDER_ID}/results"
print(f"\n🌐 Fetching: {url}")

response = requests.get(url)
if response.status_code != 200:
    print(f"❌ Error: {response.status_code}")
    exit(1)

data = response.json()
print(f"✅ Data ontvangen")

# Parse results
rider_data = data.get(str(RIDER_ID), {})
results = rider_data.get('data', [])

print(f"\n📊 Totaal results van ZwiftRacing.app: {len(results)}")

# Filter laatste 90 dagen
cutoff = datetime.now() - timedelta(days=90)
recent_results = []

for result in results:
    event_date = datetime.fromisoformat(result.get('event_date', '').replace('Z', '+00:00'))
    if event_date >= cutoff:
        recent_results.append(result)

print(f"📊 Results laatste 90 dagen: {len(recent_results)}")

# Toon eerste 30
print(f"\n📋 Eerste 30 results (laatste 90 dagen):")
print("-" * 80)
for i, result in enumerate(recent_results[:30], 1):
    event_date = result.get('event_date', '')[:10]
    event_name = result.get('event_name', 'Unknown')[:50]
    position = result.get('position', '?')
    category = result.get('category', '?')
    print(f"{i:2}. {event_date} | P{position:2} | Cat {category} | {event_name}")

if len(recent_results) > 30:
    print(f"\n... en nog {len(recent_results) - 30} results meer")

print("\n" + "=" * 80)
print(f"CONCLUSIE: ZwiftRacing.app heeft {len(recent_results)} results voor rider {RIDER_ID} (laatste 90 dagen)")
print("=" * 80)
