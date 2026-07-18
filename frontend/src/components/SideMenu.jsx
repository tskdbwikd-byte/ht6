import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CloseIcon, DashboardIcon, MenuIcon } from './icons'

export default function SideMenu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="fixed left-5 top-5 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 text-ink shadow-card backdrop-blur-sm transition hover:bg-white"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#1a2b28]/25 backdrop-blur-[2px]"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col bg-[#1a2b28] px-4 py-6 text-white shadow-soft transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <p className="mb-8 px-3 font-display text-lg font-semibold tracking-tight">Menu</p>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <DashboardIcon className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>
      </aside>
    </>
  )
}
