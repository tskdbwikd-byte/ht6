# ht6

A mini Pi-hole style DNS ad/tracker blocker with a live dashboard.

## Architecture

There are three pieces under the hood, but `./start.sh` runs all of them
together now — one command, one Ctrl-C to stop everything.

| Component | What it does |
|---|---|
| Dashboard (backend + frontend) | FastAPI API + React UI for managing the blocklist, viewing traffic, and chatting with the AI assistant. Does **not** block or capture traffic itself. |
| DNS resolver (enforcement) | Answers DNS queries. Returns NXDOMAIN for blocked domains, forwards everything else upstream. **This is the only piece that actually blocks anything.** |
| Traffic monitor (observation) | Passively sniffs packets (via scapy) to populate the dashboard's traffic graphs/top-domains. Purely observational — does not block. |

A common source of confusion: the dashboard can show plenty of traffic
while nothing is actually being blocked, because the resolver never got
enabled or your device's DNS isn't pointed at it (see below).

## Quickstart

```bash
./start.sh
```

Prompts once for `sudo` (needed to bind port 53 and for packet capture),
then starts the dashboard, resolver, and traffic monitor together, and
prints a status summary when it's up. Dashboard: http://localhost:5173

Flags/env vars, if you need them:

```bash
./start.sh --no-dns              # dashboard + monitor only, no enforcement
./start.sh --no-monitor          # dashboard + resolver only, no traffic graphs
DNS_PORT=5353 ./start.sh         # resolver port (default 53)
IFACE=wlp194s0 ./start.sh        # interface for the traffic monitor (default: auto-detected)
```

`run_dns.sh` and `run_monitor.sh` still exist if you want to run either
piece standalone in its own terminal, but `start.sh` is the normal path.

Just want the dashboard, with no sudo prompt at all (e.g. to poke at the
UI/API without touching network enforcement)?

```bash
./webapp.sh
```

It's a thin wrapper for `./start.sh --no-dns --no-monitor`.

If this machine is sharing its internet connection as a Wi-Fi hotspot
(NetworkManager "shared" mode), `start.sh` automatically detects it and
wires its dnsmasq to forward through the resolver (writing
`/etc/NetworkManager/dnsmasq-shared.d/block.conf` and reloading the
connection) — devices that join get filtered with zero per-device setup.
That file lives outside this repo and can get silently reset by anything
that touches NetworkManager (an update, a service restart), which is
exactly the "blocking stopped working, nothing in the app changed"
failure mode — re-running `./start.sh` re-applies it. It's cleaned up
again when `start.sh` exits, so you're not left with devices pointed at
a resolver that's no longer running.

If you're not using that hotspot setup, or you want *this* machine's own
DNS resolution to go through the resolver (not just other devices'), you
still need to point it there yourself:

```bash
./enable_system_dns.sh          # points this machine's default interface at 127.0.0.1
./disable_system_dns.sh         # reverts back to normal DHCP-provided DNS
```

Both scripts auto-detect the default-route interface, or accept one
explicitly (`./enable_system_dns.sh wlan0`). They require the resolver to
already be running on port 53 (`DNS_PORT=53 ./start.sh`, since
`resolvectl` can't forward to a non-standard port).

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
3. **Is your device's DNS actually pointed at the resolver?** `resolvectl status` — if it still shows your router/ISP's DNS, queries never reach `dns_server.py` at all. Run `./enable_system_dns.sh`. (This is a one-time system DNS change — not part of `start.sh` — since it affects your whole network, not just this app.)
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
