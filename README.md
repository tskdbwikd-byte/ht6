# ht6

A mini Pi-hole style DNS ad/tracker blocker with a live dashboard.

## Architecture

There are three independent pieces. All three need to be running for
blocking to actually happen — running just the dashboard shows you data
but doesn't block anything.

| Component | Script | What it does |
|---|---|---|
| Dashboard (backend + frontend) | `./start.sh` | FastAPI API + React UI for managing the blocklist, viewing traffic, and chatting with the AI assistant. Does **not** block or capture traffic itself. |
| DNS resolver (enforcement) | `sudo ./run_dns.sh` | Answers DNS queries. Returns NXDOMAIN for blocked domains, forwards everything else upstream. **This is the only component that actually blocks anything.** |
| Traffic monitor (observation) | `sudo ./run_monitor.sh <interface>` | Passively sniffs packets (via scapy) to populate the dashboard's traffic graphs/top-domains. Purely observational — does not block. |

A common source of confusion: the dashboard can show plenty of traffic
(from `monitor.py`) while nothing is actually being blocked, because
`dns_server.py` was never started, or because your device's DNS isn't
pointed at it.

## Quickstart

```bash
./start.sh                 # dashboard: http://localhost:5173
sudo ./run_dns.sh          # resolver, binds :53 (or add --port 5353 if that's taken)
sudo ./run_monitor.sh eth0 # optional: populates traffic graphs
```

Then make sure your device's DNS queries actually reach the resolver —
see below.

## Pointing your DNS at the resolver

`dns_server.py` binding to a port does nothing until something sends it
queries. On systemd-resolved systems (Fedora, most modern distros):

```bash
./enable_system_dns.sh          # points this machine's default interface at 127.0.0.1
./disable_system_dns.sh         # reverts back to normal DHCP-provided DNS
```

Both scripts auto-detect the default-route interface, or accept one
explicitly (`./enable_system_dns.sh wlan0`). They require `dns_server.py`
to be running on port 53 first (`sudo ./run_dns.sh`).

To block other devices on your network (phone, laptop, etc.), point
their DNS settings at this machine's LAN IP instead.

## Checking whether it's actually working

```bash
./blocker_status.py
```

Prints whether `dns_server.py`/`monitor.py` are running, whether the
power switch is on, blocklist size, DNS/blocked event totals, and the
current system DNS config — plus next steps if something's off.

To test directly against the resolver:

```bash
dig @127.0.0.1 doubleclick.net   # expect NXDOMAIN if blocked
```

## Troubleshooting: "ads are still getting through"

1. **Is `dns_server.py` actually running?** `./blocker_status.py` or `pgrep -f dns_server.py`.
2. **Is the power switch on?** Toggle it in the dashboard, or `GET /api/power`.
3. **Is your device's DNS actually pointed at the resolver?** `resolvectl status` — if it still shows your router/ISP's DNS, queries never reach `dns_server.py` at all. Run `./enable_system_dns.sh`.
4. **Is the browser bypassing your DNS via DNS-over-HTTPS?** Chrome/Firefox often default to a secure DNS provider (Cloudflare/Google) regardless of system DNS settings. Check `chrome://settings/security` ("Use secure DNS") or Firefox's `network.trr.mode` and disable it while testing.
5. **First-party-served ads.** DNS blocking can't stop ads served from the same domain as the page's actual content (self-hosted ads, domain-fronted ad tech). The blocklist only helps for ads/trackers served from a distinct domain.
6. **DNS caching.** If a domain was just added to the blocklist, a client that already cached the old (allowed) answer won't re-query until its TTL expires. Flush the client's DNS cache to see the change immediately.

## Managing the blocklist

The dashboard's Blocklist page (`/dashboard/blocklist`) supports:

- **Community blocklists** — toggle categorized preset lists (Ads & Marketing, Analytics & Trackers, Social Media Trackers, Aggressive Ad Networks) on/off; see `preset_blocklists.py` for the domain lists.
- **AI traffic assistant** — "Analyze with Ollama" surfaces domains from recent traffic that look like trackers, and a chat panel for asking questions about recent traffic or blocklist state (backed by `/api/chat`, requires a local Ollama server).
- **Manual add/remove** of individual domains.

Requires a local [Ollama](https://ollama.ai) instance running the model
configured in `suggestions.py` (`OLLAMA_MODEL`, default `gemma3:4b`) for
the AI features; the rest of the dashboard works without it.
