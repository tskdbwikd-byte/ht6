function StatCard({ label, value, detail }) {
  return (
    <article className="rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-ink-secondary">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      {detail && <p className="mt-1 text-sm text-ink-muted">{detail}</p>}
    </article>
  )
}

export default StatCard
