import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Flag,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Server,
  FlaskConical,
  ArrowUpDown,
  ChevronRight,
  Pause,
  Swords,
  Send,
  Loader2,
  X,
  Trash2,
} from 'lucide-react'
import { WaiveIcon } from '@/components/WaiveIcon'
import type { ApiRequest, CatalogEndpoint } from '@/data/types'
import { store } from '@/data/store'
import { PRODUCT_LABELS, STATUS_LABELS, TIER_LABELS, USE_CASE_LABELS } from '@/App'
import rawCatalog from '@/data/winteam-api-catalog.json'
import { DOMAIN_LABELS, GENERATION_LABELS } from '@/data/catalog-labels'
import { getDomainBadges, matchEndpointsRequested } from '@/data/catalog-matcher'

const catalog = rawCatalog as CatalogEndpoint[]

type FilterTab = 'all' | 'pending_review' | 'production_review' | 'on_hold' | 'flagged'
type SortMode = 'newest' | 'flagged'

function isFlagged(req: ApiRequest): boolean {
  if (req.partnerId === null) return true
  const partner = store.getPartner(req.partnerId)
  if (!partner) return true
  return partner.tier === 'unapproved' || partner.tier === 'blocked' || !!partner.competitiveFlag
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ReviewerQueue({ hideHeader = false }: { hideHeader?: boolean }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')

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

  const pendingRequests = useMemo(() => store.getPendingRequests(), [])

  const stats = useMemo(() => {
    const sandbox = pendingRequests.filter(r => r.status === 'pending_review')
    const production = pendingRequests.filter(r => r.status === 'pending_production_review')
    const onHold = pendingRequests.filter(r => r.status === 'on_hold')
    const flagged = pendingRequests.filter(r => isFlagged(r))
    return {
      total: pendingRequests.length,
      sandbox: sandbox.length,
      production: production.length,
      onHold: onHold.length,
      flagged: flagged.length,
    }
  }, [pendingRequests])

  const filteredRequests = useMemo(() => {
    let filtered = [...pendingRequests]

    switch (activeTab) {
      case 'pending_review':
        filtered = filtered.filter(r => r.status === 'pending_review')
        break
      case 'production_review':
        filtered = filtered.filter(r => r.status === 'pending_production_review')
        break
      case 'on_hold':
        filtered = filtered.filter(r => r.status === 'on_hold')
        break
      case 'flagged':
        filtered = filtered.filter(r => isFlagged(r))
        break
    }

    if (sortMode === 'flagged') {
      filtered.sort((a, b) => {
        const aFlagged = isFlagged(a) ? 0 : 1
        const bFlagged = isFlagged(b) ? 0 : 1
        if (aFlagged !== bFlagged) return aFlagged - bFlagged
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return filtered
  }, [pendingRequests, activeTab, sortMode])

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending_review', label: 'Pending Review', count: stats.sandbox },
    { key: 'production_review', label: 'Production Review', count: stats.production },
    { key: 'on_hold', label: 'On Hold', count: stats.onHold },
    { key: 'flagged', label: 'Flagged', count: stats.flagged },
  ]

  return (
    <div className="mx-auto py-8">
      {/* Header */}
      {!hideHeader && (
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-ww-navy flex items-center justify-center">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-ww-gray-900">Review Queue</h1>
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-ww-primary text-white text-xs font-bold">
                {stats.total}
              </span>
            </div>
            <p className="text-sm text-ww-gray-500">Pending API access requests requiring review</p>
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
          <WaiveIcon size={15} />
          Ask WAIve
        </button>
      </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <button onClick={() => setActiveTab('all')} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-ww-gray-400" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Total Pending</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-gray-900">{stats.total}</p>
        </button>
        <button onClick={() => setActiveTab('pending_review')} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={14} className="text-ww-primary" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Sandbox</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-primary">{stats.sandbox}</p>
        </button>
        <button onClick={() => setActiveTab('production_review')} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Server size={14} className="text-purple-600" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Production</span>
          </div>
          <p className="text-2xl font-display font-bold text-purple-600">{stats.production}</p>
        </button>
        <button onClick={() => setActiveTab('on_hold')} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Pause size={14} className="text-orange-600" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">On Hold</span>
          </div>
          <p className="text-2xl font-display font-bold text-orange-600">{stats.onHold}</p>
        </button>
        <button onClick={() => setActiveTab('flagged')} className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Flag size={14} className="text-ww-amber" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Flagged</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-amber">{stats.flagged}</p>
        </button>
      </div>

      {/* Ask WAIve panel */}
      {agentOpen && (
        <div className="rounded-lg border border-ww-primary/30 bg-white overflow-hidden flex flex-col mb-6" style={{ maxHeight: '480px' }}>
          <div className="flex items-center justify-between px-4 py-2 bg-ww-primary/5 border-b border-ww-primary/10 shrink-0">
            <div className="flex items-center gap-2">
              <WaiveIcon size={14} />
              <span className="text-sm font-display font-bold text-ww-navy">Ask WAIve</span>
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
                    'Which flagged requests should I prioritize?',
                    'Summarize the competitive vendor requests in queue',
                    'What are the approval criteria for sandbox vs production?',
                    'Any requests with contradictory resell intent?',
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
                placeholder={agentMessages.length > 0 ? 'Ask a follow-up...' : 'Ask WAIve about pending requests...'}
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

      {/* Filter Tabs + Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1 bg-ww-gray-100 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-ww-navy'
                  : 'text-ww-gray-500 hover:text-ww-gray-700'
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key
                    ? 'bg-ww-navy text-white'
                    : 'bg-ww-gray-300 text-ww-gray-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setSortMode(s => (s === 'newest' ? 'flagged' : 'newest'))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-ww-gray-600 bg-white border border-ww-gray-200 hover:bg-ww-gray-50 transition-colors"
        >
          <ArrowUpDown size={14} />
          {sortMode === 'newest' ? 'Newest First' : 'Flagged First'}
        </button>
      </div>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-md border border-ww-gray-200 p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-ww-gray-300 mb-3" />
          <p className="text-ww-gray-500 font-medium">No requests match the current filter</p>
          <p className="text-sm text-ww-gray-400 mt-1">Try selecting a different tab above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(req => {
            const customer = store.getCustomer(req.customerId)
            const partner = req.partnerId ? store.getPartner(req.partnerId) : null
            const partnerName = partner?.name ?? req.partnerNameFreetext ?? 'Unknown'
            const flagged = isFlagged(req)
            const status = STATUS_LABELS[req.status] ?? { label: req.status, color: 'bg-gray-100 text-gray-600' }
            const tierInfo = partner ? TIER_LABELS[partner.tier] : null

            return (
              <button
                key={req.id}
                onClick={() => navigate(`/reviewer/request/${req.id}`)}
                className={`w-full text-left bg-white rounded-md border transition-all hover:border-ww-primary group ${
                  flagged ? 'border-ww-amber/40' : 'border-ww-gray-200'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: customer name + product */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-ww-gray-900 truncate">
                          {customer?.name ?? 'Unknown Customer'}
                        </h3>
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-ww-sky text-ww-navy uppercase tracking-wide">
                          {PRODUCT_LABELS[req.product] ?? req.product}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      {/* Partner info */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm text-ww-gray-600">
                          {partnerName}
                        </span>
                        {req.partnerId === null && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                            <AlertTriangle size={10} />
                            Unlisted
                          </span>
                        )}
                        {tierInfo && (
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${tierInfo.color}`}>
                            {tierInfo.label}
                          </span>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="flex items-center gap-4 text-xs text-ww-gray-500 flex-wrap">
                        <span>{USE_CASE_LABELS[req.useCase] ?? req.useCase}</span>
                        {req.requestType === 'migration' && (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                            Migration
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-medium ${
                          req.environment === 'production'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {req.environment === 'production' ? (
                            <Server size={10} />
                          ) : (
                            <FlaskConical size={10} />
                          )}
                          {req.environment === 'production' ? 'Production' : 'Sandbox'}
                        </span>
                        <span className="font-mono">Submitted {formatDate(req.createdAt)}</span>
                      </div>

                      {/* Flags */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {req.status === 'on_hold' && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700">
                            <Pause size={12} />
                            On Hold
                          </span>
                        )}
                        {partner?.competitiveFlag && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                            <Swords size={12} />
                            Competitive Concern
                          </span>
                        )}
                        {partner?.tier === 'blocked' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-200 text-red-900">
                            Vendor Blocked
                          </span>
                        )}
                        {flagged && req.status !== 'on_hold' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-ww-amber">
                            <Flag size={12} className="text-ww-amber" />
                            Requires Full Review
                          </span>
                        )}
                        {req.dataLeavesEnvironment && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-ww-red">
                            <ShieldAlert size={12} className="text-ww-red" />
                            Data leaves environment
                          </span>
                        )}
                        {store.hasContradictoryResellIntent(req) && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle size={12} />
                            Contradictory Resell Intent
                          </span>
                        )}
                      </div>

                      {/* Domain badges + endpoint count (WinTeam only) */}
                      {req.product === 'winteam' && req.endpointsRequested && (
                        <EndpointSummaryBadges text={req.endpointsRequested} />
                      )}
                    </div>

                    {/* Right arrow */}
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

// ── Endpoint summary badges for queue cards ────────────────────

function EndpointSummaryBadges({ text }: { text: string }) {
  const results = useMemo(
    () => matchEndpointsRequested(text, catalog),
    [text],
  )

  const badges = useMemo(
    () => getDomainBadges(text, catalog, DOMAIN_LABELS),
    [text],
  )

  if (results.matchResults.length === 0) return null

  const genLabels = results.generations.map(g => GENERATION_LABELS[g].label)

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <span className="text-[10px] font-mono font-medium text-ww-gray-500">
        {results.matchResults.length} endpoint{results.matchResults.length !== 1 ? 's' : ''}
      </span>
      {genLabels.length > 0 && (
        <>
          <span className="text-ww-gray-300 text-[10px]">&middot;</span>
          <span className="text-[10px] font-mono text-ww-gray-400">{genLabels.join(' + ')}</span>
        </>
      )}
      {badges.map(b => (
        <span
          key={b.domain}
          className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-sky-50 text-sky-700 border border-sky-100"
        >
          {b.label}
        </span>
      ))}
    </div>
  )
}
