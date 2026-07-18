import { useState } from 'react'
import { clearActivity } from '../lib/api'

function relativeTime(iso) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

const TYPE_BADGE = {
  dns: 'badge-dns',
  tls: 'badge-tls',
  blocked: 'badge-blocked',
}

function ActivityFeed({ events }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const handleClear = async () => {
    setPending(true)
    setError(null)
    try {
      await clearActivity()
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-secondary">Live feed</p>
          <h3 className="text-lg font-semibold text-ink">Recent activity</h3>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={pending || events.length === 0}
          className="shrink-0 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-page disabled:opacity-60"
        >
          {pending ? 'Clearing…' : 'Clear'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
      <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto">
        {events.length > 0 ? (
          events.map((event, index) => (
            <li
              key={`${event.timestamp}-${index}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-surface2"
            >
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${TYPE_BADGE[event.type] ?? ''}`}
              >
                {event.type}
              </span>
              <span className="truncate text-ink" title={event.domain}>
                {event.domain}
              </span>
              <span className="ml-auto shrink-0 font-mono text-xs text-ink-muted">{relativeTime(event.timestamp)}</span>
            </li>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-ink-muted">Waiting for traffic…</p>
        )}
      </ul>
    </div>
  )
}

export default ActivityFeed
