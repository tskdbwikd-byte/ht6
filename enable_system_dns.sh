#!/usr/bin/env bash
# Points this machine's system DNS at the local blocking resolver
# (dns_server.py) via systemd-resolved, so lookups actually get filtered
# through the blocklist instead of just being logged by monitor.py.
#
# dns_server.py must already be running on port 53 (sudo ./run_dns.sh) —
# this script only changes where the OS sends its DNS queries.
#
# Usage: ./enable_system_dns.sh [interface]
# Revert with: ./disable_system_dns.sh [interface]
set -euo pipefail

IFACE="${1:-$(ip route show default | awk '{print $5; exit}')}"

if [ -z "$IFACE" ]; then
  echo "Could not detect a default network interface. Pass one explicitly:"
  echo "  ./enable_system_dns.sh <interface>"
  echo "(list interfaces with: ip -brief link)"
  exit 1
fi

if ! command -v resolvectl >/dev/null 2>&1; then
  echo "resolvectl not found — this script only supports systemd-resolved setups."
  echo "On other setups, point your DNS at 127.0.0.1 manually (e.g. edit /etc/resolv.conf"
  echo "or your router's DNS settings)."
  exit 1
fi

echo "Pointing $IFACE's DNS at 127.0.0.1 (dns_server.py)..."
sudo resolvectl dns "$IFACE" 127.0.0.1
sudo resolvectl domain "$IFACE" '~.'

echo
echo "Done. Verify with: resolvectl status $IFACE"
echo "Make sure the resolver is actually running: sudo ./run_dns.sh"
echo "Test it directly: dig @127.0.0.1 doubleclick.net   (expect NXDOMAIN if blocked)"
echo "Revert anytime with: ./disable_system_dns.sh $IFACE"
