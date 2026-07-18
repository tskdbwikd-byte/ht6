import { Link, Outlet } from 'react-router-dom'
import PatrickChat from '../components/PatrickChat'
import { Logo } from '../components/Logo'
import { useLiveDashboard } from '../hooks/useLiveDashboard'

export default function KidsLayout() {
  const { data, connected } = useLiveDashboard()

  return (
    <div className="flex min-h-screen flex-col bg-[#f7faf9] text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-hairline bg-white/90 px-5 py-3.5 backdrop-blur-sm sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size="lg" />
        </Link>
        <div className="flex items-center gap-3 text-base text-ink-muted">
          <span className="hidden sm:inline" aria-live="polite">
            {connected ? 'Watching with you' : 'Reconnecting…'}
          </span>
          <Link to="/dashboard" className="font-medium text-ink-secondary hover:text-ink">
            Grown-ups
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ minHeight: '58vh' }}>
          <PatrickChat />
        </div>

        <div className="flex max-h-[42vh] shrink-0 flex-col overflow-hidden border-t border-hairline md:max-h-none md:border-l md:border-t-0">
          <Outlet context={{ data, connected }} />
        </div>
      </div>
    </div>
  )
}
