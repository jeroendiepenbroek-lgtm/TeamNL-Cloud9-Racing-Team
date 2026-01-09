#!/usr/bin/env python3
"""
Tel exact hoeveel races rider 150437 heeft:
1. Volgens ZwiftPower API (laatste 90 dagen)
2. Volgens onze database
"""
from zpdatafetch import Cyclist
from datetime import datetime, timedelta
import json

print("=" * 80)
print("RACE COUNT VERIFICATIE - RIDER 150437")
print("=" * 80)

# STAP 1: Check ZwiftPower
print("\n📡 STAP 1: ZwiftPower API Check")
print("-" * 80)

cyclist = Cyclist()
raw_data = cyclist.fetch(150437)

rider_data = raw_data.get(150437) or raw_data.get(str(150437))
if isinstance(rider_data, str):
    rider_data = json.loads(rider_data)

all_races = rider_data.get('data', [])
cutoff = datetime.now() - timedelta(days=90)

recent_races = []
for race in all_races:
    event_date = race.get('event_date')
    if event_date and isinstance(event_date, (int, float)):
        race_date = datetime.fromtimestamp(event_date)
        if race_date >= cutoff:
            recent_races.append({
                'date': race_date,
                'zid': race.get('zid'),
                'title': race.get('event_title')
            })

recent_races.sort(key=lambda x: x['date'], reverse=True)

print(f"✅ Totaal races: {len(all_races)}")
print(f"✅ Races laatste 90 dagen: {len(recent_races)}")

print(f"\n📋 Lijst van alle {len(recent_races)} races (laatste 90 dagen):")
for i, race in enumerate(recent_races, 1):
    date_str = race['date'].strftime('%Y-%m-%d')
    print(f"{i:2}. {date_str} | Event {race['zid']:7} | {race['title'][:55]}")

print("\n" + "=" * 80)
print(f"CONCLUSIE: Rider 150437 reed in {len(recent_races)} races (laatste 90 dagen volgens ZwiftPower)")
print("=" * 80)
