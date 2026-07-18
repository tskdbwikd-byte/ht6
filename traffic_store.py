import fcntl
import json
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator

TIME_BUCKETS_KEPT = 180  # seconds of 1s-resolution history to keep for the live chart
DOMAIN_COUNTS_CAP = 500
TOP_DOMAINS_RETURNED = 20
KNOWN_TOTAL_KEYS = ("events", "dns", "tls")
BLOCKED_EVENTS_CAP = 500
BLOCKED_EVENTS_RETURNED = 100
BLOCKED_DOMAINS_CAP = 500
TOP_BLOCKED_DOMAINS_RETURNED = 20


class TrafficStore:
    def __init__(self, state_file: str | None = None, max_events: int = 200) -> None:
        self.state_file = Path(state_file or Path(__file__).resolve().parent / "traffic_state.json")
        self.max_events = max_events
        self._lock = threading.Lock()
        self._ensure_state_exists()

    def _ensure_state_exists(self) -> None:
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        try:
            with self.state_file.open("x", encoding="utf-8") as handle:
                json.dump(self._default_state(), handle, indent=2)
                handle.write("\n")
        except FileExistsError:
            pass

    def _default_state(self) -> dict[str, Any]:
        return {
            "totals": {"events": 0, "dns": 0, "tls": 0},
            "recent_events": [],
            "last_event": None,
            "minute_buckets": {},
            "domain_counts": {},
            "power": True,
            "blocked_events": [],
            "blocked_domain_counts": {},
        }

    @staticmethod
    def _normalize(data: dict[str, Any]) -> dict[str, Any]:
        raw_totals = data.get("totals", {})
        totals = {key: int(value) for key, value in raw_totals.items()}
        for key in KNOWN_TOTAL_KEYS:
            totals.setdefault(key, 0)
        return {
            "totals": totals,
            "recent_events": list(data.get("recent_events", [])),
            "last_event": data.get("last_event"),
            "minute_buckets": dict(data.get("minute_buckets", {})),
            "domain_counts": dict(data.get("domain_counts", {})),
            "power": bool(data.get("power", True)),
            "blocked_events": list(data.get("blocked_events", [])),
            "blocked_domain_counts": dict(data.get("blocked_domain_counts", {})),
        }

    @contextmanager
    def _transact(self) -> Iterator[dict[str, Any]]:
        """Cross-process-safe read-modify-write: holds an exclusive flock across
        the whole read + mutate + write cycle so concurrent writers (monitor.py,
        the DNS resolver, and the API server) can't clobber each other."""
        with self._lock:
            with self.state_file.open("r+", encoding="utf-8") as handle:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
                try:
                    handle.seek(0)
                    state = self._normalize(json.load(handle))
                    yield state
                    handle.seek(0)
                    handle.truncate()
                    json.dump(state, handle, indent=2)
                    handle.write("\n")
                    handle.flush()
                finally:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    def _read_locked(self) -> dict[str, Any]:
        with self._lock:
            with self.state_file.open("r", encoding="utf-8") as handle:
                fcntl.flock(handle.fileno(), fcntl.LOCK_SH)
                try:
                    return self._normalize(json.load(handle))
                finally:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    @staticmethod
    def _minute_key(timestamp: str) -> str:
        try:
            dt = datetime.fromisoformat(timestamp)
        except ValueError:
            dt = datetime.now(timezone.utc)
        return dt.strftime("%Y-%m-%dT%H:%M:%S")

    @staticmethod
    def _trim_buckets(buckets: dict[str, Any]) -> dict[str, Any]:
        if len(buckets) <= TIME_BUCKETS_KEPT:
            return buckets
        return dict(sorted(buckets.items())[-TIME_BUCKETS_KEPT:])

    @staticmethod
    def _trim_domains(domains: dict[str, int]) -> dict[str, int]:
        if len(domains) <= DOMAIN_COUNTS_CAP:
            return domains
        ranked = sorted(domains.items(), key=lambda kv: kv[1], reverse=True)
        return dict(ranked[:DOMAIN_COUNTS_CAP])

    def add_event(self, event: dict[str, Any]) -> None:
        event_type = str(event.get("type", "unknown")).lower()
        payload = {
            "type": event_type,
            "domain": event.get("domain") or event.get("host") or "unknown",
            "source": event.get("source", "unknown"),
            "destination": event.get("destination", "unknown"),
            "timestamp": event.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        }

        with self._transact() as state:
            state["recent_events"].insert(0, payload)
            state["recent_events"] = state["recent_events"][: self.max_events]
            state["last_event"] = payload
            state["totals"]["events"] = int(state["totals"].get("events", 0)) + 1
            state["totals"][event_type] = int(state["totals"].get(event_type, 0)) + 1

            minute_key = self._minute_key(payload["timestamp"])
            bucket = state["minute_buckets"].setdefault(minute_key, {"events": 0, "dns": 0, "tls": 0})
            bucket["events"] = bucket.get("events", 0) + 1
            bucket[event_type] = bucket.get(event_type, 0) + 1
            state["minute_buckets"] = self._trim_buckets(state["minute_buckets"])

            domain = payload["domain"]
            state["domain_counts"][domain] = int(state["domain_counts"].get(domain, 0)) + 1
            state["domain_counts"] = self._trim_domains(state["domain_counts"])

            if event_type == "blocked":
                state["blocked_events"].insert(0, payload)
                state["blocked_events"] = state["blocked_events"][:BLOCKED_EVENTS_CAP]
                state["blocked_domain_counts"][domain] = (
                    int(state["blocked_domain_counts"].get(domain, 0)) + 1
                )
                if len(state["blocked_domain_counts"]) > BLOCKED_DOMAINS_CAP:
                    ranked = sorted(
                        state["blocked_domain_counts"].items(), key=lambda kv: kv[1], reverse=True
                    )
                    state["blocked_domain_counts"] = dict(ranked[:BLOCKED_DOMAINS_CAP])

    def snapshot(self) -> dict[str, Any]:
        state = self._read_locked()
        empty_bucket = {"events": 0, "dns": 0, "tls": 0, "blocked": 0}
        now = datetime.now(timezone.utc)
        timeseries = []
        for offset in range(TIME_BUCKETS_KEPT - 1, -1, -1):
            key = (now - timedelta(seconds=offset)).strftime("%Y-%m-%dT%H:%M:%S")
            counts = {**empty_bucket, **state["minute_buckets"].get(key, {})}
            timeseries.append({"minute": key, **counts})
        top_domains = [
            {"domain": domain, "count": count}
            for domain, count in sorted(state["domain_counts"].items(), key=lambda kv: kv[1], reverse=True)[
                :TOP_DOMAINS_RETURNED
            ]
        ]
        top_blocked_domains = [
            {"domain": domain, "count": count}
            for domain, count in sorted(
                state["blocked_domain_counts"].items(), key=lambda kv: kv[1], reverse=True
            )[:TOP_BLOCKED_DOMAINS_RETURNED]
        ]
        return {
            "totals": state["totals"],
            "recent_events": state["recent_events"],
            "last_event": state["last_event"],
            "timeseries": timeseries,
            "top_domains": top_domains,
            "domain_total": len(state["domain_counts"]),
            "power": state["power"],
            "blocked_events": state["blocked_events"][:BLOCKED_EVENTS_RETURNED],
            "top_blocked_domains": top_blocked_domains,
            "blocked_domain_total": len(state["blocked_domain_counts"]),
        }

    def get_power(self) -> bool:
        return self._read_locked()["power"]

    def set_power(self, on: bool) -> bool:
        with self._transact() as state:
            state["power"] = bool(on)
        return bool(on)

    def reset_activity(self) -> None:
        with self._transact() as state:
            state["totals"] = {"events": 0, "dns": 0, "tls": 0}
            state["recent_events"] = []
            state["last_event"] = None
            state["minute_buckets"] = {}
            state["domain_counts"] = {}
            state["blocked_events"] = []
            state["blocked_domain_counts"] = {}
