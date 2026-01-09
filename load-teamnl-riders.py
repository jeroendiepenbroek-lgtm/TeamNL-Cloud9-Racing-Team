#!/usr/bin/env python3
"""
Load TeamNL riders into database
Fetches club members from ZwiftRacing API and saves to zwift_racing_riders table
"""

import os
import sys
import requests
from supabase import create_client

CLUB_ID = 2281  # TeamNL
ZWIFTRACING_TOKEN = "650c6d2fc4ef6858d74cbef1"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def fetch_club_members(club_id: int) -> list:
    """Fetch all club members from ZwiftRacing API"""
    url = f"https://www.zwiftracing.app/api/clubs/{club_id}/members"
    headers = {
        "Authorization": f"Bearer {ZWIFTRACING_TOKEN}",
        "Accept": "application/json"
    }
    
    print(f"📡 Fetching club members from ZwiftRacing API...")
    print(f"   URL: {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        members = data.get('data', [])
        print(f"✅ Found {len(members)} club members")
        return members
        
    except Exception as e:
        print(f"❌ Error fetching club members: {e}")
        return []

def save_riders_to_db(supabase, riders: list) -> int:
    """Save riders to zwift_racing_riders table"""
    if not riders:
        return 0
    
    print(f"\n💾 Saving {len(riders)} riders to database...")
    
    saved = 0
    for rider in riders:
        try:
            # Prepare rider data
            rider_data = {
                "rider_id": rider.get('rider_id'),
                "name": rider.get('name'),
                "club_id": CLUB_ID,
                "velo": rider.get('velo'),
                "category": rider.get('category'),
                "updated_at": "now()"
            }
            
            # Upsert (insert or update)
            supabase.table("zwift_racing_riders").upsert(
                rider_data,
                on_conflict="rider_id"
            ).execute()
            
            saved += 1
            print(f"  ✓ Saved: {rider.get('name')} (ID: {rider.get('rider_id')})")
            
        except Exception as e:
            print(f"  ✗ Failed: {rider.get('name')} - {e}")
    
    return saved

def main():
    print("\n🏁 TeamNL Riders Loader")
    print("=" * 80)
    
    # Check credentials
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")
        sys.exit(1)
    
    # Create Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Fetch club members
    members = fetch_club_members(CLUB_ID)
    
    if not members:
        print("❌ No members found")
        sys.exit(1)
    
    # Save to database
    saved = save_riders_to_db(supabase, members)
    
    print("\n" + "=" * 80)
    print(f"✅ COMPLETED: Saved {saved}/{len(members)} riders")
    print("=" * 80)
    
    # Verify
    print("\n📊 Verifying database...")
    response = supabase.table("zwift_racing_riders").select("*", count="exact").eq("club_id", CLUB_ID).execute()
    print(f"✅ Total TeamNL riders in database: {response.count}")
    
    if response.count > 0:
        print("\n🎯 Ready to run: python sync-race-results.py")

if __name__ == "__main__":
    main()
