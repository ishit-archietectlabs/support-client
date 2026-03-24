#!/bin/bash
set -e

# ============================================================
# Support Client — Entrypoint (Simplified Retention v1.2.7)
# ============================================================

echo "[INFO] Starting Support Client..."

# Ensure we are in the app directory
cd /app

# Hand over to Node.js in the foreground
# This ensures S6/Supervisor tracks the process correctly
exec node server.js
