function TopDomains({ data }) {
  const rows = data.slice(0, 6)
  const max = rows.reduce((m, row) => Math.max(m, row.count), 0) || 1

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-ink-secondary">Top domains</p>
      <h3 className="text-lg font-semibold text-ink">Most contacted</h3>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.domain}>
              <div className="flex items-center justify-between text-sm">
                <span className="truncate text-ink-secondary" title={row.domain}>
                  {row.domain}
                </span>
                <span className="ml-2 shrink-0 tabular-nums font-medium text-ink">{row.count}</span>
              </div>
              <div className="mt-1 h-2 rounded-full" style={{ background: 'var(--gridline)' }}>
                <div
                  className="h-2 rounded-full bg-dns"
                  style={{ width: `${Math.max(6, (row.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-ink-muted">No domains recorded yet.</p>
        )}
      </div>
    </div>
  )
}

export default TopDomains
