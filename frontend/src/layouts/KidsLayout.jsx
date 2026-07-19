import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import PatrickChat from '../components/PatrickChat'
import { Logo } from '../components/Logo'
import { useLiveDashboard } from '../hooks/useLiveDashboard'

const GROWN_UP_PASSWORD = '1234'

export default function KidsLayout() {
  const { data } = useLiveDashboard()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    setPassword('')
    setError(null)
  }

  const submit = (event) => {
    event.preventDefault()
    if (password === GROWN_UP_PASSWORD) {
      close()
      navigate('/dashboard')
      return
    }
    setError('Wrong password. Try again!')
    setPassword('')
    inputRef.current?.focus()
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7faf9] text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-hairline bg-white/90 px-5 py-3.5 backdrop-blur-sm sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size="lg" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-base font-medium text-ink-secondary hover:text-ink"
        >
          Grown-ups
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" style={{ minHeight: '58vh' }}>
          <PatrickChat />
        </div>

        <div className="flex max-h-[42vh] shrink-0 flex-col overflow-hidden border-t border-hairline md:max-h-none md:border-l md:border-t-0">
          <Outlet context={{ data }} />
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b28]/40 px-4"
          onClick={close}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-hairline bg-white p-6 shadow-soft"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="grown-ups-title"
          >
            <h2 id="grown-ups-title" className="font-display text-2xl text-ink">
              Grown-ups only
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">Enter the password to continue.</p>

            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setError(null)
                }}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full rounded-xl border-2 border-hairline bg-page px-4 py-3 text-base text-ink outline-none focus:border-brand"
              />
              {error && <p className="text-sm alert-critical rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 rounded-xl border border-hairline px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-page"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
                >
                  Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
