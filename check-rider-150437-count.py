#!/usr/bin/env python3
"""
Check hoeveel race results er zijn voor rider 150437
"""
from supabase import create_client
import os
from datetime import datetime, timedelta

# Supabase credentials
SUPABASE_URL = "https://bktbeefdmrpxhsyyalvc.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_KEY:
    print("❌ SUPABASE_SERVICE_ROLE_KEY niet gevonden")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("RACE RESULTS CHECK - RIDER 150437")
print("=" * 80)

# Check alle results voor rider 150437
result = supabase.table('race_results')\
    .select('*, race_events(event_date, event_name)')\
    .eq('rider_id', 150437)\
    .order('race_events(event_date)', desc=True)\
    .execute()

print(f"\n📊 Totaal results in database: {len(result.data)}")

# Filter op laatste 90 dagen
cutoff_date = datetime.now() - timedelta(days=90)
recent_results = [r for r in result.data if datetime.fromisoformat(r['race_events']['event_date'].replace('Z', '+00:00')) >= cutoff_date]

print(f"📊 Results laatste 90 dagen: {len(recent_results)}")

# Toon alle results
print(f"\n📋 Alle {len(result.data)} race results:")
print("-" * 80)
for i, r in enumerate(result.data, 1):
    event_date = r['race_events']['event_date'][:10]
    event_name = r['race_events']['event_name'][:50]
    print(f"{i:2}. {event_date} | P{r['position']:2} | Cat {r['category']} | {event_name}")

# Check events zonder rider 150437
print("\n" + "=" * 80)
print("EVENTS ZONDER RIDER 150437")
print("=" * 80)

all_events = supabase.table('race_events').select('event_id, event_date, event_name').execute()
events_with_150437 = set(r['event_id'] for r in result.data)

events_without = [e for e in all_events.data if e['event_id'] not in events_with_150437]
print(f"\n📊 Events zonder rider 150437: {len(events_without)}")
for e in events_without[:5]:
    print(f"  {e['event_date'][:10]} - {e['event_name'][:60]}")
