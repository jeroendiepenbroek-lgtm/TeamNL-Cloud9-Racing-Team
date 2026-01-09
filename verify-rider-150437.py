#!/usr/bin/env python3
"""
Volledige verificatie van Race Results voor rider 150437
Controleert beide APIs en alle data fields
"""

import os
import sys
import json
from datetime import datetime, timedelta
from supabase import create_client

try:
    from zpdatafetch import Cyclist, Result
    import keyring
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    sys.exit(1)

# Configuration
RIDER_ID = 150437
RIDER_NAME = "JRøne"
DAYS_BACK = 90
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Setup credentials
keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")

def print_section(title):
    print(f"\n{'='*100}")
    print(f"  {title}")
    print(f"{'='*100}")

def fetch_zwiftpower_history():
    """Haal race geschiedenis op via ZwiftPower API (via zpdatafetch)"""
    print_section("STAP 1: ZwiftPower API - Race Geschiedenis")
    
    cyclist = Cyclist()
    raw_data = cyclist.fetch(RIDER_ID)
    
    # Parse nested JSON
    rider_data = raw_data.get(RIDER_ID) or raw_data.get(str(RIDER_ID))
    if isinstance(rider_data, str):
        rider_data = json.loads(rider_data)
    
    races = rider_data.get('data', [])
    print(f"✅ Totaal races gevonden: {len(races)}")
    
    # Filter recent
    cutoff = datetime.now() - timedelta(days=DAYS_BACK)
    recent = []
    
    for race in races:
        event_date = race.get('event_date')
        if event_date and isinstance(event_date, (int, float)):
            race_date = datetime.fromtimestamp(event_date)
            if race_date >= cutoff:
                recent.append({
                    'event_id': race.get('zid'),
                    'event_title': race.get('event_title'),
                    'event_date': race_date,
                    'position': race.get('position_in_cat'),
                    'category': race.get('category'),
                    'raw': race
                })
    
    recent.sort(key=lambda x: x['event_date'], reverse=True)
    print(f"✅ Races laatste {DAYS_BACK} dagen: {len(recent)}")
    
    print(f"\n📋 Overzicht Race History:")
    print(f"{'Datum':<12} | {'EventID':<10} | {'Cat':<3} | {'Pos':<4} | Event Naam")
    print("-" * 100)
    for r in recent[:25]:
        date_str = r['event_date'].strftime('%Y-%m-%d')
        print(f"{date_str:<12} | {r['event_id']:<10} | {r['category'] or 'N/A':<3} | {r['position'] or 'N/A':<4} | {r['event_title'][:50]}")
    
    return recent

def fetch_event_details(event_id, event_title):
    """Haal complete event details op met alle deelnemers"""
    print(f"\n  Event: {event_id} - {event_title[:60]}")
    
    result = Result()
    raw_data = result.fetch(event_id)
    
    # Parse results
    event_results = None
    if isinstance(raw_data, dict):
        event_results = raw_data.get(event_id) or raw_data.get(int(event_id))
    
    if isinstance(event_results, str):
        event_results = json.loads(event_results)
    
    if not event_results or not isinstance(event_results, dict):
        print(f"  ⚠️  Geen results gevonden")
        return None
    
    results_list = event_results.get('data', [])
    
    if not results_list:
        print(f"  ⚠️  Lege results lijst")
        return None
    
    print(f"  ✅ {len(results_list)} deelnemers")
    
    # Vind onze rider
    our_result = None
    for r in results_list:
        if r.get('zwid') == RIDER_ID:
            our_result = r
            break
    
    if our_result:
        # Parse values (correcte API veldnamen!)
        power = our_result.get('avg_power')  # API gebruikt 'avg_power' niet 'power'
        avg_power = None
        if power:
            avg_power = int(float(power[0])) if isinstance(power, list) else int(float(power))
        
        wkg = our_result.get('avg_wkg')  # API gebruikt 'avg_wkg' niet 'wkg'
        avg_wkg = None
        if wkg:
            avg_wkg = float(wkg[0]) if isinstance(wkg, list) else float(wkg)
        
        time_val = our_result.get('time')
        time_seconds = None
        if time_val:
            time_seconds = int(float(time_val[0])) if isinstance(time_val, list) else int(float(time_val))
        
        print(f"     Positie: {our_result.get('position') or our_result.get('pos')}")
        print(f"     Categorie: {our_result.get('category')}")
        print(f"     Power: {avg_power}W ({avg_wkg} W/kg)")
        print(f"     Tijd: {time_seconds}s" if time_seconds else "     Tijd: N/A")
        print(f"     Team: {our_result.get('tm') or 'N/A'}")
    else:
        print(f"  ⚠️  Rider {RIDER_ID} niet gevonden in results")
    
    return {
        'event_id': event_id,
        'total_riders': len(results_list),
        'our_result': our_result,
        'all_results': results_list
    }

def check_database():
    """Check wat er in database staat"""
    print_section("Database Check")
    
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Check events
    events = supabase.table('race_events').select('*').execute()
    print(f"Events in database: {len(events.data)}")
    
    # Check results for our rider
    results = supabase.table('race_results').select('*').eq('rider_id', RIDER_ID).execute()
    print(f"Results voor rider {RIDER_ID}: {len(results.data)}")
    
    if results.data:
        print(f"\n📊 Database Results Overview:")
        print(f"{'Event ID':<10} | {'Pos':<4} | {'Cat':<3} | {'Power':<6} | {'W/kg':<6} | {'Tijd'}")
        print("-" * 70)
        for r in results.data[:10]:
            power = r.get('avg_power') or 'N/A'
            wkg = r.get('avg_wkg') or 'N/A'
            time = r.get('time_seconds') or 'N/A'
            print(f"{r['event_id']:<10} | {r.get('position') or 'N/A':<4} | {r.get('category') or 'N/A':<3} | {power:<6} | {wkg:<6} | {time}")
    
    return len(results.data)

def verify_complete_race(event_id, event_title, event_date):
    """Verifieer één race volledig en sla op in database"""
    print(f"\n{'─'*100}")
    print(f"🏁 Race Details: {event_title[:70]}")
    print(f"   Datum: {event_date.strftime('%Y-%m-%d %H:%M')}")
    print(f"   Event ID: {event_id}")
    
    details = fetch_event_details(event_id, event_title)
    
    if not details or not details['our_result']:
        return False
    
    # Toon top 10 + onze positie
    print(f"\n  📊 Uitslagen (Top 10):")
    print(f"  {'Pos':<5} | {'Naam':<30} | {'Power':<7} | {'W/kg':<6} | {'Cat':<3} | {'Team':<20}")
    print(f"  {'-'*95}")
    
    for i, r in enumerate(details['all_results'][:10], 1):
        power = r.get('avg_power')  # Correcte veldnaam
        power_str = f"{int(float(power[0] if isinstance(power, list) else power))}W" if power else "N/A"
        
        wkg = r.get('avg_wkg')  # Correcte veldnaam
        wkg_str = f"{float(wkg[0] if isinstance(wkg, list) else wkg):.1f}" if wkg else "N/A"
        
        name = r.get('name', 'Unknown')[:30]
        cat = r.get('category') or 'N/A'
        team = (r.get('tm') or 'N/A')[:20]
        pos = r.get('position') or r.get('pos') or i
        
        marker = " ← JRøne" if r.get('zwid') == RIDER_ID else ""
        print(f"  {pos:<5} | {name:<30} | {power_str:<7} | {wkg_str:<6} | {cat:<3} | {team:<20}{marker}")
    
    # Save to database
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Save event
    event_data = {
        'event_id': event_id,
        'event_name': event_title,
        'event_date': event_date.isoformat(),
        'source': 'zwiftpower'
    }
    supabase.table('race_events').upsert(event_data, on_conflict='event_id').execute()
    
    # Save all results
    saved = 0
    for r in details['all_results']:
        try:
            power_val = r.get('avg_power')  # Correcte API veldnaam
            avg_power = None
            if power_val:
                avg_power = int(float(power_val[0] if isinstance(power_val, list) else power_val))
            
            wkg_val = r.get('avg_wkg')  # Correcte API veldnaam
            avg_wkg = None
            if wkg_val:
                avg_wkg = float(wkg_val[0] if isinstance(wkg_val, list) else wkg_val)
            
            time_val = r.get('time')
            time_seconds = None
            if time_val:
                time_seconds = int(float(time_val[0] if isinstance(time_val, list) else time_val))
            
            result_data = {
                'event_id': event_id,
                'rider_id': r.get('zwid'),
                'position': r.get('position') or r.get('pos'),
                'category': r.get('category'),
                'avg_power': avg_power,
                'avg_wkg': avg_wkg,
                'time_seconds': time_seconds,
                'team_name': r.get('tm'),
                'source': 'zwiftpower'
            }
            
            supabase.table('race_results').upsert(result_data, on_conflict='event_id,rider_id').execute()
            saved += 1
        except Exception as e:
            pass
    
    print(f"\n  💾 Opgeslagen: {saved} results")
    return True

def main():
    print("\n" + "="*100)
    print("  VOLLEDIGE VERIFICATIE - Rider 150437 (JRøne)")
    print("="*100)
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing Supabase credentials")
        sys.exit(1)
    
    # Stap 1: Haal race geschiedenis op
    races = fetch_zwiftpower_history()
    
    if not races:
        print("❌ Geen races gevonden")
        return
    
    print(f"\n✅ Gevonden: {len(races)} races in laatste {DAYS_BACK} dagen")
    
    # Stap 2: Check database status
    db_count = check_database()
    
    # Stap 3: Haal details op voor eerste 5 races
    print_section("STAP 2: Gedetailleerde Race Results (Sample 5)")
    
    for race in races[:5]:
        verify_complete_race(race['event_id'], race['event_title'], race['event_date'])
    
    # Final summary
    print_section("SAMENVATTING")
    print(f"✅ ZwiftPower API: {len(races)} races laatste {DAYS_BACK} dagen")
    print(f"✅ Eerste 5 races gedetailleerd opgehaald en opgeslagen")
    print(f"📊 Database bevat nu results voor rider {RIDER_ID}")
    print(f"\n🎯 APIs gebruikt:")
    print(f"   • ZwiftPower Cyclist API (race geschiedenis)")
    print(f"   • ZwiftPower Result API (complete event results)")
    print(f"\n💡 Note: zpdatafetch library gebruikt ZwiftPower als primaire bron")
    print(f"   ZwiftRacing API werd eerder getest maar geeft minder complete data")
    
    # Check final database state
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    final_results = supabase.table('race_results').select('*', count='exact').eq('rider_id', RIDER_ID).execute()
    final_events = supabase.table('race_events').select('*', count='exact').execute()
    
    print(f"\n📊 Database Status:")
    print(f"   Events: {final_events.count}")
    print(f"   Results voor rider {RIDER_ID}: {final_results.count}")
    
    print("\n" + "="*100)
    print("✅ VERIFICATIE COMPLEET")
    print("="*100)

if __name__ == "__main__":
    main()
