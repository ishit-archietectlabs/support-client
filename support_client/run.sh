#!/usr/bin/env bashio
set -e

# ============================================================
# Support Client — Entrypoint (Strict Supervisor-Free)
# ============================================================

bashio::log.info "Starting Support Client (v1.1.1) - Native Node Mode"
cd /app
exec node server.js
