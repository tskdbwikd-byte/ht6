import { useEffect, useRef, useState } from 'react'
import { sendChatMessage } from '../lib/api'
import { SendIcon } from './icons'

const STARTERS = [
  'Why did Parasol stop something?',
  "Why shouldn't I click random links?",
  'What happens if I share my password?',
]

const PIXEL_BOX = {
  fontFamily: '"Press Start 2P", monospace',
  lineHeight: 1.65,
  imageRendering: 'pixelated',
}

function PixelBubble({ role, children, speakFromCat }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-center'}`}>
      <div
        className={`relative w-fit max-w-[min(100%,22rem)] px-4 py-3.5 ${
          isUser ? 'bg-brand text-white' : 'bg-white text-[#1a2b28]'
        }`}
        style={{
          ...PIXEL_BOX,
          fontSize: 13,
          border: `4px solid ${isUser ? '#3D8A7C' : '#1a2b28'}`,
          boxShadow: `4px 4px 0 ${isUser ? '#3D8A7C' : '#1a2b28'}`,
        }}
      >
        <p className="whitespace-pre-wrap">{children}</p>

        {speakFromCat && (
          <>
            <span
              className="absolute left-1/2 top-full z-[1] -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: '14px solid #1a2b28',
              }}
            />
            <span
              className="absolute left-1/2 top-full z-[2] -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                marginTop: -5,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '10px solid #ffffff',
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function PatrickChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Hi! I'm Patrick. Ask me why Parasol stops things!",
    },
  ])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const messagesRef = useRef(messages)
  const pendingRef = useRef(false)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, pending])

  const ask = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || pendingRef.current) return

    const history = messagesRef.current.map(({ role, content }) => ({ role, content }))

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

  const showStarters = messages.length <= 1 && !pending
  const lastIndex = messages.length - 1

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#e8f2ef]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 72%, rgba(74,155,140,0.22), transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-[1] shrink-0 px-5 pt-4 text-center sm:px-8">
        <p className="font-display text-3xl text-ink sm:text-4xl">Chat with Patrick</p>
      </div>

      <div
        ref={scrollRef}
        className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-8"
      >
        <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col items-center justify-center gap-3 py-6">
          {messages.map((message, index) => (
            <PixelBubble
              key={index}
              role={message.role}
              speakFromCat={message.role === 'assistant' && index === lastIndex && !pending}
            >
              {message.content}
            </PixelBubble>
          ))}
          {pending && (
            <div className="flex justify-center pb-1">
              <p
                className="relative bg-white px-3 py-2 text-[#1a2b28]"
                style={{
                  ...PIXEL_BOX,
                  fontSize: 12,
                  border: '3px solid #1a2b28',
                  boxShadow: '3px 3px 0 #1a2b28',
                }}
              >
                thinking…
                <span
                  className="absolute left-1/2 top-full -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '10px solid #1a2b28',
                  }}
                />
                <span
                  className="absolute left-1/2 top-full -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    marginTop: -4,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '7px solid #ffffff',
                  }}
                />
              </p>
            </div>
          )}

          <img
            src="/patrick-chat.gif"
            alt="Patrick the cat"
            className="h-40 w-40 shrink-0 select-none sm:h-48 sm:w-48 md:h-56 md:w-56"
            style={{ imageRendering: 'pixelated' }}
            draggable={false}
          />

          {showStarters && (
            <div className="flex flex-wrap justify-center gap-2.5 pb-2">
              {STARTERS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  disabled={pending}
                  className="w-fit max-w-[11.5rem] bg-white px-3 py-2.5 text-left text-[#1a2b28] transition hover:translate-x-px hover:translate-y-px disabled:opacity-60"
                  style={{
                    ...PIXEL_BOX,
                    fontSize: 10,
                    border: '3px solid #1a2b28',
                    boxShadow: '3px 3px 0 #1a2b28',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="relative z-[1] px-5 pb-2 text-center text-sm alert-critical sm:px-8">{error}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative z-[1] flex items-stretch gap-2 border-t-4 border-[#1a2b28] bg-white px-3 py-3 sm:px-6"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Why… ?"
          className="min-w-0 flex-1 bg-white px-3 py-3 text-[#1a2b28] outline-none placeholder:text-[#7a8f89]"
          style={{
            ...PIXEL_BOX,
            fontSize: 14,
            border: '3px solid #1a2b28',
            boxShadow: '3px 3px 0 #1a2b28',
          }}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex w-14 shrink-0 items-center justify-center bg-brand text-white transition hover:bg-brand-hover disabled:opacity-60"
          style={{
            border: '3px solid #1a2b28',
            boxShadow: '3px 3px 0 #1a2b28',
          }}
          aria-label="Send message"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </form>
    </section>
  )
}
