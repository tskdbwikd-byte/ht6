import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { SparkleIcon } from '../components/icons'
import StatCard from '../components/StatCard'
import { clearActivity } from '../lib/api'

const AI_SOURCE_LABEL = {
  ollama: 'AI suggested (approved)',
  'ollama-auto': 'AI auto-blocked',
}

function formatTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function BlockHistory() {
  const { data } = useOutletContext()
  const { totals, blockedEvents, topBlockedDomains, blockedDomainTotal, aiBlockedDomains } = data
  const [query, setQuery] = useState('')
  const [clearPending, setClearPending] = useState(false)
  const [clearError, setClearError] = useState(null)

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return blockedEvents
    return blockedEvents.filter(
      (event) => event.domain.toLowerCase().includes(q) || String(event.source).toLowerCase().includes(q),
    )
  }, [blockedEvents, query])

  const handleClear = async () => {
    setClearPending(true)
    setClearError(null)
    try {
      await clearActivity()
    } catch (err) {
      setClearError(err.message)
    } finally {
      setClearPending(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header>
        <p className="text-sm font-medium text-ink-secondary">Block History</p>
        <h1 className="font-display text-2xl font-normal tracking-tight text-ink">Blocked activity</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every DNS lookup the resolver answered with NXDOMAIN because the domain is on your blocklist.
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Blocked events" value={totals.blocked ?? 0} detail="Since the resolver started" />
        <StatCard label="Unique blocked domains" value={blockedDomainTotal} detail="Distinct domains hit" />
        <StatCard
          label="Most blocked domain"
          value={topBlockedDomains[0]?.domain ?? '—'}
          detail={topBlockedDomains[0] ? `${topBlockedDomains[0].count} hits` : 'No blocks yet'}
        />
      </section>

      <section className="mt-4 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <SparkleIcon className="h-4 w-4 text-brand" />
          <h3 className="text-lg font-semibold text-ink">AI-assisted blocks</h3>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Domains blocked because Patrick flagged them as trackers/ads, either auto-blocked by the
          periodic background scan, or approved by you from a suggestion.
        </p>

        {aiBlockedDomains.length > 0 ? (
          <ul className="mt-4 divide-y divide-hairline">
            {aiBlockedDomains.map((entry) => (
              <li key={entry.domain} className="flex items-center gap-3 py-2 text-sm">
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                    entry.source === 'ollama-auto' ? 'badge-blocked' : 'badge-dns'
                  }`}
                >
                  {entry.source === 'ollama-auto' ? 'Auto' : 'Approved'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink" title={entry.domain}>
                    {entry.domain}
                  </p>
                  <p className="truncate text-xs text-ink-muted" title={entry.reason ?? ''}>
                    {AI_SOURCE_LABEL[entry.source] ?? entry.source}
                    {entry.reason ? ` · ${entry.reason}` : ''}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-xs font-medium text-ink-muted">
                  {entry.count} hit{entry.count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            No AI-flagged blocks yet, the background scan runs periodically, or use "Analyze with
            Patrick" on the Network Log page.
          </p>
        )}
      </section>

      {topBlockedDomains.length > 0 && (
        <section className="mt-4 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
          <p className="text-sm font-medium text-ink-secondary">Top blocked</p>
          <h3 className="text-lg font-semibold text-ink">Most-hit domains</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {topBlockedDomains.slice(0, 10).map((row) => (
              <li
                key={row.domain}
                className="flex items-center gap-2 rounded-full border border-hairline bg-surface2 px-3 py-1.5 text-xs"
              >
                <span className="truncate text-ink" title={row.domain}>
                  {row.domain}
                </span>
                <span className="font-semibold tabular-nums text-ink-muted">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-secondary">History</p>
            <h3 className="text-lg font-semibold text-ink">Recent blocks</h3>
          </div>
          <div className="flex flex-1 items-center gap-2 sm:justify-end">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by domain or device…"
              className="min-w-0 flex-1 max-w-xs rounded-xl border border-hairline bg-page px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={handleClear}
              disabled={clearPending || blockedEvents.length === 0}
              className="shrink-0 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-page disabled:opacity-60"
            >
              {clearPending ? 'Clearing…' : 'Clear'}
            </button>
          </div>
        </div>
        {clearError && <p className="mt-2 text-sm text-critical">{clearError}</p>}

        <ul className="mt-4 max-h-[65vh] divide-y divide-hairline overflow-y-auto">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event, index) => (
              <li key={`${event.timestamp}-${index}`} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="badge-blocked shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                  Blocked
                </span>
                <span className="min-w-0 flex-1 truncate text-ink" title={event.domain}>
                  {event.domain}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-muted">{event.source}</span>
                <span className="shrink-0 font-mono text-xs text-ink-muted">{formatTimestamp(event.timestamp)}</span>
              </li>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-ink-muted">
              {blockedEvents.length === 0 ? 'No domains blocked yet.' : 'No matches for that filter.'}
            </p>
          )}
        </ul>
      </section>
    </main>
  )
}

export default BlockHistory
