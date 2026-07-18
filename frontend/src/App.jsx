import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('Monitoring')
  const [message, setMessage] = useState('Loading dashboard...')
  const [dashboard, setDashboard] = useState({
    protectedHours: 0,
    blockedSites: 0,
    alerts: 0,
    lastSync: '—',
    focusMode: 'Balanced',
    categories: [],
  })

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [helloRes, dashboardRes] = await Promise.all([
          fetch('/api/hello'),
          fetch('/api/dashboard'),
        ])

        const helloData = await helloRes.json()
        const dashboardData = await dashboardRes.json()

        setMessage(helloData.message)
        setDashboard(dashboardData)
      } catch (error) {
        setMessage('Backend unavailable. Start the FastAPI server to connect the dashboard.')
        console.error(error)
      }
    }

    loadDashboard()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-400">
              Guardian Shield
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Online safety dashboard</h1>
          </div>
          <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            {status} • Secure
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-300">Protection status</p>
                <h2 className="mt-1 text-3xl font-semibold text-white">Safe browsing mode is active</h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
                onClick={() => setStatus((current) => (current === 'Monitoring' ? 'Paused' : 'Monitoring'))}
              >
                {status === 'Monitoring' ? 'Pause protection' : 'Resume protection'}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-800/70 p-4">
              <p className="text-sm text-slate-400">Backend message</p>
              <p className="mt-2 text-lg text-slate-200">{message}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 p-6">
            <p className="text-sm font-medium text-cyan-200">Focus mode</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{dashboard.focusMode}</h2>
            <p className="mt-4 text-sm text-slate-300">
              Adaptive rules keep distractions out while preserving your essential learning and communication tools.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
              <p>Last sync: {dashboard.lastSync}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Protected time', value: `${dashboard.protectedHours} hrs`, detail: 'This week' },
            { label: 'Blocked sites', value: dashboard.blockedSites, detail: 'Auto-filtered' },
            { label: 'Alerts', value: dashboard.alerts, detail: 'Needs review' },
          ].map((card) => (
            <article key={card.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
              <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">Blocked categories</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Current ruleset</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
              {dashboard.categories.length} active filters
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {dashboard.categories.length > 0 ? (
              dashboard.categories.map((category) => (
                <span key={category} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
                  {category}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-400">No categories loaded yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
