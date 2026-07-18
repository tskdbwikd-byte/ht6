import json
from typing import Any

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "gemma3:4b"
MAX_CANDIDATES = 25
MAX_SUGGESTIONS = 10


def build_prompt(candidates: list[dict[str, Any]], blocked_domains: set[str]) -> str:
    lines = "\n".join(f'- {c["domain"]} (seen {c["count"]}x)' for c in candidates)
    blocked_list = ", ".join(sorted(blocked_domains)) or "none"
    return (
        "You are a privacy-focused network security assistant reviewing DNS/TLS traffic logs "
        "from a home network.\n"
        f"Domains already blocked: {blocked_list}\n\n"
        "Recently observed domains (not currently blocked):\n"
        f"{lines}\n\n"
        "From the list above, identify domains that are likely ads, trackers, telemetry, or "
        "analytics endpoints worth blocking for privacy. Do not suggest core application or "
        "content domains a site needs to function. Only suggest domains that appear in the list "
        "above verbatim.\n"
        'Respond with ONLY a JSON object shaped like {"suggestions": [{"domain": "...", "reason": "..."}]}. '
        'If nothing qualifies, respond with {"suggestions": []}.'
    )


def _extract_items(parsed: Any) -> list[Any]:
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        for value in parsed.values():
            if isinstance(value, list):
                return value
    return []


def parse_suggestions(raw: str, blocked_domains: set[str], candidate_domains: set[str]) -> list[dict[str, str]]:
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []

    items = _extract_items(parsed)

    seen: set[str] = set()
    results: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        domain = str(item.get("domain", "")).strip().lower().rstrip(".")
        reason = str(item.get("reason", "")).strip() or "Flagged by traffic analysis."
        if not domain or domain in seen:
            continue
        if domain in blocked_domains or domain not in candidate_domains:
            continue
        seen.add(domain)
        results.append({"domain": domain, "reason": reason})
        if len(results) >= MAX_SUGGESTIONS:
            break
    return results
