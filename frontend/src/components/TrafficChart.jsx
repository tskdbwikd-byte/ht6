import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function formatMinute(value) {
  if (!value) return ''
  const time = value.split('T')[1]
  return time ?? value
}

function integerTicks(maxValue) {
  const max = Math.max(1, Math.ceil(maxValue))
  const step = Math.max(1, Math.ceil(max / 5))
  const ticks = []
  for (let value = 0; value < max; value += step) ticks.push(value)
  ticks.push(max)
  return ticks
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
  const chartData = data.map((row) => ({ ...row, blocked: row.blocked ?? 0 }))
  const maxValue = chartData.reduce((m, row) => Math.max(m, row.dns ?? 0, row.tls ?? 0, row.blocked ?? 0), 0)
  const yTicks = integerTicks(maxValue)

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <p className="text-sm font-medium text-ink-secondary">Traffic over time</p>
      <h3 className="text-lg font-semibold text-ink">DNS, TLS &amp; blocked activity</h3>
      <p className="text-xs text-ink-muted">Instances per second — not a running total.</p>
      <div className="mt-4 h-64">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                domain={[0, yTicks[yTicks.length - 1]]}
                ticks={yTicks}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--ink-muted)', strokeDasharray: '4 4' }} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--ink-secondary)' }} />
              <Line type="monotone" dataKey="dns" name="DNS" stroke="var(--series-dns)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tls" name="TLS" stroke="var(--series-tls)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="blocked" name="Blocked" stroke="var(--series-blocked)" strokeWidth={2} dot={false} />
            </LineChart>
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
