from typing import Any

from suggestions import OLLAMA_MODEL

OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
MAX_HISTORY_MESSAGES = 12
MAX_TOP_DOMAINS = 15


def build_system_prompt(
    traffic_snapshot: dict[str, Any],
    blocklist_snapshot: list[dict[str, Any]],
    enabled_presets: list[str],
) -> str:
    top_domains = traffic_snapshot.get("top_domains", [])[:MAX_TOP_DOMAINS]
    top_lines = "\n".join(f"- {d['domain']} (seen {d['count']}x)" for d in top_domains) or "none yet"
    blocked_domains = sorted(entry["domain"] for entry in blocklist_snapshot)
    blocked_lines = ", ".join(blocked_domains) or "none"
    presets_line = ", ".join(enabled_presets) or "none"
    totals = traffic_snapshot.get("totals", {})

    return (
        "You are a helpful network security assistant embedded in a home DNS blocking dashboard. "
        "Answer the user's questions about their recent network traffic and blocklist configuration "
        "using ONLY the context below. Be concise and specific, and use plain text (no markdown "
        "tables). If asked for recommendations, only suggest domains that appear in the 'Most "
        "contacted domains' list and that are not already blocked.\n\n"
        f"Traffic totals: {totals}\n"
        f"Unique domains contacted: {traffic_snapshot.get('domain_total', 0)}\n"
        f"Most contacted domains recently (not necessarily blocked):\n{top_lines}\n\n"
        f"Currently blocked domains ({len(blocked_domains)}): {blocked_lines}\n"
        f"Enabled community blocklist presets: {presets_line}\n"
    )


def build_kids_system_prompt(
    traffic_snapshot: dict[str, Any],
    blocklist_snapshot: list[dict[str, Any]],
) -> str:
    top_domains = traffic_snapshot.get("top_domains", [])[:10]
    top_lines = "\n".join(f"- {d['domain']} ({d['count']} visits)" for d in top_domains) or "none yet"
    blocked_total = traffic_snapshot.get("totals", {}).get("blocked", 0)
    unique = traffic_snapshot.get("domain_total", 0)
    blocked_domains = sorted(entry["domain"] for entry in blocklist_snapshot)[:20]
    blocked_lines = ", ".join(blocked_domains) or "none right now"

    return (
        "You are Patrick, a friendly orange pixel cat who helps kids stay safe online. "
        "You live inside an app called Parasol. Talk like a kind friend for kids ages 7–12: "
        "short sentences, simple words, warm and playful. You may add a soft 'meow' once in a while, "
        "but stay helpful.\n\n"
        "Your job is to explain online safety: why random links can be dangerous, why they shouldn't "
        "share passwords or personal info, why pop-ups and stranger messages can trick people, and "
        "why Parasol blocks some sites. Never be scary or graphic. If you don't know something, say so "
        "kindly and suggest asking a grown-up.\n\n"
        "Use ONLY this home-network context when talking about what happened on their devices:\n"
        f"- Places visited (count): {unique}\n"
        f"- Times Parasol blocked something: {blocked_total}\n"
        f"- Top sites recently:\n{top_lines}\n"
        f"- Some blocked examples: {blocked_lines}\n\n"
        "When you mention sites, say them simply (like 'a video site' or the domain name). "
        "Keep answers under a short paragraph unless they ask for more."
    )


def build_messages(
    message: str,
    history: list[dict[str, str]],
    traffic_snapshot: dict[str, Any],
    blocklist_snapshot: list[dict[str, Any]],
    enabled_presets: list[str],
    mode: str = "adult",
) -> list[dict[str, str]]:
    if mode == "kids":
        system_prompt = build_kids_system_prompt(traffic_snapshot, blocklist_snapshot)
    else:
        system_prompt = build_system_prompt(traffic_snapshot, blocklist_snapshot, enabled_presets)

    trimmed_history = [
        {"role": item["role"], "content": item["content"]}
        for item in history
        if item.get("role") in ("user", "assistant") and item.get("content")
    ][-MAX_HISTORY_MESSAGES:]
    return [{"role": "system", "content": system_prompt}, *trimmed_history, {"role": "user", "content": message}]
