#!/usr/bin/env python3
"""
Simple live DNS monitor.
Sniffs DNS query traffic on a given interface and prints each lookup
in real time — domain, source IP, and query type.

Usage:
    sudo python3 dns_monitor.py <interface>

Example:
    sudo python3 dns_monitor.py wlp197s0f0u1
"""

import sys
import datetime
from scapy.all import sniff, DNS, DNSQR, IP

# ANSI colors for a nicer terminal demo
GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RESET = "\033[0m"

QTYPES = {1: "A", 28: "AAAA", 5: "CNAME", 15: "MX", 16: "TXT", 33: "SRV", 12: "PTR"}


def handle_packet(pkt):
    if pkt.haslayer(DNS) and pkt.haslayer(DNSQR) and pkt[DNS].qr == 0:
        # qr == 0 means this is a query (not a response)
        src_ip = pkt[IP].src if pkt.haslayer(IP) else "?"
        domain = pkt[DNSQR].qname.decode(errors="ignore").rstrip(".")
        qtype = QTYPES.get(pkt[DNSQR].qtype, str(pkt[DNSQR].qtype))
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")

        print(f"{CYAN}[{timestamp}]{RESET} "
              f"{YELLOW}{src_ip:<15}{RESET} -> "
              f"{GREEN}{domain}{RESET} "
              f"({qtype})")


def main():
    if len(sys.argv) != 2:
        print(f"Usage: sudo python3 {sys.argv[0]} <interface>")
        sys.exit(1)

    iface = sys.argv[1]
    print(f"Listening for DNS queries on {iface}... (Ctrl+C to stop)\n")

    try:
        sniff(iface=iface, filter="udp port 53", prn=handle_packet, store=False)
    except PermissionError:
        print("Permission denied — try running with sudo.")
    except OSError as e:
        print(f"Error opening interface '{iface}': {e}")
        print("Check the interface name with: nmcli device status")


if __name__ == "__main__":
    main()