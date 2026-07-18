import { Link, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { BanIcon, DashboardIcon, ListIcon, PawIcon, ShieldIcon } from '../components/icons'
import { useLiveDashboard } from '../hooks/useLiveDashboard'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', icon: DashboardIcon, end: true },
  { to: '/dashboard/protection', label: 'Protection', icon: ShieldIcon, end: false },
  { to: '/dashboard/blocklist', label: 'Blocklist', icon: ListIcon, end: false },
  { to: '/dashboard/blocked', label: 'Blocked', icon: BanIcon, end: false },
  { to: '/kids', label: "Kids (Patrick)", icon: PawIcon, end: false },
]

export default function DashboardLayout() {
  const { data, connected } = useLiveDashboard()

  return (
    <div className="flex min-h-screen bg-page text-ink">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#1a2b28] px-4 py-6 text-white">
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
          <Logo size="sm" showWordmark={false} />
          <span className="font-display text-lg font-normal tracking-tight">Parasol</span>
        </Link>

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

        <Link
          to="/"
          className="mb-3 rounded-xl px-3 py-2 text-xs font-medium text-white/50 transition hover:bg-white/5 hover:text-white/80"
        >
          ← Back to home
        </Link>

        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-xs text-white/60">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-good' : 'bg-critical'}`} />
          {connected ? 'Live' : 'Reconnecting…'}
        </div>
      </aside>

      <div className="flex-1">
        <Outlet context={{ data, connected }} />
      </div>
    </div>
  )
}
