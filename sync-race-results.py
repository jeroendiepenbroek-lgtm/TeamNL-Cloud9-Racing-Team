#!/usr/bin/env python3
"""
Race Results Database Sync
Sync race results voor alle TeamNL riders naar Supabase
"""

import os
import sys
import json
from datetime import datetime, timedelta
from typing import List, Dict, Set

try:
    from zpdatafetch import Cyclist, Result
    import keyring
    from supabase import create_client, Client
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("Run: pip install zpdatafetch keyring supabase")
    sys.exit(1)

# Configuration
CLUB_ID = 2281  # TeamNL
DAYS_BACK = 90  # Haal laatste 90 dagen op
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Setup credentials
try:
    keyring.set_password("zpdatafetch", "username", "jeroen.diepenbroek@gmail.com")
    keyring.set_password("zpdatafetch", "password", "CloudRacer-9")
except:
    pass

class RaceResultsSync:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        self.cutoff_date = datetime.now() - timedelta(days=DAYS_BACK)
        self.processed_events: Set[str] = set()
        
    def get_team_riders(self) -> List[Dict]:
        """Haal alle TeamNL riders op uit database"""
        print(f"\n📋 Fetching TeamNL riders from database...")
        
        try:
            response = self.supabase.table("api_zwiftracing_riders").select("*").execute()
            riders = response.data
            print(f"✅ Found {len(riders)} TeamNL riders")
            return riders
        except Exception as e:
            print(f"❌ Error fetching riders: {e}")
            return []
    
    def fetch_rider_race_history(self, rider_id: int, rider_name: str) -> List[Dict]:
        """Haal race history voor een rider op"""
        print(f"\n👤 Fetching race history for {rider_name} ({rider_id})...")
        
        try:
            cyclist = Cyclist()
            cyclist.fetch(rider_id)
            
            if not hasattr(cyclist, 'raw') or not cyclist.raw:
                print(f"   ⚠️  No race data found")
                return []
            
            # Parse raw data
            raw_data = cyclist.raw
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)
            
            # Get nested data
            if rider_id in raw_data:
                nested = raw_data[rider_id]
                if isinstance(nested, str):
                    nested = json.loads(nested)
                if isinstance(nested, dict) and 'data' in nested:
                    races = nested['data']
                else:
                    print(f"   ⚠️  No 'data' in nested structure")
                    return []
            else:
                print(f"   ⚠️  Rider ID not in raw data")
                return []
            
            # Filter recent races
            recent_races = []
            for race in races:
                event_date = race.get('event_date', 0)
                if event_date and event_date > 0:
                    race_date = datetime.fromtimestamp(event_date)
                    if race_date >= self.cutoff_date:
                        recent_races.append({
                            'event_id': race.get('zid'),
                            'event_date': race_date,
                            'event_title': race.get('event_title', 'Unknown'),
                            'rider_data': race
                        })
            
            print(f"   ✅ Found {len(recent_races)} races in last {DAYS_BACK} days")
            return recent_races
        
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return []
    
    def fetch_event_results(self, event_id: str, event_title: str) -> Dict:
        """Haal volledige results op voor een event"""
        
        # Skip if already processed
        if event_id in self.processed_events:
            return None
        
        print(f"\n🏁 Fetching results for event {event_id}: {event_title[:50]}...")
        self.processed_events.add(event_id)
        
        try:
            result = Result()
            result.fetch(event_id)
            
            if not hasattr(result, 'raw') or not result.raw:
                print(f"   ⚠️  No data found")
                return None
            
            # Parse raw data
            raw_data = result.raw
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)
            
            # Get event results
            event_key = None
            if event_id in raw_data:
                event_key = event_id
            elif int(event_id) in raw_data:
                event_key = int(event_id)
            
            if not event_key:
                print(f"   ⚠️  Event key not found in response")
                return None
            
            event_data = raw_data[event_key]
            if isinstance(event_data, str):
                event_data = json.loads(event_data)
            
            if not isinstance(event_data, dict) or 'data' not in event_data:
                print(f"   ⚠️  No 'data' in event response")
                return None
            
            results = event_data['data']
            print(f"   ✅ Found {len(results)} riders in event")
            
            return {
                'event_id': event_id,
                'results': results
            }
        
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return None
    
    def save_event_to_db(self, event_id: str, event_title: str, event_date: datetime) -> bool:
        """Sla event metadata op in race_events tabel"""
        try:
            # Check if event already exists
            existing = self.supabase.table("race_events").select("event_id").eq("event_id", event_id).execute()
            
            if existing.data:
                return True  # Already exists
            
            # Insert new event
            event_data = {
                "event_id": event_id,
                "event_name": event_title,
                "event_date": event_date.isoformat(),
                "source": "zwiftpower"
            }
            
            self.supabase.table("race_events").insert(event_data).execute()
            return True
        
        except Exception as e:
            print(f"   ⚠️  Error saving event: {e}")
            return False
    
    def save_results_to_db(self, event_id: str, results: List[Dict]) -> int:
        """Sla race results op in race_results tabel"""
        saved_count = 0
        
        try:
            for result in results:
                rider_id = result.get('zwid')
                if not rider_id:
                    continue
                
                # Check if result already exists
                existing = self.supabase.table("race_results").select("event_id,rider_id").eq("event_id", event_id).eq("rider_id", rider_id).execute()
                
                if existing.data:
                    continue  # Skip duplicates
                
                # Extract and convert values with proper handling
                power_val = result.get('avg_power')  # Correcte API veldnaam
                avg_power = None
                if power_val:
                    try:
                        if isinstance(power_val, list):
                            avg_power = int(float(power_val[0])) if power_val[0] else None
                        else:
                            avg_power = int(float(power_val))
                    except:
                        pass
                
                wkg_val = result.get('avg_wkg')  # Correcte API veldnaam
                avg_wkg = None
                if wkg_val:
                    try:
                        if isinstance(wkg_val, list):
                            avg_wkg = float(wkg_val[0]) if wkg_val[0] else None
                        else:
                            avg_wkg = float(wkg_val)
                    except:
                        pass
                
                time_val = result.get('time')
                time_seconds = None
                if time_val:
                    try:
                        if isinstance(time_val, list):
                            time_seconds = int(float(time_val[0])) if time_val[0] else None
                        else:
                            time_seconds = int(float(time_val))
                    except:
                        pass
                
                result_data = {
                    "event_id": event_id,
                    "rider_id": rider_id,
                    "position": result.get('position') or result.get('pos'),
                    "category": result.get('category'),
                    "avg_power": avg_power,
                    "avg_wkg": avg_wkg,
                    "time_seconds": time_seconds,
                    "team_name": result.get('tm') or result.get('tname'),
                    "source": "zwiftpower"
                }
                
                self.supabase.table("race_results").insert(result_data).execute()
                saved_count += 1
        
        except Exception as e:
            print(f"   ⚠️  Error saving results: {e}")
        
        return saved_count
    
    def sync(self):
        """Main sync process"""
        print("=" * 100)
        print("🚀 RACE RESULTS SYNC - TeamNL")
        print("=" * 100)
        print(f"📅 Fetching races from: {self.cutoff_date.strftime('%Y-%m-%d')}")
        print(f"🏢 Club ID: {CLUB_ID}")
        
        # Start sync log
        sync_start = datetime.now()
        sync_id = None
        sync_log = {
            "sync_type": "full",
            "source": "zwiftpower",
            "events_fetched": 0,
            "results_fetched": 0,
            "results_saved": 0,
            "errors": 0,
            "error_messages": [],
            "success": True
        }
        
        try:
            # Insert sync log
            log_response = self.supabase.table("race_results_sync_log").insert(sync_log).execute()
            sync_id = log_response.data[0]['id'] if log_response.data else None
            
            # Get TeamNL riders
            riders = self.get_team_riders()
            if not riders:
                raise Exception("No riders found")
            
            # Collect all unique events
            all_events = {}  # event_id -> (title, date)
            
            # Process each rider
            for rider in riders:
                rider_id = rider.get('rider_id')
                rider_name = rider.get('name', f"Rider {rider_id}")
                
                if not rider_id:
                    continue
                
                # Fetch rider's race history
                races = self.fetch_rider_race_history(rider_id, rider_name)
                sync_log['results_fetched'] += len(races)
                
                # Collect events
                for race in races:
                    event_id = race['event_id']
                    if event_id and event_id not in all_events:
                        all_events[event_id] = (race['event_title'], race['event_date'])
            
            print(f"\n📊 Found {len(all_events)} unique events to process")
            
            # Process each unique event
            for event_id, (event_title, event_date) in all_events.items():
                # Save event metadata
                self.save_event_to_db(event_id, event_title, event_date)
                
                # Fetch and save results
                event_data = self.fetch_event_results(event_id, event_title)
                
                if event_data and event_data['results']:
                    saved = self.save_results_to_db(event_id, event_data['results'])
                    sync_log['results_saved'] += saved
                
                sync_log['events_fetched'] += 1
            
            # Success
            sync_log['completed_at'] = datetime.now().isoformat()
            sync_log['success'] = True
            
            print("\n" + "=" * 100)
            print("✅ SYNC COMPLETED")
            print("=" * 100)
            print(f"Riders checked:    {len(riders)}")
            print(f"Events fetched:    {sync_log['events_fetched']}")
            print(f"Results saved:     {sync_log['results_saved']}")
            print(f"Duration:          {(datetime.now() - sync_start).total_seconds():.1f}s")
        
        except Exception as e:
            sync_log['success'] = False
            sync_log['errors'] = 1
            sync_log['error_messages'] = [str(e)]
            sync_log['completed_at'] = datetime.now().isoformat()
            print(f"\n❌ SYNC FAILED: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            # Update sync log
            if sync_id:
                try:
                    self.supabase.table("race_results_sync_log").update(sync_log).eq("id", sync_id).execute()
                except:
                    pass

def main():
    print("\n🏁 TeamNL Race Results Sync")
    print("=" * 100)
    
    # Check environment
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing environment variables:")
        print("   SUPABASE_URL")
        print("   SUPABASE_SERVICE_KEY")
        print("\nSet them with:")
        print("   export SUPABASE_URL='your-url'")
        print("   export SUPABASE_SERVICE_KEY='your-key'")
        sys.exit(1)
    
    try:
        sync = RaceResultsSync()
        sync.sync()
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
