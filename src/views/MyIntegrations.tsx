import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers,
  FlaskConical,
  Server,
  CheckCircle2,
  ArrowRight,
  Globe,
  Bot,
  Send,
  Loader2,
  X,
  Trash2,
} from 'lucide-react'
import type { CustomerUser } from '@/data/types'
import { store } from '@/data/store'
import {
  PRODUCT_LABELS,
  GATEWAY_LABELS,
  LEGACY_METHOD_LABELS,
} from '@/App'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface MyIntegrationsProps {
  activeUser?: CustomerUser
}

export function MyIntegrations({ activeUser }: MyIntegrationsProps) {
  const navigate = useNavigate()

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

  const integrations = useMemo(() => {
    if (!activeUser) return []
    return store.getActiveIntegrationsForCustomer(activeUser.customerId)
  }, [activeUser])

  const stats = useMemo(() => {
    const sandbox = integrations.filter(r => r.status === 'sandbox_approved')
    const production = integrations.filter(r => r.status === 'production_approved')
    return {
      total: integrations.length,
      sandbox: sandbox.length,
      production: production.length,
    }
  }, [integrations])

  return (
    <div className="mx-auto py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-ww-navy flex items-center justify-center">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-ww-gray-900">My Integrations</h1>
            <p className="text-sm text-ww-gray-500">Active API integrations for your organization</p>
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

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button onClick={() => {}} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Layers size={14} className="text-ww-gray-400" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Total Active</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-gray-900">{stats.total}</p>
        </button>
        <button onClick={() => {}} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={14} className="text-ww-primary" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Sandbox</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-primary">{stats.sandbox}</p>
        </button>
        <button onClick={() => {}} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Server size={14} className="text-purple-600" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Production</span>
          </div>
          <p className="text-2xl font-display font-bold text-purple-600">{stats.production}</p>
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
                    'How do I request production access after sandbox?',
                    'What does provisioning status mean?',
                    'Can I expand my integration to more endpoints?',
                    'How do I migrate from a legacy access method?',
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
                placeholder={agentMessages.length > 0 ? 'Ask a follow-up...' : 'Ask about your integrations, endpoints, access...'}
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

      {/* Integration Cards */}
      {integrations.length === 0 ? (
        <div className="bg-white rounded-md border border-ww-gray-200 p-12 text-center">
          <Layers size={40} className="mx-auto text-ww-gray-300 mb-3" />
          <p className="text-ww-gray-500 font-medium">No active integrations</p>
          <p className="text-sm text-ww-gray-400 mt-1 mb-4">Your approved API integrations will appear here</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-ww-primary hover:text-ww-primary-light transition-colors"
          >
            <Globe size={14} />
            Browse Partner Directory
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {integrations.map(req => {
            const partner = req.partnerId ? store.getPartner(req.partnerId) : null
            const partnerName = partner?.name ?? req.partnerNameFreetext ?? 'Unknown'
            const completedSteps = req.provisioningChecklist.filter(s => s.completed).length
            const totalSteps = req.provisioningChecklist.length
            const fullyProvisioned = totalSteps > 0 && completedSteps === totalSteps

            return (
              <div
                key={req.id}
                className="bg-white rounded-md border border-ww-gray-200 p-5 transition-all hover:border-ww-gray-300 hover:bg-ww-gray-50/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Top row: partner + badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-ww-gray-900">{partnerName}</h3>
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
                    </div>

                    {/* Active since */}
                    <p className="text-xs text-ww-gray-500 font-mono mb-2">
                      Active since {formatDate(req.updatedAt)}
                    </p>

                    {/* Gateway + Provisioning */}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {req.gatewayPlatform && (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-ww-gray-100 text-ww-gray-600">
                          {GATEWAY_LABELS[req.gatewayPlatform] ?? req.gatewayPlatform}
                        </span>
                      )}
                      {totalSteps > 0 && (
                        fullyProvisioned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={10} />
                            Fully Provisioned
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                            {completedSteps}/{totalSteps} provisioning complete
                          </span>
                        )
                      )}
                      {req.requestType === 'migration' && req.migratingFrom && (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                          Migrated from {LEGACY_METHOD_LABELS[req.migratingFrom] ?? req.migratingFrom}
                        </span>
                      )}
                    </div>

                    {/* Approved endpoints */}
                    {(req.endpointsApproved || req.endpointsRequested) && (
                      <div className="text-xs font-mono text-ww-gray-500 truncate">
                        {(req.endpointsApproved ?? req.endpointsRequested).split('\n').slice(0, 2).join(' · ')}
                        {(req.endpointsApproved ?? req.endpointsRequested).split('\n').length > 2 && ' ...'}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate('/check-status')}
                    className="flex items-center gap-1 text-xs text-ww-gray-400 hover:text-ww-primary transition-colors shrink-0"
                  >
                    <span className="font-mono">{req.caseNumber}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
