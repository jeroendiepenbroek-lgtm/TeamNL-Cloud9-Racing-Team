#!/usr/bin/env python3
"""
ZwiftPower Data Fetcher - Python Bridge
Uses zpdatafetch library to get official ZwiftPower data
"""

import sys
import json
import os
from pathlib import Path
from zpdatafetch import Config, ZP

def get_rider_data(zwift_id: int, username: str, password: str):
    """Fetch rider data from ZwiftPower using official library"""
    try:
        # Create config with credentials
        config_path = Path.home() / '.zwiftpower' / 'config.json'
        config_path.parent.mkdir(exist_ok=True)
        
        # Write config file temporarily
        config_data = {
            'username': username,
            'password': password
        }
        
        with open(config_path, 'w') as f:
            json.dump(config_data, f)
        
        # Create ZwiftPower session
        zp = ZP()
        
        # Get rider (cyclist) profile data
        cyclist = zp.cyclist(zwift_id)
        rider_data = cyclist.profile()
        
        if rider_data:
            # Extract relevant fields
            result = {
                'success': True,
                'data': {
                    'zwid': zwift_id,
                    'name': rider_data.get('name', ''),
                    'ftp': rider_data.get('ftp', 0),
                    'weight': rider_data.get('weight', 0),
                    'category': rider_data.get('category', ''),
                    'flag': rider_data.get('flag', ''),
                    'age': rider_data.get('age', 0),
                    'height': rider_data.get('height', 0),
                },
                'source': 'zwiftpower',
                'raw': rider_data  # Include full data for debugging
            }
            print(json.dumps(result))
        else:
            print(json.dumps({
                'success': False,
                'error': 'No data returned from ZwiftPower'
            }))
            
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print(json.dumps({
            'success': False,
            'error': 'Usage: python zp_fetch.py <zwift_id> <username> <password>'
        }))
        sys.exit(1)
    
    zwift_id = int(sys.argv[1])
    username = sys.argv[2]
    password = sys.argv[3]
    
    get_rider_data(zwift_id, username, password)
