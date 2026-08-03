import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, X, Trash2 } from 'lucide-react'
import { WaiveIcon } from '@/components/WaiveIcon'

interface AskWaiveProps {
  /** Page identifier sent to the server for context-aware responses */
  page: string
  /** Placeholder text shown in the input when empty */
  placeholder?: string
}

export function AskWaive({ page, placeholder = 'Ask WAIve...' }: AskWaiveProps) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ dailySpentCents: number; dailyBudgetCents: number } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  const ask = async () => {
    const q = question.trim()
    if (!q || loading) return
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setQuestion('')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, page }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Request failed')
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
        if (data.usage) setUsage(data.usage)
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => {
          setOpen(o => !o)
          if (!open) setTimeout(() => inputRef.current?.focus(), 100)
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
          open
            ? 'bg-ww-primary text-white'
            : 'bg-ww-navy text-white hover:bg-ww-navy/90'
        }`}
      >
        <WaiveIcon size={15} />
        Ask WAIve
      </button>

      {/* Panel */}
      {open && (
        <div className="col-span-full border border-ww-gray-200 rounded-lg bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-ww-gray-200 bg-ww-gray-50">
            <div className="flex items-center gap-2">
              <WaiveIcon size={14} />
              <span className="text-sm font-display font-bold text-ww-navy">Ask WAIve</span>
            </div>
            <div className="flex items-center gap-1">
              {usage && (
                <span className="text-[10px] font-mono text-ww-gray-400 mr-2">
                  ${((usage.dailyBudgetCents - usage.dailySpentCents) / 100).toFixed(2)} remaining
                </span>
              )}
              {messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); setError(null); setUsage(null) }}
                  className="p-1 rounded text-ww-gray-400 hover:text-ww-gray-600"
                  title="Clear conversation"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded text-ww-gray-400 hover:text-ww-gray-600">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          {messages.length > 0 && (
            <div ref={scrollRef} className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-ww-navy font-medium' : 'text-ww-gray-600'}`}>
                  <span className="text-[10px] font-mono text-ww-gray-400 uppercase mr-1.5">
                    {msg.role === 'user' ? 'You' : 'WAIve'}
                  </span>
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-ww-gray-400 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</div>
          )}

          {/* Input */}
          <div className="px-4 py-2.5 border-t border-ww-gray-200 flex gap-2">
            <textarea
              ref={inputRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() }
              }}
              placeholder={messages.length > 0 ? 'Ask a follow-up...' : placeholder}
              rows={1}
              className="flex-1 resize-none text-sm border border-ww-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
            />
            <button
              onClick={ask}
              disabled={!question.trim() || loading}
              className="px-3 py-2 rounded-lg bg-ww-navy text-white hover:bg-ww-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
