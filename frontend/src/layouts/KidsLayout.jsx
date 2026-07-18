import { Link, Outlet } from 'react-router-dom'
import PatrickChat from '../components/PatrickChat'
import { Logo } from '../components/Logo'
import { useLiveDashboard } from '../hooks/useLiveDashboard'

export default function KidsLayout() {
  const { data, connected } = useLiveDashboard()

  return (
    <div className="flex min-h-screen flex-col bg-[#f7faf9] text-ink md:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-hairline bg-white/80 px-5 py-4 backdrop-blur-sm md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="hidden sm:inline">{connected ? 'Live updates on' : 'Reconnecting…'}</span>
            <Link to="/dashboard" className="font-medium text-ink-secondary hover:text-ink">
              Grown-ups
            </Link>
          </div>
        </header>
        <Outlet context={{ data, connected }} />
      </div>

      <div className="flex h-[42vh] shrink-0 border-t border-hairline md:h-auto md:min-h-screen md:border-l md:border-t-0">
        <PatrickChat />
      </div>
    </div>
  )
}
