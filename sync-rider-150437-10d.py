#!/usr/bin/env python3
"""
Quick sync for rider 150437 for last N days using profile scraping as fallback.
Deletes old results older than days_back and fetches fresh ZwiftRacing results for events in the last window.
"""

import os
import sys
import re
import requests
from datetime import datetime, timedelta
from typing import List

# Dynamically load helper functions from the main pipeline (file contains hyphens)
import importlib.util
sync_path = os.path.join(os.getcwd(), 'sync-rider-race-results.py')
spec = importlib.util.spec_from_file_location('sync_rider_module', sync_path)
sync_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync_mod)
# Access functions as sync_mod.delete_old_results, sync_mod.upsert_race_event, sync_mod.upsert_race_results

RIDER_ID = 150437
DAYS_BACK = int(os.environ.get('DAYS_BACK', '10'))
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

PROFILE_URL = f"https://zwiftpower.com/profile.php?z={RIDER_ID}"
EVENTID_RE = re.compile(r"eventid=(\d+)")


def fetch_event_ids_from_profile(limit=200) -> List[int]:
    print(f"🔍 Scraping ZwiftPower profile for event links: {PROFILE_URL}")
    try:
        r = requests.get(PROFILE_URL, timeout=15)
        r.raise_for_status()
        html = r.text
        ids = EVENTID_RE.findall(html)
        unique_ids = []
        for id_ in ids:
            if id_ not in unique_ids:
                unique_ids.append(id_)
        print(f"✅ Found {len(unique_ids)} candidate event IDs on profile")
        return [int(x) for x in unique_ids[:limit]]
    except Exception as e:
        print(f"❌ Failed to fetch profile page: {e}")
        return []


def filter_event_ids_by_date(event_ids: List[int], days_back: int) -> List[int]:
    """Use Zwiftracing results endpoint to fetch event metadata and filter by date within days_back."""
    # Use fetch_zwiftracing_results from the loaded module
    fetch_zwiftracing_results = sync_mod.fetch_zwiftracing_results
    kept = []
    cutoff = datetime.utcnow() - timedelta(days=days_back)
    for eid in event_ids:
        try:
            data = fetch_zwiftracing_results(eid)
            if not data:
                continue
            # event date might be under data.event.event_date or data.event.date
            event_date_str = None
            if isinstance(data, dict):
                event = data.get('event') or data.get('event')
                if event:
                    event_date_str = event.get('event_date') or event.get('date') or event.get('eventStart')
            # Parse various date formats
            if isinstance(event_date_str, (int, float)):
                # epoch seconds
                ed = datetime.utcfromtimestamp(int(event_date_str))
            elif isinstance(event_date_str, str) and event_date_str:
                try:
                    ed = datetime.fromisoformat(event_date_str.replace('Z', '+00:00')).astimezone(tz=None)
                except Exception:
                    try:
                        ed = datetime.strptime(event_date_str.split('T')[0], '%Y-%m-%d')
                    except Exception:
                        ed = None
            else:
                ed = None

            if ed and ed >= cutoff:
                kept.append(eid)
                print(f"   ✅ Event {eid} is within {days_back} days: {ed}")
            else:
                # If we couldn't parse date, be conservative and include recently fetched events from profile ordering
                # But skip if many
                pass
        except Exception as e:
            print(f"   ⚠️  Skipping event {eid}: {e}")
    return kept


def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ SUPABASE env vars not set. Source backend/.env before running.")
        sys.exit(1)

    print(f"🔧 Cleaning old results older than {DAYS_BACK} days for rider {RIDER_ID}...")
    sync_mod.delete_old_results(RIDER_ID, DAYS_BACK)

    candidate_ids = fetch_event_ids_from_profile(limit=200)
    if not candidate_ids:
        print("❌ No event ids found on profile page. Aborting.")
        return

    # Filter by event date via Zwiftracing metadata
    event_ids = filter_event_ids_by_date(candidate_ids, DAYS_BACK)
    if not event_ids:
        print(f"⚠️ No events within last {DAYS_BACK} days found via Zwiftracing metadata.")
        # As fallback, use first N profile IDs
        event_ids = candidate_ids[:20]
        print(f"     Falling back to first {len(event_ids)} candidate IDs from profile")

    total_events = 0
    total_results = 0

    for idx, eid in enumerate(event_ids, 1):
        print(f"\n[{idx}/{len(event_ids)}] Event {eid} - fetching Zwiftracing results...")
        # Use functions from the loaded module
        data = sync_mod.fetch_zwiftracing_results(eid)
        if not data:
            print(f"   ⚠️ No data for event {eid}")
            continue
        # Upsert event and results via module
        try:
            if sync_mod.upsert_race_event(data, {'event_id': eid}):
                total_events += 1
            num = sync_mod.upsert_race_results(eid, data)
            total_results += num
            print(f"   ✅ Processed event {eid}: {num} results upserted")
        except Exception as e:
            print(f"   ❌ Error processing event {eid}: {e}")

    print(f"\n✅ Completed - events added: {total_events}, results added: {total_results}")


if __name__ == '__main__':
    main()
