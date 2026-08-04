import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Send, Loader2, X, Trash2, Sparkles, ArrowRight, CheckCircle2, ClipboardCopy } from 'lucide-react'
import { WaiveIcon } from '@/components/WaiveIcon'
import { store } from '@/data/store'
import type { ViewMode, CustomerUser, DataCategory, WorkWaveProduct, BuilderType, UseCase } from '@/data/types'

// ── Route to page key for server context ─────────────────────────
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
      'How do I message the review team?',
    ],
    'request-form': [
      'What endpoints should I request for CRM sync?',
      'What volume tier do I need?',
      'What happens after I submit?',
      'How do I add my WinTeam databases?',
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

// ── Simple markdown to JSX for WAIve responses ───────────────────
function renderWaiveText(text: string) {
  // Split into lines, process each
  return text.split('\n').map((line, li) => {
    // Process inline formatting: **bold** and *italic*
    const parts: React.ReactNode[] = []
    let remaining = line
    let ki = 0
    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(remaining.slice(0, boldMatch.index))
        }
        parts.push(<strong key={ki++} className="font-semibold">{boldMatch[1]}</strong>)
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
        continue
      }
      // No more formatting
      parts.push(remaining)
      break
    }

    // Bullet lines
    const bulletMatch = line.match(/^(\s*[-\u2022]\s+)(.*)/)
    if (bulletMatch) {
      return <div key={li} className="flex gap-1.5 ml-1"><span className="text-[#6310D1] shrink-0">&#8226;</span><span>{parts.slice(1)}{parts.length <= 1 ? renderInlineParts(bulletMatch[2]) : null}</span></div>
    }

    // Numbered lines
    const numMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      return <div key={li} className="flex gap-1.5 ml-1"><span className="text-[#6310D1] font-semibold shrink-0">{numMatch[1]}.</span><span>{parts.slice(1)}{parts.length <= 1 ? renderInlineParts(numMatch[2]) : null}</span></div>
    }

    if (line.trim() === '') return <div key={li} className="h-2" />
    return <div key={li}>{parts}</div>
  })
}

function renderInlineParts(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let ki = 0
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index))
      parts.push(<strong key={ki++} className="font-semibold">{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
      continue
    }
    parts.push(remaining)
    break
  }
  return parts
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

// ── Wizard parsed request data ──────────────────────────────────
interface WizardRequestData {
  product: string
  builderType: string
  connectingSystem: string
  useCase: string
  useCaseDetail: string
  dataRead: string[]
  dataWrite: string[]
  endpointsRequested: string
  partnerName: string | null
  partnerWebsite: string | null
  partnerContact: string | null
  technicalContactName: string | null
  technicalContactEmail: string | null
  technicalContactPhone: string | null
  targetTimeline: string
  requestType: string
  environment: string
}

// ── Label maps for summary card ─────────────────────────────────
const PRODUCT_DISPLAY: Record<string, string> = {
  pestpac: 'PestPac',
  realgreen: 'RealGreen',
  winteam: 'WinTeam',
}

const TIMELINE_DISPLAY: Record<string, string> = {
  asap: 'As soon as possible',
  this_quarter: 'This quarter',
  next_quarter: 'Next quarter',
  exploring: 'Just exploring',
}

const USE_CASE_DISPLAY: Record<string, string> = {
  sync_customer_data: 'Sync Customer Data',
  automate_scheduling: 'Automate Scheduling',
  financial_reporting: 'Financial Reporting',
  payment_processing: 'Payment Processing',
  fleet_tracking: 'Fleet Tracking',
  marketing_automation: 'Marketing Automation',
  hr_integration: 'HR Integration',
  custom_reporting: 'Custom Reporting',
  mobile_app: 'Mobile App',
  other: 'Other',
}

const BUILDER_DISPLAY: Record<string, string> = {
  partner: 'Integration Partner',
  internal_team: 'Internal Team',
  contractor: 'Contractor',
}

// ── Valid type sets for safe casting ─────────────────────────────
const VALID_PRODUCTS = new Set(['pestpac', 'realgreen', 'winteam'])
const VALID_USE_CASES = new Set([
  'sync_customer_data', 'automate_scheduling', 'financial_reporting',
  'payment_processing', 'fleet_tracking', 'marketing_automation',
  'hr_integration', 'custom_reporting', 'mobile_app', 'other',
])
const VALID_BUILDER_TYPES = new Set(['partner', 'internal_team', 'contractor'])
const VALID_DATA_CATEGORIES = new Set([
  'customers', 'appointments', 'invoices', 'payments', 'employees',
  'routes', 'inventory', 'service_history', 'estimates', 'documents',
])

// ── Component ───────────────────────────────────────────────────

export function WaiveWidget({ viewMode, activeUser }: { viewMode: ViewMode; activeUser?: CustomerUser }) {
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

  // ── Wizard state (AI-powered conversation) ──
  const [wizardActive, setWizardActive] = useState(false)
  const [wizardMessages, setWizardMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [wizardRequestData, setWizardRequestData] = useState<WizardRequestData | null>(null)
  // wizardSummaryText is stored implicitly in the last wizard assistant message
  const [wizardSubmitting, setWizardSubmitting] = useState(false)
  const [wizardSubmitted, setWizardSubmitted] = useState(false)

  // ── Parse wizard response for <<<SUBMIT_REQUEST>>> marker ──
  const parseWizardResponse = (text: string): { displayText: string; requestData: WizardRequestData | null } => {
    const marker = '<<<SUBMIT_REQUEST>>>'
    const idx = text.indexOf(marker)
    if (idx === -1) {
      return { displayText: text, requestData: null }
    }

    const displayText = text.slice(0, idx).trim()
    const jsonStr = text.slice(idx + marker.length).trim()

    try {
      // Try to extract JSON from the remaining text
      const jsonStart = jsonStr.indexOf('{')
      const jsonEnd = jsonStr.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(jsonStr.slice(jsonStart, jsonEnd + 1))
        return { displayText, requestData: parsed as WizardRequestData }
      }
    } catch (e) {
      console.error('Failed to parse wizard JSON:', e)
    }

    return { displayText, requestData: null }
  }

  // ── Send wizard message ──
  const sendWizardMessage = useCallback(async (userMessage: string) => {
    const newMessages = [...wizardMessages, { role: 'user' as const, content: userMessage }]
    setWizardMessages(newMessages)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'wizard',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Request failed')
      } else {
        const { displayText, requestData } = parseWizardResponse(data.answer)
        const updatedMessages = [...newMessages, { role: 'assistant' as const, content: displayText }]
        setWizardMessages(updatedMessages)
        if (requestData) {
          setWizardRequestData(requestData)
        }
        if (data.usage) setUsage(data.usage)
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [wizardMessages])

  // ── Start wizard — kick off the conversation ──
  const startWizard = useCallback(() => {
    setWizardActive(true)
    setWizardMessages([])
    setWizardRequestData(null)
    setWizardSubmitting(false)
    setWizardSubmitted(false)
    setMessages([])
    setError(null)
    setQuestion('')
  }, [])

  // After starting wizard, send the initial kickoff message
  const wizardInitRef = useRef(false)
  useEffect(() => {
    if (wizardActive && wizardMessages.length === 0 && !loading && !wizardInitRef.current) {
      wizardInitRef.current = true
      sendWizardMessage('start')
    }
    if (!wizardActive) {
      wizardInitRef.current = false
    }
  }, [wizardActive, wizardMessages.length, loading, sendWizardMessage])

  const exitWizard = () => {
    setWizardActive(false)
    setWizardMessages([])
    setWizardRequestData(null)
    setWizardSubmitting(false)
    setWizardSubmitted(false)
  }

  // ── Submit the wizard request ──
  const submitWizardRequest = async () => {
    if (!wizardRequestData || !activeUser) return
    setWizardSubmitting(true)

    try {
      const product = VALID_PRODUCTS.has(wizardRequestData.product)
        ? wizardRequestData.product as WorkWaveProduct
        : 'pestpac' as WorkWaveProduct
      const useCase = VALID_USE_CASES.has(wizardRequestData.useCase)
        ? wizardRequestData.useCase as UseCase
        : 'other' as UseCase
      const builderType = VALID_BUILDER_TYPES.has(wizardRequestData.builderType)
        ? wizardRequestData.builderType as BuilderType
        : 'internal_team' as BuilderType
      const dataRead = (wizardRequestData.dataRead || []).filter(d => VALID_DATA_CATEGORIES.has(d)) as DataCategory[]
      const dataWrite = (wizardRequestData.dataWrite || []).filter(d => VALID_DATA_CATEGORIES.has(d)) as DataCategory[]

      const newRequest = store.createRequest({
        customerId: activeUser.customerId,
        requestedBy: activeUser.id,
        partnerId: null,
        partnerNameFreetext: wizardRequestData.partnerName || null,
        partnerWebsite: wizardRequestData.partnerWebsite || null,
        partnerContact: wizardRequestData.partnerContact || null,
        product,
        builderType,
        connectingSystem: wizardRequestData.connectingSystem || '',
        useCase,
        useCaseDetail: wizardRequestData.useCaseDetail || '',
        dataRead,
        dataWrite,
        dataLeavesEnvironment: true,
        endpointsRequested: wizardRequestData.endpointsRequested || '',
        thirdPartyTool: null,
        thirdPartyToolUrl: null,
        technicalContactName: wizardRequestData.technicalContactName || null,
        technicalContactEmail: wizardRequestData.technicalContactEmail || null,
        technicalContactPhone: wizardRequestData.technicalContactPhone || null,
        targetTimeline: wizardRequestData.targetTimeline || null,
        environment: (wizardRequestData.environment === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
        requestType: 'new_access',
        migratingFrom: null,
        customerIntendToResell: null,
        developerIntendToResell: null,
        databases: [],
      })

      setWizardSubmitted(true)
      // Navigate to confirmation after a brief pause
      setTimeout(() => {
        navigate(`/confirmation/${newRequest.id}`)
        setOpen(false)
        exitWizard()
      }, 1500)
    } catch (e) {
      console.error('Failed to create request:', e)
      setError('Failed to submit request. Please try again.')
      setWizardSubmitting(false)
    }
  }

  // ── Handle wizard text input ──
  const handleWizardInput = () => {
    const text = question.trim()
    if (!text || loading || wizardRequestData) return
    setQuestion('')
    sendWizardMessage(text)
  }

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
  }, [messages, wizardMessages, open, wizardRequestData])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150)
  }, [open])

  // Listen for external wizard trigger (from CTA buttons on other pages)
  useEffect(() => {
    const handler = () => {
      setOpen(true)
      startWizard()
    }
    window.addEventListener('waive:start-wizard', handler)
    return () => window.removeEventListener('waive:start-wizard', handler)
  }, [startWizard])

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

  // ── Render wizard conversation messages (excluding the initial kickoff) ──
  const visibleWizardMessages = wizardMessages.filter((_, i) => i > 0)  // skip "I want to request API access."

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
                    {wizardActive ? (
                      <span className="text-[10px] font-mono text-emerald-300 ml-1.5 uppercase tracking-wider">Guided Request</span>
                    ) : (
                      <span className="text-[10px] font-mono text-white/50 ml-1.5 uppercase tracking-wider">{friendly}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {usage && viewMode === 'reviewer' && (
                    <span className="text-[9px] font-mono text-white/40 mr-1">
                      ${((usage.dailyBudgetCents - usage.dailySpentCents) / 100).toFixed(2)}
                    </span>
                  )}
                  {(messages.length > 0 || wizardMessages.length > 0) && (
                    <button
                      onClick={() => {
                        const text = wizardActive
                          ? wizardMessages.map(m => `${m.role === 'user' ? 'You' : 'WAIve'}: ${m.content}`).join('\n\n')
                          : messages.map(m => `${m.role === 'user' ? 'You' : 'WAIve'}: ${m.text}`).join('\n\n')
                        navigator.clipboard.writeText(text)
                      }}
                      className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      title="Copy chat history"
                    >
                      <ClipboardCopy size={13} />
                    </button>
                  )}
                  {(messages.length > 0 || wizardMessages.length > 0) && !wizardActive && (
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
              {wizardActive ? (
                /* ── AI Wizard mode ── */
                <div className="px-4 py-3 space-y-3">
                  {/* Conversation messages */}
                  {visibleWizardMessages.map((msg, i) => (
                    <div key={i}>
                      <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed overflow-hidden break-words ${
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
                          {msg.role === 'assistant'
                            ? <div className="space-y-0.5">{renderWaiveText(msg.content)}</div>
                            : <span className="whitespace-pre-wrap">{msg.content}</span>
                          }
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-ww-gray-100 rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2">
                        <Loader2 size={13} className="animate-spin text-[#6310D1]" />
                        <span className="text-[13px] text-ww-gray-400">Thinking...</span>
                      </div>
                    </div>
                  )}

                  {/* Summary card when request data is parsed */}
                  {wizardRequestData && (
                    <div className="mt-3">
                      <div className="border border-[#6310D1]/20 rounded-xl bg-[#6310D1]/5 p-3.5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-[#6310D1]/10 flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-[#6310D1]" />
                          </div>
                          <span className="text-[13px] font-semibold text-ww-navy">Request Summary</span>
                        </div>

                        <div className="space-y-2 text-[12px]">
                          <div className="flex justify-between">
                            <span className="text-ww-gray-500">Product</span>
                            <span className="font-medium text-ww-navy">{PRODUCT_DISPLAY[wizardRequestData.product] || wizardRequestData.product}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ww-gray-500">Use Case</span>
                            <span className="font-medium text-ww-navy">{USE_CASE_DISPLAY[wizardRequestData.useCase] || wizardRequestData.useCase}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ww-gray-500">Builder</span>
                            <span className="font-medium text-ww-navy">{BUILDER_DISPLAY[wizardRequestData.builderType] || wizardRequestData.builderType}</span>
                          </div>
                          {wizardRequestData.partnerName && (
                            <div className="flex justify-between">
                              <span className="text-ww-gray-500">Partner</span>
                              <span className="font-medium text-ww-navy">{wizardRequestData.partnerName}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-ww-gray-500">Connecting To</span>
                            <span className="font-medium text-ww-navy">{wizardRequestData.connectingSystem}</span>
                          </div>
                          {wizardRequestData.dataRead.length > 0 && (
                            <div>
                              <span className="text-ww-gray-500">Data Categories</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {wizardRequestData.dataRead.map(d => (
                                  <span key={d} className="px-2 py-0.5 rounded-full bg-white text-[11px] text-ww-gray-600 border border-ww-gray-200">{d}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {wizardRequestData.endpointsRequested && (
                            <div>
                              <span className="text-ww-gray-500">Recommended Endpoints</span>
                              <p className="text-[11px] text-ww-navy mt-0.5 leading-relaxed">{wizardRequestData.endpointsRequested}</p>
                            </div>
                          )}
                          {wizardRequestData.technicalContactName && (
                            <div className="flex justify-between">
                              <span className="text-ww-gray-500">Tech Contact</span>
                              <span className="font-medium text-ww-navy">{wizardRequestData.technicalContactName}</span>
                            </div>
                          )}
                          {wizardRequestData.technicalContactEmail && (
                            <div className="flex justify-between">
                              <span className="text-ww-gray-500">Contact Email</span>
                              <span className="font-medium text-ww-navy text-[11px]">{wizardRequestData.technicalContactEmail}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-ww-gray-500">Timeline</span>
                            <span className="font-medium text-ww-navy">{TIMELINE_DISPLAY[wizardRequestData.targetTimeline] || wizardRequestData.targetTimeline}</span>
                          </div>
                        </div>

                        {/* Submit button */}
                        {!wizardSubmitted ? (
                          <button
                            onClick={submitWizardRequest}
                            disabled={wizardSubmitting || !activeUser}
                            className="w-full mt-4 px-3.5 py-2.5 rounded-lg bg-[#6310D1] text-white text-[13px] font-medium hover:bg-[#5009B0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                          >
                            {wizardSubmitting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Submitting...
                              </>
                            ) : !activeUser ? (
                              'Sign in to submit'
                            ) : (
                              <>
                                <ArrowRight size={14} />
                                Submit Request
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="w-full mt-4 px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-medium text-center flex items-center justify-center gap-2">
                            <CheckCircle2 size={14} />
                            Request submitted! Redirecting...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Exit wizard link */}
                  {!wizardRequestData && !loading && (
                    <button
                      onClick={exitWizard}
                      className="text-[11px] text-ww-gray-400 hover:text-ww-gray-600 transition-colors"
                    >
                      Exit guided request
                    </button>
                  )}
                </div>
              ) : messages.length === 0 ? (
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

                  {/* Guided request wizard — customer only */}
                  {viewMode === 'customer' && (
                    <button
                      onClick={startWizard}
                      className="w-full mt-5 px-3.5 py-3 rounded-xl bg-gradient-to-r from-[#6310D1] to-[#8736F0] text-white text-[13px] font-medium hover:shadow-lg hover:shadow-[#6310D1]/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles size={14} />
                      Start Guided Access Request
                    </button>
                  )}

                  {/* Suggested questions */}
                  <div className="w-full mt-3 space-y-1.5">
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
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed overflow-hidden break-words ${
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
                            {msg.role === 'assistant'
                              ? <div className="space-y-0.5">{renderWaiveText(msg.text)}</div>
                              : <span className="whitespace-pre-wrap">{msg.text}</span>
                            }
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
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (wizardActive) {
                        handleWizardInput()
                      } else {
                        ask()
                      }
                    }
                  }}
                  placeholder={
                    wizardActive
                      ? (wizardRequestData ? 'Request ready to submit' : 'Type your answer...')
                      : (messages.length > 0 ? 'Ask a follow-up...' : `Ask about ${friendly.toLowerCase()}...`)
                  }
                  disabled={wizardActive && !!wizardRequestData}
                  rows={1}
                  className="flex-1 resize-none text-[13px] border border-ww-gray-200 rounded-full px-3.5 py-2 focus:ring-2 focus:ring-[#6310D1]/20 focus:border-[#6310D1]/40 outline-none disabled:bg-ww-gray-50 disabled:text-ww-gray-400"
                />
                <button
                  onClick={() => {
                    if (wizardActive) {
                      handleWizardInput()
                    } else {
                      ask()
                    }
                  }}
                  disabled={!question.trim() || loading || (wizardActive && !!wizardRequestData)}
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
