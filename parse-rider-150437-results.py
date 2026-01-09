#!/usr/bin/env python3
"""
Parse Race Results voor Rider 150437 (laatste 90 dagen)
"""

import sys
import json
from datetime import datetime, timedelta

try:
    from zpdatafetch import Cyclist
    import keyring
except ImportError as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

# Setup credentials
try:
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
except:
    pass

RIDER_ID = 150437

def parse_results():
    print("=" * 110)
    print(f"🏁 Race Results voor Rider 150437 (JRøne) - Laatste 90 dagen")
    print("=" * 110)
    
    cyclist = Cyclist()
    cyclist.fetch(RIDER_ID)
    
    # Get raw data
    if not hasattr(cyclist, 'raw') or not cyclist.raw:
        print("❌ Geen raw data gevonden")
        return
    
    # Debug: check raw data type and structure
    raw_data = cyclist.raw
    print(f"\n🔍 Raw data type: {type(raw_data)}")
    
    # If it's a string, parse JSON
    if isinstance(raw_data, str):
        try:
            raw_data = json.loads(raw_data)
            print("✅ Parsed JSON string")
        except:
            print("❌ Failed to parse JSON")
            return
    
    # Try different data structures
    if isinstance(raw_data, dict):
        print(f"📦 Keys in raw data: {list(raw_data.keys())[:10]}")
        
        # Try nested structure with INTEGER key
        if 150437 in raw_data:
            nested_data = raw_data[150437]
            print(f"   Type of raw_data[150437]: {type(nested_data)}")
            
            # If it's a JSON string, parse it
            if isinstance(nested_data, str):
                try:
                    nested_data = json.loads(nested_data)
                    print("   ✅ Parsed nested JSON string")
                except:
                    print("   ❌ Failed to parse nested JSON")
                    return
            
            if isinstance(nested_data, dict) and 'data' in nested_data:
                races = nested_data['data']
            else:
                print(f"   ❌ No 'data' key in nested structure")
                return
        # Try string key
        elif '150437' in raw_data and 'data' in raw_data['150437']:
            races = raw_data['150437']['data']
        # Try direct data key
        elif 'data' in raw_data:
            races = raw_data['data']
        else:
            print("❌ Could not find 'data' array in raw_data")
            print(f"   Available structure: {json.dumps({k: type(v).__name__ for k, v in list(raw_data.items())[:3]}, indent=2)}")
            return
    else:
        print(f"❌ Unexpected raw_data type: {type(raw_data)}")
        return
    
    print(f"\n📊 Totaal aantal races in data: {len(races)}")
    
    # Filter laatste 90 dagen
    ninety_days_ago = datetime.now() - timedelta(days=90)
    recent_races = []
    
    for race in races:
        try:
            event_date = race.get('event_date', 0)
            if event_date and event_date > 0:
                race_date = datetime.fromtimestamp(event_date)
                if race_date >= ninety_days_ago:
                    recent_races.append({
                        'date': race_date,
                        'title': race.get('event_title', 'Unknown'),
                        'position': race.get('pos', '?'),
                        'category': race.get('category', '?'),
                        'avg_power': race.get('avg_power', [0])[0],
                        'avg_wkg': race.get('avg_wkg', ['0'])[0],
                        'time': race.get('time', [0])[0],
                        'distance': race.get('distance', 0),
                        'zid': race.get('zid', '?')
                    })
        except Exception as e:
            continue
    
    # Sort by date (newest first)
    recent_races.sort(key=lambda x: x['date'], reverse=True)
    
    print(f"\n🔥 Races in laatste 90 dagen: {len(recent_races)}")
    print("=" * 110)
    print(f"💡 Event URL voorbeeld: https://zwiftpower.com/events.php?zid=<EventID>")
    print("=" * 110)
    
    if not recent_races:
        print("\n❌ Geen races gevonden in de laatste 90 dagen")
        return
    
    # Print table header
    print(f"\n{'Datum':<12} {'EventID':<10} {'Event':<45} {'Pos':<5} {'Cat':<5} {'Power':<8} {'W/kg':<6} {'Tijd':<8} {'Dist':<6}")
    print("-" * 110)
    
    for race in recent_races:
        date_str = race['date'].strftime('%Y-%m-%d')
        event_id = str(race['zid'])
        title = race['title'][:43]  # Truncate long titles
        pos = str(race['position'])
        cat = race['category']
        power = f"{race['avg_power']}W"
        wkg = f"{race['avg_wkg']}"
        time_min = int(race['time'] / 60)
        time_sec = int(race['time'] % 60)
        time_str = f"{time_min}:{time_sec:02d}"
        dist = f"{race['distance']}km"
        
        print(f"{date_str:<12} {event_id:<10} {title:<45} {pos:<5} {cat:<5} {power:<8} {wkg:<6} {time_str:<8} {dist:<6}")
    
    # Stats
    print("\n" + "=" * 110)
    print("📈 STATISTIEKEN (laatste 90 dagen)")
    print("=" * 110)
    total_races = len(recent_races)
    avg_power = sum([r['avg_power'] for r in recent_races]) / total_races if total_races > 0 else 0
    avg_position = sum([int(r['position']) for r in recent_races if str(r['position']).isdigit()]) / total_races if total_races > 0 else 0
    
    print(f"Totaal races:      {total_races}")
    print(f"Gemiddelde power:  {avg_power:.0f}W")
    print(f"Gemiddelde positie: {avg_position:.1f}")
    print(f"Eerste race:       {recent_races[-1]['date'].strftime('%Y-%m-%d')}")
    print(f"Laatste race:      {recent_races[0]['date'].strftime('%Y-%m-%d')}")
    
    # Category breakdown
    categories = {}
    for race in recent_races:
        cat = race['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"\nCategorie verdeling:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count} races")

if __name__ == "__main__":
    parse_results()
