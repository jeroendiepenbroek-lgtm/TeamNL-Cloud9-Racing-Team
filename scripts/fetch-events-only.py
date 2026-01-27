#!/usr/bin/env python3
import asyncio
import json
import os
from datetime import datetime

# Use zpdatafetch directly to avoid importing the full pipeline (which has zrdatafetch dependency)
try:
    from zpdatafetch import Cyclist, setup_logging
    import keyring
except Exception as e:
    print('Missing dependency:', e)
    print('Install via: pip install zpdatafetch keyring')
    raise

RIDER_ID = 150437
DAYS_BACK = int(os.environ.get('DAYS_BACK', '90'))

setup_logging(console_level='INFO')

async def fetch_events(rider_id, days_back):
    try:
        # Setup credentials (hardcoded for environment as in other scripts)
        try:
            keyring.set_password('zpdatafetch', 'username', 'jeroen.diepenbroek@gmail.com')
            keyring.set_password('zpdatafetch', 'password', 'CloudRacer-9')
        except Exception as e:
            print('Warning setting keyring:', e)

        cyclist = Cyclist()
        await cyclist.afetch(rider_id)
        # Access processed data (fallback when araces isn't available)
        pdata = cyclist.processed.get(rider_id) or cyclist.processed.get(str(rider_id)) or cyclist.processed
        all_races = pdata.get('data', []) if isinstance(pdata, dict) else []

        event_ids = []
        races_out = []
        for r in all_races:
            rd = r if isinstance(r, dict) else getattr(r, 'asdict', lambda: {})()
            eid = rd.get('zid') or rd.get('id') or rd.get('event_id')
            if not eid:
                continue
            event_ids.append(str(eid))
            races_out.append({
                'event_id': str(eid),
                'name': rd.get('event_title') or rd.get('name') or None,
                'date': str(rd.get('date') or rd.get('event_date') or rd.get('date')),
                'category': rd.get('category'),
                'position': rd.get('position'),
                'finishers': rd.get('finishers') or rd.get('finishers')
            })

        result = {
            'rider_id': rider_id,
            'fetch_date': datetime.now().isoformat(),
            'total_races': len(all_races),
            'event_ids': event_ids,
            'races': races_out
        }
        return result
    except Exception as e:
        print('Error fetching events:', e)
        raise

async def main():
    print(f"Fetching events for rider {RIDER_ID} for last {DAYS_BACK} days...")
    events = await fetch_events(RIDER_ID, DAYS_BACK)
    outdir = os.path.join('backend', 'data')
    os.makedirs(outdir, exist_ok=True)
    filename = os.path.join(outdir, f"rider-{RIDER_ID}-events-{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(filename, 'w') as f:
        json.dump(events, f, indent=2)
    print('Saved:', filename)
    print('Event IDs:', len(events.get('event_ids', [])))
    print('\n'.join(str(e) for e in events.get('event_ids', [])))

if __name__ == '__main__':
    asyncio.run(main())
