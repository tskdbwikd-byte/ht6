import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PowerIcon, ShieldIcon } from '../components/icons'
import { setPower } from '../lib/api'

function Protection() {
  const { data } = useOutletContext()
  const power = data.power
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const toggle = async () => {
    setPending(true)
    setError(null)
    try {
      await setPower(!power)
    } catch {
      setError('Could not reach the backend — try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center md:px-10">
      <p className="text-sm font-medium text-ink-secondary">Protection</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Network protection control</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        Turning protection on enables active monitoring and enforcement across your network. Turning it off
        pauses enforcement — traffic is still observed by the monitor.
      </p>

      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`mt-10 flex h-44 w-44 items-center justify-center rounded-full border transition disabled:opacity-60 ${
          power ? 'power-ring-good' : 'power-ring-critical'
        }`}
      >
        <span className="flex flex-col items-center gap-2">
          <PowerIcon className="h-10 w-10" />
          <span className="text-sm font-semibold uppercase tracking-wide">{power ? 'On' : 'Off'}</span>
        </span>
      </button>

      <p className="mt-6 text-sm font-medium text-ink">
        {power ? 'Protection is currently active' : 'Protection is currently paused'}
      </p>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}

      <div className="mt-10 flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs text-ink-muted">
        <ShieldIcon className="h-4 w-4" />
        State is shared across every open dashboard in real time.
      </div>
    </main>
  )
}

export default Protection
