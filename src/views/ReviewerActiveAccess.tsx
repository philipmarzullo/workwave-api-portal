import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers,
  FlaskConical,
  Server,
  ChevronRight,
  Search,
  Bot,
  Send,
  Loader2,
  X,
  Trash2,
} from 'lucide-react'
import type { WorkWaveProduct, GatewayPlatform } from '@/data/types'
import { store } from '@/data/store'
import {
  PRODUCT_LABELS,
  GATEWAY_LABELS,
  REQUEST_TYPE_LABELS,
} from '@/App'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const REQUEST_TYPE_COLORS: Record<string, string> = {
  new_access: 'bg-emerald-100 text-emerald-700',
  migration: 'bg-amber-100 text-amber-700',
  expand_access: 'bg-blue-100 text-blue-700',
}

export function ReviewerActiveAccess({ hideHeader = false }: { hideHeader?: boolean }) {
  const navigate = useNavigate()
  const [productFilter, setProductFilter] = useState<WorkWaveProduct | ''>('')
  const [gatewayFilter, setGatewayFilter] = useState<GatewayPlatform | ''>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Agent state
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentQuestion, setAgentQuestion] = useState('')
  const [agentMessages, setAgentMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState('')
  const [agentUsage, setAgentUsage] = useState<{ dailySpentCents: number; dailyBudgetCents: number } | null>(null)
  const agentInputRef = useRef<HTMLTextAreaElement>(null)
  const agentScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agentScrollRef.current) {
      agentScrollRef.current.scrollTop = agentScrollRef.current.scrollHeight
    }
  }, [agentMessages, agentLoading])

  const askAgent = async () => {
    const q = agentQuestion.trim()
    if (!q || agentLoading) return
    setAgentMessages(prev => [...prev, { role: 'user', text: q }])
    setAgentQuestion('')
    setAgentLoading(true)
    setAgentError('')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAgentError(data.error || 'Request failed')
      } else {
        setAgentMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
        if (data.usage) setAgentUsage(data.usage)
      }
    } catch {
      setAgentError('Failed to connect to server')
    } finally {
      setAgentLoading(false)
      setTimeout(() => agentInputRef.current?.focus(), 50)
    }
  }

  const approvedRequests = useMemo(() => store.getApprovedRequests(), [])

  const stats = useMemo(() => {
    const apigee = approvedRequests.filter(r => r.gatewayPlatform === 'apigee')
    const concourse = approvedRequests.filter(r => r.gatewayPlatform === 'concourse')
    const migrations = approvedRequests.filter(r => r.requestType === 'migration')
    const needsProvisioning = approvedRequests.filter(r => {
      if (r.provisioningChecklist.length === 0) return true
      return r.provisioningChecklist.some(s => !s.completed)
    })
    return {
      total: approvedRequests.length,
      apigee: apigee.length,
      concourse: concourse.length,
      migrations: migrations.length,
      needsProvisioning: needsProvisioning.length,
    }
  }, [approvedRequests])

  const filteredRequests = useMemo(() => {
    let filtered = [...approvedRequests]

    if (productFilter) {
      filtered = filtered.filter(r => r.product === productFilter)
    }
    if (gatewayFilter) {
      filtered = filtered.filter(r => r.gatewayPlatform === gatewayFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(r => {
        const customer = store.getCustomer(r.customerId)
        const partner = r.partnerId ? store.getPartner(r.partnerId) : null
        const partnerName = partner?.name ?? r.partnerNameFreetext ?? ''
        return (
          (customer?.name ?? '').toLowerCase().includes(q) ||
          partnerName.toLowerCase().includes(q) ||
          r.caseNumber.toLowerCase().includes(q)
        )
      })
    }

    // Sort by most recently updated
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    return filtered
  }, [approvedRequests, productFilter, gatewayFilter, searchQuery])

  return (
    <div className="mx-auto py-8">
      {/* Header */}
      {!hideHeader && (
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-ww-navy flex items-center justify-center">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-ww-gray-900">Active Access Inventory</h1>
            <p className="text-sm text-ww-gray-500">All approved API integrations across customers</p>
          </div>
        </div>
        <button
          onClick={() => {
            setAgentOpen(o => !o)
            if (!agentOpen) setTimeout(() => agentInputRef.current?.focus(), 100)
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
            agentOpen
              ? 'bg-ww-primary text-white border-ww-primary'
              : 'border-ww-primary/30 text-ww-primary bg-ww-primary/5 hover:bg-ww-primary/10'
          }`}
        >
          <Bot size={15} />
          Ask the Agent
        </button>
      </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <button onClick={() => { setProductFilter(''); setGatewayFilter(''); setSearchQuery('') }} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Layers size={14} className="text-ww-gray-400" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Total Active</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-gray-900">{stats.total}</p>
        </button>
        <button onClick={() => { setGatewayFilter('apigee'); setProductFilter('') }} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Apigee</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-gray-900">{stats.apigee}</p>
        </button>
        <button onClick={() => { setGatewayFilter('concourse'); setProductFilter('') }} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Concourse</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-gray-900">{stats.concourse}</p>
        </button>
        <button onClick={() => { setGatewayFilter(''); setProductFilter(''); setSearchQuery('migration') }} className="bg-white rounded-md border border-amber-200 bg-amber-50 p-4 text-left transition-all hover:bg-amber-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Migrations</span>
          </div>
          <p className="text-2xl font-display font-bold text-amber-600">{stats.migrations}</p>
        </button>
        <button onClick={() => { setGatewayFilter(''); setProductFilter(''); setSearchQuery('') }} className="bg-white rounded-md border border-ww-red/30 bg-red-50 p-4 text-left transition-all hover:bg-red-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Needs Provisioning</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-red">{stats.needsProvisioning}</p>
        </button>
      </div>

      {/* Ask the Agent panel */}
      {agentOpen && (
        <div className="rounded-lg border border-ww-primary/30 bg-white overflow-hidden flex flex-col mb-6" style={{ maxHeight: '480px' }}>
          <div className="flex items-center justify-between px-4 py-2 bg-ww-primary/5 border-b border-ww-primary/10 shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-ww-primary" />
              <span className="text-sm font-display font-bold text-ww-navy">Ask the Agent</span>
              {agentUsage && (
                <span className="text-[10px] font-mono text-ww-gray-400">
                  ${((agentUsage.dailyBudgetCents - agentUsage.dailySpentCents) / 100).toFixed(2)} remaining today
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {agentMessages.length > 0 && (
                <button
                  onClick={() => { setAgentMessages([]); setAgentError('') }}
                  className="p-1 rounded hover:bg-ww-gray-100 text-ww-gray-400 hover:text-ww-gray-600 transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setAgentOpen(false)}
                className="p-1 rounded hover:bg-ww-gray-100 text-ww-gray-400 hover:text-ww-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div ref={agentScrollRef} className="flex-1 overflow-y-auto min-h-0">
            {agentMessages.length === 0 && !agentLoading ? (
              <div className="p-4">
                <p className="text-xs text-ww-gray-400 mb-2">Try a question:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'What are the business rules for API access approval?',
                    'How should we handle competitive vendor requests?',
                    'What is the pricing model for API access?',
                    'When should we put a request on hold?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => {
                        setAgentQuestion(q)
                        setTimeout(() => agentInputRef.current?.focus(), 50)
                      }}
                      className="text-[11px] px-2 py-1 rounded-full border border-ww-gray-200 text-ww-gray-500 hover:border-ww-primary/30 hover:text-ww-primary hover:bg-ww-primary/5 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {agentMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-ww-primary text-white'
                          : 'bg-ww-gray-50 border border-ww-gray-200 text-ww-gray-700'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    </div>
                  </div>
                ))}
                {agentLoading && (
                  <div className="flex justify-start">
                    <div className="bg-ww-gray-50 border border-ww-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-ww-gray-400">
                      <Loader2 size={14} className="animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {agentError && (
            <div className="mx-3 mb-2 px-3 py-2 rounded bg-red-50 border border-red-200 text-sm text-red-700 shrink-0">
              {agentError}
            </div>
          )}

          <div className="border-t border-ww-gray-100 px-3 py-2 shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={agentInputRef}
                value={agentQuestion}
                onChange={e => setAgentQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    askAgent()
                  }
                }}
                placeholder={agentMessages.length > 0 ? 'Ask a follow-up...' : 'Ask about business rules, pricing, competitive guidance...'}
                rows={1}
                className="flex-1 px-3 py-2 text-sm border border-ww-gray-200 rounded resize-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
              />
              <button
                onClick={askAgent}
                disabled={agentLoading || !agentQuestion.trim()}
                className="px-3 py-2 rounded bg-ww-primary text-white text-sm hover:bg-ww-primary-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 self-end"
              >
                {agentLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ww-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customer or partner..."
            className="w-full pl-9 pr-4 py-2 rounded-md border border-ww-gray-200 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary transition-colors"
          />
        </div>
        <select
          value={productFilter}
          onChange={e => setProductFilter(e.target.value as WorkWaveProduct | '')}
          className="px-3 py-2 rounded-md border border-ww-gray-200 text-sm text-ww-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-ww-primary/30"
        >
          <option value="">All Products</option>
          {Object.entries(PRODUCT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={gatewayFilter}
          onChange={e => setGatewayFilter(e.target.value as GatewayPlatform | '')}
          className="px-3 py-2 rounded-md border border-ww-gray-200 text-sm text-ww-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-ww-primary/30"
        >
          <option value="">All Gateways</option>
          {Object.entries(GATEWAY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-md border border-ww-gray-200 p-12 text-center">
          <Layers size={40} className="mx-auto text-ww-gray-300 mb-3" />
          <p className="text-ww-gray-500 font-medium">No active integrations match your filters</p>
          <p className="text-sm text-ww-gray-400 mt-1">Try adjusting the filters above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => {
            const customer = store.getCustomer(req.customerId)
            const partner = req.partnerId ? store.getPartner(req.partnerId) : null
            const partnerName = partner?.name ?? req.partnerNameFreetext ?? 'Unknown'
            const completedSteps = req.provisioningChecklist.filter(s => s.completed).length
            const totalSteps = req.provisioningChecklist.length
            const requestTypeColor = REQUEST_TYPE_COLORS[req.requestType] ?? 'bg-gray-100 text-gray-600'

            return (
              <button
                key={req.id}
                onClick={() => navigate(`/reviewer/request/${req.id}`)}
                className="w-full text-left bg-white rounded-md border border-ww-gray-200 transition-all hover:border-ww-primary group"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Top row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-ww-gray-900 truncate">
                          {customer?.name ?? 'Unknown Customer'}
                        </h3>
                        <span className="text-sm text-ww-gray-500">{partnerName}</span>
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-ww-sky text-ww-navy uppercase tracking-wide">
                          {PRODUCT_LABELS[req.product] ?? req.product}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          req.environment === 'production'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {req.environment === 'production' ? <Server size={10} /> : <FlaskConical size={10} />}
                          {req.environment === 'production' ? 'Production' : 'Sandbox'}
                        </span>
                        {req.gatewayPlatform && (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-ww-gray-100 text-ww-gray-600">
                            {GATEWAY_LABELS[req.gatewayPlatform] ?? req.gatewayPlatform}
                          </span>
                        )}
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${requestTypeColor}`}>
                          {REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="flex items-center gap-4 text-xs text-ww-gray-500 flex-wrap">
                        {totalSteps > 0 ? (
                          <span className={`font-medium ${completedSteps === totalSteps ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {completedSteps}/{totalSteps} provisioned
                          </span>
                        ) : (
                          <span className="font-medium text-ww-red">Not provisioned</span>
                        )}
                        <span className="font-mono">Approved {formatDate(req.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center self-center">
                      <ChevronRight size={18} className="text-ww-gray-300 group-hover:text-ww-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
