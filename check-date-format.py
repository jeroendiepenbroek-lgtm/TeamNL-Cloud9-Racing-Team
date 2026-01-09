from zpdatafetch import Cyclist
import keyring
import json

keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
keyring.set_password("zpdatafetch", "password", "CloudRacer-9")

cyclist = Cyclist()
raw_data = cyclist.fetch(150437)

# Get rider data
rider_data = raw_data.get(150437) or raw_data.get('150437')
if isinstance(rider_data, str):
    rider_data = json.loads(rider_data)

races = rider_data.get('data', [])
print(f"Total races: {len(races)}")
print(f"\nFirst 3 races with dates:")
for race in races[:3]:
    print(f"  Date: {race.get('event_date')} | EventID: {race.get('zid')} | {race.get('event_title')}")
