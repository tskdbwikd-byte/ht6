#!/usr/bin/env python3
"""One-shot health check: is the resolver actually running and enforcing,
or just being logged by monitor.py? Answers the question "is it blocking
ads or not" without having to piece it together by hand.

Also catches a sneaky failure mode: dns_server.py and monitor.py are
long-running processes that hold whatever code was in memory when they
started. Editing traffic_store.py (or the scripts themselves) doesn't
affect them until they're restarted -- they'll keep running, keep logging
traffic, and just silently produce stale/inconsistent data. This checks
each process's start time against the mtime of the files it imports and
flags it if the code has changed since it launched.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Files each long-running process has loaded into memory at start time --
# if any of these were edited after the process started, it's running stale code.
WATCHED_FILES = {
    "dns_server.py": ["dns_server.py", "traffic_store.py", "blocklist_store.py"],
    "monitor.py": ["monitor.py", "traffic_store.py"],
}


def find_pids(pattern: str) -> list[int]:
    result = subprocess.run(["pgrep", "-f", pattern], capture_output=True, text=True)
    if result.returncode != 0:
        return []
    return [int(pid) for pid in result.stdout.split()]


def process_start_time(pid: int) -> float | None:
    try:
        # /proc/<pid>'s mtime is set when the process is created and doesn't
        # change afterward, making it a reliable-enough process-start marker.
        return Path(f"/proc/{pid}").stat().st_mtime
    except (FileNotFoundError, PermissionError):
        return None


def newest_mtime(filenames: list[str]) -> float:
    return max((ROOT / name).stat().st_mtime for name in filenames if (ROOT / name).exists())


def stale_pids(pattern: str) -> list[int]:
    pids = find_pids(pattern)
    if not pids:
        return []
    code_mtime = newest_mtime(WATCHED_FILES[pattern])
    return [pid for pid in pids if (start := process_start_time(pid)) is not None and start < code_mtime]


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def main() -> None:
    traffic = load_json(ROOT / "traffic_state.json")
    blocklist = load_json(ROOT / "blocklist.json")

    power_on = bool(traffic.get("power"))
    domains = blocklist.get("domains", {})
    enabled_presets = blocklist.get("enabled_presets", [])
    totals = traffic.get("totals", {})

    dns_pids = find_pids("dns_server.py")
    monitor_pids = find_pids("monitor.py")
    dns_stale = stale_pids("dns_server.py")
    monitor_stale = stale_pids("monitor.py")

    print("=== Blocker status ===")
    print(f"dns_server.py running:  {'yes' if dns_pids else 'NO -- nothing is being blocked'}")
    print(f"monitor.py running:     {'yes' if monitor_pids else 'no (traffic dashboard will stay empty)'}")
    print(f"Power switch:           {'ON' if power_on else 'OFF (blocking is disabled even if dns_server.py is running)'}")
    print(f"Blocklist size:         {len(domains)} domains ({len(enabled_presets)} community presets enabled)")
    print(f"DNS events logged:      {totals.get('dns', 0)}")
    print(f"Blocked events (ever):  {totals.get('blocked', 0)}")

    if dns_stale:
        print(f"\n/!\\ dns_server.py (pid {', '.join(map(str, dns_stale))}) is running CODE OLDER than "
              "traffic_store.py/blocklist_store.py/dns_server.py on disk -- restart it to pick up recent changes.")
    if monitor_stale:
        print(f"/!\\ monitor.py (pid {', '.join(map(str, monitor_stale))}) is running CODE OLDER than "
              "traffic_store.py/monitor.py on disk -- restart it to pick up recent changes.")

    print()
    print("System DNS (resolvectl status):")
    subprocess.run(["resolvectl", "status"], check=False)

    print()
    print("Next steps:")
    if not dns_pids:
        print("  - Start the resolver:            sudo ./run_dns.sh")
    if dns_stale:
        print("  - Restart the stale resolver:     sudo pkill -f dns_server.py && sudo ./run_dns.sh")
    if monitor_stale:
        print("  - Restart the stale monitor:      sudo pkill -f monitor.py && sudo ./run_monitor.sh <interface>")
    if not power_on:
        print(
            "  - Turn on the power switch:       curl -X POST localhost:8000/api/power "
            "-H 'Content-Type: application/json' -d '{\"on\": true}'"
        )
    print("  - Point this machine's DNS at it: ./enable_system_dns.sh")
    print("  - Confirm it's enforcing:         dig @127.0.0.1 doubleclick.net   (expect NXDOMAIN)")
    print("  - Browser bypassing it? Check Chrome/Firefox 'secure DNS' (DoH) settings are off.")


if __name__ == "__main__":
    main()
