#!/usr/bin/env python3
"""
Inspect raw ZwiftPower data voor Rider 150437
"""

import sys
import json

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

def inspect_data():
    print("=" * 70)
    print(f"🔍 Inspecting ZwiftPower Raw Data for Rider {RIDER_ID}")
    print("=" * 70)
    
    cyclist = Cyclist()
    
    try:
        cyclist.fetch(RIDER_ID)
        
        print(f"\n📋 RAW DATA:")
        if hasattr(cyclist, 'raw') and cyclist.raw:
            print(json.dumps(cyclist.raw, indent=2, default=str))
        
        print(f"\n📋 PROCESSED DATA:")
        if hasattr(cyclist, 'processed') and cyclist.processed:
            print(json.dumps(cyclist.processed, indent=2, default=str))
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    inspect_data()
