#!/usr/bin/env bash
set -e

CONFIG_PATH=/data/options.json

export CENTRAL_URL=$(jq -r '.central_url' $CONFIG_PATH)
export SITE_NAME=$(jq -r '.site_name' $CONFIG_PATH)
export SIP_EXTENSION=$(jq -r '.sip_extension' $CONFIG_PATH)
export SIP_PASSWORD=$(jq -r '.sip_password' $CONFIG_PATH)
export ASTERISK_WS_URL=$(jq -r '.asterisk_ws_url' $CONFIG_PATH)
export SIP_DOMAIN=$(jq -r '.sip_domain' $CONFIG_PATH)

echo "[INFO] Starting Support Client - Site: $SITE_NAME"
cd /app
exec node server.js
