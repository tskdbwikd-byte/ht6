#!/usr/bin/env python3
"""
Lightweight DNS blocking resolver ("mini pi-hole").

Blocks queries for domains in the blocklist (NXDOMAIN), transparently
forwards everything else to an upstream resolver, and logs blocked
lookups into TrafficStore so they show up in the dashboard.

Point a device's DNS server at this machine's IP to enforce blocking.

Usage:
    sudo python3 dns_server.py
    sudo python3 dns_server.py --port 5353 --upstream 1.1.1.1
"""

import argparse
import socket
import struct
import threading
from pathlib import Path

from blocklist_store import BlocklistStore
from traffic_store import TrafficStore

ROOT_DIR = Path(__file__).resolve().parent
STORE = TrafficStore(state_file=str(ROOT_DIR / "traffic_state.json"))
BLOCKLIST = BlocklistStore(state_file=str(ROOT_DIR / "blocklist.json"))

GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"


def parse_qname(data: bytes, offset: int) -> str:
    labels = []
    while True:
        length = data[offset]
        if length == 0:
            break
        offset += 1
        labels.append(data[offset:offset + length].decode(errors="ignore"))
        offset += length
    return ".".join(labels)


def extract_question_domain(query: bytes) -> str | None:
    try:
        if len(query) < 12:
            return None
        qdcount = struct.unpack("!H", query[4:6])[0]
        if qdcount < 1:
            return None
        return parse_qname(query, 12).rstrip(".").lower()
    except (IndexError, struct.error):
        return None


def build_nxdomain_response(query: bytes) -> bytes:
    transaction_id = query[:2]
    flags = struct.pack("!H", 0x8183)  # QR=1, RD=1, RA=1, RCODE=3 (NXDOMAIN)
    counts = struct.pack("!HHHH", 1, 0, 0, 0)
    question = query[12:]
    return transaction_id + flags + counts + question


def forward_upstream(query: bytes, upstream: str, upstream_port: int) -> bytes | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as upstream_sock:
            upstream_sock.settimeout(3)
            upstream_sock.sendto(query, (upstream, upstream_port))
            response, _ = upstream_sock.recvfrom(4096)
            return response
    except OSError:
        return None


def handle_query(sock: socket.socket, data: bytes, addr: tuple, upstream: str, upstream_port: int) -> None:
    domain = extract_question_domain(data)

    if domain and STORE.get_power() and BLOCKLIST.is_blocked(domain):
        sock.sendto(build_nxdomain_response(data), addr)
        print(f"{RED}[BLOCKED]{RESET} {addr[0]:<15} -> {domain}")
        STORE.add_event({
            "type": "blocked",
            "domain": domain,
            "source": addr[0],
            "destination": "blocked",
        })
        return

    response = forward_upstream(data, upstream, upstream_port)
    if response is not None:
        sock.sendto(response, addr)
        if domain:
            print(f"{GREEN}[ALLOW]{RESET}   {addr[0]:<15} -> {domain}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Lightweight DNS blocking resolver")
    parser.add_argument("--listen", default="0.0.0.0", help="Address to bind (default 0.0.0.0)")
    parser.add_argument("--port", type=int, default=53, help="Port to bind (default 53)")
    parser.add_argument("--upstream", default="1.1.1.1", help="Upstream resolver to forward to")
    parser.add_argument("--upstream-port", type=int, default=53)
    args = parser.parse_args()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind((args.listen, args.port))
    except PermissionError:
        print(f"Permission denied binding {args.listen}:{args.port}, try running with sudo.")
        raise SystemExit(1)
    except OSError as exc:
        print(f"Could not bind {args.listen}:{args.port}: {exc}")
        print("Port 53 is often already in use by systemd-resolved on Linux desktops.")
        print("Check what's listening with: sudo ss -tulnp | grep :53")
        print("You can test on an unprivileged port instead: --port 5353")
        raise SystemExit(1)

    print(f"DNS resolver listening on {args.listen}:{args.port}, forwarding to {args.upstream}:{args.upstream_port}")
    print(f"Blocklist has {len(BLOCKLIST.domains())} domains. Point a device's DNS at this machine to enforce. Ctrl+C to stop.\n")

    try:
        while True:
            data, addr = sock.recvfrom(512)
            threading.Thread(
                target=handle_query,
                args=(sock, data, addr, args.upstream, args.upstream_port),
                daemon=True,
            ).start()
    except KeyboardInterrupt:
        pass
    finally:
        sock.close()


if __name__ == "__main__":
    main()
