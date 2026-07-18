#!/usr/bin/env bash
# Launches just the web app (dashboard backend + frontend) -- no DNS
# resolver, no traffic monitor, no sudo prompts. Use this when you just
# want to poke at the UI/API without touching network enforcement.
#
# For the full thing (resolver + monitor too), use ./start.sh instead.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT_DIR/start.sh" --no-dns --no-monitor "$@"
