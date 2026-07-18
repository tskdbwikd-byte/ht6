#!/usr/bin/env bash
# Runs monitor.py under sudo using this project's venv (not the system python),
# so scapy and the traffic_store module resolve correctly regardless of what
# `sudo python3` would otherwise pick up.
#
# Usage: ./run_monitor.sh <interface>
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="$ROOT_DIR/venv/bin/python3"
VENV_PIP="$ROOT_DIR/venv/bin/pip"

if [ ! -x "$VENV_PYTHON" ]; then
  echo "Virtual environment not found — run ./start.sh once first to set it up."
  exit 1
fi

if ! "$VENV_PYTHON" -c "import scapy" >/dev/null 2>&1; then
  echo "Installing packet-capture dependencies (scapy)..."
  "$VENV_PIP" install -r "$ROOT_DIR/requirements.txt"
fi

exec sudo "$VENV_PYTHON" "$ROOT_DIR/monitor.py" "$@"
