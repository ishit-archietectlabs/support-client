import os
import requests
import sys
import json

def get_options():
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        print("ERROR: SUPERVISOR_TOKEN not found", file=sys.stderr)
        # Fallback to local test defaults if no token
        return {
            "central_url": "http://localhost:3000",
            "site_name": "Fallback Site",
            "sip_extension": "client_1",
            "sip_password": "changeme_client",
            "asterisk_ws_url": "ws://localhost:8088/ws",
            "sip_domain": "localhost"
        }

    url = "http://supervisor/addons/self/options"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"DEBUG: Supervisor API Status: {response.status_code}", file=sys.stderr)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("data", {})
        else:
            print(f"ERROR: Failed to fetch options: {response.text}", file=sys.stderr)
    except Exception as e:
        print(f"ERROR: Request failed: {e}", file=sys.stderr)

    return {}

if __name__ == "__main__":
    options = get_options()
    # Output in shell-compatible format for run.sh
    for key, value in options.items():
        print(f"{key.upper()}='{value}'")
