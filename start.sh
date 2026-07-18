#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$ROOT_DIR/venv"
PYTHON_BIN="$VENV_DIR/bin/python"
PIP_BIN="$VENV_DIR/bin/pip"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but wasn't found on PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but wasn't found on PATH (install Node.js first)."
  exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

if [ ! -f "$BACKEND_DIR/requirements.txt" ]; then
  echo "Backend requirements file missing."
  exit 1
fi

if [ ! -x "$PYTHON_BIN" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv "$VENV_DIR"
fi

if ! "$PYTHON_BIN" -c "import fastapi, httpx, watchfiles, pydantic" >/dev/null 2>&1; then
  echo "Installing backend dependencies..."
  "$PIP_BIN" install -r "$BACKEND_DIR/requirements.txt"
fi

# Note: this only runs the web dashboard (frontend + backend). It has no
# dependency on scapy or root privileges. The packet-capture / DNS-blocking
# pieces (monitor.py, dns_server.py) are separate, optional, and run via
# ./run_monitor.sh / ./run_dns.sh — see README.

( cd "$BACKEND_DIR" && "$PYTHON_BIN" -m uvicorn main:app --reload --port 8000 \
    --reload-dir "$ROOT_DIR" \
    --reload-exclude "../frontend/*" \
    --reload-exclude "../venv/*" ) &
BACKEND_PID=$!

( cd "$FRONTEND_DIR" && npm run dev -- --host 0.0.0.0 ) &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

wait "$BACKEND_PID" "$FRONTEND_PID"
