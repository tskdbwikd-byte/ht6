#!/usr/bin/env python3
"""
Enhanced live traffic monitor.
Captures:
  - DNS queries (domain lookups)
  - TLS Client Hello SNI (actual HTTPS connections, even though encrypted)

Usage:
    sudo python3 monitor.py <interface>

Example:
    sudo python3 monitor.py wlp194s0
"""

import json
import sys
import datetime
from pathlib import Path
from scapy.all import sniff, DNS, DNSQR, IP, TCP, Raw

from traffic_store import TrafficStore

# ANSI colors for terminal demo
GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
RESET = "\033[0m"

QTYPES = {1: "A", 28: "AAAA", 5: "CNAME", 15: "MX", 16: "TXT", 33: "SRV", 12: "PTR"}

STORE = TrafficStore(state_file=str(Path(__file__).resolve().parent / "traffic_state.json"))


def extract_sni(payload: bytes):
    """
    Parse a raw TCP payload for a TLS Client Hello and extract the SNI hostname.
    Returns the hostname string, or None if this isn't a Client Hello / no SNI found.
    """
    try:
        # TLS record header: type(1) + version(2) + length(2)
        if len(payload) < 5 or payload[0] != 0x16:  # 0x16 = Handshake
            return None

        # Handshake header: type(1) + length(3)
        if payload[5] != 0x01:  # 0x01 = Client Hello
            return None

        idx = 5 + 4  # skip record header + handshake header
        idx += 2  # client version
        idx += 32  # random
        session_id_len = payload[idx]
        idx += 1 + session_id_len

        cipher_suites_len = int.from_bytes(payload[idx:idx + 2], "big")
        idx += 2 + cipher_suites_len

        compression_len = payload[idx]
        idx += 1 + compression_len

        if idx >= len(payload):
            return None

        extensions_len = int.from_bytes(payload[idx:idx + 2], "big")
        idx += 2
        end = idx + extensions_len

        while idx < end and idx < len(payload):
            ext_type = int.from_bytes(payload[idx:idx + 2], "big")
            ext_len = int.from_bytes(payload[idx + 2:idx + 4], "big")
            idx += 4

            if ext_type == 0x00:  # server_name extension
                # server_name_list_len(2) + type(1) + name_len(2) + name
                name_len = int.from_bytes(payload[idx + 3:idx + 5], "big")
                name = payload[idx + 5:idx + 5 + name_len]
                return name.decode(errors="ignore")

            idx += ext_len

        return None
    except (IndexError, ValueError):
        return None


def handle_packet(pkt):
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")

    # --- DNS queries ---
    if pkt.haslayer(DNS) and pkt.haslayer(DNSQR) and pkt[DNS].qr == 0:
        src_ip = pkt[IP].src if pkt.haslayer(IP) else "?"
        domain = pkt[DNSQR].qname.decode(errors="ignore").rstrip(".")
        qtype = QTYPES.get(pkt[DNSQR].qtype, str(pkt[DNSQR].qtype))

        print(f"{CYAN}[{timestamp}]{RESET} "
              f"{YELLOW}{src_ip:<15}{RESET} "
              f"{'DNS':<6} -> "
              f"{GREEN}{domain}{RESET} "
              f"({qtype})")
        STORE.add_event({
            "type": "dns",
            "domain": domain,
            "source": src_ip,
            "destination": "dns",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
        return

    # --- TLS Client Hello (SNI) ---
    if pkt.haslayer(TCP) and pkt.haslayer(Raw) and pkt.haslayer(IP):
        payload = bytes(pkt[Raw].load)
        sni = extract_sni(payload)
        if sni:
            src_ip = pkt[IP].src
            dst_ip = pkt[IP].dst
            print(f"{CYAN}[{timestamp}]{RESET} "
                  f"{YELLOW}{src_ip:<15}{RESET} "
                  f"{'TLS':<6} -> "
                  f"{MAGENTA}{sni}{RESET} "
                  f"({dst_ip})")
            STORE.add_event({
                "type": "tls",
                "domain": sni,
                "source": src_ip,
                "destination": dst_ip,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            })


def main():
    if len(sys.argv) != 2:
        print(f"Usage: sudo python3 {sys.argv[0]} <interface>")
        sys.exit(1)

    iface = sys.argv[1]
    print(f"Monitoring DNS + TLS (SNI) traffic on {iface}... (Ctrl+C to stop)\n")

    try:
        # port 53 = DNS, port 443 = HTTPS (TLS handshakes)
        sniff(iface=iface, filter="udp port 53 or tcp port 443",
              prn=handle_packet, store=False)
    except PermissionError:
        print("Permission denied — try running with sudo.")
    except OSError as e:
        print(f"Error opening interface '{iface}': {e}")
        print("Check the interface name with: nmcli device status")


if __name__ == "__main__":
    main()
