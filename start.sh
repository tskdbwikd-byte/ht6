#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
NODE_BIN="$ROOT_DIR/.local/node/node-v20.20.2-linux-x64/bin"

export PATH="$NODE_BIN:$HOME/.local/bin:$PATH"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

if [ ! -f "$BACKEND_DIR/requirements.txt" ]; then
  echo "Backend requirements file missing."
  exit 1
fi

if ! python3 -c "import fastapi" >/dev/null 2>&1; then
  echo "Installing backend dependencies..."
  python3 -m pip install --user --break-system-packages -r "$BACKEND_DIR/requirements.txt"
fi

( cd "$BACKEND_DIR" && python3 -m uvicorn main:app --reload --port 8000 ) &
BACKEND_PID=$!

( cd "$FRONTEND_DIR" && npm run dev -- --host 0.0.0.0 ) &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

wait "$BACKEND_PID" "$FRONTEND_PID"
