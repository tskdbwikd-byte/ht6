import { useCallback, useEffect, useState } from 'react'
import { ListIcon, TrashIcon } from '../components/icons'
import PresetBlocklists from '../components/PresetBlocklists'
import { addBlockedDomain, getBlocklist, removeBlockedDomain } from '../lib/api'

const SOURCE_LABEL = {
  seed: 'Starter list',
  manual: 'Manual',
  ollama: 'AI suggested (approved)',
  'ollama-auto': 'AI auto-blocked',
  chat: 'AI chat request',
}

function sourceLabel(source) {
  if (SOURCE_LABEL[source]) return SOURCE_LABEL[source]
  if (source?.startsWith('preset:')) return 'Community list'
  return source
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function Filters() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(null)

  const [newDomain, setNewDomain] = useState('')
  const [addPending, setAddPending] = useState(false)
  const [addError, setAddError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getBlocklist()
      setDomains(data.domains)
      setListError(null)
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleAdd = async (event) => {
    event.preventDefault()
    const domain = newDomain.trim()
    if (!domain) return
    setAddPending(true)
    setAddError(null)
    try {
      const data = await addBlockedDomain(domain, null, 'manual')
      setDomains(data.domains)
      setNewDomain('')
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddPending(false)
    }
  }

  const handleRemove = async (domain) => {
    try {
      const data = await removeBlockedDomain(domain)
      setDomains(data.domains)
    } catch (err) {
      setListError(err.message)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 md:px-10">
      <header>
        <p className="text-sm font-medium text-ink-secondary">Filters</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Blocked domains</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Domains here are blocked at the DNS level by the resolver. {domains.length} domain
          {domains.length === 1 ? '' : 's'} blocked. For AI-powered analysis and chat, see Network Log.
        </p>
      </header>

      <PresetBlocklists onChange={setDomains} />

      <section className="mt-4 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Add a domain manually</h2>
        <form onSubmit={handleAdd} className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(event) => setNewDomain(event.target.value)}
            placeholder="ads.example.com"
            className="min-w-0 flex-1 rounded-xl border border-hairline bg-page px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={addPending || !newDomain.trim()}
            className="rounded-xl border border-hairline px-4 py-2 text-sm font-semibold text-ink hover:bg-page disabled:opacity-60"
          >
            {addPending ? 'Adding…' : 'Block domain'}
          </button>
        </form>
        {addError && <p className="mt-2 text-sm text-critical">{addError}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <ListIcon className="h-4 w-4 text-ink-secondary" />
          <h2 className="text-lg font-semibold text-ink">Currently blocked</h2>
        </div>

        {listError && <p className="mt-3 text-sm text-critical">{listError}</p>}

        {loading ? (
          <p className="mt-4 text-sm text-ink-muted">Loading…</p>
        ) : domains.length > 0 ? (
          <ul className="mt-3 max-h-96 divide-y divide-hairline overflow-y-auto">
            {domains.map((entry) => (
              <li key={entry.domain} className="flex items-center gap-2 py-1.5">
                <div className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium text-ink">{entry.domain}</span>
                  <span className="ml-2 text-xs text-ink-muted">
                    {sourceLabel(entry.source)} · {formatDate(entry.added_at)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(entry.domain)}
                  className="icon-btn-danger shrink-0 rounded-full p-1.5 text-ink-muted transition"
                  aria-label={`Remove ${entry.domain}`}
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">No domains blocked yet.</p>
        )}
      </section>
    </main>
  )
}

export default Filters
