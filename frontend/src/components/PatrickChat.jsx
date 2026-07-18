import { useEffect, useRef, useState } from 'react'
import { sendChatMessage } from '../lib/api'
import { SendIcon } from './icons'

const STARTERS = [
  "Why shouldn't I click random links?",
  'What does Parasol protect me from?',
  'Is it safe to share my password?',
]

export default function PatrickChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Patrick the cat. Ask me anything about staying safe online — meow!",
    },
  ])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, pending])

  const ask = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || pending) return

    const history = messages.map(({ role, content }) => ({ role, content }))

    setMessages((current) => [...current, { role: 'user', content: trimmed }])
    setInput('')
    setPending(true)
    setError(null)

    try {
      const data = await sendChatMessage(trimmed, history, 'kids')
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(
        err.message?.includes('Ollama')
          ? "Patrick is napping (chat isn't connected right now). Try again soon, or ask a grown-up!"
          : err.message,
      )
    } finally {
      setPending(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    ask(input)
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-hairline bg-white md:w-[380px]">
      <header className="flex items-center gap-3 border-b border-hairline px-4 py-4">
        <img
          src="/cat.gif"
          alt=""
          className="h-12 w-12 select-none"
          style={{ imageRendering: 'pixelated' }}
          draggable={false}
        />
        <div>
          <p className="font-display text-lg text-ink">Chat with Patrick</p>
          <p className="text-xs text-ink-muted">Your online safety buddy</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p
              className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-brand text-white'
                  : 'border border-hairline bg-brand-mist text-ink'
              }`}
            >
              {message.content}
            </p>
          </div>
        ))}
        {pending && <p className="text-sm text-ink-muted">Patrick is thinking…</p>}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {STARTERS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => ask(prompt)}
              disabled={pending}
              className="rounded-full border border-hairline bg-page px-3 py-1.5 text-left text-xs font-medium text-ink-secondary transition hover:border-brand hover:text-ink disabled:opacity-60"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-4 pb-2 text-sm alert-critical">{error}</p>}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-hairline px-3 py-3">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Patrick about staying safe…"
          className="min-w-0 flex-1 rounded-xl border border-hairline bg-page px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-hover disabled:opacity-60"
          aria-label="Send message"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>
    </aside>
  )
}
