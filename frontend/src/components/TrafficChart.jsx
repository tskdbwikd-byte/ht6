import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function formatMinute(value) {
  if (!value) return ''
  const time = value.split('T')[1]
  return time ?? value
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-hairline bg-surface2 px-3 py-2 shadow-card">
      <p className="text-xs font-medium text-ink-muted">{formatMinute(label)}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-1 flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-ink-secondary">{entry.name}</span>
          <span className="ml-auto font-medium tabular-nums text-ink">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

function TrafficChart({ data }) {
  const hasData = data.length > 0

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-ink-secondary">Traffic over time</p>
      <h3 className="text-lg font-semibold text-ink">DNS &amp; TLS activity</h3>
      <div className="mt-4 h-64">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="dnsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-dns)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--series-dns)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tlsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-tls)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--series-tls)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis
                dataKey="minute"
                tickFormatter={formatMinute}
                stroke="var(--ink-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis
                stroke="var(--ink-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={32}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--ink-muted)', strokeDasharray: '4 4' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--ink-secondary)' }} />
              <Area type="monotone" dataKey="dns" name="DNS" stackId="1" stroke="var(--series-dns)" strokeWidth={2} fill="url(#dnsFill)" />
              <Area type="monotone" dataKey="tls" name="TLS" stackId="1" stroke="var(--series-tls)" strokeWidth={2} fill="url(#tlsFill)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-muted">
            Waiting for traffic to chart…
          </div>
        )}
      </div>
    </div>
  )
}

export default TrafficChart
