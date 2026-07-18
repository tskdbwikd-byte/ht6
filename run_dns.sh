#!/usr/bin/env bash
# Runs dns_server.py under sudo using this project's venv (needed for the
# blocklist_store/traffic_store imports, and to bind port 53).
#
# Usage: ./run_dns.sh [--port 53] [--upstream 1.1.1.1]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="$ROOT_DIR/venv/bin/python3"

if [ ! -x "$VENV_PYTHON" ]; then
  echo "Virtual environment not found — run ./start.sh once first to set it up."
  exit 1
fi

exec sudo "$VENV_PYTHON" "$ROOT_DIR/dns_server.py" "$@"
