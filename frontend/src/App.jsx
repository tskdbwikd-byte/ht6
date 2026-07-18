import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('On')
  const [message, setMessage] = useState('Loading dashboard...')
  const [activeTab, setActiveTab] = useState('Overview')
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7d6_0%,_#ffeaf4_45%,_#e7f8ff_100%)] p-4 text-slate-800 md:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 rounded-[32px] border border-white/70 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur md:flex-row md:p-6">
        <aside className="w-full rounded-[24px] bg-slate-900 p-4 text-white md:w-56">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Guardian</p>
            <h2 className="mt-1 text-xl font-semibold">Shield</h2>
          </div>

          <nav className="space-y-2">
            {['Overview', 'Insights', 'Settings'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium transition ${activeTab === tab ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-white/10'}`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 rounded-[24px] bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-5 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-500">Protection</p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-900">Safe browsing is {status.toLowerCase()}</h1>
              <p className="mt-2 text-sm text-slate-600">{message}</p>
            </div>

            <button
              type="button"
              onClick={() => setStatus((current) => (current === 'On' ? 'Off' : 'On'))}
              className={`rounded-full px-6 py-4 text-lg font-semibold text-white shadow-lg transition ${status === 'On' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
            >
              {status === 'On' ? 'Turn Off' : 'Turn On'}
            </button>
          </div>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Protected time', value: `${dashboard.protectedHours} hrs`, detail: 'This week' },
              { label: 'Blocked sites', value: dashboard.blockedSites, detail: 'Auto-filtered' },
              { label: 'Alerts', value: dashboard.alerts, detail: 'Needs review' },
            ].map((card) => (
              <article key={card.label} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                <p className="mt-1 text-sm text-slate-500">{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 rounded-[24px] border border-cyan-100 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-cyan-600">{activeTab}</p>
                <h2 className="text-xl font-semibold text-slate-900">{activeTab === 'Insights' ? 'Recent activity' : activeTab === 'Settings' ? 'Quick controls' : 'Today at a glance'}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">{dashboard.lastSync}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {activeTab === 'Insights' ? (
                <>
                  <span className="rounded-full bg-emerald-100 px-3 py-2 text-sm text-emerald-700">8 safe sessions</span>
                  <span className="rounded-full bg-rose-100 px-3 py-2 text-sm text-rose-700">2 risky attempts</span>
                </>
              ) : activeTab === 'Settings' ? (
                <>
                  <span className="rounded-full bg-cyan-100 px-3 py-2 text-sm text-cyan-700">Auto-block</span>
                  <span className="rounded-full bg-purple-100 px-3 py-2 text-sm text-purple-700">Time limits</span>
                </>
              ) : (
                dashboard.categories.length > 0 ? (
                  dashboard.categories.map((category) => (
                    <span key={category} className="rounded-full bg-pink-100 px-3 py-2 text-sm text-pink-700">
                      {category}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No categories loaded yet.</p>
                )
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
