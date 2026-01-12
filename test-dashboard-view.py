#!/usr/bin/env python3
"""
Create Dashboard Views in Supabase
"""

import os
from supabase import create_client, Client

# Supabase setup
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL of SUPABASE_SERVICE_KEY niet gevonden in environment")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL voor dashboard view
CREATE_VIEW_SQL = """
CREATE OR REPLACE VIEW v_dashboard_rider_results AS
SELECT 
  re.event_id,
  re.event_name,
  re.event_date,
  re.world,
  re.route,
  re.distance_km,
  rr.rider_id,
  rr.position,
  rr.category,
  rr.category_position,
  rr.avg_power,
  rr.avg_wkg,
  rr.time_seconds,
  rr.velo_before,
  rr.velo_after,
  rr.velo_change,
  rr.team_name,
  rr.source,
  -- Bereken tijd in min:sec format
  CONCAT(
    FLOOR(rr.time_seconds / 60)::TEXT, 
    ':', 
    LPAD((rr.time_seconds % 60)::TEXT, 2, '0')
  ) AS time_formatted,
  -- Count total participants
  (SELECT COUNT(*) FROM race_results WHERE event_id = rr.event_id) AS total_participants
FROM race_results rr
INNER JOIN race_events re ON rr.event_id = re.event_id
WHERE re.event_date >= NOW() - INTERVAL '90 days'
ORDER BY re.event_date DESC, rr.position ASC;
"""

def main():
    print("=" * 80)
    print("🎨 CREATE DASHBOARD VIEWS")
    print("=" * 80)
    
    print("\n📝 Creating view: v_dashboard_rider_results...")
    
    try:
        # Execute via RPC or direct SQL
        result = supabase.rpc('exec_sql', {'query': CREATE_VIEW_SQL}).execute()
        print("✅ View created successfully")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n⚠️  Trying alternative method...")
        
        # Alternative: gebruik postgrest direct
        try:
            import psycopg2
            # We kunnen view niet via Supabase client maken, we moeten via SQL
            print("⚠️  Views kunnen alleen via SQL worden aangemaakt")
            print("📋 SQL is klaar in create-dashboard-views.sql")
        except:
            pass
    
    # Test de view door data op te halen
    print("\n🔍 Testing view...")
    try:
        result = supabase.table('v_dashboard_rider_results')\
            .select('*')\
            .eq('rider_id', 150437)\
            .limit(5)\
            .execute()
        
        if result.data:
            print(f"✅ View works! Found {len(result.data)} results for rider 150437:")
            for r in result.data:
                print(f"   {r.get('event_name', 'N/A')[:40]} - P{r.get('position')} | {r.get('avg_power')}W")
        else:
            print("⚠️  View bestaat nog niet of heeft geen data")
    except Exception as e:
        print(f"⚠️  View nog niet beschikbaar: {e}")
    
    # Haal direct data op voor dashboard
    print("\n📊 Direct query voor dashboard:")
    try:
        result = supabase.table('race_results')\
            .select('*, race_events(*)')\
            .eq('rider_id', 150437)\
            .order('event_id', desc=True)\
            .limit(10)\
            .execute()
        
        if result.data:
            print(f"✅ Found {len(result.data)} race results:")
            for r in result.data:
                event = r.get('race_events', {})
                print(f"   Event: {event.get('event_name', 'N/A')[:40]}")
                print(f"   Position: {r.get('position')} | Category: {r.get('category')} | Power: {r.get('avg_power')}W @ {r.get('avg_wkg')}w/kg")
                if r.get('velo_change'):
                    print(f"   Velo: {r.get('velo_before')} → {r.get('velo_after')} (Δ {r.get('velo_change'):+.1f})")
                print()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    main()
