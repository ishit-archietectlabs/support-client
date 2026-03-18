#!/usr/bin/with-contenv bashio
set -e

# ============================================================
# Support Client — Entrypoint
# ============================================================

export CENTRAL_URL=$(bashio::config 'central_url')
export SITE_NAME=$(bashio::config 'site_name')
export SIP_EXTENSION=$(bashio::config 'sip_extension')
export SIP_PASSWORD=$(bashio::config 'sip_password')
export ASTERISK_WS_URL=$(bashio::config 'asterisk_ws_url')
export SIP_DOMAIN=$(bashio::config 'sip_domain')

bashio::log.info "Starting Support Client - Site: ${SITE_NAME}"
cd /app
exec node server.js
