#!/usr/bin/env python3
"""
1. Verificeer sync status voor rider 150437
2. Identificeer ongebruikte views en tabellen voor cleanup
"""
from supabase import create_client
from pathlib import Path
import os

# Load .env.upload
env_file = Path(__file__).parent / '.env.upload'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 100)
print("DEEL 1: VERIFICATIE SYNC STATUS")
print("=" * 100)

# Check race_results voor rider 150437
results = supabase.table('race_results')\
    .select('event_id', count='exact')\
    .eq('rider_id', 150437)\
    .execute()

print(f"\n✅ Race results voor rider 150437: {results.count}")
print(f"   Verwacht: 27 races")
print(f"   Status: {'✅ CORRECT' if results.count == 27 else '❌ MISMATCH'}")

# Check totaal events
events = supabase.table('race_events').select('event_id', count='exact').execute()
print(f"\n✅ Totaal events in database: {events.count}")

# Check totaal results
all_results = supabase.table('race_results').select('event_id', count='exact').execute()
print(f"✅ Totaal results in database: {all_results.count}")

print("\n" + "=" * 100)
print("DEEL 2: DATABASE CLEANUP ANALYSE")
print("=" * 100)

# Lijst alle tabellen en views via information_schema
print("\n📋 Alle tabellen en views:")
print("-" * 100)

# Query voor tabellen
query = """
SELECT 
    schemaname,
    tablename as name,
    'table' as type
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    schemaname,
    viewname as name,
    'view' as type
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY type, name;
"""

# Gebruik RPC of direct query
try:
    # Probeer via RPC als die bestaat
    result = supabase.rpc('exec_sql', {'query': query}).execute()
    items = result.data
except:
    # Anders handmatig ophalen
    print("⚠️  Kan niet direct queryen, haal tabellen handmatig op...")
    items = []

# Tabellen die IN GEBRUIK zijn (moeten NIET verwijderd worden)
ACTIVE_TABLES = {
    # Race Results (nieuw systeem)
    'race_events',
    'race_results', 
    'race_results_sync_log',
    
    # Riders & Teams
    'riders',
    'teams',
    'team_riders',
    'rider_power_intervals',
    
    # Racing data
    'api_zwiftracing_riders',
    'zwift_racing_riders',
    'zwift_racing_results',
    
    # Lineups
    'lineups',
    'lineup_riders',
    
    # Categories
    'rider_categories',
    
    # System
    'migrations',
}

# Views die IN GEBRUIK zijn
ACTIVE_VIEWS = {
    # Race Results dashboards
    'v_dashboard_rider_results',
    'v_dashboard_race_details',
    'v_dashboard_team_results',
    'v_event_statistics',
    'v_rider_performance_summary',
    
    # TeamBuilder views
    'v_recent_race_results',
    'v_teamnl_race_results',
    'v_rider_race_stats',
    
    # Rider views
    'v_riders_with_categories',
    'v_team_roster',
}

print("\n📊 ACTIEVE TABELLEN (IN GEBRUIK):")
for table in sorted(ACTIVE_TABLES):
    print(f"   ✅ {table}")

print("\n📊 ACTIEVE VIEWS (IN GEBRUIK):")
for view in sorted(ACTIVE_VIEWS):
    print(f"   ✅ {view}")

# Check voor lege tabellen
print("\n" + "=" * 100)
print("DEEL 3: LEGE TABELLEN DETECTIE")
print("=" * 100)

for table in ACTIVE_TABLES:
    try:
        result = supabase.table(table).select('*', count='exact', head=True).execute()
        row_count = result.count
        if row_count == 0:
            print(f"⚠️  {table}: LEEG (0 rows)")
        else:
            print(f"✅ {table}: {row_count} rows")
    except Exception as e:
        print(f"❌ {table}: Fout bij ophalen - {str(e)[:50]}")

print("\n" + "=" * 100)
print("CLEANUP AANBEVELINGEN")
print("=" * 100)

print("""
TE VERWIJDEREN (oude/deprecated):
- v_riders_with_power_metrics (oude view)
- v_teambuilder_riders (deprecated)
- race_results_poc (POC tabel)
- zwift_racing_results (vervangen door race_results)
- Alle views met '_old' of '_backup' suffix

TE BEHOUDEN:
- race_events (27 events)
- race_results (2200+ results)
- api_zwiftracing_riders (78 TeamNL riders)
- Alle v_dashboard_* views (voor frontend)
""")

print("\n💡 Wil je een cleanup SQL script genereren? (handmatig uitvoeren)")
