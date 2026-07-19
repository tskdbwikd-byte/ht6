import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { PowerIcon, ShieldIcon } from '../components/icons'
import { setPower } from '../lib/api'

function Status() {
  const { data } = useOutletContext()
  const [power, setPowerState] = useState(data.power)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setPowerState(data.power)
  }, [data.power])

  const toggle = async () => {
    const next = !power
    setPowerState(next)
    setPending(true)
    setError(null)
    try {
      const result = await setPower(next)
      setPowerState(result.on)
    } catch {
      setPowerState(!next)
      setError('Could not reach the backend, try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center md:px-10">
      <p className="text-sm font-medium text-ink-secondary">Status</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Ad blocking</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        Enabling ad blocking makes the DNS resolver return NXDOMAIN for every domain on your blocklist, so
        ads and trackers never load. Turning it off pauses enforcement, traffic is still observed by the
        monitor, but nothing gets blocked.
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
        {power ? 'Ad blocking is currently active' : 'Ad blocking is currently paused'}
      </p>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}

      <div className="mt-10 flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs text-ink-muted">
        <ShieldIcon className="h-4 w-4" />
        State is shared across every open dashboard in real time.
      </div>
    </main>
  )
}

export default Status
