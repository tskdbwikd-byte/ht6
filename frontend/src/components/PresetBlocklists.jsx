import { useCallback, useEffect, useState } from 'react'
import { disablePreset, enablePreset, getPresets } from '../lib/api'
import { GlobeIcon } from './icons'

function PresetBlocklists({ onChange }) {
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingId, setPendingId] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getPresets()
      setPresets(data.presets)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleToggle = async (preset) => {
    setPendingId(preset.id)
    setError(null)
    try {
      const data = preset.enabled ? await disablePreset(preset.id) : await enablePreset(preset.id)
      setPresets(data.presets)
      onChange?.(data.domains)
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <GlobeIcon className="h-4 w-4 text-ink-secondary" />
        <h2 className="text-lg font-semibold text-ink">Community blocklists</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Turn on a category to block every domain in it, curated from well-known community blocklists.
      </p>

      {error && <p className="mt-3 text-sm alert-critical">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-hairline bg-surface2 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{preset.name}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{preset.description}</p>
                <p className="mt-1 text-xs font-medium text-ink-secondary">{preset.domain_count} domains</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(preset)}
                disabled={pendingId === preset.id}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                  preset.enabled ? 'bg-good text-white' : 'border border-hairline text-ink hover:bg-page'
                }`}
              >
                {pendingId === preset.id ? '…' : preset.enabled ? 'Enabled' : 'Enable'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default PresetBlocklists
