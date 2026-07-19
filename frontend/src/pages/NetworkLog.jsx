import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import ChatPanel from '../components/ChatPanel'
import { LogIcon, SparkleIcon } from '../components/icons'
import { addBlockedDomain, generateAiLogEntry, generateSuggestions } from '../lib/api'

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

function NetworkLog() {
  const { data: dashboardData } = useOutletContext()
  const aiLog = dashboardData.aiLog

  const [suggestions, setSuggestions] = useState(null)
  const [suggestPending, setSuggestPending] = useState(false)
  const [suggestError, setSuggestError] = useState(null)
  const [suggestNote, setSuggestNote] = useState(null)
  const [acceptingDomain, setAcceptingDomain] = useState(null)

  const [logPending, setLogPending] = useState(false)
  const [logError, setLogError] = useState(null)

  const handleAnalyze = async () => {
    setSuggestPending(true)
    setSuggestError(null)
    setSuggestNote(null)
    try {
      const data = await generateSuggestions()
      setSuggestions(data.suggestions)
      setSuggestNote(data.note ?? null)
    } catch (err) {
      setSuggestError(err.message)
      setSuggestions(null)
    } finally {
      setSuggestPending(false)
    }
  }

  const handleAccept = async (domain, reason) => {
    setAcceptingDomain(domain)
    try {
      await addBlockedDomain(domain, reason, 'ollama')
      setSuggestions((current) => current?.filter((s) => s.domain !== domain) ?? null)
    } catch (err) {
      setSuggestError(err.message)
    } finally {
      setAcceptingDomain(null)
    }
  }

  const handleDismiss = (domain) => {
    setSuggestions((current) => current?.filter((s) => s.domain !== domain) ?? null)
  }

  const handleGenerateLog = async () => {
    setLogPending(true)
    setLogError(null)
    try {
      await generateAiLogEntry()
    } catch (err) {
      setLogError(err.message)
    } finally {
      setLogPending(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8 md:px-10">
      <header>
        <p className="text-sm font-medium text-ink-secondary">Network Log</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Patrick's view of your network</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Analysis, chat, and a running activity log, all powered by Patrick, your local AI assistant.
          Nothing here leaves your network. For the plain blocklist itself, see the Filters page.
        </p>
      </header>

      <section className="mt-6 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <SparkleIcon className="h-4 w-4 text-brand" />
          <h2 className="text-lg font-semibold text-ink">AI assistant</h2>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Scans recent traffic for trackers/ads, and you can chat with it directly, including asking
          it to block something for you.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={suggestPending}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
          >
            {suggestPending ? 'Analyzing…' : 'Analyze with Patrick'}
          </button>
        </div>

        {suggestError && <p className="mt-3 rounded-xl px-3 py-2 text-sm alert-critical">{suggestError}</p>}
        {suggestNote && <p className="mt-3 text-sm text-ink-muted">{suggestNote}</p>}

        {suggestions && suggestions.length > 0 && (
          <ul className="mt-4 space-y-2">
            {suggestions.map((s) => (
              <li
                key={s.domain}
                className="flex items-start justify-between gap-3 rounded-xl border border-hairline bg-surface2 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{s.domain}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{s.reason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDismiss(s.domain)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-page"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAccept(s.domain, s.reason)}
                    disabled={acceptingDomain === s.domain}
                    className="rounded-full bg-good px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    {acceptingDomain === s.domain ? 'Adding…' : 'Block it'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {suggestions && suggestions.length === 0 && !suggestNote && (
          <p className="mt-3 text-sm text-ink-muted">No new tracker-like domains found in recent traffic.</p>
        )}

        <div className="mt-4">
          <ChatPanel />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-hairline bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogIcon className="h-4 w-4 text-ink-secondary" />
            <h2 className="text-lg font-semibold text-ink">Traffic log</h2>
          </div>
          <button
            type="button"
            onClick={handleGenerateLog}
            disabled={logPending}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-ink transition hover:bg-page disabled:opacity-60"
          >
            {logPending ? 'Summarizing…' : 'Generate entry now'}
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          A running plain-English record of what's happened on the network, written automatically as
          traffic accumulates.
        </p>

        {logError && <p className="mt-3 rounded-xl px-3 py-2 text-sm alert-critical">{logError}</p>}

        {aiLog.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {aiLog.map((entry, index) => (
              <li key={`${entry.timestamp}-${index}`} className="rounded-xl border border-hairline bg-surface2 px-3 py-3">
                <p className="text-xs font-medium text-ink-muted">{formatDate(entry.timestamp)}</p>
                <p className="mt-1 text-sm text-ink">{entry.summary}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            No log entries yet, they're written automatically every so often, or click "Generate entry
            now".
          </p>
        )}
      </section>
    </main>
  )
}

export default NetworkLog
