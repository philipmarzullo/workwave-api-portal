import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Send, Loader2, X, Trash2, Sparkles, ArrowRight } from 'lucide-react'
import { WaiveIcon } from '@/components/WaiveIcon'
import type { ViewMode } from '@/data/types'

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

// ── Suggested questions per page + persona ──────────────────────
function suggestedQuestions(path: string, role: ViewMode): string[] {
  const page = pageKey(path)

  // Reviewer-specific suggestions
  if (role === 'reviewer') {
    const reviewerMap: Record<string, string[]> = {
      'reviewer-requests': [
        'Which requests should I prioritize?',
        'Show me high-risk pending requests',
        'What does the approval workflow look like?',
        'Flag any competitive concerns in the queue',
      ],
      'reviewer-partners': [
        'Which partners have competitive flags?',
        'Show blocked or at-risk partners',
        'What is the $500K ARR threshold?',
        'Summarize partner risk exposure',
      ],
      'api-catalog': [
        'How do I authenticate with the API?',
        'Compare PestPac vs RealGreen API surfaces',
        'Which endpoints handle premium data?',
        'Show me legacy vs modern WinTeam endpoints',
      ],
      'reviewer-applications': [
        'What are the top competitive vendors?',
        'Show application trends by product',
        'How many applications flagged resell intent?',
        'Cross-reference demand with endpoint coverage',
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
        'Recommend access restrictions for high-risk devs',
      ],
    }
    return reviewerMap[page] ?? [
      'What can WAIve help me with?',
      'Summarize the current review pipeline',
      'Which areas have the most risk?',
      'Show me competitive landscape insights',
    ]
  }

  // Customer-specific suggestions
  const customerMap: Record<string, string[]> = {
    'customer-partners': [
      'Walk me through getting API access',
      'Which partners support PestPac?',
      'What endpoints do I need for scheduling?',
      'Can I build my own integration?',
    ],
    'my-integrations': [
      'What is the status of my integrations?',
      'How do I request additional endpoints?',
      'What volume tier am I on?',
      'How do I upgrade my access?',
    ],
    'check-status': [
      'Where is my request in the review process?',
      'How long does approval usually take?',
      'What are the review stages?',
      'Who do I contact for updates?',
    ],
    'request-form': [
      'What endpoints should I request for CRM sync?',
      'What volume tier do I need?',
      'What happens after I submit?',
      'Which data categories should I select?',
    ],
    'directory': [
      'Which partner fits my use case?',
      'How do I compare integration partners?',
      'What products does each partner support?',
      'Can I request access without a partner?',
    ],
  }
  return customerMap[page] ?? [
    'Walk me through getting API access',
    'What integrations are available?',
    'What endpoints do I need?',
    'How does the approval process work?',
  ]
}

// ── Navigation actions WAIve can suggest ────────────────────────
interface NavAction {
  label: string
  path: string
}

const CUSTOMER_NAV_ACTIONS: { keywords: RegExp; action: NavAction }[] = [
  { keywords: /request (?:api )?access|start (?:a )?request|submit (?:a )?request|apply for|get started/i, action: { label: 'Start Access Request', path: '/request' } },
  { keywords: /browse partners|find (?:a )?partner|view partners|partner directory/i, action: { label: 'Browse Partners', path: '/' } },
  { keywords: /check (?:your |my )?status|track (?:your |my )?request|where is my/i, action: { label: 'Check Request Status', path: '/check-status' } },
  { keywords: /my integrations|active integrations|current access/i, action: { label: 'View My Integrations', path: '/my-integrations' } },
  { keywords: /api catalog|endpoint catalog|browse endpoints|view endpoints/i, action: { label: 'View API Catalog', path: '/reviewer/api-catalog' } },
  { keywords: /build your own|self.?build|internal integration|without a partner/i, action: { label: 'Build Your Own', path: '/request?self=true' } },
]

function detectNavActions(text: string, role: ViewMode): NavAction[] {
  if (role !== 'customer') return []
  const actions: NavAction[] = []
  for (const { keywords, action } of CUSTOMER_NAV_ACTIONS) {
    if (keywords.test(text) && actions.length < 2) {
      actions.push(action)
    }
  }
  return actions
}

export function WaiveWidget({ viewMode }: { viewMode: ViewMode }) {
  const location = useLocation()
  const navigate = useNavigate()
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
        body: JSON.stringify({ question: text, page: currentPage, role: viewMode }),
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
  const suggestions = suggestedQuestions(location.pathname, viewMode)

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

      {/* ── Floating card popup ── */}
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="fixed bottom-[88px] right-5 z-[58] w-[380px] max-w-[calc(100vw-40px)] max-h-[min(620px,calc(100vh-120px))] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-ww-gray-200">
            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-[#6310D1] to-[#4A0EA0] text-white px-4 py-3 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WaiveIcon size={20} className="brightness-0 invert" />
                  <div>
                    <span className="font-display font-bold text-[14px] tracking-tight">WAIve</span>
                    <span className="text-[10px] font-mono text-white/50 ml-1.5 uppercase tracking-wider">{friendly}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {usage && (
                    <span className="text-[9px] font-mono text-white/40 mr-1">
                      ${((usage.dailyBudgetCents - usage.dailySpentCents) / 100).toFixed(2)}
                    </span>
                  )}
                  {messages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      title="New conversation"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Chat area ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                /* ── Empty state: branded welcome + suggestions ── */
                <div className="flex flex-col items-center px-5 pt-8 pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6310D1] to-[#8736F0] flex items-center justify-center mb-4 shadow-lg shadow-[#6310D1]/20">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <h3 className="font-display font-bold text-base text-ww-navy text-center">
                    Ask WAIve about {friendly}
                  </h3>
                  <p className="text-[13px] text-ww-gray-400 text-center mt-1 max-w-[260px]">
                    Endpoints, partners, access requests, pricing, authentication — I've got you covered.
                  </p>

                  {/* Suggested questions */}
                  <div className="w-full mt-5 space-y-1.5">
                    {suggestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => ask(q)}
                        className="w-full text-left px-3.5 py-2.5 rounded-lg border border-ww-gray-200 text-[13px] text-ww-gray-600 hover:border-[#6310D1]/30 hover:bg-[#6310D1]/5 hover:text-[#6310D1] transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Message thread ── */
                <div className="px-4 py-3 space-y-3">
                  {messages.map((msg, i) => {
                    const navActions = msg.role === 'assistant' ? detectNavActions(msg.text, viewMode) : []
                    return (
                      <div key={i}>
                        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-[#6310D1] text-white rounded-br-md'
                                : 'bg-ww-gray-100 text-ww-gray-700 rounded-bl-md'
                            }`}
                          >
                            {msg.role === 'assistant' && (
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <WaiveIcon size={11} />
                                <span className="text-[9px] font-semibold text-[#6310D1] uppercase tracking-wider">WAIve</span>
                              </div>
                            )}
                            <span className="whitespace-pre-wrap">{msg.text}</span>
                          </div>
                        </div>
                        {navActions.length > 0 && (
                          <div className="flex gap-2 mt-1.5 ml-1">
                            {navActions.map((action, j) => (
                              <button
                                key={j}
                                onClick={() => { navigate(action.path); setOpen(false) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6310D1]/10 text-[#6310D1] text-[12px] font-medium hover:bg-[#6310D1]/20 transition-colors"
                              >
                                {action.label}
                                <ArrowRight size={11} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-ww-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2">
                        <Loader2 size={13} className="animate-spin text-[#6310D1]" />
                        <span className="text-[13px] text-ww-gray-400">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</div>
            )}

            {/* ── Input ── */}
            <div className="px-3.5 py-3 border-t border-ww-gray-200 bg-white rounded-b-2xl">
              <div className="flex gap-2 items-center">
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() }
                  }}
                  placeholder={messages.length > 0 ? 'Ask a follow-up...' : `Ask about ${friendly.toLowerCase()}...`}
                  rows={1}
                  className="flex-1 resize-none text-[13px] border border-ww-gray-200 rounded-full px-3.5 py-2 focus:ring-2 focus:ring-[#6310D1]/20 focus:border-[#6310D1]/40 outline-none"
                />
                <button
                  onClick={() => ask()}
                  disabled={!question.trim() || loading}
                  className="w-9 h-9 rounded-full bg-[#6310D1] text-white hover:bg-[#5009B0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
