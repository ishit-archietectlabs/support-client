#!/usr/bin/env bashio
set -e

# ============================================================
# Support Client — Entrypoint
# ============================================================

# Load configuration via secure Python handler
CONFIG_VARS=$(python3 /app/options_handler.py)
if [ -n "$CONFIG_VARS" ]; then
    eval "export $CONFIG_VARS"
else
    bashio::log.error "Failed to retrieve configuration via Python handler!"
fi

bashio::log.info "Starting Support Client - Site: ${SITE_NAME}"
cd /app
exec node server.js
