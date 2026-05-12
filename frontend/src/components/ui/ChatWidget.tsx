import { useState, useRef, useEffect } from 'react'
import { X, MessageCircle, Send, Loader2 } from 'lucide-react'
import { sendChatMessage, type ChatMessage } from '@/lib/api'
import { useAuth, getAuthToken } from '@/hooks/useAuth'

const QUICK_REPLIES = [
  'Track my order',
  'Return policy',
  'Shipping info',
  'Sizing help',
]

export function ChatWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [hasGreeted, setHasGreeted] = useState(false)
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const greeting = user?.firstName
    ? `Hi ${user.firstName}, I'm here to help with orders, returns, sizing, and anything else. What can I do for you?`
    : "Hi, I'm Akwaluzto's support assistant. I can help with orders, returns, shipping, and sizing. How can I help?"

  // Mount panel on first open so it's in the DOM for transitions
  useEffect(() => {
    if (open && !mounted) setMounted(true)
  }, [open, mounted])

  useEffect(() => {
    if (open && !hasGreeted) {
      setHistory([{ role: 'assistant', content: greeting }])
      setHasGreeted(true)
    }
  }, [open, hasGreeted, greeting])

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 50)
    }
  }, [open, history])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const next = [...history, userMsg]
    setHistory(next)
    setInput('')
    setSending(true)

    try {
      const token = getAuthToken()
      const contextHistory = next.slice(1)
      const { reply } = await sendChatMessage(trimmed, contextHistory, token)
      setHistory([...next, { role: 'assistant', content: reply }])
    } catch (err: any) {
      const msg =
        err?.message && !err.message.toLowerCase().includes('internal server error')
          ? err.message
          : "I'm having trouble connecting right now. Please try again in a moment or reach out via our contact form."
      setHistory([...next, { role: 'assistant', content: msg }])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Chat panel — always in DOM once opened, hidden via CSS so transitions work */}
      {mounted && (
        <div
          className="w-80 sm:w-96 shadow-2xl border border-cream/10 overflow-hidden"
          style={{
            height: '520px',
            background: '#0f0d0c',
            display: 'flex',
            flexDirection: 'column',
            transformOrigin: 'bottom right',
            transition: 'opacity 250ms ease, transform 250ms ease',
            opacity: open ? 1 : 0,
            transform: open ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(16px)',
            pointerEvents: open ? 'auto' : 'none',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b border-cream/10"
            style={{ flexShrink: 0 }}
          >
            <div>
              <p className="text-cream font-serif text-base leading-tight">Support</p>
              <p className="text-cream/40 text-xs font-sans tracking-widest uppercase mt-0.5">Akwaluzto</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-cream/40 hover:text-cream transition-colors p-1"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="px-4 py-4 space-y-3"
            style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
          >
            {history.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 text-sm font-sans leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-cream text-charcoal'
                      : 'bg-white/5 text-cream/90 border border-cream/8'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-cream/8 px-3.5 py-2.5">
                  <Loader2 size={14} className="text-cream/40 animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          {history.length === 1 && (
            <div
              className="px-4 pb-3 flex flex-wrap gap-2"
              style={{ flexShrink: 0 }}
            >
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-2xs font-sans tracking-widest uppercase text-cream/50 border border-cream/15 px-3 py-1.5 hover:border-cream/40 hover:text-cream/80 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-4 py-3 border-t border-cream/10"
            style={{ flexShrink: 0 }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              maxLength={1000}
              disabled={sending}
              className="flex-1 bg-transparent text-cream placeholder-cream/25 text-sm font-sans outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="text-cream/40 hover:text-cream transition-colors disabled:opacity-25 p-1"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        className="w-12 h-12 bg-cream text-charcoal flex items-center justify-center shadow-lg hover:bg-cream/90 transition-colors overflow-hidden"
        style={{ flexShrink: 0 }}
      >
        {/* Animated icon swap */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 300ms ease, opacity 300ms ease',
            transform: open ? 'rotate(90deg) scale(1)' : 'rotate(0deg) scale(1)',
            opacity: 1,
          }}
        >
          {open ? <X size={18} /> : <MessageCircle size={18} />}
        </span>
      </button>
    </div>
  )
}
