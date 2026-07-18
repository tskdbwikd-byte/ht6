from typing import Any

OLLAMA_URL = "http://localhost:11434/api/generate"
MAX_TOP_DOMAINS = 10


def build_summary_prompt(traffic_snapshot: dict[str, Any], blocked_since_last: int) -> str:
    top_domains = traffic_snapshot.get("top_domains", [])[:MAX_TOP_DOMAINS]
    top_lines = "\n".join(f"- {d['domain']} ({d['count']}x)" for d in top_domains) or "none"
    totals = traffic_snapshot.get("totals", {})

    return (
        "You are a network activity logger for a home DNS blocking dashboard. Write ONE short log "
        "entry (2-3 sentences, plain text, no markdown, no preamble) summarizing what has happened "
        "on the network recently, for someone skimming a history of entries. Mention anything "
        "notable: unusual domains, spikes in activity, or new blocks. Be factual and concise -- this "
        "is a log entry, not a conversation.\n\n"
        f"Traffic totals so far: {totals}\n"
        f"Unique domains contacted: {traffic_snapshot.get('domain_total', 0)}\n"
        f"Domains blocked since the last log entry: {blocked_since_last}\n"
        f"Most contacted domains recently:\n{top_lines}\n"
    )
