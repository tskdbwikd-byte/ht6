#!/usr/bin/env bash
# Single entry point: dashboard (frontend + backend), the DNS blocking
# resolver, and the traffic monitor. Previously these were three separate
# scripts (start.sh, run_dns.sh, run_monitor.sh) that had to be run by hand
# in different terminals -- this runs all of them together and tears them
# all down on Ctrl-C.
#
# Usage: ./start.sh [--no-dns] [--no-monitor]
#   DNS_PORT=5353 ./start.sh     # resolver port (default 53)
#   IFACE=wlp194s0 ./start.sh    # interface for the traffic monitor (default: auto-detected)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$ROOT_DIR/venv"
PYTHON_BIN="$VENV_DIR/bin/python"
PIP_BIN="$VENV_DIR/bin/pip"

DNS_PORT="${DNS_PORT:-53}"
IFACE="${IFACE:-$(ip route show default 2>/dev/null | awk '{print $5; exit}')}"
WITH_DNS=1
WITH_MONITOR=1

for arg in "$@"; do
  case "$arg" in
    --no-dns) WITH_DNS=0 ;;
    --no-monitor) WITH_MONITOR=0 ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: ./start.sh [--no-dns] [--no-monitor]"
      exit 1
      ;;
  esac
done

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but wasn't found on PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but wasn't found on PATH (install Node.js first)."
  exit 1
fi

# On WSL, PATH sometimes resolves npm/node to the Windows install (under
# /mnt/c/...) instead of a Linux one. Windows' npm can't handle WSL's
# \\wsl.localhost UNC path and fails with a cryptic CMD.EXE error, so catch
# it early with a clearer message.
if [ -n "${WSL_DISTRO_NAME:-}" ] || grep -qi microsoft /proc/version 2>/dev/null; then
  NPM_PATH="$(command -v npm)"
  case "$NPM_PATH" in
    /mnt/*)
      echo "npm resolves to a Windows install ($NPM_PATH), which doesn't work from WSL paths."
      echo "Install Node.js inside WSL instead, e.g.:"
      echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
      echo "  sudo apt-get install -y nodejs"
      echo "Then make sure a WSL-native npm comes first on PATH (check with: which npm)."
      exit 1
      ;;
  esac
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ] || [ "$FRONTEND_DIR/package-lock.json" -nt "$FRONTEND_DIR/node_modules" ]; then
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

if [ "$WITH_MONITOR" = "1" ] && ! "$PYTHON_BIN" -c "import scapy" >/dev/null 2>&1; then
  echo "Installing packet-capture dependencies (scapy)..."
  "$PIP_BIN" install -r "$ROOT_DIR/requirements.txt"
fi

if [ "$WITH_DNS" = "1" ] || [ "$WITH_MONITOR" = "1" ]; then
  echo "The resolver and traffic monitor need root -- caching your sudo credential now."
  sudo -v
fi

PIDS=()
SUDO_PIDS=()
SHARED_CONNS=()
DNSMASQ_CONF="/etc/NetworkManager/dnsmasq-shared.d/block.conf"

# If this machine is sharing its internet connection as a Wi-Fi hotspot
# (NetworkManager "shared" mode -- e.g. a phone-tethered laptop acting as
# an AP for other devices), NetworkManager's own dnsmasq answers DNS for
# connected devices, bypassing our resolver entirely. This wires that
# dnsmasq to forward through our resolver instead, so phones/laptops that
# join the hotspot get filtered too, with no per-device setup. It's a
# system-wide file outside this repo, so anything that touches
# NetworkManager (an update, a service restart) can silently reset it --
# re-applying it here means a fresh ./start.sh always fixes that instead
# of quietly leaving blocking broken.
wire_shared_dns() {
  [ "$WITH_DNS" = "1" ] || return 0
  command -v nmcli >/dev/null 2>&1 || return 0

  local conn method desired="server=127.0.0.1#$DNS_PORT"
  while IFS= read -r conn; do
    [ -z "$conn" ] && continue
    method="$(nmcli -g ipv4.method connection show "$conn" 2>/dev/null)"
    [ "$method" = "shared" ] && SHARED_CONNS+=("$conn")
  done < <(nmcli -t -f NAME connection show --active 2>/dev/null)

  [ "${#SHARED_CONNS[@]}" -eq 0 ] && return 0

  if [ "$(sudo cat "$DNSMASQ_CONF" 2>/dev/null)" = "$desired" ]; then
    echo "Shared-hotspot DNS (${SHARED_CONNS[*]}) already routed through the resolver."
    return 0
  fi

  echo "Routing shared-hotspot DNS (${SHARED_CONNS[*]}) through the resolver on :$DNS_PORT..."
  sudo mkdir -p "$(dirname "$DNSMASQ_CONF")"
  echo "$desired" | sudo tee "$DNSMASQ_CONF" >/dev/null
  for conn in "${SHARED_CONNS[@]}"; do
    sudo nmcli connection down "$conn" >/dev/null 2>&1 || true
    sudo nmcli connection up "$conn" >/dev/null 2>&1 || true
  done
}

unwire_shared_dns() {
  [ "${#SHARED_CONNS[@]}" -eq 0 ] && return 0
  sudo rm -f "$DNSMASQ_CONF" 2>/dev/null || true
  for conn in "${SHARED_CONNS[@]}"; do
    sudo nmcli connection down "$conn" >/dev/null 2>&1 || true
    sudo nmcli connection up "$conn" >/dev/null 2>&1 || true
  done
}

cleanup() {
  echo
  echo "Shutting down..."
  [ "${#PIDS[@]}" -gt 0 ] && kill "${PIDS[@]}" 2>/dev/null || true
  [ "${#SUDO_PIDS[@]}" -gt 0 ] && sudo kill "${SUDO_PIDS[@]}" 2>/dev/null || true
  unwire_shared_dns
}
trap cleanup EXIT

( cd "$BACKEND_DIR" && "$PYTHON_BIN" -m uvicorn main:app --reload --port 8000 \
    --reload-dir "$ROOT_DIR" \
    --reload-exclude "../frontend/*" \
    --reload-exclude "../venv/*" ) &
PIDS+=("$!")

( cd "$FRONTEND_DIR" && npm run dev -- --host 0.0.0.0 ) &
PIDS+=("$!")

if [ "$WITH_DNS" = "1" ]; then
  if pgrep -f dns_server.py >/dev/null 2>&1; then
    echo "dns_server.py already running, leaving it alone (restart it yourself if you changed its code)."
  else
    sudo "$VENV_DIR/bin/python3" "$ROOT_DIR/dns_server.py" --port "$DNS_PORT" &
    SUDO_PIDS+=("$!")
    echo "Resolver listening on :$DNS_PORT"
  fi
else
  echo "Skipping the resolver (--no-dns) -- nothing will actually be blocked."
fi

wire_shared_dns

if [ "$WITH_MONITOR" = "1" ]; then
  if pgrep -f monitor.py >/dev/null 2>&1; then
    echo "monitor.py already running, leaving it alone (restart it yourself if you changed its code)."
  elif [ -z "$IFACE" ]; then
    echo "Could not auto-detect a network interface for the traffic monitor."
    echo "Re-run with IFACE=<name> ./start.sh, or add --no-monitor to skip it."
  else
    sudo "$VENV_DIR/bin/python3" "$ROOT_DIR/monitor.py" "$IFACE" &
    SUDO_PIDS+=("$!")
    echo "Traffic monitor watching $IFACE"
  fi
else
  echo "Skipping the traffic monitor (--no-monitor) -- dashboard graphs will stay empty."
fi

sleep 2
echo
"$PYTHON_BIN" "$ROOT_DIR/blocker_status.py" || true
echo
echo "Dashboard: http://localhost:5173  (Ctrl-C to stop everything)"

wait
