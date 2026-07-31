import { useState, useMemo } from 'react'
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
} from 'lucide-react'
import type { ApiRequest } from '@/data/types'
import { store } from '@/data/store'
import { PRODUCT_LABELS, STATUS_LABELS, TIER_LABELS, USE_CASE_LABELS } from '@/App'

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

export function ReviewerQueue() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')

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
      <div className="flex items-center gap-3 mb-6">
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

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-md border border-ww-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-ww-gray-400" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Total Pending</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-md border border-ww-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={14} className="text-ww-primary" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Sandbox</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-primary">{stats.sandbox}</p>
        </div>
        <div className="bg-white rounded-md border border-ww-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Server size={14} className="text-purple-600" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Production</span>
          </div>
          <p className="text-2xl font-display font-bold text-purple-600">{stats.production}</p>
        </div>
        <div className="bg-white rounded-md border border-ww-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Pause size={14} className="text-orange-600" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">On Hold</span>
          </div>
          <p className="text-2xl font-display font-bold text-orange-600">{stats.onHold}</p>
        </div>
        <div className="bg-white rounded-md border border-ww-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flag size={14} className="text-ww-amber" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Flagged</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-amber">{stats.flagged}</p>
        </div>
      </div>

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
