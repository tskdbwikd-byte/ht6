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

from blocklist_store import BlocklistStore
from suggestions import MAX_CANDIDATES, OLLAMA_MODEL, OLLAMA_URL, build_prompt, parse_suggestions
from traffic_store import TrafficStore

STORE = TrafficStore(state_file=str(ROOT_DIR / "traffic_state.json"))
BLOCKLIST = BlocklistStore(state_file=str(ROOT_DIR / "blocklist.json"))

_connections: set[WebSocket] = set()
_connections_lock = asyncio.Lock()


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
        await _broadcast(build_dashboard_payload())


@asynccontextmanager
async def lifespan(app: FastAPI):
    watcher_task = asyncio.create_task(_watch_state_file())
    try:
        yield
    finally:
        watcher_task.cancel()


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


@app.post("/api/suggestions/generate")
async def generate_suggestions():
    snapshot = STORE.snapshot()
    blocked_domains = BLOCKLIST.domains()
    candidates = [d for d in snapshot["top_domains"] if not BLOCKLIST.is_blocked(d["domain"])][:MAX_CANDIDATES]

    if not candidates:
        return {"suggestions": [], "note": "No new domains to analyze yet."}

    prompt = build_prompt(candidates, blocked_domains)

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                OLLAMA_URL,
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json"},
            )
            resp.raise_for_status()
            payload = resp.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama unavailable: {exc}") from exc

    candidate_domains = {c["domain"] for c in candidates}
    suggestions = parse_suggestions(payload.get("response", ""), blocked_domains, candidate_domains)
    return {"suggestions": suggestions}


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
