import { useOutletContext } from 'react-router-dom'
import ActivityFeed from '../components/ActivityFeed'
import StatCard from '../components/StatCard'
import TopDomains from '../components/TopDomains'
import TrafficChart from '../components/TrafficChart'

function Dashboard() {
  const { data } = useOutletContext()
  const { totals, timeseries, topDomains, recentEvents, uniqueDomains, lastSync, power } = data

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-secondary">Overview</p>
          <h1 className="font-display text-2xl font-normal tracking-tight text-ink">
            Network activity
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge-status ${power ? 'badge-good' : 'badge-critical'}`}>
            {power ? 'Protection active' : 'Protection off'}
          </span>
          <span className="text-sm text-ink-muted">Last sync {lastSync}</span>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total events" value={totals.events} detail="DNS + TLS combined" />
        <StatCard label="DNS queries" value={totals.dns} detail="Domain lookups" />
        <StatCard label="TLS handshakes" value={totals.tls} detail="Encrypted connections" />
        <StatCard label="Unique domains" value={uniqueDomains} detail="Seen since start" />
        <StatCard label="Blocked" value={totals.blocked ?? 0} detail="Enforced by resolver" />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TrafficChart data={timeseries} />
        </div>
        <TopDomains data={topDomains} />
      </section>

      <section className="mt-4">
        <ActivityFeed events={recentEvents} />
      </section>
    </main>
  )
}

export default Dashboard
