import { NavLink, Route, Routes } from 'react-router-dom'
import { DashboardIcon, ListIcon, ShieldIcon } from './components/icons'
import { useLiveDashboard } from './hooks/useLiveDashboard'
import Blocklist from './pages/Blocklist'
import Dashboard from './pages/Dashboard'
import Protection from './pages/Protection'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/protection', label: 'Protection', icon: ShieldIcon, end: false },
  { to: '/blocklist', label: 'Blocklist', icon: ListIcon, end: false },
]

function App() {
  const { data, connected } = useLiveDashboard()

  return (
    <div className="flex min-h-screen bg-page text-ink">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#0b0e14] px-4 py-6 text-white">
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            W
          </span>
          <span className="text-lg font-semibold tracking-tight">Warden</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-xs text-white/60">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-good' : 'bg-critical'}`} />
          {connected ? 'Live' : 'Reconnecting…'}
        </div>
      </aside>

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard data={data} />} />
          <Route path="/protection" element={<Protection power={data.power} />} />
          <Route path="/blocklist" element={<Blocklist />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
