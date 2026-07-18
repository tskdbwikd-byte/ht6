import fcntl
import json
import threading
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

SEED_DOMAINS = [
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "adservice.google.com",
    "scorecardresearch.com",
    "adnxs.com",
]


class BlocklistStore:
    def __init__(self, state_file: str | None = None) -> None:
        self.state_file = Path(state_file or Path(__file__).resolve().parent / "blocklist.json")
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
        now = datetime.now(timezone.utc).isoformat()
        return {
            "domains": {
                domain: {"added_at": now, "source": "seed", "reason": "Known ad/tracker domain"}
                for domain in SEED_DOMAINS
            },
            "enabled_presets": [],
        }

    @staticmethod
    def _normalize(data: dict[str, Any]) -> dict[str, Any]:
        return {
            "domains": dict(data.get("domains", {})),
            "enabled_presets": list(data.get("enabled_presets", [])),
        }

    @contextmanager
    def _transact(self) -> Iterator[dict[str, Any]]:
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
    def _normalize_domain(domain: str) -> str:
        return domain.strip().lower().rstrip(".")

    def domains(self) -> set[str]:
        return set(self._read_locked()["domains"].keys())

    def snapshot(self) -> list[dict[str, Any]]:
        state = self._read_locked()
        return [{"domain": domain, **meta} for domain, meta in sorted(state["domains"].items())]

    def add(self, domain: str, source: str = "manual", reason: str | None = None) -> bool:
        domain = self._normalize_domain(domain)
        if not domain:
            return False
        with self._transact() as state:
            if domain in state["domains"]:
                return False
            state["domains"][domain] = {
                "added_at": datetime.now(timezone.utc).isoformat(),
                "source": source,
                "reason": reason,
            }
        return True

    def remove(self, domain: str) -> bool:
        domain = self._normalize_domain(domain)
        with self._transact() as state:
            if domain not in state["domains"]:
                return False
            del state["domains"][domain]
        return True

    def is_blocked(self, domain: str) -> bool:
        domain = self._normalize_domain(domain)
        if not domain:
            return False
        for blocked in self.domains():
            if domain == blocked or domain.endswith("." + blocked):
                return True
        return False

    def enabled_presets(self) -> set[str]:
        return set(self._read_locked()["enabled_presets"])

    def enable_preset(self, preset_id: str, domains: list[str], reason: str | None = None) -> int:
        source = f"preset:{preset_id}"
        added = 0
        with self._transact() as state:
            for domain in domains:
                domain = self._normalize_domain(domain)
                if not domain or domain in state["domains"]:
                    continue
                state["domains"][domain] = {
                    "added_at": datetime.now(timezone.utc).isoformat(),
                    "source": source,
                    "reason": reason,
                }
                added += 1
            if preset_id not in state["enabled_presets"]:
                state["enabled_presets"].append(preset_id)
        return added

    def disable_preset(self, preset_id: str) -> int:
        source = f"preset:{preset_id}"
        removed = 0
        with self._transact() as state:
            for domain in [d for d, meta in state["domains"].items() if meta.get("source") == source]:
                del state["domains"][domain]
                removed += 1
            if preset_id in state["enabled_presets"]:
                state["enabled_presets"].remove(preset_id)
        return removed
