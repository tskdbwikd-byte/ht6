import { Link, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { BanIcon, DashboardIcon, ListIcon, PawIcon, ShieldIcon } from '../components/icons'
import { useLiveDashboard } from '../hooks/useLiveDashboard'

const KIDS_NAV = [{ to: '/kids', label: 'Kids (Patrick)', icon: PawIcon, end: false }]

const PARENT_NAV = [
  { to: '/dashboard', label: 'Overview', icon: DashboardIcon, end: true },
  { to: '/dashboard/protection', label: 'Protection', icon: ShieldIcon, end: false },
  { to: '/dashboard/blocklist', label: 'Blocklist', icon: ListIcon, end: false },
  { to: '/dashboard/blocked', label: 'Blocked', icon: BanIcon, end: false },
]

function NavSection({ title, items }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-2">
      <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
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
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const { data, connected } = useLiveDashboard()

  return (
    <div className="flex min-h-screen bg-page text-ink">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10 bg-[#1a2b28] px-4 py-6 text-white">
        <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
          <Logo size="md" showWordmark={false} />
          <span className="font-display text-xl font-normal tracking-tight">Parasol</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-4">
          <NavSection title="Kids" items={KIDS_NAV} />
          <NavSection title="Parents" items={PARENT_NAV} />
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
