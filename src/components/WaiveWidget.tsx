import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Loader2, X, Trash2, Sparkles } from 'lucide-react'
import { WaiveIcon } from '@/components/WaiveIcon'

// ── Route → page key for server context ─────────────────────────
function pageKey(path: string): string {
  const map: Record<string, string> = {
    '/': 'customer-partners',
    '/my-integrations': 'my-integrations',
    '/check-status': 'check-status',
    '/reviewer': 'reviewer-requests',
    '/reviewer/partners': 'reviewer-partners',
    '/reviewer/risk-profiles': 'developer-risk-profiles',
    '/reviewer/applications': 'reviewer-applications',
    '/reviewer/usage-intelligence': 'usage-intelligence',
    '/reviewer/api-catalog': 'api-catalog',
  }
  if (map[path]) return map[path]
  if (path.startsWith('/reviewer/request/')) return 'reviewer-queue'
  if (path.startsWith('/reviewer/partner/')) return 'reviewer-partners'
  if (path.startsWith('/request/')) return 'request-form'
  if (path.startsWith('/confirmation/')) return 'check-status'
  return 'directory'
}

// ── Friendly page name for display ──────────────────────────────
function pageName(path: string): string {
  const map: Record<string, string> = {
    '/': 'Partners',
    '/my-integrations': 'My Integrations',
    '/check-status': 'Check Status',
    '/reviewer': 'Requests',
    '/reviewer/partners': 'Partners',
    '/reviewer/risk-profiles': 'Risk Profiles',
    '/reviewer/applications': 'Applications',
    '/reviewer/usage-intelligence': 'Usage Intelligence',
    '/reviewer/api-catalog': 'API Catalog',
  }
  if (map[path]) return map[path]
  if (path.startsWith('/reviewer/request/')) return 'Request Detail'
  if (path.startsWith('/reviewer/partner/')) return 'Partner Detail'
  if (path.startsWith('/request/')) return 'Request Form'
  if (path.startsWith('/confirmation/')) return 'Confirmation'
  return 'the Portal'
}

// ── Suggested questions per page ────────────────────────────────
function suggestedQuestions(path: string): string[] {
  const page = pageKey(path)
  const map: Record<string, string[]> = {
    'customer-partners': [
      'Which partners support PestPac?',
      'How do I request API access?',
      'What endpoints do I need for scheduling?',
      'Compare integration partners for my use case',
    ],
    'reviewer-requests': [
      'Which requests should I prioritize?',
      'Show me high-risk pending requests',
      'What does the approval workflow look like?',
      'How many requests are pending review?',
    ],
    'reviewer-partners': [
      'Which partners have competitive flags?',
      'Show blocked or at-risk partners',
      'What is the $500K ARR threshold?',
      'How does partner tiering work?',
    ],
    'api-catalog': [
      'How do I authenticate with the API?',
      'What endpoints handle customer data?',
      'Compare PestPac vs RealGreen APIs',
      'Which endpoints support scheduling?',
    ],
    'reviewer-applications': [
      'What are the top competitive vendors?',
      'Show application trends by product',
      'How many applications flagged resell intent?',
      'Which endpoints are most requested?',
    ],
    'usage-intelligence': [
      'Which capability gaps are largest?',
      'What integrations have the most demand?',
      'Where should we invest in API coverage?',
      'Show me scheduling integration gaps',
    ],
    'developer-risk-profiles': [
      'Who are the highest-risk developers?',
      'What factors drive risk scores?',
      'Which developers have competitive overlap?',
      'How is the risk score calculated?',
    ],
    'request-form': [
      'What endpoints should I request for CRM sync?',
      'What volume tier do I need?',
      'What happens after I submit?',
      'Which data categories should I select?',
    ],
  }
  return map[page] ?? [
    'What can WAIve help me with?',
    'How does API access work?',
    'What endpoints are available?',
    'Walk me through the process',
  ]
}

export function WaiveWidget() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ dailySpentCents: number; dailyBudgetCents: number } | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Clear conversation when navigating to a new page
  const currentPage = pageKey(location.pathname)
  const prevPageRef = useRef(currentPage)
  useEffect(() => {
    if (currentPage !== prevPageRef.current) {
      prevPageRef.current = currentPage
      setMessages([])
      setError(null)
    }
  }, [currentPage])

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  const ask = async (q?: string) => {
    const text = (q ?? question).trim()
    if (!text || loading) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setQuestion('')
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, page: currentPage }),
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

  const clearChat = () => {
    setMessages([])
    setError(null)
    setUsage(null)
  }

  const friendly = pageName(location.pathname)
  const suggestions = suggestedQuestions(location.pathname)

  return (
    <>
      {/* ── Floating WAIve button ── */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all hover:scale-105 hover:shadow-xl ${
          open
            ? 'bg-ww-gray-700'
            : 'bg-[#6310D1] hover:bg-[#5009B0]'
        }`}
        title="Ask WAIve"
      >
        {open ? (
          <X size={20} className="text-white" />
        ) : (
          <WaiveIcon size={28} className="brightness-0 invert" />
        )}
      </button>

      {/* ── Slide-out panel ── */}
      {open && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[58] w-[400px] max-w-[90vw] bg-white shadow-2xl flex flex-col border-l border-ww-gray-200">
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-[#6310D1] to-[#4A0EA0] text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <WaiveIcon size={22} className="brightness-0 invert" />
                  <span className="font-display font-bold text-[15px] tracking-tight">WAIve</span>
                </div>
                <div className="flex items-center gap-1">
                  {usage && (
                    <span className="text-[10px] font-mono text-white/60 mr-2">
                      ${((usage.dailyBudgetCents - usage.dailySpentCents) / 100).toFixed(2)} left
                    </span>
                  )}
                  {messages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      title="New conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <p className="text-white/50 text-[11px] mt-1 font-mono uppercase tracking-wider">
                {friendly}
              </p>
            </div>

            {/* ── Chat area ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                /* ── Empty state: branded welcome + suggestions ── */
                <div className="flex flex-col items-center px-6 pt-10 pb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6310D1] to-[#8736F0] flex items-center justify-center mb-5 shadow-lg shadow-[#6310D1]/20">
                    <Sparkles size={28} className="text-white" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-ww-navy text-center">
                    Ask WAIve about {friendly}
                  </h3>
                  <p className="text-sm text-ww-gray-400 text-center mt-1.5 max-w-[280px]">
                    Endpoints, partners, access requests, pricing, authentication — I've got you covered.
                  </p>

                  {/* Suggested questions */}
                  <div className="w-full mt-6 space-y-2">
                    {suggestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => ask(q)}
                        className="w-full text-left px-4 py-2.5 rounded-lg border border-ww-gray-200 text-sm text-ww-gray-600 hover:border-[#6310D1]/30 hover:bg-[#6310D1]/5 hover:text-[#6310D1] transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Message thread ── */
                <div className="px-5 py-4 space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#6310D1] text-white rounded-br-md'
                            : 'bg-ww-gray-100 text-ww-gray-700 rounded-bl-md'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <WaiveIcon size={12} />
                            <span className="text-[10px] font-semibold text-[#6310D1] uppercase tracking-wider">WAIve</span>
                          </div>
                        )}
                        <span className="whitespace-pre-wrap">{msg.text}</span>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-ww-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-[#6310D1]" />
                        <span className="text-sm text-ww-gray-400">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="px-5 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</div>
            )}

            {/* ── Input ── */}
            <div className="px-4 py-3 border-t border-ww-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() }
                  }}
                  placeholder={messages.length > 0 ? 'Ask a follow-up...' : `Ask about ${friendly.toLowerCase()}...`}
                  rows={1}
                  className="flex-1 resize-none text-sm border border-ww-gray-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-[#6310D1]/20 focus:border-[#6310D1]/40 outline-none"
                />
                <button
                  onClick={() => ask()}
                  disabled={!question.trim() || loading}
                  className="px-3.5 py-2.5 rounded-xl bg-[#6310D1] text-white hover:bg-[#5009B0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
