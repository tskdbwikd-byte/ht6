#!/usr/bin/env bash
# Reverts the DNS override made by enable_system_dns.sh, restoring whatever
# DNS servers the network/DHCP normally provides for this interface.
#
# Usage: ./disable_system_dns.sh [interface]
set -euo pipefail

IFACE="${1:-$(ip route show default | awk '{print $5; exit}')}"

if [ -z "$IFACE" ]; then
  echo "Could not detect a default network interface. Pass one explicitly:"
  echo "  ./disable_system_dns.sh <interface>"
  echo "(list interfaces with: ip -brief link)"
  exit 1
fi

if ! command -v resolvectl >/dev/null 2>&1; then
  echo "resolvectl not found — this script only supports systemd-resolved setups."
  exit 1
fi

echo "Reverting DNS override on $IFACE..."
sudo resolvectl revert "$IFACE"
echo "Done. Verify with: resolvectl status $IFACE"
