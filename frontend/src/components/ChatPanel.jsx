import { useEffect, useRef, useState } from 'react'
import { sendChatMessage } from '../lib/api'
import { SendIcon } from './icons'

function ChatPanel({ onBlocklistChange }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, pending])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || pending) return

    const history = messages.map(({ role, content }) => ({ role, content }))
    setMessages((current) => [...current, { role: 'user', content: text }])
    setInput('')
    setPending(true)
    setError(null)

    try {
      const data = await sendChatMessage(text, history)
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }])
      if (data.blockedDomains?.length > 0) {
        setMessages((current) => [
          ...current,
          {
            role: 'system',
            content: `Blocked: ${data.blockedDomains.join(', ')}`,
          },
        ])
        if (data.domains) onBlocklistChange?.(data.domains)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-hairline bg-surface2">
      <div ref={scrollRef} className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-ink-muted">
            Ask about recent traffic, why something was flagged, which blocklists to turn on, or just
            say "block ads.example.com" and I'll do it.
          </p>
        )}
        {messages.map((message, index) => {
          if (message.role === 'system') {
            return (
              <p key={index} className="text-center text-xs font-medium text-ink-muted">
                {message.content}
              </p>
            )
          }
          return (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'bg-brand text-white'
                    : 'border border-hairline bg-surface text-ink'
                }`}
              >
                {message.content}
              </p>
            </div>
          )
        })}
        {pending && <p className="text-sm text-ink-muted">Thinking…</p>}
      </div>

      {error && <p className="px-4 pb-2 text-sm alert-critical">{error}</p>}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-hairline px-3 py-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your traffic, or ask me to block a domain…"
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-page px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-hover disabled:opacity-60"
          aria-label="Send message"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

export default ChatPanel
