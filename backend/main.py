import asyncio
import json
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from watchfiles import awatch

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from ai_logger import build_summary_prompt
from ai_logger import OLLAMA_URL as AI_LOG_OLLAMA_URL
from blocklist_store import BlocklistStore
from chat import OLLAMA_CHAT_URL, build_messages
from preset_blocklists import PRESETS
from suggestions import MAX_CANDIDATES, OLLAMA_MODEL, OLLAMA_URL, build_prompt, parse_suggestions
from traffic_store import TrafficStore

STORE = TrafficStore(state_file=str(ROOT_DIR / "traffic_state.json"))
BLOCKLIST = BlocklistStore(state_file=str(ROOT_DIR / "blocklist.json"))

_connections: set[WebSocket] = set()
_connections_lock = asyncio.Lock()
_last_ai_log_blocked_total = 0
_last_ai_log_event_total = 0
_ai_log_generating = False


AI_BLOCKLIST_SOURCES = {"ollama", "ollama-auto"}


def build_ai_blocked_domains(blocked_domain_counts: dict[str, int]) -> list[dict[str, Any]]:
    entries = [
        {
            "domain": entry["domain"],
            "reason": entry.get("reason"),
            "source": entry["source"],
            "addedAt": entry.get("added_at"),
            "count": blocked_domain_counts.get(entry["domain"], 0),
        }
        for entry in BLOCKLIST.snapshot()
        if entry.get("source") in AI_BLOCKLIST_SOURCES
    ]
    entries.sort(key=lambda e: e["count"], reverse=True)
    return entries


def build_dashboard_payload() -> dict[str, Any]:
    snapshot = STORE.snapshot()
    totals = snapshot["totals"]
    last_event = snapshot["last_event"]

    return {
        "power": snapshot["power"],
        "lastSync": last_event["timestamp"].split("T")[1][:8] if last_event else "No traffic yet",
        "totals": totals,
        "uniqueDomains": snapshot["domain_total"],
        "recentEvents": snapshot["recent_events"][:10],
        "timeseries": snapshot["timeseries"],
        "topDomains": snapshot["top_domains"],
        "blockedEvents": snapshot["blocked_events"],
        "topBlockedDomains": snapshot["top_blocked_domains"],
        "blockedDomainTotal": snapshot["blocked_domain_total"],
        "aiBlockedDomains": build_ai_blocked_domains(snapshot["blocked_domain_counts"]),
        "aiLog": snapshot["ai_log"],
    }


async def _broadcast(payload: dict[str, Any]) -> None:
    message = json.dumps(payload)
    async with _connections_lock:
        targets = list(_connections)
    dead: set[WebSocket] = set()
    for ws in targets:
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    if dead:
        async with _connections_lock:
            _connections.difference_update(dead)


async def _watch_state_file() -> None:
    async for _changes in awatch(STORE.state_file):
        payload = build_dashboard_payload()
        await _broadcast(payload)
        asyncio.create_task(_maybe_generate_ai_log_entry(payload["totals"]))


@asynccontextmanager
async def lifespan(app: FastAPI):
    watcher_task = asyncio.create_task(_watch_state_file())
    auto_analyze_task = asyncio.create_task(_auto_analyze_loop())
    try:
        yield
    finally:
        watcher_task.cancel()
        auto_analyze_task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI!"}


@app.get("/api/dashboard")
def dashboard():
    return build_dashboard_payload()


@app.post("/api/activity/reset")
def reset_activity():
    STORE.reset_activity()
    return build_dashboard_payload()


class PowerUpdate(BaseModel):
    on: bool


@app.get("/api/power")
def get_power():
    return {"on": STORE.get_power()}


@app.post("/api/power")
def set_power(update: PowerUpdate):
    return {"on": STORE.set_power(update.on)}


@app.get("/api/blocklist")
def list_blocklist():
    return {"domains": BLOCKLIST.snapshot()}


class BlocklistAdd(BaseModel):
    domain: str
    reason: str | None = None
    source: str = "manual"


@app.post("/api/blocklist")
def add_blocklist(entry: BlocklistAdd):
    added = BLOCKLIST.add(entry.domain, source=entry.source, reason=entry.reason)
    if not added:
        raise HTTPException(status_code=409, detail="Domain already blocked")
    return {"domains": BLOCKLIST.snapshot()}


@app.delete("/api/blocklist/{domain}")
def remove_blocklist(domain: str):
    removed = BLOCKLIST.remove(domain)
    if not removed:
        raise HTTPException(status_code=404, detail="Domain not found")
    return {"domains": BLOCKLIST.snapshot()}


def build_preset_status() -> list[dict[str, Any]]:
    enabled = BLOCKLIST.enabled_presets()
    return [
        {
            "id": preset_id,
            "name": preset["name"],
            "description": preset["description"],
            "domain_count": len(preset["domains"]),
            "enabled": preset_id in enabled,
        }
        for preset_id, preset in PRESETS.items()
    ]


@app.get("/api/blocklist/presets")
def list_presets():
    return {"presets": build_preset_status()}


@app.post("/api/blocklist/presets/{preset_id}/enable")
def enable_preset(preset_id: str):
    preset = PRESETS.get(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Unknown preset")
    BLOCKLIST.enable_preset(preset_id, preset["domains"], reason=f"From community list: {preset['name']}")
    return {"domains": BLOCKLIST.snapshot(), "presets": build_preset_status()}


@app.post("/api/blocklist/presets/{preset_id}/disable")
def disable_preset(preset_id: str):
    if preset_id not in PRESETS:
        raise HTTPException(status_code=404, detail="Unknown preset")
    BLOCKLIST.disable_preset(preset_id)
    return {"domains": BLOCKLIST.snapshot(), "presets": build_preset_status()}


def _analyze_candidates() -> tuple[list[dict[str, Any]], set[str]]:
    snapshot = STORE.snapshot()
    blocked_domains = BLOCKLIST.domains()
    candidates = [d for d in snapshot["top_domains"] if not BLOCKLIST.is_blocked(d["domain"])][:MAX_CANDIDATES]
    return candidates, blocked_domains


async def _fetch_suggestions(candidates: list[dict[str, Any]], blocked_domains: set[str]) -> list[dict[str, str]]:
    """Ask Ollama which of the given not-yet-blocked domains look like trackers/ads.
    Shared by the manual "Analyze with Ollama" button and the background auto-analyze loop."""
    prompt = build_prompt(candidates, blocked_domains)

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json"},
        )
        resp.raise_for_status()
        payload = resp.json()

    candidate_domains = {c["domain"] for c in candidates}
    return parse_suggestions(payload.get("response", ""), blocked_domains, candidate_domains)


@app.post("/api/suggestions/generate")
async def generate_suggestions():
    candidates, blocked_domains = _analyze_candidates()
    if not candidates:
        return {"suggestions": [], "note": "No new domains to analyze yet."}

    try:
        suggestions = await _fetch_suggestions(candidates, blocked_domains)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama unavailable: {exc}") from exc

    return {"suggestions": suggestions}


AUTO_ANALYZE_INTERVAL_SECONDS = 300


async def _auto_analyze_loop() -> None:
    while True:
        await asyncio.sleep(AUTO_ANALYZE_INTERVAL_SECONDS)
        try:
            candidates, blocked_domains = _analyze_candidates()
            if not candidates:
                continue
            suggestions = await _fetch_suggestions(candidates, blocked_domains)
            for suggestion in suggestions:
                BLOCKLIST.add(suggestion["domain"], source="ollama-auto", reason=suggestion["reason"])
        except Exception:
            # Ollama may be offline or misbehaving -- skip this cycle, try again next interval.
            continue


# How many new events (dns + tls + blocked combined) accumulate between AI log
# entries. Event-count-based rather than a fixed timer, so quiet networks don't
# get spammed with "nothing happened" entries and busy ones log more often.
AI_LOG_EVENT_INTERVAL = 50


async def _generate_ai_log_entry() -> dict[str, Any]:
    global _last_ai_log_blocked_total
    snapshot = STORE.snapshot()
    blocked_total = snapshot["totals"].get("blocked", 0)
    blocked_since_last = max(0, blocked_total - _last_ai_log_blocked_total)
    prompt = build_summary_prompt(snapshot, blocked_since_last)

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            AI_LOG_OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        payload = resp.json()

    summary = payload.get("response", "").strip() or "Nothing notable to report."
    _last_ai_log_blocked_total = blocked_total
    return STORE.add_ai_log_entry(summary)


async def _maybe_generate_ai_log_entry(totals: dict[str, int]) -> None:
    """Fired on every traffic_state.json change; only actually calls Ollama once
    enough new events have accumulated since the last log entry."""
    global _last_ai_log_event_total, _ai_log_generating
    if _ai_log_generating:
        return
    event_total = totals.get("events", 0)
    if event_total - _last_ai_log_event_total < AI_LOG_EVENT_INTERVAL:
        return

    _last_ai_log_event_total = event_total
    _ai_log_generating = True
    try:
        await _generate_ai_log_entry()
    except Exception:
        # Ollama may be offline or misbehaving -- try again once more events land.
        pass
    finally:
        _ai_log_generating = False


@app.post("/api/ai-log/generate")
async def generate_ai_log_entry():
    try:
        entry = await _generate_ai_log_entry()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama unavailable: {exc}") from exc
    return entry


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    mode: str = "adult"


@app.post("/api/chat")
async def chat(request: ChatRequest):
    mode = "kids" if request.mode == "kids" else "adult"
    messages = build_messages(
        message=request.message,
        history=[item.model_dump() for item in request.history],
        traffic_snapshot=STORE.snapshot(),
        blocklist_snapshot=BLOCKLIST.snapshot(),
        enabled_presets=[PRESETS[pid]["name"] for pid in BLOCKLIST.enabled_presets() if pid in PRESETS],
        mode=mode,
    )

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                OLLAMA_CHAT_URL,
                json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
            )
            resp.raise_for_status()
            payload = resp.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama unavailable: {exc}") from exc

    reply = payload.get("message", {}).get("content", "").strip()
    return {"reply": reply or "I couldn't come up with a response for that."}


@app.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket):
    await websocket.accept()
    async with _connections_lock:
        _connections.add(websocket)
    try:
        await websocket.send_text(json.dumps(build_dashboard_payload()))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        async with _connections_lock:
            _connections.discard(websocket)
