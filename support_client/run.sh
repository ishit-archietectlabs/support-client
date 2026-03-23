#!/usr/bin/env bashio
set -e

# ============================================================
# Support Client — Entrypoint (Strict Supervisor-Free)
# ============================================================

bashio::log.info "Starting Support Client (v1.2.0) - Manual SIP Mode"
cd /app
exec node server.js
